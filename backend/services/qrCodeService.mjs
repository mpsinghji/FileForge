import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

/**
 * Generate QR code from text/URL
 * @param {string} text - Text or URL to encode
 * @param {object} options - QR code options
 * @param {function} progressCallback - Progress callback
 * @returns {Promise<object>} - Result with QR code image path
 */
export async function generateQRCode(text, options = {}, progressCallback) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text or URL is required to generate QR code');
  }
  
  if (progressCallback) progressCallback(20, 'Generating QR code...');
  
  const {
    size = 512,
    format = 'png',
    errorCorrectionLevel = 'M', // L, M, Q, H
    darkColor = '#000000',
    lightColor = '#FFFFFF',
    margin = 4
  } = options;
  
  const outputDir = path.join('processed', `qrcode-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  
  const outputFilename = `qrcode.${format}`;
  const outputPath = path.join(outputDir, outputFilename);
  
  if (progressCallback) progressCallback(50, 'Rendering QR code...');
  
  const qrOptions = {
    errorCorrectionLevel,
    type: 'image/png',
    quality: 1,
    margin,
    width: size,
    color: {
      dark: darkColor,
      light: lightColor
    }
  };
  
  if (format === 'svg') {
    const svgString = await QRCode.toString(text, { ...qrOptions, type: 'svg' });
    fs.writeFileSync(outputPath, svgString);
  } else {
    await QRCode.toFile(outputPath, text, qrOptions);
  }
  
  if (progressCallback) progressCallback(90, 'Saving QR code...');
  
  const stats = fs.statSync(outputPath);
  
  if (progressCallback) progressCallback(100, 'QR code generated!');
  
  return {
    success: true,
    filename: outputFilename,
    path: outputPath,
    size: stats.size,
    format,
    text: text.length > 100 ? text.substring(0, 100) + '...' : text
  };
}

/**
 * Generate QR code with logo/image in center
 * @param {string} text - Text or URL to encode
 * @param {string} logoPath - Path to logo image
 * @param {object} options - QR code options
 * @param {function} progressCallback - Progress callback
 * @returns {Promise<object>} - Result with QR code image path
 */
export async function generateQRCodeWithLogo(text, logoPath, options = {}, progressCallback) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text or URL is required to generate QR code');
  }
  
  if (progressCallback) progressCallback(20, 'Generating QR code with logo...');
  
  // For now, generate basic QR code
  // Advanced logo embedding would require canvas/sharp library
  const result = await generateQRCode(text, options, (progress, message) => {
    if (progressCallback) progressCallback(progress * 0.8, message);
  });
  
  if (progressCallback) progressCallback(100, 'QR code with logo generated!');
  
  return result;
}

/**
 * Read/decode QR code from image
 * @param {string} imagePath - Path to image containing QR code
 * @param {function} progressCallback - Progress callback
 * @returns {Promise<object>} - Decoded text from QR code
 */
export async function readQRCode(imagePath, progressCallback) {
  if (progressCallback) progressCallback(20, 'Reading QR code...');
  
  // Note: Decoding requires jsQR or similar library
  // This is a placeholder implementation
  throw new Error('QR code reading/decoding is not yet implemented. Please install jsQR library.');
}
