import { getUniqueFilename } from '../utils/fileUtils.mjs';
import Tesseract, { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';

export async function extractText(inputPath, extractionMode = 'auto', includeMetadata = false, language = 'auto', originalFilename, progressCallback) {
  const startTime = Date.now();
  const inputExt = path.extname(inputPath).toLowerCase();

  // Use original filename if provided, otherwise derive from input path
  const baseName = originalFilename ? path.parse(originalFilename).name : path.parse(inputPath).name;
  const desiredFilename = `${baseName}.txt`;

  // Ensure output directory exists
  if (!fs.existsSync('processed')) {
    fs.mkdirSync('processed');
  }

  const outputFilename = getUniqueFilename('processed', desiredFilename);
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

    // Format output as text only
    const formattedOutput = formatAsText(extractedText, includeMetadata, metadata);

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
      outputFormat: 'txt',
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

  let worker = null;
  try {
    // Determine the best language for OCR
    let ocrLanguage = 'eng'; // Default to English
    if (language && language !== 'auto') {
      ocrLanguage = language;
    }

    // Use a more robust approach with timeout and proper cleanup
    const ocrPromise = new Promise(async (resolve, reject) => {
      try {
        // Create worker with timeout
        worker = await createWorker({
          cacheMethod: 'none',
          logger: () => { } // Disable logging to prevent crashes
        });

        await worker.load();
        await worker.loadLanguage(ocrLanguage);
        await worker.initialize(ocrLanguage);

        // Set parameters with error handling
        try {
          await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?;:()[]{}\'"`~@#$%^&*+=|\\/<>-_',
            preserve_interword_spaces: '1',
            user_defined_dpi: '300',
            tessedit_ocr_engine_mode: '3',
            tessedit_pageseg_mode: '6'
          });
        } catch (paramError) {
          console.warn('Parameter setting failed, continuing with defaults:', paramError.message);
        }

        const result = await worker.recognize(processedImagePath);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OCR timeout after 60 seconds')), 60000);
    });

    const result = await Promise.race([ocrPromise, timeoutPromise]);

    // Post-process the extracted text for better quality
    let extractedText = result.data.text;

    // Clean up common OCR artifacts
    extractedText = extractedText
      .replace(/\f/g, '\n') // Replace form feeds with newlines
      .replace(/\r/g, '\n') // Replace carriage returns with newlines
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .replace(/[^\S\n]+/g, ' ') // Replace multiple spaces with single space (but preserve newlines)
      .trim();

    return extractedText;
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error(`OCR failed: ${error.message}`);
  } finally {
    // Always clean up worker and processed image
    try {
      if (worker) {
        await worker.terminate();
      }
    } catch (cleanupError) {
      console.warn('Worker cleanup failed:', cleanupError.message);
    }

    try {
      if (fs.existsSync(processedImagePath)) {
        fs.unlinkSync(processedImagePath);
      }
    } catch (cleanupError) {
      console.warn('File cleanup failed:', cleanupError.message);
    }
  }
}

async function extractNativeText(inputPath, progressCallback) {
  if (progressCallback) progressCallback(20, 'Extracting native text...');

  const inputExt = path.extname(inputPath).toLowerCase();

  switch (inputExt) {
    case '.txt':
    case '.md':
    case '.markdown':
    case '.rtf':
    case '.log':
    case '.csv':
    case '.json':
    case '.xml':
    case '.html':
    case '.htm':
      return fs.readFileSync(inputPath, 'utf8');
    case '.pdf':
      return await extractTextFromPdf(inputPath, progressCallback);
    case '.docx':
      return await extractTextFromDocx(inputPath, progressCallback);
    case '.doc':
      return await extractTextFromDoc(inputPath, progressCallback);
    case '.xlsx':
    case '.xls':
      return await extractTextFromExcel(inputPath, progressCallback);
    default:
      throw new Error(`Native text extraction not supported for: ${inputExt}`);
  }
}

