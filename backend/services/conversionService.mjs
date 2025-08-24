import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromFile } from 'file-type';

// Configure ffmpeg path
import ffmpegStatic from 'ffmpeg-static';
ffmpeg.setFfmpegPath(ffmpegStatic);

export async function convertFile(inputPath, targetFormat, progressCallback) {
  console.log('convertFile called with:');
  console.log('inputPath:', inputPath);
  console.log('targetFormat:', targetFormat);
  
  const startTime = Date.now();
  const inputExt = path.extname(inputPath).toLowerCase();
  
  const outputFilename = `${uuidv4()}-${Date.now()}.${targetFormat.toLowerCase()}`;
  const outputPath = path.join('processed', outputFilename);
  
  console.log('Filename generation:');
  console.log('Input extension:', inputExt);
  console.log('Target format:', targetFormat);
  console.log('Generated filename:', outputFilename);
  console.log('Full output path:', outputPath);

  console.log('Output details:');
  console.log('inputExt:', inputExt);
  console.log('outputFilename:', outputFilename);
  console.log('outputPath:', outputPath);

  try {
    // Determine file type and conversion method
    const fileType = getFileType(inputExt);
    console.log('Detected file type:', fileType);
    
    if (progressCallback) progressCallback(10, 'Analyzing file type...');

    let result;
    
    switch (fileType) {
      case 'image':
        result = await convertImage(inputPath, outputPath, targetFormat, progressCallback);
        break;
      case 'video':
        result = await convertVideo(inputPath, outputPath, targetFormat, progressCallback);
        break;
      case 'audio':
        result = await convertAudio(inputPath, outputPath, targetFormat, progressCallback);
        break;
      case 'document':
        result = await convertDocument(inputPath, outputPath, targetFormat, progressCallback);
        break;
      default:
        throw new Error(`Unsupported file type for conversion: ${inputExt}`);
    }
    
    console.log('Conversion result received:', result);
    console.log('Result type:', typeof result);
    console.log('Result keys:', result ? Object.keys(result) : 'undefined');

    const processingTime = (Date.now() - startTime) / 1000;
    
    const actualOutputPath = outputPath;
    const expectedExtension = `.${targetFormat.toLowerCase()}`;
    const actualExtension = path.extname(actualOutputPath).toLowerCase();
    
    console.log('Final conversion result:');
    console.log('Expected output path:', outputPath);
    console.log('Expected extension:', expectedExtension);
    console.log('Actual extension:', actualExtension);
    console.log('File exists:', fs.existsSync(actualOutputPath));
    
    let finalStats;
    if (fs.existsSync(actualOutputPath)) {
      finalStats = fs.statSync(actualOutputPath);
      console.log('File size:', finalStats.size);
      console.log('Target format requested:', targetFormat);
      
      // If the extension doesn't match, rename the file
      if (actualExtension !== expectedExtension) {
        console.log('WARNING: Extension mismatch! Renaming file...');
        const correctedPath = outputPath.replace(actualExtension, expectedExtension);
        fs.renameSync(actualOutputPath, correctedPath);
        console.log('File renamed to:', correctedPath);
        
        outputPath = correctedPath;
        finalStats = fs.statSync(outputPath);
        console.log('Updated file size after renaming:', finalStats.size);
      }
    }

    return {
      filename: outputFilename,
      path: outputPath,
      size: finalStats ? finalStats.size : 0,
      processingTime,
      originalFormat: inputExt.substring(1),
      targetFormat
    };

  } catch (error) {
    // Clean up output file if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    throw error;
  }
}

