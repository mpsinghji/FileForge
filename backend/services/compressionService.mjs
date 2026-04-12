import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { execa } from 'execa';
import sevenBin from '7zip-bin';

import { getUniqueFilename } from '../utils/fileUtils.mjs';

// Configure ffmpeg path
import ffmpegStatic from 'ffmpeg-static';
ffmpeg.setFfmpegPath(ffmpegStatic);

// Disable sharp cache
sharp.cache(false);

export async function compressFile(inputPath, compressionLevel = 'medium', preserveQuality = true, removeMetadata = false, originalFilename, progressCallback) {
  const startTime = Date.now();
  const inputExt = path.extname(inputPath).toLowerCase();

  // Use original filename if provided, otherwise derive from input path
  const baseName = originalFilename ? path.parse(originalFilename).name : path.parse(inputPath).name;
  const desiredFilename = `${baseName}${inputExt}`;

  // Ensure output directory exists
  if (!fs.existsSync('processed')) {
    fs.mkdirSync('processed');
  }

  const outputFilename = getUniqueFilename('processed', desiredFilename);
  const outputPath = path.join('processed', outputFilename);

  try {
    // Determine file type and compression method
    const fileType = getFileType(inputExt);

    if (progressCallback) progressCallback(10, 'Analyzing file for compression...');

    let result;

    switch (fileType) {
      case 'image':
        result = await compressImage(inputPath, outputPath, compressionLevel, preserveQuality, removeMetadata, progressCallback);
        break;
      case 'video':
        result = await compressVideo(inputPath, outputPath, compressionLevel, preserveQuality, progressCallback);
        break;
      case 'audio':
        result = await compressAudio(inputPath, outputPath, compressionLevel, progressCallback);
        break;
    case 'document':
        result = await compressDocument(inputPath, outputPath, compressionLevel, inputExt, progressCallback);
        break;
      case 'archive':
        // Already-compressed archives: re-archiving won't shrink them noticeably
        // Copy the file with a clear message rather than pretending to compress it
        result = await compressArchive(inputPath, outputPath, compressionLevel, progressCallback);
        break;
      default:
        throw new Error(`Unsupported file type for compression: ${inputExt}`);
    }

    const processingTime = (Date.now() - startTime) / 1000;
    const outputStats = fs.statSync(outputPath);

    return {
      filename: outputFilename,
      path: outputPath,
      size: outputStats.size,
      processingTime,
      originalSize: fs.statSync(inputPath).size,
      compressionRatio: Math.round(((fs.statSync(inputPath).size - outputStats.size) / fs.statSync(inputPath).size) * 100)
    };

  } catch (error) {
    // Clean up output file if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    throw error;
  }
}

async function compressImage(inputPath, outputPath, compressionLevel, preserveQuality, removeMetadata, progressCallback) {
  if (progressCallback) progressCallback(20, 'Loading image for compression...');

  const sharpInstance = sharp(inputPath);

  // Remove metadata if requested
  if (removeMetadata) {
    sharpInstance.withMetadata(false);
  }

  // Apply compression settings based on level
  const compressionSettings = getImageCompressionSettings(compressionLevel, preserveQuality);

  // Get original image info
  const imageInfo = await sharpInstance.metadata();
  const originalFormat = imageInfo.format;

  // Choose output format based on best compression
  let outputFormat = originalFormat;
  if (compressionLevel === 'extreme' && originalFormat !== 'webp') {
    outputFormat = 'webp'; // WebP provides best compression
  } else if (compressionLevel === 'high' && originalFormat === 'png') {
    outputFormat = 'jpeg'; // JPEG for high compression of PNG
  }

  if (progressCallback) progressCallback(40, `Compressing image using ${outputFormat} format...`);

  switch (outputFormat) {
    case 'jpeg':
    case 'jpg':
      await sharpInstance
        .jpeg({
          quality: compressionSettings.jpegQuality,
          progressive: true,
          mozjpeg: compressionSettings.useMozjpeg
        })
        .toFile(outputPath);
      break;
    case 'png':
      await sharpInstance
        .png({
          compressionLevel: compressionSettings.pngCompression,
          progressive: true,
          adaptiveFiltering: true
        })
        .toFile(outputPath);
      break;
    case 'webp':
      await sharpInstance
        .webp({
          quality: compressionSettings.webpQuality,
          effort: compressionSettings.webpEffort,
          nearLossless: compressionSettings.nearLossless
        })
        .toFile(outputPath);
      break;
    default:
      // For other formats, use the original format with compression
      await sharpInstance.toFile(outputPath);
  }

  if (progressCallback) progressCallback(100, 'Image compression completed');
}

