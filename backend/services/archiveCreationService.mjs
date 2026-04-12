import fs from 'fs';
import path from 'path';
import archiver from './archiverSetup.mjs';

/**
 * Create an archive from multiple files using Node.js archiver library
 * Supports password protection without external software
 * @param {string[]} filePaths - Array of file paths to archive
 * @param {object} options - Archive options
 * @returns {Promise<object>} - Result with archive path
 */
export async function createArchive(filePaths, options = {}, progressCallback) {
  const {
    format = 'zip',
    password = null,
    compressionLevel = 5,
    archiveName = `archive-${Date.now()}`
  } = options;

  if (progressCallback) progressCallback(10, 'Preparing archive creation...');

  // Validate format
  const validFormats = ['zip'];
  if (!validFormats.includes(format)) {
    throw new Error(`Invalid format: ${format}. Supported: ${validFormats.join(', ')}`);
  }

  // Create output directory
  const outputDir = path.join('processed', `archive-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFilename = `${archiveName}.${format}`;
  const outputPath = path.join(outputDir, outputFilename);

  if (progressCallback) progressCallback(20, 'Creating archive...');

  return new Promise((resolve, reject) => {
    // Create output stream
    const output = fs.createWriteStream(outputPath);
    
    // Create archiver instance - use encrypted version if password provided
    let archive;
    if (password) {
      console.log(`[ARCHIVE CREATE] Creating PASSWORD-PROTECTED archive with password: ${password ? '***' : 'none'}`);
      archive = archiver.create('zip-encrypted', {
        zlib: { level: compressionLevel },
        encryptionMethod: 'aes256',
        password: password
      });
      console.log('[ARCHIVE CREATE] Using archiver-zip-encrypted with AES-256');
    } else {
      console.log('[ARCHIVE CREATE] Creating UNPROTECTED archive (no password)');
      archive = archiver(format, {
        zlib: { level: compressionLevel },
        store: compressionLevel === 0
      });
    }

    // Listen for archive events
    output.on('close', () => {
      if (progressCallback) progressCallback(100, 'Archive created successfully!');
      
      const stats = fs.statSync(outputPath);
      resolve({
        success: true,
        filename: outputFilename,
        path: outputPath,
        size: stats.size,
        format: format,
        filesCount: filePaths.length,
        isPasswordProtected: !!password,
        compressionLevel: compressionLevel
      });
    });

    output.on('error', (err) => {
      console.error('[ARCHIVE CREATE] Output stream error:', err);
      reject(new Error(`Failed to write archive: ${err.message}`));
    });

    archive.on('error', (err) => {
      console.error('[ARCHIVE CREATE] Archive error:', err);
      reject(new Error(`Failed to create archive: ${err.message}`));
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('[ARCHIVE CREATE] Warning:', err);
      } else {
        console.error('[ARCHIVE CREATE] Warning (treating as error):', err);
        reject(err);
      }
    });

    // Pipe archive data to the file
    archive.pipe(output);

    if (progressCallback) progressCallback(30, 'Adding files to archive...');

    // Add files to archive
    let filesAdded = 0;
    filePaths.forEach((filePath, index) => {
      try {
        if (!fs.existsSync(filePath)) {
          console.error(`[ARCHIVE CREATE] File not found: ${filePath}`);
          return;
        }
        
        const fileName = path.basename(filePath);
        archive.file(filePath, { name: fileName });
        filesAdded++;
        
        const progress = 30 + Math.floor((filesAdded / filePaths.length) * 50);
        if (progressCallback) progressCallback(progress, `Added ${fileName}`);
        
        console.log(`[ARCHIVE CREATE] Added file: ${fileName}`);
      } catch (err) {
        console.error(`[ARCHIVE CREATE] Failed to add file ${filePath}:`, err);
      }
    });

    if (filesAdded === 0) {
      reject(new Error('No files were added to the archive'));
      return;
    }

    if (progressCallback) progressCallback(80, 'Finalizing archive...');

    console.log(`[ARCHIVE CREATE] Finalizing archive with ${filesAdded} files${password ? ' (password-protected)' : ''}`);

    // Finalize the archive
    archive.finalize();
  });
}

/**
 * Get available compression levels
 */
export function getCompressionLevels() {
  return [
    { value: 0, label: 'Store', description: 'No compression, fastest' },
    { value: 1, label: 'Fastest', description: 'Minimal compression' },
    { value: 3, label: 'Fast', description: 'Quick compression' },
    { value: 5, label: 'Normal', description: 'Balanced speed and size' },
    { value: 7, label: 'Maximum', description: 'Better compression' },
    { value: 9, label: 'Ultra', description: 'Best compression, slowest' }
  ];
}

/**
 * Get supported archive formats
 */
export function getSupportedFormats() {
  return [
    { value: 'zip', label: 'ZIP', description: 'Universal format, widely supported', icon: '📦' }
  ];
}