async function convertImage(inputPath, outputPath, targetFormat, progressCallback) {
  console.log('convertImage called with:');
  console.log('inputPath:', inputPath);
  console.log('outputPath:', outputPath);
  console.log('targetFormat:', targetFormat);
  
  if (progressCallback) progressCallback(20, 'Loading image...');

  const sharpInstance = sharp(inputPath);
  const qualitySettings = getQualitySettings('high');
  
  // CRITICAL: Force Sharp to convert to the target format by using format-specific methods
  console.log('Processing targetFormat:', targetFormat.toLowerCase());
  console.log('Sharp instance created for:', inputPath);
  
  let result;
  
  switch (targetFormat.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      console.log('Converting to JPG format');
      console.log('Output path before conversion:', outputPath);
      result = await sharpInstance
        .removeAlpha() // Remove alpha channel for JPG
        .jpeg({ quality: qualitySettings.jpegQuality, progressive: true })
        .toBuffer();
      fs.writeFileSync(outputPath, result);
      console.log('JPG conversion completed');
      console.log('Output path after conversion:', outputPath);
      console.log('File exists after conversion:', fs.existsSync(outputPath));
      if (fs.existsSync(outputPath)) {
        console.log('File size after conversion:', fs.statSync(outputPath).size);
        console.log('File extension check:', path.extname(outputPath));
        console.log('File MIME type check:', await getMimeType(outputPath));
        
        // Verify conversion actually happened
        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = fs.readFileSync(outputPath);
        console.log('Input file size:', inputBuffer.length);
        console.log('Output file size:', outputBuffer.length);
        console.log('Files are different:', !inputBuffer.equals(outputBuffer));
      }
      break;
    case 'png':
      console.log('Converting to PNG format');
      console.log('Output path before conversion:', outputPath);
      result = await sharpInstance
        .ensureAlpha() // Ensure alpha channel for PNG
        .png({ compressionLevel: qualitySettings.pngCompression, progressive: true })
        .toBuffer();
      fs.writeFileSync(outputPath, result);
      console.log('PNG conversion completed');
      console.log('Output path after conversion:', outputPath);
      console.log('File exists after conversion:', fs.existsSync(outputPath));
      if (fs.existsSync(outputPath)) {
        console.log('File size after conversion:', fs.statSync(outputPath).size);
        console.log('File extension check:', path.extname(outputPath));
        console.log('File MIME type check:', await getMimeType(outputPath));
        
        // Verify conversion actually happened
        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = fs.readFileSync(outputPath);
        console.log('Input file size:', inputBuffer.length);
        console.log('Output file size:', outputBuffer.length);
        console.log('Files are different:', !inputBuffer.equals(outputBuffer));
      }
      break;
    case 'webp':
      console.log('Converting to WebP format');
      console.log('Output path before conversion:', outputPath);
      result = await sharpInstance
        .webp({ quality: qualitySettings.webpQuality, effort: qualitySettings.webpEffort })
        .toBuffer();
      fs.writeFileSync(outputPath, result);
      console.log('WebP conversion completed');
      console.log('Output path after conversion:', outputPath);
      console.log('File exists after conversion:', fs.existsSync(outputPath));
      if (fs.existsSync(outputPath)) {
        console.log('File size after conversion:', fs.statSync(outputPath).size);
        console.log('File extension check:', path.extname(outputPath));
        console.log('File MIME type check:', await getMimeType(outputPath));
        
        // Verify conversion actually happened
        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = fs.readFileSync(outputPath);
        console.log('Input file size:', inputBuffer.length);
        console.log('Output file size:', outputBuffer.length);
        console.log('Files are different:', !inputBuffer.equals(outputBuffer));
      }
      break;
    case 'gif':
      console.log('Converting to GIF format');
      console.log('Output path before conversion:', outputPath);
      result = await sharpInstance
        .gif()
        .toBuffer();
      fs.writeFileSync(outputPath, result);
      console.log('GIF conversion completed');
      console.log('Output path after conversion:', outputPath);
      console.log('File exists after conversion:', fs.existsSync(outputPath));
      if (fs.existsSync(outputPath)) {
        console.log('File size after conversion:', fs.statSync(outputPath).size);
        console.log('File extension check:', path.extname(outputPath));
        console.log('File MIME type check:', await getMimeType(outputPath));
        
        // Verify conversion actually happened
        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = fs.readFileSync(outputPath);
        console.log('Input file size:', inputBuffer.length);
        console.log('Output file size:', outputBuffer.length);
        console.log('Files are different:', !inputBuffer.equals(outputBuffer));
      }
      break;

    case 'tiff':
      console.log('Converting to TIFF format');
      console.log('Output path before conversion:', outputPath);
      result = await sharpInstance
        .tiff({ compression: 'lzw', quality: qualitySettings.tiffQuality })
        .toBuffer();
      fs.writeFileSync(outputPath, result);
      console.log('TIFF conversion completed');
      console.log('Output path after conversion:', outputPath);
      console.log('File exists after conversion:', fs.existsSync(outputPath));
      if (fs.existsSync(outputPath)) {
        console.log('File size after conversion:', fs.statSync(outputPath).size);
        console.log('File extension check:', path.extname(outputPath));
        console.log('File MIME type check:', await getMimeType(outputPath));
        
        // Verify conversion actually happened
        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = fs.readFileSync(outputPath);
        console.log('Input file size:', inputBuffer.length);
        console.log('Output file size:', outputBuffer.length);
        console.log('Files are different:', !inputBuffer.equals(outputBuffer));
      }
      break;
    default:
      throw new Error(`Unsupported image format: ${targetFormat}`);
  }

  if (progressCallback) progressCallback(100, 'Image conversion completed');
  
  // Return the conversion result
  return {
    success: true,
    outputPath: outputPath,
    outputSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0
  };
}

