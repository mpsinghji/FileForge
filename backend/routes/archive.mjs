import express from 'express';
import { uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { createArchive, getCompressionLevels, getSupportedFormats } from '../services/archiveCreationService.mjs';
import { addFileHistory } from '../services/databaseService.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const router = express.Router();

// Create archive endpoint
router.post('/create',
  uploadMultiple,
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const { format = 'zip', password, compressionLevel = 5, archiveName } = req.body;
    const startTime = Date.now();

    try {
      const filePaths = req.files.map(f => f.path);
      
      const result = await createArchive(
        filePaths,
        {
          format,
          password: password || null,
          compressionLevel: parseInt(compressionLevel),
          archiveName: archiveName || `archive-${Date.now()}`
        },
        (progress, message) => {
          console.log(`[ARCHIVE CREATE] ${progress}% - ${message}`);
        }
      );

      // Upload to Supabase or serve locally
      let download_url = null;
      let supabase_path = null;
      
      try {
        const { uploadToSupabase } = await import('../services/supabaseService.js');
        const sup = await uploadToSupabase(result.path, `archives/${result.filename}`);
        download_url = sup.publicUrl;
        supabase_path = sup.supabasePath;
        console.log(`[ARCHIVE CREATE] Uploaded to Supabase: ${download_url}`);
      } catch (supErr) {
        console.warn('[ARCHIVE CREATE] Supabase upload failed:', supErr.message);
        const relativePath = path.relative('processed', result.path).replace(/\\/g, '/');
        download_url = `${process.env.BACKEND_URL || 'http://localhost:3001'}/processed/${relativePath}`;
        console.log(`[ARCHIVE CREATE] Using local URL: ${download_url}`);
      }

      // Save to database
      const user_id = req.user?.id || new mongoose.Types.ObjectId();
      const totalSize = req.files.reduce((sum, f) => sum + f.size, 0);
      
      try {
        await addFileHistory({
          user_id: user_id,
          original_filename: req.files.map(f => f.originalname).join(', '),
          original_path: filePaths[0],
          processed_filename: result.filename,
          processed_path: result.path,
          download_url: download_url,
          supabase_path: supabase_path,
          operation_type: 'archive-create',
          operation_details: {
            format: result.format,
            filesCount: result.filesCount,
            isPasswordProtected: result.isPasswordProtected,
            compressionLevel: result.compressionLevel,
            sourceFiles: req.files.map(f => f.originalname)
          },
          file_size: totalSize,
          processed_size: result.size,
          processing_time: Date.now() - startTime,
          status: 'completed'
        });
        console.log(`[ARCHIVE CREATE] Saved to database: ${result.filename}`);
      } catch (dbErr) {
        console.error('[ARCHIVE CREATE] Database save failed:', dbErr.message);
      }

      // Cleanup input files
      filePaths.forEach(p => {
        try { fs.unlinkSync(p); } catch {}
      });

      res.status(200).json({
        success: true,
        data: {
          filename: result.filename,
          size: result.size,
          format: result.format,
          filesCount: result.filesCount,
          isPasswordProtected: result.isPasswordProtected,
          compressionLevel: result.compressionLevel,
          download_url
        }
      });
    } catch (error) {
      console.error('[ARCHIVE CREATE] Error:', error);
      // Cleanup on error
      req.files.forEach(f => {
        try { fs.unlinkSync(f.path); } catch {}
      });
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

// Get compression levels
router.get('/compression-levels',
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      data: getCompressionLevels()
    });
  })
);

// Get supported formats
router.get('/formats',
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      data: getSupportedFormats()
    });
  })
);

export default router;
