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
        extractedText = await extractNativeText(inputPath, includeMetadata, progressCallback);
        break;
      case 'hybrid':
        extractedText = await performHybridExtraction(inputPath, language, includeMetadata, progressCallback);
        break;
      default:
        throw new Error(`Unsupported extraction mode: ${actualExtractionMode}`);
    }

    if (progressCallback) progressCallback(80, 'Formatting extracted text...');

    // Format output — only wrap with metadata section if user opted in
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
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?;:()[]{}\'"`~@#$%^&*+=|\\/\<\>-_',
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

async function extractNativeText(inputPath, includeMetadata = false, progressCallback) {
  if (progressCallback) progressCallback(20, 'Extracting native text...');

  const inputExt = path.extname(inputPath).toLowerCase();

  switch (inputExt) {
    // Plain text / code files — read as-is
    case '.txt':
    case '.md':
    case '.markdown':
    case '.rtf':
    case '.log':
    case '.csv':
    case '.json':
    case '.xml':
    case '.yaml':
    case '.yml':
    case '.ini':
    case '.cfg':
    case '.conf':
    case '.env':
    case '.js':
    case '.jsx':
    case '.ts':
    case '.tsx':
    case '.py':
    case '.java':
    case '.cpp':
    case '.c':
    case '.cs':
    case '.go':
    case '.rb':
    case '.php':
    case '.swift':
    case '.kt':
    case '.rs':
    case '.sql':
    case '.sh':
    case '.bat':
    case '.ps1':
      return fs.readFileSync(inputPath, 'utf8');

    // HTML / HTM — strip tags
    case '.html':
    case '.htm':
      return stripHtmlTags(fs.readFileSync(inputPath, 'utf8'));

    case '.pdf':
      return await extractTextFromPdf(inputPath, includeMetadata, progressCallback);
    case '.docx':
      return await extractTextFromDocx(inputPath, includeMetadata, progressCallback);
    case '.doc':
      return await extractTextFromDoc(inputPath, progressCallback);
    case '.xlsx':
    case '.xls':
      return await extractTextFromExcel(inputPath, includeMetadata, progressCallback);
    case '.pptx':
      return await extractTextFromPptx(inputPath, includeMetadata, progressCallback);
    case '.odt':
      return await extractTextFromOdt(inputPath, progressCallback);
    case '.eml':
      return await extractTextFromEml(inputPath, progressCallback);

    default:
      throw new Error(`Native text extraction not supported for: ${inputExt}`);
  }
}