async function convertVideo(inputPath, outputPath, targetFormat, progressCallback) {
  return new Promise((resolve, reject) => {
    if (progressCallback) progressCallback(20, 'Initializing video conversion...');

    const qualitySettings = getVideoQualitySettings('high');
    
    let command = ffmpeg(inputPath)
      .outputOptions(qualitySettings.outputOptions)
      .output(outputPath);

    command.on('progress', (progress) => {
      if (progressCallback) {
        const percent = Math.min(90, 20 + (progress.percent || 0) * 0.7);
        progressCallback(percent, `Converting video: ${Math.round(progress.percent || 0)}%`);
      }
    });

    command.on('end', () => {
      if (progressCallback) progressCallback(100, 'Video conversion completed');
      resolve({
        success: true,
        outputPath: outputPath,
        outputSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0
      });
    });

    command.on('error', (err) => {
      reject(new Error(`Video conversion failed: ${err.message}`));
    });

    command.run();
  });
}

async function convertAudio(inputPath, outputPath, targetFormat, progressCallback) {
  return new Promise((resolve, reject) => {
    if (progressCallback) progressCallback(20, 'Initializing audio conversion...');

    const qualitySettings = getAudioQualitySettings('high');
    
    let command = ffmpeg(inputPath)
      .outputOptions(qualitySettings.outputOptions)
      .output(outputPath);

    command.on('progress', (progress) => {
      if (progressCallback) {
        const percent = Math.min(90, 20 + (progress.percent || 0) * 0.7);
        progressCallback(percent, `Converting audio: ${Math.round(progress.percent || 0)}%`);
      }
    });

    command.on('end', () => {
      if (progressCallback) progressCallback(100, 'Audio conversion completed');
      resolve({
        success: true,
        outputPath: outputPath,
        outputSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0
      });
    });

    command.on('error', (err) => {
      reject(new Error(`Audio conversion failed: ${err.message}`));
    });

    command.run();
  });
}

async function convertDocument(inputPath, outputPath, targetFormat, progressCallback) {
  if (progressCallback) progressCallback(20, 'Processing document...');

  const inputExt = path.extname(inputPath).toLowerCase();
  
  // Handle PDF to image conversions
  if (inputExt === '.pdf' && ['jpg', 'jpeg', 'png', 'webp', 'tiff'].includes(targetFormat.toLowerCase())) {
    console.log('Converting PDF to image format:', targetFormat);
    await convertPdfToImage(inputPath, outputPath, targetFormat, progressCallback);
  } else if (inputExt === '.txt' && targetFormat === 'pdf') {
    // Convert text to PDF
    await convertTextToPdf(inputPath, outputPath, progressCallback);
  } else if (inputExt === '.pdf' && targetFormat === 'txt') {
    // Extract text from PDF
    await convertPdfToText(inputPath, outputPath, progressCallback);
  } else {
    // For other conversions, we'll create a simple placeholder
    await createPlaceholderDocument(inputPath, outputPath, targetFormat, progressCallback);
  }

  if (progressCallback) progressCallback(100, 'Document conversion completed');
  
  // Return the conversion result
  return {
    success: true,
    outputPath: outputPath,
    outputSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0
  };
}

// Helper function to get actual MIME type
async function getMimeType(filePath) {
  try {
    const fileType = await fileTypeFromFile(filePath);
    return fileType ? fileType.mime : 'unknown';
  } catch (error) {
    console.log('Error getting MIME type:', error.message);
    return 'unknown';
  }
}

