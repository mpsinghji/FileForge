import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import unzipper from 'unzipper';
import { execa } from 'execa';
import sevenBin from '7zip-bin';

// ─── Helpers ────────────────────────────────────────────────────────────────

function get7zPath() {
  // Prefer system-installed 7-Zip (full format support incl. RAR)
  const systemPaths = [
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
  ];
  for (const p of systemPaths) {
    if (fs.existsSync(p)) return p;
  }
  return sevenBin.path7za;
}

function dirSize(targetDir) {
  let size = 0;
  let files = 0;
  if (!fs.existsSync(targetDir)) return { size: 0, files: 0 };
  const stack = [targetDir];
  while (stack.length) {
    const d = stack.pop();
    const items = fs.readdirSync(d, { withFileTypes: true });
    for (const it of items) {
      const p = path.join(d, it.name);
      if (it.isDirectory()) stack.push(p);
      else { size += fs.statSync(p).size; files += 1; }
    }
  }
  return { size, files };
}

// ─── Password detection ──────────────────────────────────────────────────────

/**
 * Checks whether the archive requires a password.
 * Returns { encrypted: boolean, encryptedHeaders: boolean }
 * Works for: ZIP, 7z (header encryption), RAR, etc.
 */
export async function checkArchiveEncryption(archivePath) {
  const sevenPath = get7zPath();
  if (!fs.existsSync(sevenPath)) {
    throw new Error('7-Zip binary not found. Cannot check archive encryption.');
  }

  try {
    // 7z l = list archive (without extracting)
    // If the archive has encrypted content, 7z exits 0 but marks files with [Encrypted +]
    // If headers are encrypted, 7z exits with a non-zero code asking for password
    const { stdout } = await execa(sevenPath, ['l', archivePath, '-slt'], {
      timeout: 15000,
      reject: false, // don't throw on non-zero exit
    });

    const encrypted = stdout.includes('Encrypted = +') || stdout.includes('Encrypted: +');
    const encryptedHeaders = stdout.includes('Encrypted = Headers') || stdout.includes('Can not open encrypted archive');

    return { encrypted: encrypted || encryptedHeaders, encryptedHeaders };
  } catch (err) {
    // If 7z itself fails to even list the file because of header encryption
    const msg = err.stderr || err.message || '';
    if (msg.includes('Wrong password') || msg.includes('MISSING_PASSWORD') || msg.includes('encrypted')) {
      return { encrypted: true, encryptedHeaders: true };
    }
    return { encrypted: false, encryptedHeaders: false };
  }
}

// ─── 7-Zip extraction (crash-proof) ─────────────────────────────────────────

async function extractWith7z(archivePath, outDir, { overwriteExisting, password }, progressCallback) {
  const sevenPath = get7zPath();

  if (!fs.existsSync(sevenPath)) {
    throw new Error('7-Zip binary not found at: ' + sevenPath);
  }

  const args = ['x', archivePath, `-o${outDir}`, overwriteExisting ? '-y' : '-aos'];
  if (password) {
    args.push(`-p${password}`);
  } else {
    // Pass empty password to suppress the interactive prompt and get clean exit
    args.push('-p');
  }

  if (progressCallback) progressCallback(20, 'Extracting with 7-Zip...');

  let stdout = '';
  let stderr = '';

  try {
    const result = await execa(sevenPath, args, {
      timeout: 300000,
      reject: false, // ← CRITICAL: never throw on exit code, parse manually
    });

    stdout = result.stdout || '';
    stderr = result.stderr || '';
    const exitCode = result.exitCode;

    console.log('[7ZIP] Exit code:', exitCode);
    console.log('[7ZIP] Stdout:', stdout.substring(0, 500));
    console.log('[7ZIP] Stderr:', stderr.substring(0, 500));

    // Exit codes: 0 = OK, 1 = Warning, 2 = Fatal, 7 = Bad args, 8 = Not enough memory
    // 255 = User stopped / Wrong password
    if (exitCode === 255 || stderr.includes('Wrong password') || stdout.includes('Wrong password')) {
      throw new Error('WRONG_PASSWORD: The password you entered is incorrect.');
    }

    if (exitCode === 2) {
      // Check if it's a password issue
      if (stdout.includes('password') || stdout.includes('Encrypted') || stderr.includes('password')) {
        throw new Error('PASSWORD_REQUIRED: This archive is password-protected. Please enter the password to extract it.');
      }
      throw new Error(`Archive extraction failed with error. Output: ${stderr || stdout}`);
    }

    if (exitCode !== 0 && exitCode !== 1) {
      throw new Error(`7-Zip returned exit code ${exitCode}. ${stderr || stdout}`);
    }

    if (progressCallback) progressCallback(90, 'Extraction done, finalizing...');
    return { stdout, stderr, exitCode };

  } catch (err) {
    // Re-throw named errors as-is
    if (err.message.startsWith('PASSWORD_REQUIRED:') || err.message.startsWith('WRONG_PASSWORD:')) {
      throw err;
    }
    // Anything else: wrap cleanly
    throw new Error(`7-Zip extraction failed: ${err.shortMessage || err.message}`);
  }
}

