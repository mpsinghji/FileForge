import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Encrypt a file using password-protected ZIP (AES-256)
 * @param {string} inputPath - Path to input file
 * @param {string} password - Encryption password
 * @param {function} progressCallback - Progress callback
 * @returns {Promise<object>} - Result with encrypted file path
 */
export async function encryptFile(inputPath, password, progressCallback) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  if (progressCallback) progressCallback(10, 'Preparing encryption...');
  
  const outputDir = path.join('processed', `encrypted-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  
  const originalName = path.basename(inputPath);
  const outputFilename = `${originalName}.zip`; // Use .zip extension
  const outputPath = path.join(outputDir, outputFilename);
  
  if (progressCallback) progressCallback(30, 'Encrypting with AES-256...');
  
  try {
    // Use 7-Zip to create password-protected ZIP with AES-256 encryption
    const command = `7z a -tzip -mem=AES256 -p${password} "${outputPath}" "${inputPath}"`;
    
    const { stdout, stderr } = await execPromise(command);
    console.log('[ENCRYPT] 7-Zip output:', stdout);
    
    if (stderr && !stderr.includes('Everything is Ok')) {
      console.warn('[ENCRYPT] 7-Zip warnings:', stderr);
    }
  } catch (error) {
    console.error('[ENCRYPT] 7-Zip error:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
  
  if (progressCallback) progressCallback(80, 'Verifying encrypted file...');
  
  if (!fs.existsSync(outputPath)) {
    throw new Error('Encryption failed - output file not found');
  }
  
  const inputStats = fs.statSync(inputPath);
  const outputStats = fs.statSync(outputPath);
  
  if (progressCallback) progressCallback(100, 'Encryption completed!');
  
  return {
    success: true,
    filename: outputFilename,
    path: outputPath,
    size: outputStats.size,
    originalSize: inputStats.size,
    algorithm: 'AES-256 (ZIP)'
  };
}

/**
 * Decrypt a password-protected ZIP file
 * @param {string} inputPath - Path to encrypted ZIP file
 * @param {string} password - Decryption password
 * @param {function} progressCallback - Progress callback
 * @returns {Promise<object>} - Result with decrypted file path
 */
export async function decryptFile(inputPath, password, progressCallback) {
  if (!password) {
    throw new Error('Password is required for decryption');
  }
  
  if (progressCallback) progressCallback(10, 'Reading encrypted file...');
  
  const outputDir = path.join('processed', `decrypted-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  
  if (progressCallback) progressCallback(30, 'Decrypting...');
  
  try {
    // Use 7-Zip to extract password-protected ZIP
    const command = `7z x -p${password} -o"${outputDir}" "${inputPath}" -y`;
    
    const { stdout, stderr } = await execPromise(command);
    console.log('[DECRYPT] 7-Zip output:', stdout);
    
    if (stderr && !stderr.includes('Everything is Ok')) {
      console.warn('[DECRYPT] 7-Zip warnings:', stderr);
    }
  } catch (error) {
    console.error('[DECRYPT] 7-Zip error:', error);
    
    // Check if it's a wrong password error
    if (error.message.includes('Wrong password') || error.message.includes('Can not open encrypted archive')) {
      throw new Error('WRONG_PASSWORD: Incorrect password or corrupted file');
    }
    
    throw new Error(`Decryption failed: ${error.message}`);
  }
  
  if (progressCallback) progressCallback(70, 'Extracting decrypted file...');
  
  // Find the extracted file
  const extractedFiles = fs.readdirSync(outputDir);
  
  if (extractedFiles.length === 0) {
    throw new Error('Decryption failed - no files extracted');
  }
  
  // Get the first extracted file (should be the original file)
  let originalFilename = extractedFiles[0];
  let extractedPath = path.join(outputDir, originalFilename);
  
  // If multiple files, they're in a subdirectory
  if (fs.statSync(extractedPath).isDirectory()) {
    const subFiles = fs.readdirSync(extractedPath);
    if (subFiles.length > 0) {
      originalFilename = subFiles[0];
      extractedPath = path.join(extractedPath, originalFilename);
    }
  }
  
  const encryptedStats = fs.statSync(inputPath);
  const decryptedStats = fs.statSync(extractedPath);
  
  if (progressCallback) progressCallback(100, 'Decryption completed!');
  
  return {
    success: true,
    filename: originalFilename,
    path: extractedPath,
    size: decryptedStats.size,
    encryptedSize: encryptedStats.size
  };
}