async function performHybridExtraction(inputPath, language, includeMetadata = false, progressCallback) {
  if (progressCallback) progressCallback(20, 'Starting hybrid extraction...');

  let nativeText = '';
  let ocrText = '';
  let extractionErrors = [];

  try {
    // Try native extraction first
    if (progressCallback) progressCallback(25, 'Attempting native text extraction...');
    nativeText = await extractNativeText(inputPath, includeMetadata, (progress, message) => {
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

    combinedText = `Text extraction failed for: ${fileName}\n\nRecommendations:\n- For PDF files: Ensure the PDF contains selectable text (not just scanned images)\n- For image files: Try adjusting OCR language settings\n- For document files: Ensure the file is not corrupted or password-protected\n\nFile type: ${inputExt}`;
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

// ─── Per-format extractors ────────────────────────────────────────────────────

async function extractTextFromPdf(inputPath, includeMetadata = false, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from PDF...');

  try {
    const dataBuffer = fs.readFileSync(inputPath);
    const data = await pdfParse(dataBuffer);
    let extractedText = data.text;

    if (includeMetadata && data.info) {
      const meta = data.info;
      const metaBlock = [
        `Title: ${meta.Title || 'Unknown'}`,
        `Author: ${meta.Author || 'Unknown'}`,
        `Subject: ${meta.Subject || 'Unknown'}`,
        `Creator: ${meta.Creator || 'Unknown'}`,
        `Producer: ${meta.Producer || 'Unknown'}`,
        `Pages: ${data.numpages || 0}`,
        `Characters: ${extractedText.length}`,
      ].join('\n');
      extractedText = `=== PDF Info ===\n${metaBlock}\n\n=== Content ===\n\n${extractedText}`;
    }

    return extractedText;
  } catch (error) {
    console.error('[EXTRACTION] PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

async function extractTextFromDocx(inputPath, includeMetadata = false, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from DOCX...');

  try {
    const dataBuffer = fs.readFileSync(inputPath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    let extractedText = result.value;

    if (includeMetadata) {
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      extractedText = `=== DOCX Info ===\nWord Count: ${wordCount}\nCharacters: ${extractedText.length}\n\n=== Content ===\n\n${extractedText}`;
    }

    return extractedText;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

async function extractTextFromDoc(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from DOC...');
  // .doc (legacy Word) needs LibreOffice or antiword — attempt raw binary scan for printable ASCII
  try {
    const buf = fs.readFileSync(inputPath);
    // Extract printable ASCII runs (crude but useful fallback)
    let text = '';
    let run = '';
    for (let i = 0; i < buf.length; i++) {
      const c = buf[i];
      if (c >= 32 && c < 127) {
        run += String.fromCharCode(c);
      } else {
        if (run.length > 4) text += run + '\n';
        run = '';
      }
    }
    if (run.length > 4) text += run;
    if (!text.trim()) {
      return 'Could not extract text from this .doc file. Please convert it to .docx format first for reliable extraction.';
    }
    return text;
  } catch (error) {
    throw new Error(`Failed to extract text from DOC: ${error.message}`);
  }
}

async function extractTextFromExcel(inputPath, includeMetadata = false, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from Excel file...');

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(inputPath);

    let extractedText = '';
    let totalRows = 0;
    let totalCells = 0;

    for (const worksheet of workbook.worksheets) {
      if (progressCallback) progressCallback(45, `Processing worksheet: ${worksheet.name}`);
      extractedText += `\n[Sheet: ${worksheet.name}]\n`;

      let rowCount = 0;
      let cellCount = 0;

      worksheet.eachRow((row) => {
        rowCount++;
        const rowData = [];
        row.eachCell((cell) => {
          cellCount++;
          const cellValue = cell.value;
          if (cellValue !== null && cellValue !== undefined) {
            let textValue = '';
            if (typeof cellValue === 'object' && cellValue.richText) {
              textValue = cellValue.richText.map(rt => rt.text).join('');
            } else if (typeof cellValue === 'object' && cellValue.text) {
              textValue = cellValue.text;
            } else {
              textValue = String(cellValue);
            }
            if (textValue.trim()) rowData.push(textValue.trim());
          }
        });
        if (rowData.length > 0) extractedText += rowData.join('\t') + '\n';
      });

      totalRows += rowCount;
      totalCells += cellCount;
    }

    if (includeMetadata) {
      const header = `=== Excel Info ===\nSheets: ${workbook.worksheets.length}\nTotal Rows: ${totalRows}\nTotal Cells: ${totalCells}\n\n=== Content ===\n`;
      extractedText = header + extractedText;
    }

    return extractedText.trim();
  } catch (error) {
    console.error('Excel extraction error:', error);
    throw new Error(`Failed to extract text from Excel file: ${error.message}`);
  }
}

async function extractTextFromPptx(inputPath, includeMetadata = false, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from PPTX...');
  try {
    // PPTX is a ZIP — read ppt/slides/slide*.xml files
    const unzipper = await import('unzipper');
    const directory = await unzipper.Open.file(inputPath);
    const slideFiles = directory.files.filter(f => /ppt\/slides\/slide\d+\.xml$/.test(f.path)).sort((a, b) => a.path.localeCompare(b.path));

    let allText = '';
    let slideNum = 0;

    for (const entry of slideFiles) {
      slideNum++;
      const content = await entry.buffer();
      const xml = content.toString('utf8');
      // Extract <a:t> text runs
      const textRuns = [];
      const regex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
      let m;
      while ((m = regex.exec(xml)) !== null) {
        const t = m[1].trim();
        if (t) textRuns.push(t);
      }
      if (textRuns.length > 0) {
        allText += `[Slide ${slideNum}]\n${textRuns.join(' ')}\n\n`;
      }
    }

    if (!allText.trim()) return 'No text content found in this PPTX file.';

    if (includeMetadata) {
      allText = `=== PPTX Info ===\nSlides: ${slideNum}\n\n=== Content ===\n\n${allText}`;
    }

    return allText.trim();
  } catch (error) {
    console.error('PPTX extraction error:', error);
    throw new Error(`Failed to extract text from PPTX: ${error.message}`);
  }
}

async function extractTextFromOdt(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from ODT...');
  try {
    const unzipper = await import('unzipper');
    const directory = await unzipper.Open.file(inputPath);
    const contentFile = directory.files.find(f => f.path === 'content.xml');
    if (!contentFile) throw new Error('content.xml not found in ODT file');
    const buf = await contentFile.buffer();
    const xml = buf.toString('utf8');
    // Strip XML tags, decode entities
    const text = xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return text || 'No text content found in this ODT file.';
  } catch (error) {
    console.error('ODT extraction error:', error);
    throw new Error(`Failed to extract text from ODT: ${error.message}`);
  }
}

async function extractTextFromEml(inputPath, progressCallback) {
  if (progressCallback) progressCallback(40, 'Extracting text from EML...');
  try {
    const raw = fs.readFileSync(inputPath, 'utf8');
    // Split headers from body
    const sep = raw.indexOf('\n\n');
    const headers = sep > -1 ? raw.substring(0, sep) : raw;
    const body = sep > -1 ? raw.substring(sep + 2) : '';
    // Parse key headers
    const getHeader = (name) => {
      const rx = new RegExp(`^${name}:\\s*(.+)`, 'im');
      const m = headers.match(rx);
      return m ? m[1].trim() : '';
    };
    const from = getHeader('From');
    const to = getHeader('To');
    const subject = getHeader('Subject');
    const date = getHeader('Date');
    // Decode quoted-printable body
    const decodedBody = body
      .replace(/=\r?\n/g, '')             // soft line breaks
      .replace(/=[0-9A-Fa-f]{2}/g, (m) => String.fromCharCode(parseInt(m.slice(1), 16)));
    return `From: ${from}\nTo: ${to}\nSubject: ${subject}\nDate: ${date}\n\n${decodedBody}`.trim();
  } catch (error) {
    throw new Error(`Failed to extract text from EML: ${error.message}`);
  }
}

function stripHtmlTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')  // remove script blocks
    .replace(/<style[\s\S]*?<\/style>/gi, '')     // remove style blocks
    .replace(/<[^>]+>/g, ' ')                      // strip tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, (m) => String.fromCharCode(parseInt(m.slice(2, -1))))
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatAsText(extractedText, includeMetadata, metadata) {
  if (includeMetadata && metadata && Object.keys(metadata).length > 0) {
    return `=== Extraction Metadata ===\n${JSON.stringify(metadata, null, 2)}\n\n=== Extracted Text ===\n${extractedText}`;
  }
  return extractedText;
}

// ─── Mode determination ───────────────────────────────────────────────────────

function determineExtractionMode(fileExtension) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg'];
  const textExts = [
    '.txt', '.md', '.markdown', '.log', '.csv', '.json', '.xml', '.yaml', '.yml',
    '.html', '.htm', '.ini', '.cfg', '.conf', '.env', '.rtf',
    // Code files
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
    '.go', '.rb', '.php', '.swift', '.kt', '.rs', '.sql', '.sh', '.bat', '.ps1',
  ];
  const documentExts = ['.pdf', '.docx', '.doc', '.pptx', '.odt'];
  const spreadsheetExts = ['.xlsx', '.xls', '.ods'];
  const emailExts = ['.eml'];

  if (imageExts.includes(fileExtension)) return 'ocr';
  if (textExts.includes(fileExtension)) return 'native';
  if (documentExts.includes(fileExtension)) return 'hybrid';
  if (spreadsheetExts.includes(fileExtension)) return 'native';
  if (emailExts.includes(fileExtension)) return 'native';

  return 'ocr'; // Default to OCR for unknown file types
}
