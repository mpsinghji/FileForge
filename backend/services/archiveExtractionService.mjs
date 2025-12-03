import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import unzipper from 'unzipper';
import { execa } from 'execa';
import sevenBin from '7zip-bin';

export async function extractArchive(inputPath, options = {}, progressCallback) {
  console.log('[ARCHIVE DEBUG] Starting archive extraction:', { inputPath, options });

  const startTime = Date.now();
  const inputExt = path.extname(inputPath).toLowerCase();
  const baseOutDir = options.extractPath && typeof options.extractPath === 'string' ? options.extractPath : 'extracted';

  // Derive a user-friendly base name from the archive file (without extension)
  const archiveBase = path.basename(inputPath, inputExt);
  const safeArchiveBase = archiveBase.replace(/[^a-zA-Z0-9_.\-]/g, '_') || 'archive';

  // Include archive name in the output directory so users can see which archive it came from
  const outputDirName = `${safeArchiveBase}-${Date.now()}-${baseOutDir}`;
  const outputDir = path.join('processed', outputDirName);

  console.log('[ARCHIVE DEBUG] Output directory:', outputDir);

  if (!fs.existsSync('processed')) fs.mkdirSync('processed', { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const overwriteExisting = !!options.overwriteExisting;

  try {
    if (progressCallback) progressCallback(10, 'Preparing archive extraction...');

    const password = typeof options.password === 'string' && options.password.length > 0 ? options.password : null;

    console.log('[ARCHIVE DEBUG] Processing file extension:', inputExt);

    switch (inputExt) {
      case '.zip':
        console.log('[ARCHIVE DEBUG] Using ZIP extraction method');
        await extractZip(inputPath, outputDir, { overwriteExisting, password }, progressCallback);
        break;
      case '.rar':
      case '.7z':
      case '.tar':
      case '.gz':
      case '.bz2':
      case '.xz':
      case '.tar.gz':
      case '.tgz':
      case '.tar.bz2':
      case '.tbz2':
        console.log('[ARCHIVE DEBUG] Using 7-Zip extraction method for:', inputExt);
        try {
          await extractWith7z(inputPath, outputDir, { overwriteExisting, password }, progressCallback);
        } catch (error) {
          console.log('[ARCHIVE DEBUG] 7-Zip failed:', error.message);
          throw new Error(`Archive format ${inputExt} extraction failed: ${error.message}`);
        }
        break;
      default:
        console.log('[ARCHIVE DEBUG] Using 7-Zip extraction method for unknown extension:', inputExt);
        try {
          await extractWith7z(inputPath, outputDir, { overwriteExisting, password }, progressCallback);
        } catch (error) {
          console.log('[ARCHIVE DEBUG] 7-Zip failed for unknown format:', error.message);
          // Try ZIP extraction as fallback for unknown formats
          try {
            console.log('[ARCHIVE DEBUG] Trying ZIP extraction as fallback');
            await extractZip(inputPath, outputDir, { overwriteExisting, password }, progressCallback);
          } catch (zipError) {
            throw new Error(`Archive format ${inputExt} is not supported.`);
          }
        }
    }

    const processingTime = (Date.now() - startTime) / 1000;
    const stats = dirSize(outputDir);

    console.log('[ARCHIVE DEBUG] Extraction completed:', {
      outputDir,
      processingTime,
      stats,
      filesExtracted: stats.files,
      totalSize: stats.size
    });

    if (progressCallback) progressCallback(100, 'Archive extraction completed');

    return {
      filename: path.basename(outputDir),
      path: outputDir,
      size: stats.size,
      filesExtracted: stats.files,
      processingTime
    };
  } catch (err) {
    // Cleanup on failure
    try { if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true }); } catch { }
    throw err;
  }
}

async function extractZip(zipPath, outDir, { overwriteExisting, password }, progressCallback) {
  console.log('[ARCHIVE DEBUG] Starting ZIP extraction');

  try {
    const directory = await unzipper.Open.file(zipPath);
    const total = directory.files.length || 1;
    let processed = 0;

    console.log('[ARCHIVE DEBUG] ZIP contains', total, 'entries');

    for (const entry of directory.files) {
      const destPath = path.join(outDir, entry.path);

      // Skip directories
      if (entry.type === 'Directory') {
        fs.mkdirSync(destPath, { recursive: true });
      } else {
        // Ensure parent directory exists
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        if (!overwriteExisting && fs.existsSync(destPath)) {
          // Skip existing file if not overwriting
          console.log('[ARCHIVE DEBUG] Skipping existing file:', entry.path);
        } else {
          if (password) {
            // Fallback to 7z for password-protected zip
            console.log('[ARCHIVE DEBUG] Password-protected ZIP, using 7-Zip');
            await extractWith7z(zipPath, outDir, { overwriteExisting, password }, progressCallback);
            break;
          } else {
            try {
              await new Promise((resolve, reject) => {
                entry.stream()
                  .pipe(fs.createWriteStream(destPath))
                  .on('finish', resolve)
                  .on('error', reject);
              });
              console.log('[ARCHIVE DEBUG] Extracted file:', entry.path);
            } catch (error) {
              console.error('[ARCHIVE DEBUG] Failed to extract file:', entry.path, error.message);
              throw error;
            }
          }
        }
      }

      processed += 1;
      if (progressCallback) {
        const pct = 10 + Math.floor((processed / total) * 80);
        progressCallback(pct, `Extracting ${entry.path}`);
      }
    }

    console.log('[ARCHIVE DEBUG] ZIP extraction completed successfully');
  } catch (error) {
    console.error('[ARCHIVE DEBUG] ZIP extraction failed:', error);
    throw new Error(`ZIP extraction failed: ${error.message}`);
  }
}

async function extractWith7z(archivePath, outDir, { overwriteExisting, password }, progressCallback) {
  console.log('[ARCHIVE DEBUG] Using 7-Zip for extraction');

  let sevenPath = sevenBin.path7za;

  // Check for system 7-Zip which supports RAR (bundled 7za does not)
  const systemPaths = [
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe'
  ];

  for (const sysPath of systemPaths) {
    if (fs.existsSync(sysPath)) {
      sevenPath = sysPath;
      break;
    }
  }

  console.log('[ARCHIVE DEBUG] 7-Zip binary path:', sevenPath);

  if (!fs.existsSync(sevenPath)) {
    throw new Error('7-Zip binary not found at expected path: ' + sevenPath);
  }

  const args = ['x', archivePath, `-o${outDir}`, overwriteExisting ? '-y' : '-aos'];
  if (password) {
    args.push(`-p${password}`);
  }

  console.log('[ARCHIVE DEBUG] 7-Zip command:', sevenPath, args);

  if (progressCallback) progressCallback(20, 'Extracting with 7-Zip...');
  try {
    const result = await execa(sevenPath, args, { timeout: 300000 }); // 5 minute timeout
    console.log('[ARCHIVE DEBUG] 7-Zip extraction completed successfully');
    return result;
  } catch (err) {
    console.error('[ARCHIVE DEBUG] 7-Zip extraction failed:', err);
    throw new Error(`7-Zip extraction failed: ${err.shortMessage || err.message}`);
  }
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