async function compressVideo(inputPath, outputPath, compressionLevel, preserveQuality, progressCallback) {
  return new Promise((resolve, reject) => {
    if (progressCallback) progressCallback(20, 'Initializing video compression...');

    const compressionSettings = getVideoCompressionSettings(compressionLevel, preserveQuality);

    let command = ffmpeg(inputPath)
      .outputOptions(compressionSettings.outputOptions)
      .output(outputPath);

    command.on('progress', (progress) => {
      if (progressCallback) {
        const percent = Math.min(90, 20 + (progress.percent || 0) * 0.7);
        progressCallback(percent, `Compressing video: ${Math.round(progress.percent || 0)}%`);
      }
    });

    command.on('end', () => {
      if (progressCallback) progressCallback(100, 'Video compression completed');
      resolve();
    });

    command.on('error', (err) => {
      reject(new Error(`Video compression failed: ${err.message}`));
    });

    command.run();
  });
}

async function compressAudio(inputPath, outputPath, compressionLevel, progressCallback) {
  return new Promise((resolve, reject) => {
    if (progressCallback) progressCallback(20, 'Initializing audio compression...');

    const compressionSettings = getAudioCompressionSettings(compressionLevel);

    let command = ffmpeg(inputPath)
      .outputOptions(compressionSettings.outputOptions)
      .output(outputPath);

    command.on('progress', (progress) => {
      if (progressCallback) {
        const percent = Math.min(90, 20 + (progress.percent || 0) * 0.7);
        progressCallback(percent, `Compressing audio: ${Math.round(progress.percent || 0)}%`);
      }
    });

    command.on('end', () => {
      if (progressCallback) progressCallback(100, 'Audio compression completed');
      resolve();
    });

    command.on('error', (err) => {
      reject(new Error(`Audio compression failed: ${err.message}`));
    });

    command.run();
  });
}

async function compressDocument(inputPath, outputPath, compressionLevel, inputExt, progressCallback) {
  if (progressCallback) progressCallback(30, 'Compressing document...');

  const ext = inputExt || path.extname(inputPath).toLowerCase();

  if (ext === '.pdf') {
    // For PDFs, use Ghostscript (best quality), fall back to pdf-lib
    await compressPdf(inputPath, outputPath, compressionLevel, progressCallback);
  } else if (['.docx', '.pptx', '.odt', '.xlsx'].includes(ext)) {
    // These are already ZIP-based formats; re-deflate with maximum compression
    await recompressZipBased(inputPath, outputPath, compressionLevel, progressCallback);
  } else {
    // Plain text, CSV, HTML, JSON, XML, Markdown etc. — deflate into a ZIP
    await createCompressedArchive(inputPath, outputPath, compressionLevel, progressCallback);
  }

  if (progressCallback) progressCallback(100, 'Document compression completed');
}

async function compressArchive(inputPath, outputPath, compressionLevel, progressCallback) {
  return new Promise((resolve, reject) => {
    if (progressCallback) progressCallback(30, 'Recompressing archive...');

    // For archives, we'll recompress with different settings
    const compressionSettings = getArchiveCompressionSettings(compressionLevel);

    // Create a new archive with higher compression
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: compressionSettings.compressionLevel }
    });

    output.on('close', () => {
      if (progressCallback) progressCallback(100, 'Archive compression completed');
      resolve();
    });

    archive.on('error', (err) => {
      reject(new Error(`Archive compression failed: ${err.message}`));
    });

    archive.pipe(output);

    // We'll create a simple recompressed version
    archive.append(fs.createReadStream(inputPath), { name: path.basename(inputPath) });
    archive.finalize();
  });
}

// Helper functions
function getFileType(extension) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.heic', '.heif', '.avif'];
  const videoExts = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.opus', '.wma'];
  const documentExts = ['.pdf', '.docx', '.doc', '.txt', '.rtf', '.odt', '.pptx', '.md', '.csv', '.html', '.htm', '.xml', '.json'];
  const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz'];

  if (imageExts.includes(extension)) return 'image';
  if (videoExts.includes(extension)) return 'video';
  if (audioExts.includes(extension)) return 'audio';
  if (documentExts.includes(extension)) return 'document';
  if (archiveExts.includes(extension)) return 'archive';

  return 'unknown';
}

