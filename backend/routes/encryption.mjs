import express from 'express';
import { uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { encryptFile, decryptFile } from '../services/encryptionService.mjs';
import { addFileHistory } from '../services/databaseService.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const router = express.Router();

// Encrypt file endpoint
router.post('/encrypt',
  uploadMultiple,
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const file = req.files[0];
    const { password } = req.body;
    const startTime = Date.now();

    if (!password) {
      try { fs.unlinkSync(file.path); } catch {}
      return res.status(400).json({ 
        success: false, 
        error: 'Password is required for encryption' 
      });
    }

    try {
      const result = await encryptFile(
        file.path,
        password,
        (progress, message) => {
          console.log(`[ENCRYPT] ${progress}% - ${message}`);
        }
      );

      // Upload to Supabase or serve locally
      let download_url = null;
      let supabase_path = null;
      const filename = result.filename;
      
      try {
        const { uploadToSupabase } = await import('../services/supabaseService.js');
        const sup = await uploadToSupabase(result.path, `encrypted/${filename}`);
        download_url = sup.publicUrl;
        supabase_path = sup.supabasePath;
      } catch (supErr) {
        console.warn('[ENCRYPT] Supabase upload failed:', supErr.message);
        const relativePath = path.relative('processed', result.path).replace(/\\/g, '/');
        download_url = `${process.env.BACKEND_URL || 'http://localhost:3001'}/processed/${relativePath}`;
      }

      // Save to database
      const user_id = req.user?.id || new mongoose.Types.ObjectId();
      try {
        await addFileHistory({
          user_id: user_id,
          original_filename: file.originalname,
          original_path: file.path,
          processed_filename: result.filename,
          processed_path: result.path,
          download_url: download_url,
          supabase_path: supabase_path,
          operation_type: 'file-encrypt',
          operation_details: {
            algorithm: result.algorithm
          },
          file_size: result.originalSize,
          processed_size: result.size,
          processing_time: Date.now() - startTime,
          status: 'completed'
        });
        console.log(`[ENCRYPT] Saved to database: ${result.filename}`);
      } catch (dbErr) {
        console.error('[ENCRYPT] Database save failed:', dbErr.message);
      }

      // Cleanup input file
      try {
        fs.unlinkSync(file.path);
      } catch {}

      res.status(200).json({
        success: true,
        data: {
          filename: result.filename,
          size: result.size,
          originalSize: result.originalSize,
          algorithm: result.algorithm,
          download_url
        }
      });
    } catch (error) {
      console.error('[ENCRYPT] Error:', error);
      try { fs.unlinkSync(file.path); } catch {}
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

// Decrypt file endpoint
router.post('/decrypt',
  uploadMultiple,
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No encrypted file uploaded' });
    }

    const file = req.files[0];
    const { password } = req.body;
    const startTime = Date.now();

    if (!password || password.length === 0) {
      try { fs.unlinkSync(file.path); } catch {}
      return res.status(400).json({ 
        success: false, 
        error: 'Password is required for decryption' 
      });
    }

    try {
      const result = await decryptFile(
        file.path,
        password,
        (progress, message) => {
          console.log(`[DECRYPT] ${progress}% - ${message}`);
        }
      );

      // Upload to Supabase or serve locally
      let download_url = null;
      let supabase_path = null;
      const filename = result.filename;
      
      try {
        const { uploadToSupabase } = await import('../services/supabaseService.js');
        const sup = await uploadToSupabase(result.path, `decrypted/${filename}`);
        download_url = sup.publicUrl;
        supabase_path = sup.supabasePath;
      } catch (supErr) {
        console.warn('[DECRYPT] Supabase upload failed:', supErr.message);
        const relativePath = path.relative('processed', result.path).replace(/\\/g, '/');
        download_url = `${process.env.BACKEND_URL || 'http://localhost:3001'}/processed/${relativePath}`;
      }

      // Save to database
      const user_id = req.user?.id || new mongoose.Types.ObjectId();
      try {
        await addFileHistory({
          user_id: user_id,
          original_filename: file.originalname,
          original_path: file.path,
          processed_filename: result.filename,
          processed_path: result.path,
          download_url: download_url,
          supabase_path: supabase_path,
          operation_type: 'file-decrypt',
          operation_details: {},
          file_size: result.encryptedSize,
          processed_size: result.size,
          processing_time: Date.now() - startTime,
          status: 'completed'
        });
        console.log(`[DECRYPT] Saved to database: ${result.filename}`);
      } catch (dbErr) {
        console.error('[DECRYPT] Database save failed:', dbErr.message);
      }

      // Cleanup input file
      try {
        fs.unlinkSync(file.path);
      } catch {}

      res.status(200).json({
        success: true,
        data: {
          filename: result.filename,
          size: result.size,
          encryptedSize: result.encryptedSize,
          download_url
        }
      });
    } catch (error) {
      console.error('[DECRYPT] Error:', error);
      try { fs.unlinkSync(file.path); } catch {}
      
      let errorMessage = error.message;
      if (errorMessage.startsWith('WRONG_PASSWORD:')) {
        errorMessage = errorMessage.replace('WRONG_PASSWORD:', '').trim();
      }
      
      res.status(400).json({ success: false, error: errorMessage });
    }
  })
);

export default router;
