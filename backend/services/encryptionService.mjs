import fs from 'fs';
import path from 'path';
import archiver from './archiverSetup.mjs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Encrypt a file using password-protected ZIP (AES-256)
 */
export async function encryptFile(inputPath, password, progressCallback) {
  if (!password) throw new Error('Password is required for encryption');
  if (progressCallback) progressCallback(10, 'Preparing encryption...');

  const outputDir = path.join('processed', `encrypted-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const originalName = path.basename(inputPath);
  const outputFilename = `${originalName}.zip`;
  const outputPath = path.join(outputDir, outputFilename);

  if (progressCallback) progressCallback(30, 'Encrypting with AES-256...');

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver.create('zip-encrypted', {
      zlib: { level: 9 },
      encryptionMethod: 'aes256',
      password: password
    });

    output.on('close', () => {
      if (progressCallback) progressCallback(100, 'Encryption completed!');
      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      resolve({
        success: true,
        filename: outputFilename,
        path: outputPath,
        size: outputStats.size,
        originalSize: inputStats.size,
        algorithm: 'AES-256 (ZIP)'
      });
    });

    output.on('error', (err) => reject(new Error(`Failed to write encrypted file: ${err.message}`)));
    archive.on('error', (err) => reject(new Error(`Encryption failed: ${err.message}`)));
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });

    archive.pipe(output);
    if (progressCallback) progressCallback(50, 'Adding file to encrypted archive...');
    archive.file(inputPath, { name: originalName });
    if (progressCallback) progressCallback(70, 'Finalizing encryption...');
    archive.finalize();
  });
}

/**
 * Decrypt a password-protected AES-256 ZIP file using 7-Zip.
 * The `unzipper` npm package cannot handle AES-256 encrypted ZIPs;
 * 7-Zip handles them natively.
 */
export async function decryptFile(inputPath, password, progressCallback) {
  if (!password) throw new Error('Password is required for decryption');
  if (progressCallback) progressCallback(10, 'Reading encrypted file...');

  const outputDir = path.join('processed', `decrypted-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });

  if (progressCallback) progressCallback(30, 'Decrypting with 7-Zip...');

  // Resolve 7zip binary path
  let sevenZipBin;
  try {
    const sevenZipModule = await import('7zip-bin');
    sevenZipBin = sevenZipModule.path7za || sevenZipModule.default;
  } catch {
    throw new Error('7-Zip binary not found. Please ensure 7zip-bin is installed.');
  }

  // Use 7z e (extract) with -o (output dir) and -p (password)
  const absInput = path.resolve(inputPath);
  const absOutput = path.resolve(outputDir);

  try {
    await execFileAsync(sevenZipBin, [
      'e',                    // extract (flat, no dir structure)
      absInput,               // input file
      `-p${password}`,        // password — no space between -p and value
      `-o${absOutput}`,       // output directory
      '-y',                   // yes to all prompts
    ]);
  } catch (err) {
    // 7z exits with code 2 on wrong password / corrupt archive
    const msg = (err.stderr || err.message || '').toLowerCase();
    if (msg.includes('wrong password') || msg.includes('cannot open encrypted')
      || (err.code === 2 && !msg.includes('warning'))) {
      throw new Error('WRONG_PASSWORD: Incorrect password or corrupted encrypted file');
    }
    throw new Error(`Decryption failed: ${err.stderr || err.message}`);
  }

  if (progressCallback) progressCallback(80, 'Locating decrypted file...');

  // Find the extracted file(s) in the output directory
  const extractedEntries = fs.readdirSync(outputDir);
  if (extractedEntries.length === 0) {
    throw new Error('WRONG_PASSWORD: No files were extracted — password may be incorrect');
  }

  // If multiple files, pick the first non-hidden one
  const extractedName = extractedEntries.find(n => !n.startsWith('.')) || extractedEntries[0];
  const extractedPath = path.join(outputDir, extractedName);

  const encryptedStats = fs.statSync(inputPath);
  const decryptedStats = fs.statSync(extractedPath);

  if (progressCallback) progressCallback(100, 'Decryption completed!');

  return {
    success: true,
    filename: extractedName,
    path: extractedPath,
    size: decryptedStats.size,
    encryptedSize: encryptedStats.size,
  };
}