function getImageCompressionSettings(compressionLevel, preserveQuality) {
  switch (compressionLevel) {
    case 'light':
      return {
        jpegQuality: preserveQuality ? 85 : 75,
        pngCompression: 3,
        webpQuality: preserveQuality ? 85 : 75,
        webpEffort: 3,
        nearLossless: false,
        useMozjpeg: false
      };
    case 'medium':
      return {
        jpegQuality: preserveQuality ? 75 : 65,
        pngCompression: 5,
        webpQuality: preserveQuality ? 75 : 65,
        webpEffort: 4,
        nearLossless: false,
        useMozjpeg: true
      };
    case 'high':
      return {
        jpegQuality: preserveQuality ? 65 : 55,
        pngCompression: 7,
        webpQuality: preserveQuality ? 65 : 55,
        webpEffort: 5,
        nearLossless: false,
        useMozjpeg: true
      };
    case 'extreme':
      return {
        jpegQuality: preserveQuality ? 50 : 40,
        pngCompression: 9,
        webpQuality: preserveQuality ? 50 : 40,
        webpEffort: 6,
        nearLossless: true,
        useMozjpeg: true
      };
    default:
      return getImageCompressionSettings('medium', preserveQuality);
  }
}

function getVideoCompressionSettings(compressionLevel, preserveQuality) {
  switch (compressionLevel) {
    case 'light':
      return {
        outputOptions: [
          '-c:v libx264',
          '-preset fast',
          '-crf 25',
          '-c:a aac',
          '-b:a 160k'
        ]
      };
    case 'medium':
      return {
        outputOptions: [
          '-c:v libx264',
          '-preset medium',
          '-crf 28',
          '-c:a aac',
          '-b:a 128k'
        ]
      };
    case 'high':
      return {
        outputOptions: [
          '-c:v libx264',
          '-preset slow',
          '-crf 32',
          '-c:a aac',
          '-b:a 96k'
        ]
      };
    case 'extreme':
      return {
        outputOptions: [
          '-c:v libx264',
          '-preset veryslow',
          '-crf 35',
          '-c:a aac',
          '-b:a 64k'
        ]
      };
    default:
      return getVideoCompressionSettings('medium', preserveQuality);
  }
}

function getAudioCompressionSettings(compressionLevel) {
  switch (compressionLevel) {
    case 'light':
      return {
        outputOptions: [
          '-c:a mp3',
          '-b:a 192k'
        ]
      };
    case 'medium':
      return {
        outputOptions: [
          '-c:a mp3',
          '-b:a 128k'
        ]
      };
    case 'high':
      return {
        outputOptions: [
          '-c:a mp3',
          '-b:a 96k'
        ]
      };
    case 'extreme':
      return {
        outputOptions: [
          '-c:a mp3',
          '-b:a 64k'
        ]
      };
    default:
      return getAudioCompressionSettings('medium');
  }
}

function getArchiveCompressionSettings(compressionLevel) {
  switch (compressionLevel) {
    case 'light':
      return { compressionLevel: 3 };
    case 'medium':
      return { compressionLevel: 6 };
    case 'high':
      return { compressionLevel: 8 };
    case 'extreme':
      return { compressionLevel: 9 };
    default:
      return { compressionLevel: 6 };
  }
}

async function compressPdf(inputPath, outputPath, compressionLevel, progressCallback) {
  if (progressCallback) progressCallback(50, 'Compressing PDF with Ghostscript...');

  // Map compression levels to Ghostscript settings
  const gsSettings = {
    'light': '/screen',      // 72 dpi - lowest quality, smallest size
    'medium': '/ebook',      // 150 dpi - medium quality
    'high': '/printer',      // 300 dpi - high quality
    'extreme': '/screen'     // 72 dpi - maximum compression
  };

  const setting = gsSettings[compressionLevel] || '/ebook';

  try {
    // Use Ghostscript to compress PDF
    const { execa } = await import('execa');
    
    const gsCommand = 'gswin64c'; // Windows Ghostscript command
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${setting}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    await execa(gsCommand, args);
    
    if (progressCallback) progressCallback(100, 'PDF compression completed');
  } catch (error) {
    console.error('[PDF COMPRESS] Ghostscript error:', error);
    
    // Fallback: If Ghostscript not available, use pdf-lib for basic compression
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Save with compression
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 50
      });
      
      fs.writeFileSync(outputPath, compressedBytes);
      
      if (progressCallback) progressCallback(100, 'PDF compression completed (fallback method)');
    } catch (fallbackError) {
      console.error('[PDF COMPRESS] Fallback error:', fallbackError);
      // Last resort: just copy the file
      fs.copyFileSync(inputPath, outputPath);
      if (progressCallback) progressCallback(100, 'PDF copied (compression not available)');
    }
  }
}

