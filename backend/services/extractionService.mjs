import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export async function extractText(inputPath, extractionMode = 'auto', outputFormat = 'txt', includeMetadata = false, language = 'auto', progressCallback) {
  const startTime = Date.now();
  const inputExt = path.extname(inputPath).toLowerCase();
  const outputFilename = `${uuidv4()}-${Date.now()}-extracted.${outputFormat}`;
  const outputPath = path.join('processed', outputFilename);

  try {
    if (progressCallback) progressCallback(10, 'Analyzing file for text extraction...');

    // Determine the best extraction method
    const actualExtractionMode = extractionMode === 'auto' ? 
      determineExtractionMode(inputExt) : extractionMode;

    let extractedText = '';
    let metadata = {};

    // Extract text based on mode
    switch (actualExtractionMode) {
      case 'ocr':
        extractedText = await performOCR(inputPath, language, progressCallback);
        break;
      case 'native':
        extractedText = await extractNativeText(inputPath, progressCallback);
        break;
      case 'hybrid':
        extractedText = await performHybridExtraction(inputPath, language, progressCallback);
        break;
      default:
        throw new Error(`Unsupported extraction mode: ${actualExtractionMode}`);
    }

    if (progressCallback) progressCallback(80, 'Formatting extracted text...');

    // Format output based on requested format
    const formattedOutput = await formatOutput(extractedText, outputFormat, includeMetadata, metadata);

    // Write to file
    fs.writeFileSync(outputPath, formattedOutput);

    const processingTime = (Date.now() - startTime) / 1000;
    const outputStats = fs.statSync(outputPath);

    if (progressCallback) progressCallback(100, 'Text extraction completed');

    return {
      filename: outputFilename,
      path: outputPath,
      size: outputStats.size,
      processingTime,
      extractionMode: actualExtractionMode,
      outputFormat,
      textLength: extractedText.length,
      metadata: includeMetadata ? metadata : null
    };

  } catch (error) {
    // Clean up output file if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    throw error;
  }
}