// Helper functions
function getFileType(extension) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.webp'];
  const videoExts = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.aac', '.flac'];
  const documentExts = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];

  if (imageExts.includes(extension)) return 'image';
  if (videoExts.includes(extension)) return 'video';
  if (audioExts.includes(extension)) return 'audio';
  if (documentExts.includes(extension)) return 'document';
  
  return 'unknown';
}

function getQualitySettings(quality) {
  switch (quality) {
    case 'low':
      return {
        jpegQuality: 60,
        pngCompression: 6,
        webpQuality: 60,
        webpEffort: 2,
        tiffQuality: 60
      };
    case 'medium':
      return {
        jpegQuality: 80,
        pngCompression: 4,
        webpQuality: 80,
        webpEffort: 4,
        tiffQuality: 80
      };
    case 'high':
    default:
      return {
        jpegQuality: 95,
        pngCompression: 2,
        webpQuality: 95,
        webpEffort: 6,
        tiffQuality: 95
      };
  }
}

function getVideoQualitySettings(quality) {
  switch (quality) {
    case 'low':
      return {
        outputOptions: [
          '-c:v libx264',
          '-preset fast',
          '-crf 28',
          '-c:a aac',
          '-b:a 128k'
        ]
      };
    case 'medium':
      return {
        outputOptions: [
          '-c:v libx264',
          '-preset medium',
          '-crf 23',
          '-c:a aac',
          '-b:a 192k'
        ]
      };
    case 'high':
    default:
      return {
        outputOptions: [
          '-c:v libx264',
          '-preset slow',
          '-crf 18',
          '-c:a aac',
          '-b:a 256k'
        ]
      };
  }
}

function getAudioQualitySettings(quality) {
  switch (quality) {
    case 'low':
      return {
        outputOptions: [
          '-c:a mp3',
          '-b:a 128k'
        ]
      };
    case 'medium':
      return {
        outputOptions: [
          '-c:a mp3',
          '-b:a 192k'
        ]
      };
    case 'high':
    default:
      return {
        outputOptions: [
          '-c:a mp3',
          '-b:a 320k'
        ]
      };
  }
}

async function convertTextToPdf(inputPath, outputPath, progressCallback) {
  if (progressCallback) progressCallback(50, 'Converting text to PDF...');
  
  // Simple text to PDF conversion
  const text = fs.readFileSync(inputPath, 'utf8');
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${text.replace(/[()\\]/g, '\\$&')}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

  fs.writeFileSync(outputPath, pdfContent);
}

async function convertPdfToText(inputPath, outputPath, progressCallback) {
  if (progressCallback) progressCallback(50, 'Extracting text from PDF...');
  
  // For now, create a placeholder text file
  // In a real implementation, you'd use pdf-parse or similar
  const placeholderText = `Text extracted from PDF: ${path.basename(inputPath)}
  
This is a placeholder for PDF text extraction.
In a full implementation, this would contain the actual extracted text from the PDF file.`;
  
  fs.writeFileSync(outputPath, placeholderText);
}

async function convertPdfToImage(inputPath, outputPath, targetFormat, progressCallback) {
  if (progressCallback) progressCallback(30, 'Converting PDF to image...');
  
  try {
    // For now, create a placeholder image
    // In a full implementation, you'd use pdf2pic or similar library
    const placeholderImage = `Converted PDF: ${path.basename(inputPath)}
Target format: ${targetFormat}
Conversion completed at: ${new Date().toISOString()}

This is a placeholder image. In a full implementation, this would contain the actual PDF converted to ${targetFormat} format.`;
    
    // Create a simple text-based image representation
    fs.writeFileSync(outputPath, placeholderImage);
    
    if (progressCallback) progressCallback(80, 'PDF to image conversion completed');
  } catch (error) {
    throw new Error(`PDF to image conversion failed: ${error.message}`);
  }
}

async function createPlaceholderDocument(inputPath, outputPath, targetFormat, progressCallback) {
  if (progressCallback) progressCallback(50, `Creating ${targetFormat} document...`);
  
  const placeholderContent = `Converted document from: ${path.basename(inputPath)}
Target format: ${targetFormat}
Conversion completed at: ${new Date().toISOString()}

This is a placeholder document. In a full implementation, this would contain the properly converted content.`;
  
  fs.writeFileSync(outputPath, placeholderContent);
}
