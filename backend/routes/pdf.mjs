import express from 'express';
import { uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { splitPDF, mergePDFs } from '../services/pdfService.mjs';
import { addFileHistory } from '../services/databaseService.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const router = express.Router();

// Split PDF endpoint
router.post('/split',
  uploadMultiple,
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded' });
    }

    const file = req.files[0];
    const { mode = 'pages', pagesPerFile = 1, ranges = '[]' } = req.body;
    const startTime = Date.now();

    try {
      const parsedRanges = JSON.parse(ranges);
      
      const result = await splitPDF(
        file.path,
        {
          mode,
          pagesPerFile: parseInt(pagesPerFile),
          ranges: parsedRanges
        },
        (progress, message) => {
          console.log(`[PDF SPLIT] ${progress}% - ${message}`);
        }
      );

      // Upload each split PDF to Supabase and save to database
      const downloadUrls = [];
      const user_id = req.user?.id || new mongoose.Types.ObjectId(); // Use authenticated user or create temp ID
      
      for (const splitFile of result.files) {
        let download_url = null;
        let supabase_path = null;
        
        try {
          const { uploadToSupabase } = await import('../services/supabaseService.js');
          const sup = await uploadToSupabase(splitFile.path, `pdf/${splitFile.filename}`);
          download_url = sup.publicUrl;
          supabase_path = sup.supabasePath;
          console.log(`[PDF SPLIT] Uploaded to Supabase: ${download_url}`);
        } catch (supErr) {
          console.warn('[PDF SPLIT] Supabase upload failed:', supErr.message);
          // Construct proper local URL
          const relativePath = path.relative('processed', splitFile.path).replace(/\\/g, '/');
          download_url = `${process.env.BACKEND_URL || 'http://localhost:3001'}/processed/${relativePath}`;
          console.log(`[PDF SPLIT] Using local URL: ${download_url}`);
        }
        
        // Save to database
        try {
          await addFileHistory({
            user_id: user_id,
            original_filename: file.originalname,
            original_path: file.path,
            processed_filename: splitFile.filename,
            processed_path: splitFile.path,
            download_url: download_url,
            supabase_path: supabase_path,
            operation_type: 'pdf-split',
            operation_details: {
              mode: mode,
              pagesPerFile: pagesPerFile,
              pages: splitFile.pages,
              partNumber: downloadUrls.length + 1,
              totalParts: result.totalFiles
            },
            file_size: file.size,
            processed_size: splitFile.size,
            processing_time: Date.now() - startTime,
            status: 'completed'
          });
          console.log(`[PDF SPLIT] Saved to database: ${splitFile.filename}`);
        } catch (dbErr) {
          console.error('[PDF SPLIT] Database save failed:', dbErr.message);
          // Continue even if database save fails
        }
        
        downloadUrls.push({
          filename: splitFile.filename,
          download_url,
          pages: splitFile.pages,
          size: splitFile.size
        });
      }

      // Cleanup input file
      try {
        fs.unlinkSync(file.path);
      } catch {}

      res.status(200).json({
        success: true,
        data: {
          totalFiles: result.totalFiles,
          originalPages: result.originalPages,
          files: downloadUrls,
          message: `Split into ${result.totalFiles} PDF files`
        }
      });
    } catch (error) {
      console.error('[PDF SPLIT] Error:', error);
      try { fs.unlinkSync(file.path); } catch {}
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

// Merge PDFs endpoint
router.post('/merge',
  uploadMultiple,
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 PDF files are required for merging' });
    }

    const filePaths = req.files.map(f => f.path);
    const startTime = Date.now();

    try {
      const result = await mergePDFs(
        filePaths,
        {},
        (progress, message) => {
          console.log(`[PDF MERGE] ${progress}% - ${message}`);
        }
      );

      // Upload to Supabase
      let download_url = null;
      let supabase_path = null;
      
      try {
        const { uploadToSupabase } = await import('../services/supabaseService.js');
        const sup = await uploadToSupabase(result.path, `pdf/${result.filename}`);
        download_url = sup.publicUrl;
        supabase_path = sup.supabasePath;
        fs.unlinkSync(result.path);
      } catch (supErr) {
        console.warn('[PDF MERGE] Supabase upload failed:', supErr.message);
        const relativePath = path.relative('processed', result.path).replace(/\\/g, '/');
        download_url = `${process.env.BACKEND_URL || 'http://localhost:3001'}/processed/${relativePath}`;
      }

      // Save to database
      const user_id = req.user?.id || new mongoose.Types.ObjectId();
      const totalSize = req.files.reduce((sum, f) => sum + f.size, 0);
      
      try {
        await addFileHistory({
          user_id: user_id,
          original_filename: req.files.map(f => f.originalname).join(', '),
          original_path: filePaths[0], // First file path as reference
          processed_filename: result.filename,
          processed_path: result.path,
          download_url: download_url,
          supabase_path: supabase_path,
          operation_type: 'pdf-merge',
          operation_details: {
            filesCount: result.filesCount,
            totalPages: result.totalPages,
            sourceFiles: req.files.map(f => f.originalname)
          },
          file_size: totalSize,
          processed_size: result.size,
          processing_time: Date.now() - startTime,
          status: 'completed'
        });
        console.log(`[PDF MERGE] Saved to database: ${result.filename}`);
      } catch (dbErr) {
        console.error('[PDF MERGE] Database save failed:', dbErr.message);
      }

      // Cleanup
      filePaths.forEach(p => {
        try { fs.unlinkSync(p); } catch {}
      });
      try {
        fs.rmSync(path.dirname(result.path), { recursive: true, force: true });
      } catch {}

      res.status(200).json({
        success: true,
        data: {
          filename: result.filename,
          totalPages: result.totalPages,
          filesCount: result.filesCount,
          size: result.size,
          download_url
        }
      });
    } catch (error) {
      console.error('[PDF MERGE] Error:', error);
      filePaths.forEach(p => {
        try { fs.unlinkSync(p); } catch {}
      });
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

export default router;
