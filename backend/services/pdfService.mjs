import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

/**
 * Split a PDF into multiple files
 * @param {string} inputPath - Path to input PDF
 * @param {object} options - Split options
 * @returns {Promise<object>} - Result with paths to split PDFs
 */
export async function splitPDF(inputPath, options = {}, progressCallback) {
  const { mode = 'pages', ranges = [], pagesPerFile = 1 } = options;
  
  if (progressCallback) progressCallback(10, 'Loading PDF...');
  
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  
  if (progressCallback) progressCallback(20, `PDF loaded: ${totalPages} pages`);
  
  const outputFiles = [];
  const outputDir = path.join('processed', `split-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  
  if (mode === 'pages') {
    // Split by pages per file
    let fileIndex = 1;
    for (let i = 0; i < totalPages; i += pagesPerFile) {
      const newPdf = await PDFDocument.create();
      const endPage = Math.min(i + pagesPerFile, totalPages);
      
      for (let j = i; j < endPage; j++) {
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [j]);
        newPdf.addPage(copiedPage);
      }
      
      const outputFilename = `split-${fileIndex}.pdf`;
      const outputPath = path.join(outputDir, outputFilename);
      const pdfBytesOut = await newPdf.save();
      fs.writeFileSync(outputPath, pdfBytesOut);
      
      outputFiles.push({
        filename: outputFilename,
        path: outputPath,
        pages: endPage - i,
        size: pdfBytesOut.length
      });
      
      if (progressCallback) {
        const progress = 20 + Math.floor(((i + pagesPerFile) / totalPages) * 70);
        progressCallback(progress, `Created ${outputFilename} (pages ${i + 1}-${endPage})`);
      }
      
      fileIndex++;
    }
  } else if (mode === 'odd') {
    // Split odd pages only
    const newPdf = await PDFDocument.create();
    for (let i = 0; i < totalPages; i += 2) {
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
    }
    
    const outputFilename = 'odd-pages.pdf';
    const outputPath = path.join(outputDir, outputFilename);
    const pdfBytesOut = await newPdf.save();
    fs.writeFileSync(outputPath, pdfBytesOut);
    
    outputFiles.push({
      filename: outputFilename,
      path: outputPath,
      pages: Math.ceil(totalPages / 2),
      size: pdfBytesOut.length
    });
    
    if (progressCallback) progressCallback(90, 'Created odd pages PDF');
  } else if (mode === 'even') {
    // Split even pages only
    const newPdf = await PDFDocument.create();
    for (let i = 1; i < totalPages; i += 2) {
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
    }
    
    const outputFilename = 'even-pages.pdf';
    const outputPath = path.join(outputDir, outputFilename);
    const pdfBytesOut = await newPdf.save();
    fs.writeFileSync(outputPath, pdfBytesOut);
    
    outputFiles.push({
      filename: outputFilename,
      path: outputPath,
      pages: Math.floor(totalPages / 2),
      size: pdfBytesOut.length
    });
    
    if (progressCallback) progressCallback(90, 'Created even pages PDF');
  } else if (mode === 'ranges' && ranges.length > 0) {
    // Split by custom ranges
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const newPdf = await PDFDocument.create();
      
      const startPage = Math.max(0, range.start - 1);
      const endPage = Math.min(totalPages, range.end);
      
      for (let j = startPage; j < endPage; j++) {
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [j]);
        newPdf.addPage(copiedPage);
      }
      
      const outputFilename = `split-${i + 1}.pdf`;
      const outputPath = path.join(outputDir, outputFilename);
      const pdfBytesOut = await newPdf.save();
      fs.writeFileSync(outputPath, pdfBytesOut);
      
      outputFiles.push({
        filename: outputFilename,
        path: outputPath,
        pages: endPage - startPage,
        size: pdfBytesOut.length
      });
      
      if (progressCallback) {
        const progress = 20 + Math.floor(((i + 1) / ranges.length) * 70);
        progressCallback(progress, `Created ${outputFilename} (pages ${startPage + 1}-${endPage})`);
      }
    }
  }
  
  if (progressCallback) progressCallback(100, 'PDF split completed!');
  
  return {
    success: true,
    outputDir,
    files: outputFiles,
    totalFiles: outputFiles.length,
    originalPages: totalPages
  };
}

/**
 * Merge multiple PDFs into one
 * @param {string[]} inputPaths - Array of PDF file paths
 * @param {object} options - Merge options
 * @returns {Promise<object>} - Result with merged PDF path
 */
export async function mergePDFs(inputPaths, options = {}, progressCallback) {
  if (progressCallback) progressCallback(10, 'Starting PDF merge...');
  
  const mergedPdf = await PDFDocument.create();
  let totalPages = 0;
  
  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i];
    
    if (progressCallback) {
      const progress = 10 + Math.floor((i / inputPaths.length) * 70);
      progressCallback(progress, `Merging ${path.basename(inputPath)}...`);
    }
    
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    const copiedPages = await mergedPdf.copyPages(pdfDoc, [...Array(pageCount).keys()]);
    copiedPages.forEach(page => mergedPdf.addPage(page));
    
    totalPages += pageCount;
  }
  
  if (progressCallback) progressCallback(85, 'Saving merged PDF...');
  
  const outputDir = path.join('processed', `merged-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  
  const outputFilename = 'merged.pdf';
  const outputPath = path.join(outputDir, outputFilename);
  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, mergedPdfBytes);
  
  if (progressCallback) progressCallback(100, 'PDF merge completed!');
  
  return {
    success: true,
    filename: outputFilename,
    path: outputPath,
    size: mergedPdfBytes.length,
    totalPages,
    filesCount: inputPaths.length
  };
}

/**
 * Merge split PDF files back into one
 * @param {string} splitDir - Directory containing split PDFs
 * @returns {Promise<object>} - Result with merged PDF path
 */
export async function mergeSplitPDFs(splitDir, progressCallback) {
  if (progressCallback) progressCallback(10, 'Finding split PDF files...');
  
  // Get all PDF files in the directory
  const files = fs.readdirSync(splitDir)
    .filter(f => f.endsWith('.pdf'))
    .sort((a, b) => {
      // Sort by number in filename (split-1.pdf, split-2.pdf, etc.)
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    })
    .map(f => path.join(splitDir, f));
  
  if (files.length === 0) {
    throw new Error('No PDF files found in directory');
  }
  
  if (progressCallback) progressCallback(20, `Found ${files.length} PDF files to merge`);
  
  // Use the existing mergePDFs function
  return await mergePDFs(files, {}, progressCallback);
}