async function performHybridExtraction(inputPath, language, progressCallback) {
  if (progressCallback) progressCallback(20, 'Starting hybrid extraction...');

  let nativeText = '';
  let ocrText = '';
  let extractionErrors = [];

  try {
    // Try native extraction first
    if (progressCallback) progressCallback(25, 'Attempting native text extraction...');
    nativeText = await extractNativeText(inputPath, (progress, message) => {
      if (progressCallback) progressCallback(25 + (progress * 0.25), `Native: ${message}`);
    });
  } catch (error) {

    extractionErrors.push(`Native extraction failed: ${error.message}`);
  }

  // If native extraction didn't yield much text, use OCR
  if (!nativeText || nativeText.trim().length < 50) {
    if (progressCallback) progressCallback(50, 'Native extraction yielded little text, using OCR...');
    try {
      ocrText = await performOCR(inputPath, language, (progress, message) => {
        if (progressCallback) progressCallback(50 + (progress * 0.4), `OCR: ${message}`);
      });
    } catch (error) {

      extractionErrors.push(`OCR extraction failed: ${error.message}`);
    }
  }

  // Combine results
  let combinedText = '';

  if (nativeText && nativeText.trim().length > 0) {
    combinedText += nativeText;
  }

  if (ocrText && ocrText.trim().length > 0) {
    if (combinedText) combinedText += '\n\n--- OCR Results ---\n\n';
    combinedText += ocrText;
  }

  // If both methods failed, provide helpful error information
  if (!combinedText.trim()) {
    const inputExt = path.extname(inputPath).toLowerCase();
    const fileName = path.basename(inputPath);

    combinedText = `Text extraction failed for: ${fileName}

=== EXTRACTION ERRORS ===
${extractionErrors.join('\n')}

=== RECOMMENDATIONS ===
- For PDF files: Ensure the PDF contains selectable text (not just scanned images)
- For image files: Try adjusting OCR language settings
- For document files: Ensure the file is not corrupted or password-protected
- Consider using a different extraction mode or preprocessing the file

File type: ${inputExt}
File path: ${inputPath}`;
  }

  return combinedText;
}

async function preprocessImageForOCR(inputPath) {
  const processedPath = path.join('temp', `${uuidv4()}-processed.png`);

  try {
    const { Worker } = await import('worker_threads');
    await new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./worker/imagePreprocessor.mjs', import.meta.url), {
        workerData: { inputPath, outputPath: processedPath }
      });
      worker.on('message', (msg) => {
        if (msg.ok) resolve(); else reject(new Error(msg.error));
      });
      worker.on('error', reject);
      worker.on('exit', (code) => { if (code !== 0) reject(new Error(`Worker exited with code ${code}`)); });
    });

    return processedPath;
  } catch (error) {
    console.error('Image preprocessing failed:', error);
    // If preprocessing fails, return original path
    return inputPath;
  }
}