// ─── Fallback ZIP (unzipper) ────────────────────────────────────────────────

async function extractZip(zipPath, outDir, { overwriteExisting, password }, progressCallback) {
  console.log('[ARCHIVE] Trying unzipper for ZIP');

  try {
    const directory = await unzipper.Open.file(zipPath);
    const total = directory.files.length || 1;
    let processed = 0;

    for (const entry of directory.files) {
      const destPath = path.join(outDir, entry.path);

      if (entry.type === 'Directory') {
        fs.mkdirSync(destPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        if (!overwriteExisting && fs.existsSync(destPath)) {
          // skip
        } else {
          await new Promise((resolve, reject) => {
            let stream;
            try {
              stream = entry.stream(password || undefined);
            } catch (syncErr) {
              if (syncErr.message === 'MISSING_PASSWORD') {
                return reject(new Error('PASSWORD_REQUIRED: This archive is password-protected. Please enter the password.'));
              }
              return reject(syncErr);
            }

            stream
              .pipe(fs.createWriteStream(destPath))
              .on('finish', resolve)
              .on('error', (e) => {
                if (e.message === 'MISSING_PASSWORD' || e.message === 'BAD_PASSWORD') {
                  reject(new Error('PASSWORD_REQUIRED: This archive is password-protected. Please enter the password.'));
                } else {
                  reject(e);
                }
              });
          });
        }
      }

      processed += 1;
      if (progressCallback) {
        const pct = 10 + Math.floor((processed / total) * 80);
        progressCallback(pct, `Extracting: ${entry.path}`);
      }
    }

    console.log('[ARCHIVE] unzipper extraction completed');
  } catch (error) {
    if (error.message === 'MISSING_PASSWORD') {
      throw new Error('PASSWORD_REQUIRED: This archive is password-protected. Please enter the password.');
    }
    throw new Error(`ZIP extraction failed: ${error.message}`);
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function extractArchive(inputPath, options = {}, progressCallback) {
  console.log('[ARCHIVE] Starting extraction:', { inputPath, options });

  const startTime = Date.now();
  const inputExt = path.extname(inputPath).toLowerCase();
  const baseOutDir = options.extractPath && typeof options.extractPath === 'string' ? options.extractPath : 'extracted';
  const archiveBase = path.basename(inputPath, inputExt);
  const safeArchiveBase = archiveBase.replace(/[^a-zA-Z0-9_.\-]/g, '_') || 'archive';
  const outputDirName = `${safeArchiveBase}-${Date.now()}-${baseOutDir}`;
  const outputDir = path.join('processed', outputDirName);

  if (!fs.existsSync('processed')) fs.mkdirSync('processed', { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const overwriteExisting = !!options.overwriteExisting;
  const password = typeof options.password === 'string' && options.password.length > 0 ? options.password : null;

  try {
    if (progressCallback) progressCallback(10, 'Preparing archive extraction...');

    // All formats go through 7-Zip first (it's the most reliable)
    try {
      await extractWith7z(inputPath, outputDir, { overwriteExisting, password }, progressCallback);
    } catch (err) {
      // Named errors bubble up immediately without fallback
      if (err.message.startsWith('PASSWORD_REQUIRED:') || err.message.startsWith('WRONG_PASSWORD:')) {
        throw err;
      }
      // For ZIPs only, try the unzipper fallback
      if (inputExt === '.zip') {
        console.log('[ARCHIVE] 7-Zip failed, trying unzipper fallback:', err.message);
        await extractZip(inputPath, outputDir, { overwriteExisting, password }, progressCallback);
      } else {
        throw err;
      }
    }

    const processingTime = (Date.now() - startTime) / 1000;
    const stats = dirSize(outputDir);

    if (progressCallback) progressCallback(100, 'Archive extraction completed successfully!');

    return {
      success: true,
      filename: path.basename(outputDir),
      path: outputDir,
      size: stats.size,
      filesExtracted: stats.files,
      processingTime,
    };
  } catch (err) {
    // Cleanup on failure
    try { if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true }); } catch { }
    throw err;
  }
}