async function performOCR(inputPath, language, progressCallback) {
  if (progressCallback) progressCallback(20, 'Preparing image for OCR...');

  // Preprocess image for better OCR results
  const processedImagePath = await preprocessImageForOCR(inputPath);

  if (progressCallback) progressCallback(30, 'Running OCR...');

  try {
    const result = await Tesseract.recognize(processedImagePath, language === 'auto' ? 'eng' : language, {
      logger: m => {
        if (progressCallback && m.status === 'recognizing text') {
          const progress = 30 + (m.progress * 0.6); // 30% to 90%
          progressCallback(progress, `OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Clean up processed image
    if (fs.existsSync(processedImagePath)) {
      fs.unlinkSync(processedImagePath);
    }

    return result.data.text;
  } catch (error) {
    // Clean up processed image
    if (fs.existsSync(processedImagePath)) {
      fs.unlinkSync(processedImagePath);
    }
    throw new Error(`OCR failed: ${error.message}`);
  }
}

async function extractNativeText(inputPath, progressCallback) {
  if (progressCallback) progressCallback(20, 'Extracting native text...');

  const inputExt = path.extname(inputPath).toLowerCase();
  
  switch (inputExt) {
    case '.txt':
      return fs.readFileSync(inputPath, 'utf8');
    case '.pdf':
      return await extractTextFromPdf(inputPath, progressCallback);
    case '.docx':
      return await extractTextFromDocx(inputPath, progressCallback);
    case '.doc':
      return await extractTextFromDoc(inputPath, progressCallback);
    default:
      throw new Error(`Native text extraction not supported for: ${inputExt}`);
  }
}

async function performHybridExtraction(inputPath, language, progressCallback) {
  if (progressCallback) progressCallback(20, 'Starting hybrid extraction...');

  let nativeText = '';
  let ocrText = '';

  try {
    // Try native extraction first
    nativeText = await extractNativeText(inputPath, (progress, message) => {
      if (progressCallback) progressCallback(20 + (progress * 0.3), `Native: ${message}`);
    });
  } catch (error) {
    console.log('Native extraction failed, will use OCR only');
  }

  // If native extraction didn't yield much text, use OCR
  if (!nativeText || nativeText.trim().length < 50) {
    if (progressCallback) progressCallback(50, 'Native extraction yielded little text, using OCR...');
    ocrText = await performOCR(inputPath, language, (progress, message) => {
      if (progressCallback) progressCallback(50 + (progress * 0.4), `OCR: ${message}`);
    });
  }

  // Combine results
  const combinedText = nativeText + (ocrText ? '\n\n--- OCR Results ---\n\n' + ocrText : '');
  return combinedText;
}

async function preprocessImageForOCR(inputPath) {
  const processedPath = path.join('temp', `${uuidv4()}-processed.png`);

  try {
    await sharp(inputPath)
      .grayscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Sharpen the image
      .png()
      .toFile(processedPath);

    return processedPath;
  } catch (error) {
    // If preprocessing fails, return original path
    return inputPath;
  }
}

async function extractTextFromPdf(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from PDF...');
  
  // For now, create a placeholder text extraction
  // In a real implementation, you'd use pdf-parse or similar
  const placeholderText = `Text extracted from PDF: ${path.basename(inputPath)}

This is a placeholder for PDF text extraction.
In a full implementation, this would contain the actual extracted text from the PDF file.

The PDF would be processed page by page, extracting text content while preserving formatting and structure.`;
  
  return placeholderText;
}

async function extractTextFromDocx(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from DOCX...');
  
  // For now, create a placeholder text extraction
  // In a real implementation, you'd use mammoth or similar
  const placeholderText = `Text extracted from DOCX: ${path.basename(inputPath)}

This is a placeholder for DOCX text extraction.
In a full implementation, this would contain the actual extracted text from the Word document.

The DOCX would be parsed to extract text content, preserving paragraphs, headings, and basic formatting.`;
  
  return placeholderText;
}

async function extractTextFromDoc(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from DOC...');
  
  // For now, create a placeholder text extraction
  // In a real implementation, you'd use a library that can handle .doc files
  const placeholderText = `Text extracted from DOC: ${path.basename(inputPath)}

This is a placeholder for DOC text extraction.
In a full implementation, this would contain the actual extracted text from the Word document.

The DOC file would be parsed to extract text content, though this format is older and more complex to process.`;
  
  return placeholderText;
}

async function formatOutput(extractedText, outputFormat, includeMetadata, metadata) {
  switch (outputFormat.toLowerCase()) {
    case 'txt':
      return formatAsText(extractedText, includeMetadata, metadata);
    case 'docx':
      return await formatAsDocx(extractedText, includeMetadata, metadata);
    case 'pdf':
      return await formatAsPdf(extractedText, includeMetadata, metadata);
    case 'json':
      return formatAsJson(extractedText, includeMetadata, metadata);
    default:
      throw new Error(`Unsupported output format: ${outputFormat}`);
  }
}

function formatAsText(extractedText, includeMetadata, metadata) {
  let output = extractedText;
  
  if (includeMetadata && metadata) {
    output = `=== EXTRACTION METADATA ===
${JSON.stringify(metadata, null, 2)}

=== EXTRACTED TEXT ===
${output}`;
  }
  
  return output;
}

async function formatAsDocx(extractedText, includeMetadata, metadata) {
  // For now, create a simple text representation
  // In a real implementation, you'd use a library like docx
  let content = extractedText;
  
  if (includeMetadata && metadata) {
    content = `EXTRACTION METADATA:
${JSON.stringify(metadata, null, 2)}

EXTRACTED TEXT:
${content}`;
  }
  
  return content;
}

async function formatAsPdf(extractedText, includeMetadata, metadata) {
  // For now, create a simple PDF representation
  // In a real implementation, you'd use a library like pdf-lib
  let content = extractedText;
  
  if (includeMetadata && metadata) {
    content = `EXTRACTION METADATA:
${JSON.stringify(metadata, null, 2)}

EXTRACTED TEXT:
${content}`;
  }
  
  // Create a simple PDF structure
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
/Length ${content.length + 44}
>>
stream
BT
/F1 12 Tf
72 720 Td
(${content.replace(/[()\\]/g, '\\$&')}) Tj
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

  return pdfContent;
}

function formatAsJson(extractedText, includeMetadata, metadata) {
  const jsonOutput = {
    extractedText: extractedText,
    extractionInfo: {
      timestamp: new Date().toISOString(),
      textLength: extractedText.length,
      wordCount: extractedText.split(/\s+/).length,
      characterCount: extractedText.length
    }
  };
  
  if (includeMetadata && metadata) {
    jsonOutput.metadata = metadata;
  }
  
  return JSON.stringify(jsonOutput, null, 2);
}

function determineExtractionMode(fileExtension) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
  const textExts = ['.txt', '.md', '.rtf'];
  const documentExts = ['.pdf', '.docx', '.doc'];
  
  if (imageExts.includes(fileExtension)) {
    return 'ocr';
  } else if (textExts.includes(fileExtension)) {
    return 'native';
  } else if (documentExts.includes(fileExtension)) {
    return 'hybrid';
  } else {
    return 'ocr'; // Default to OCR for unknown file types
  }
}