async function createCompressedArchive(inputPath, outputPath, compressionLevel, progressCallback) {
  return new Promise((resolve, reject) => {
    if (progressCallback) progressCallback(50, 'Creating compressed archive...');

    const compressionSettings = getArchiveCompressionSettings(compressionLevel);

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: compressionSettings.compressionLevel }
    });

    output.on('close', () => {
      if (progressCallback) progressCallback(100, 'Archive created');
      resolve();
    });

    archive.on('error', (err) => {
      reject(new Error(`Archive creation failed: ${err.message}`));
    });

    archive.pipe(output);
    archive.append(fs.createReadStream(inputPath), { name: path.basename(inputPath) });
    archive.finalize();
  });
}

// Re-compress a ZIP-based Office document (DOCX/PPTX/XLSX/ODT) at maximum deflate level.
// These files are internally ZIPs created by Office apps with moderate compression.
// Re-deflating at level 9 typically saves 10-30%.
async function recompressZipBased(inputPath, outputPath, compressionLevel, progressCallback) {
  if (progressCallback) progressCallback(30, 'Re-compressing ZIP-based document...');

  const zlibLevel = getArchiveCompressionSettings(compressionLevel).compressionLevel;

  return new Promise((resolve, reject) => {
    const unzipper = require && false ? null : null; // use dynamic import below
    (async () => {
      try {
        const unzipperMod = await import('unzipper');
        const directory = await unzipperMod.Open.file(inputPath);

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: zlibLevel } });

        archive.on('error', (err) => reject(new Error(`Re-compress failed: ${err.message}`)));
        output.on('close', () => {
          if (progressCallback) progressCallback(100, 'Document recompression completed');
          resolve();
        });
        archive.pipe(output);

        for (const entry of directory.files) {
          if (entry.type === 'Directory') continue;
          const buf = await entry.buffer();
          archive.append(buf, { name: entry.path });
        }

        archive.finalize();
      } catch (err) {
        // Fallback: just create a plain archive wrapper
        console.warn('[COMPRESS] recompressZipBased failed, falling back:', err.message);
        try {
          await createCompressedArchive(inputPath, outputPath, compressionLevel, progressCallback);
          resolve();
        } catch (fallback) {
          reject(fallback);
        }
      }
    })();
  });
}


export async function createArchiveFromFiles(inputPaths, outputFormat = 'zip', compressionLevel = 'medium', archiveName = null, password = null, progressCallback) {
  if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
    throw new Error('No input files provided for archiving');
  }

  const startTime = Date.now();
  const outBase = archiveName || `${uuidv4()}-${Date.now()}`;
  const ext = outputFormat.toLowerCase() === '7z' ? '7z' : 'zip';
  const outputPath = path.join('processed', `${outBase}.${ext}`);

  if (!fs.existsSync('processed')) fs.mkdirSync('processed', { recursive: true });

  const sevenPath = sevenBin.path7za;
  const args = ['a', outputPath, ...inputPaths];
  const levelMap = { light: '1', medium: '5', high: '7', extreme: '9' };
  const lvl = levelMap[compressionLevel] || '5';
  args.push(`-mx=${lvl}`);
  if (ext === '7z') {
    args.push('-t7z');
  } else {
    args.push('-tzip');
  }
  if (password) {
    args.push(`-p${password}`);
    if (ext === '7z') {
      args.push('-mhe=on');
    }
  }

  if (progressCallback) progressCallback(20, 'Creating archive...');
  try {
    await execa(sevenPath, args);
    if (progressCallback) progressCallback(100, 'Archive created');
    const size = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
    return { filename: path.basename(outputPath), path: outputPath, size, processingTime: (Date.now() - startTime) / 1000 };
  } catch (err) {
    throw new Error(`Archive creation failed: ${err.shortMessage || err.message}`);
  }
}

export function estimateConvertedSize(bytes, kind = 'video', quality = 'medium') {
  const map = {
    image: { low: 0.35, medium: 0.55, high: 0.75 },
    audio: { low: 0.4, medium: 0.6, high: 0.8 },
    video: { low: 0.2, medium: 0.4, high: 0.6 },
    document: { low: 0.6, medium: 0.8, high: 1.0 }
  };
  const q = ['low', 'medium', 'high'].includes(quality) ? quality : 'medium';
  const k = map[kind] ? kind : 'document';
  return Math.max(1024, Math.floor(bytes * map[k][q]));
}