async function extractTextFromPdf(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from PDF...');

  try {
    // Read the PDF file
    const dataBuffer = fs.readFileSync(inputPath);

    // Parse the PDF
    const data = await pdfParse(dataBuffer);

    // Extract text content
    let extractedText = data.text;

    // Add metadata if available
    if (data.info) {
      const metadata = {
        title: data.info.Title || 'Unknown',
        author: data.info.Author || 'Unknown',
        subject: data.info.Subject || 'Unknown',
        creator: data.info.Creator || 'Unknown',
        producer: data.info.Producer || 'Unknown',
        creationDate: data.info.CreationDate || 'Unknown',
        modificationDate: data.info.ModDate || 'Unknown',
        pageCount: data.numpages || 0,
        textLength: extractedText.length
      };


      // Add metadata to the extracted text
      extractedText = `=== PDF METADATA ===
Title: ${metadata.title}
Author: ${metadata.author}
Subject: ${metadata.subject}
Creator: ${metadata.creator}
Producer: ${metadata.producer}
Creation Date: ${metadata.creationDate}
Modification Date: ${metadata.modificationDate}
Page Count: ${metadata.pageCount}
Text Length: ${metadata.textLength}

=== EXTRACTED TEXT ===

${extractedText}`;
    }

    console.log(`[EXTRACTION DEBUG] Final extracted text length: ${extractedText.length}`);
    return extractedText;
  } catch (error) {
    console.error(`[EXTRACTION DEBUG] PDF extraction error:`, error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

async function extractTextFromDocx(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from DOCX...');

  try {
    // Read the DOCX file
    const dataBuffer = fs.readFileSync(inputPath);

    // Extract text using mammoth
    const result = await mammoth.extractRawText({ buffer: dataBuffer });

    let extractedText = result.value;

    // Add metadata
    const metadata = {
      textLength: extractedText.length,
      wordCount: extractedText.split(/\s+/).length,
      hasMessages: result.messages && result.messages.length > 0
    };

    // Add metadata to the extracted text
    extractedText = `=== DOCX METADATA ===
Text Length: ${metadata.textLength}
Word Count: ${metadata.wordCount}
Has Processing Messages: ${metadata.hasMessages}

=== EXTRACTED TEXT ===

${extractedText}`;

    return extractedText;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

async function extractTextFromDoc(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from DOC...');

  try {
    // For .doc files, we'll need to use a different approach
    // Since mammoth doesn't support .doc files directly, we'll try to convert or use OCR
    // For now, we'll attempt to read as binary and provide a helpful message

    const stats = fs.statSync(inputPath);
    const fileSize = stats.size;

    // Create a helpful message about .doc files
    const message = `Text extracted from DOC: ${path.basename(inputPath)}

Note: .doc files (older Word format) require special handling.
File size: ${fileSize} bytes

This file format is not directly supported for text extraction.
Consider converting it to .docx format first for better text extraction results.

Alternatively, you can use OCR mode to extract text from this document by treating it as an image.`;

    return message;
  } catch (error) {
    console.error('DOC extraction error:', error);
    throw new Error(`Failed to extract text from DOC: ${error.message}`);
  }
}

async function extractTextFromExcel(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from Excel file...');

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(inputPath);

    let extractedText = '';
    const metadata = {
      sheetCount: workbook.worksheets.length,
      totalRows: 0,
      totalCells: 0
    };

    // Process each worksheet
    for (const worksheet of workbook.worksheets) {
      if (progressCallback) progressCallback(45, `Processing worksheet: ${worksheet.name}`);

      extractedText += `\n=== WORKSHEET: ${worksheet.name} ===\n\n`;

      let rowCount = 0;
      let cellCount = 0;

      // Process each row
      worksheet.eachRow((row, rowNumber) => {
        rowCount++;
        const rowData = [];

        // Process each cell in the row
        row.eachCell((cell, colNumber) => {
          cellCount++;
          const cellValue = cell.value;

          if (cellValue !== null && cellValue !== undefined) {
            // Convert different cell types to string
            let textValue = '';
            if (typeof cellValue === 'object' && cellValue.richText) {
              // Handle rich text
              textValue = cellValue.richText.map(rt => rt.text).join('');
            } else if (typeof cellValue === 'object' && cellValue.text) {
              // Handle hyperlinks
              textValue = cellValue.text;
            } else {
              // Handle regular values
              textValue = String(cellValue);
            }

            if (textValue.trim()) {
              rowData.push(textValue.trim());
            }
          }
        });

        // Add row data if it contains any text
        if (rowData.length > 0) {
          extractedText += rowData.join('\t') + '\n';
        }
      });

      metadata.totalRows += rowCount;
      metadata.totalCells += cellCount;

      extractedText += `\nRows: ${rowCount}, Cells: ${cellCount}\n\n`;
    }

    // Add metadata to the extracted text
    extractedText = `=== EXCEL METADATA ===
Total Worksheets: ${metadata.sheetCount}
Total Rows: ${metadata.totalRows}
Total Cells: ${metadata.totalCells}

=== EXTRACTED TEXT ===
${extractedText}`;

    return extractedText;
  } catch (error) {
    console.error('Excel extraction error:', error);
    throw new Error(`Failed to extract text from Excel file: ${error.message}`);
  }
}

async function formatOutput(extractedText, outputFormat, includeMetadata, metadata) {
  // Only support text format for now
  return formatAsText(extractedText, includeMetadata, metadata);
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

function determineExtractionMode(fileExtension) {
  console.log(`[EXTRACTION DEBUG] Determining extraction mode for extension: ${fileExtension}`);

  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg'];
  const textExts = ['.txt', '.md', '.markdown', '.rtf', '.log', '.csv', '.json', '.xml', '.html', '.htm'];
  const documentExts = ['.pdf', '.docx', '.doc'];
  const spreadsheetExts = ['.xlsx', '.xls', '.ods'];

  let mode;
  if (imageExts.includes(fileExtension)) {
    mode = 'ocr';
  } else if (textExts.includes(fileExtension)) {
    mode = 'native';
  } else if (documentExts.includes(fileExtension)) {
    mode = 'hybrid';
  } else if (spreadsheetExts.includes(fileExtension)) {
    mode = 'native'; // Spreadsheets can be read as text
  } else {
    mode = 'ocr'; // Default to OCR for unknown file types
  }

  console.log(`[EXTRACTION DEBUG] Determined mode: ${mode} for extension: ${fileExtension}`);
  return mode;
}
