import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import unzipper from 'unzipper';
import { execa } from 'execa';
import sevenBin from '7zip-bin';

export async function extractArchive(inputPath, options = {}, progressCallback) {
  const startTime = Date.now();
  const inputExt = path.extname(inputPath).toLowerCase();
  const baseOutDir = options.extractPath && typeof options.extractPath === 'string' ? options.extractPath : 'extracted';
  const outputDirName = `${uuidv4()}-${Date.now()}-${baseOutDir}`;
  const outputDir = path.join('processed', outputDirName);

  if (!fs.existsSync('processed')) fs.mkdirSync('processed', { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const overwriteExisting = !!options.overwriteExisting;

  try {
    if (progressCallback) progressCallback(10, 'Preparing archive extraction...');

    const password = typeof options.password === 'string' && options.password.length > 0 ? options.password : null;

    switch (inputExt) {
      case '.zip':
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
        await extractWith7z(inputPath, outputDir, { overwriteExisting, password }, progressCallback);
        break;
      default:
        await extractWith7z(inputPath, outputDir, { overwriteExisting, password }, progressCallback);
    }

    const processingTime = (Date.now() - startTime) / 1000;
    const stats = dirSize(outputDir);

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
    try { if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true }); } catch {}
    throw err;
  }
}

async function extractZip(zipPath, outDir, { overwriteExisting, password }, progressCallback) {
  const directory = await unzipper.Open.file(zipPath);
  const total = directory.files.length || 1;
  let processed = 0;

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
      } else {
        if (password) {
          // Fallback to 7z for password-protected zip
          await extractWith7z(zipPath, outDir, { overwriteExisting, password }, progressCallback);
          break;
        } else {
          await new Promise((resolve, reject) => {
            entry.stream()
              .pipe(fs.createWriteStream(destPath))
              .on('finish', resolve)
              .on('error', reject);
          });
        }
      }
    }

    processed += 1;
    if (progressCallback) {
      const pct = 10 + Math.floor((processed / total) * 80);
      progressCallback(pct, `Extracting ${entry.path}`);
    }
  }
}

async function extractWith7z(archivePath, outDir, { overwriteExisting, password }, progressCallback) {
  const sevenPath = sevenBin.path7za; // cross-platform 7z binary
  const args = ['x', archivePath, `-o${outDir}`, overwriteExisting ? '-y' : '-aos'];
  if (password) {
    args.push(`-p${password}`);
  }
  if (progressCallback) progressCallback(20, 'Extracting with 7-Zip...');
  try {
    await execa(sevenPath, args);
  } catch (err) {
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



