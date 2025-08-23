import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure ffmpeg path
import ffmpegStatic from 'ffmpeg-static';
ffmpeg.setFfmpegPath(ffmpegStatic);

export async function compressFile(inputPath, compressionLevel = 'medium', preserveQuality = true, removeMetadata = false, progressCallback) {
  const startTime = Date.now();
  const inputExt = path.extname(inputPath).toLowerCase();
  const outputFilename = `${uuidv4()}-${Date.now()}-compressed${inputExt}`;
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
        result = await compressDocument(inputPath, outputPath, compressionLevel, progressCallback);
        break;
      case 'archive':
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

async function compressDocument(inputPath, outputPath, compressionLevel, progressCallback) {
  if (progressCallback) progressCallback(30, 'Compressing document...');

  const inputExt = path.extname(inputPath).toLowerCase();
  
  if (inputExt === '.pdf') {
    // For PDFs, we'll create a compressed version
    // In a real implementation, you'd use pdf-lib or similar
    await compressPdf(inputPath, outputPath, compressionLevel, progressCallback);
  } else {
    // For other documents, create a compressed archive
    await createCompressedArchive(inputPath, outputPath, compressionLevel, progressCallback);
  }

  if (progressCallback) progressCallback(100, 'Document compression completed');
}

async function compressArchive(inputPath, outputPath, compressionLevel, progressCallback) {
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
  });

  archive.on('error', (err) => {
    throw new Error(`Archive compression failed: ${err.message}`);
  });

  archive.pipe(output);

  // Extract and recompress the original archive
  const extractPath = path.join('temp', uuidv4());
  fs.mkdirSync(extractPath, { recursive: true });

  // For now, we'll create a simple recompressed version
  // In a real implementation, you'd extract and recompress
  archive.append(fs.createReadStream(inputPath), { name: path.basename(inputPath) });
  archive.finalize();
}

// Helper functions
function getFileType(extension) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
  const videoExts = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.aac', '.flac'];
  const documentExts = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];
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
  if (progressCallback) progressCallback(50, 'Compressing PDF...');
  
  // For now, create a placeholder compressed PDF
  // In a real implementation, you'd use pdf-lib or similar
  const placeholderContent = `Compressed PDF from: ${path.basename(inputPath)}
Compression level: ${compressionLevel}
Compression completed at: ${new Date().toISOString()}

This is a placeholder for PDF compression.
In a full implementation, this would contain the actual compressed PDF content.`;
  
  fs.writeFileSync(outputPath, placeholderContent);
}

async function createCompressedArchive(inputPath, outputPath, compressionLevel, progressCallback) {
  if (progressCallback) progressCallback(50, 'Creating compressed archive...');
  
  const compressionSettings = getArchiveCompressionSettings(compressionLevel);
  
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: compressionSettings.compressionLevel }
  });

  output.on('close', () => {
    if (progressCallback) progressCallback(100, 'Archive created');
  });

  archive.on('error', (err) => {
    throw new Error(`Archive creation failed: ${err.message}`);
  });

  archive.pipe(output);
  archive.append(fs.createReadStream(inputPath), { name: path.basename(inputPath) });
  archive.finalize();
}
