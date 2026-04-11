import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { generateQRCode } from '../services/qrCodeService.mjs';
import { addFileHistory } from '../services/databaseService.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const router = express.Router();

// Generate QR code endpoint
router.post('/generate',
  asyncHandler(async (req, res) => {
    const { 
      text, 
      size = 512, 
      format = 'png',
      errorCorrectionLevel = 'M',
      darkColor = '#000000',
      lightColor = '#FFFFFF',
      margin = 4
    } = req.body;
    const startTime = Date.now();

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text or URL is required to generate QR code' 
      });
    }

    try {
      const result = await generateQRCode(
        text,
        {
          size: parseInt(size),
          format,
          errorCorrectionLevel,
          darkColor,
          lightColor,
          margin: parseInt(margin)
        },
        (progress, message) => {
          console.log(`[QR CODE] ${progress}% - ${message}`);
        }
      );

      // Upload to Supabase
      let download_url = null;
      let supabase_path = null;
      
      try {
        const { uploadToSupabase } = await import('../services/supabaseService.js');
        const sup = await uploadToSupabase(result.path, `qrcode/${result.filename}`);
        download_url = sup.publicUrl;
        supabase_path = sup.supabasePath;
        fs.unlinkSync(result.path);
      } catch (supErr) {
        console.warn('[QR CODE] Supabase upload failed:', supErr.message);
        const relativePath = path.relative('processed', result.path).replace(/\\/g, '/');
        download_url = `${process.env.BACKEND_URL || 'http://localhost:3001'}/processed/${relativePath}`;
      }

      // Save to database
      const user_id = req.user?.id || new mongoose.Types.ObjectId();
      try {
        await addFileHistory({
          user_id: user_id,
          original_filename: 'QR Code',
          original_path: result.path,
          processed_filename: result.filename,
          processed_path: result.path,
          download_url: download_url,
          supabase_path: supabase_path,
          operation_type: 'qr-generate',
          operation_details: {
            text: text.substring(0, 100), // Store first 100 chars
            size: size,
            format: format,
            errorCorrectionLevel: errorCorrectionLevel
          },
          file_size: 0,
          processed_size: result.size,
          processing_time: Date.now() - startTime,
          status: 'completed'
        });
        console.log(`[QR CODE] Saved to database: ${result.filename}`);
      } catch (dbErr) {
        console.error('[QR CODE] Database save failed:', dbErr.message);
      }

      // Cleanup
      try {
        fs.rmSync(path.dirname(result.path), { recursive: true, force: true });
      } catch {}

      res.status(200).json({
        success: true,
        data: {
          filename: result.filename,
          size: result.size,
          format: result.format,
          text: result.text,
          download_url
        }
      });
    } catch (error) {
      console.error('[QR CODE] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

export default router;
