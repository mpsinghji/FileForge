import express from 'express';
import { uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { addFileHistory, updateFileHistory, addProcessingJob, updateProcessingJob, getFileHistoryById, getProcessingJob } from '../services/databaseService.js';
import { guestAddFileHistory, guestUpdateFileHistory, guestGetFileHistory, guestAddJob, guestUpdateJob, guestGetJob } from '../services/guestJobStore.mjs';
import { estimateConvertedSize } from '../services/compressionService.mjs';
import { runWithConcurrency } from '../services/queue.mjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// — Auth helpers —
function isAuthenticated(req) { return !!(req.user && req.user.userId); }
async function saveFileHistory(req, data) {
  if (isAuthenticated(req)) { try { return await addFileHistory({ ...data, user_id: req.user.userId, is_guest: false }); } catch(e){ console.warn('[DB]',e.message); } }
  return guestAddFileHistory({ ...data, user_id: null, is_guest: true });
}
async function saveProcessingJob(req, jobId, fileHistoryId, opType) {
  if (isAuthenticated(req)) { try { await addProcessingJob({ job_id: jobId, file_history_id: fileHistoryId, operation_type: opType }); return; } catch(e){ console.warn('[DB]',e.message); } }
  guestAddJob(jobId, fileHistoryId, opType);
}
async function resolveJob(jobId) {
  try { const j = await getProcessingJob(jobId); if(j) return {source:'db',job:j}; } catch(_){}
  const j = guestGetJob(jobId); if(j) return {source:'guest',job:j}; return null;
}
async function resolveHistory(id) {
  try { const r = await getFileHistoryById(id); if(r) return r; } catch(_){}
  return guestGetFileHistory(id);
}
async function doUpdateJob(jobId, data) {
  try { await updateProcessingJob(jobId, data); } catch(_){}
  guestUpdateJob(jobId, data);
}
async function doUpdateHistory(histId, data) {
  try { await updateFileHistory(histId, data); } catch(_){}
  guestUpdateFileHistory(histId, data);
}

// File conversion endpoint
router.post('/convert', uploadMultiple, handleUploadError, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded for conversion' });
  }

  const { targetFormat } = req.body;
  if (!targetFormat) {
    return res.status(400).json({ success: false, error: 'Target format is required' });
  }

  const safeFormat = String(targetFormat).toLowerCase().trim();
  console.log('[CONVERT] targetFormat received:', safeFormat);

  const jobId = uuidv4();
  const conversionJobs = [];

  for (const file of req.files) {
    const fileHistoryId = await saveFileHistory(req, {
      original_filename: file.originalname,
      original_path: file.path,
      operation_type: 'conversion',
      operation_details: { targetFormat: safeFormat, mimetype: file.mimetype, size: file.size },
      file_size: file.size,
    });
    const jobId2 = `${jobId}-${fileHistoryId}`;
    await saveProcessingJob(req, jobId2, fileHistoryId, 'conversion');
    conversionJobs.push({ jobId: jobId2, fileHistoryId, originalFile: file.originalname, targetFormat: safeFormat });
  }

  processConversion(jobId, conversionJobs, safeFormat, req);

  res.status(200).json({
    success: true,
    message: 'Conversion started',
    data: {
      jobId,
      totalFiles: conversionJobs.length,
      targetFormat: safeFormat,
      jobs: conversionJobs.map(job => ({ jobId: job.jobId, originalFile: job.originalFile, targetFormat: job.targetFormat }))
    }
  });
}));

// Get conversion status
router.get('/status/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const found = await resolveJob(jobId);

  if (!found) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  const { job } = found;
  const fileHistory = await resolveHistory(job.file_history_id);

  res.status(200).json({
    success: true,
    data: {
      jobId: job.job_id,
      status: job.status,
      progress: job.progress,
      logs: job.logs ? (typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs) : [],
      originalFile: fileHistory?.original_filename,
      processedFile: fileHistory?.processed_filename,
      processedSize: fileHistory?.processed_size,
      downloadUrl: fileHistory?.download_url || null
    }
  });
}));

// Get supported formats
router.get('/formats', asyncHandler(async (req, res) => {
  const supportedFormats = {
    images: {
      formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'],
      description: 'Image file formats'
    },
    videos: {
      formats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
      description: 'Video file formats'
    },
    audio: {
      formats: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
      description: 'Audio file formats'
    },
    documents: {
      formats: ['pdf', 'docx', 'txt'],
      description: 'Document file formats'
    }
  };

  res.status(200).json({
    success: true,
    data: supportedFormats
  });
}));

// Presets and size estimate
router.post('/estimate', asyncHandler(async (req, res) => {
  const { kind, quality = 'medium', sizeBytes = 0 } = req.body;
  const estimated = estimateConvertedSize(Number(sizeBytes || 0), kind, quality);
  const presets = {
    video: [
      { name: 'Web MP4 (H.264)', options: ['-c:v libx264', '-preset medium', '-crf 23', '-c:a aac', '-b:a 128k'] },
      { name: 'High Quality', options: ['-c:v libx264', '-preset slow', '-crf 18', '-c:a aac', '-b:a 192k'] }
    ],
    audio: [
      { name: 'Standard MP3', options: ['-c:a mp3', '-b:a 128k'] },
      { name: 'High MP3', options: ['-c:a mp3', '-b:a 192k'] }
    ],
    image: [
      { name: 'WebP Balanced', options: ['webpQuality=80', 'webpEffort=4'] },
      { name: 'JPEG High', options: ['jpegQuality=90'] }
    ]
  };
  res.status(200).json({ success: true, data: { estimatedSize: estimated, presets } });
}));

// Smart suggestions based on filename/extension
router.post('/suggest', asyncHandler(async (req, res) => {
  const { filename = '', mimetype = '', sizeBytes = 0 } = req.body;
  const lower = String(filename).toLowerCase();
  const suggestions = [];
  if (lower.endsWith('.mov')) suggestions.push({ reason: 'Better compatibility', target: 'mp4' });
  if (lower.endsWith('.heic')) suggestions.push({ reason: 'Web sharing', target: 'jpg' });
  if (lower.endsWith('.wav')) suggestions.push({ reason: 'Smaller size', target: 'mp3' });
  if (lower.endsWith('.bmp')) suggestions.push({ reason: 'Web optimized', target: 'png' });
  const estimatedMp4 = estimateConvertedSize(Number(sizeBytes || 0), 'video', 'medium');
  res.status(200).json({ success: true, data: { suggestions, estimates: { mp4: estimatedMp4 } } });
}));

// Get conversion history
router.get('/history', asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const history = await getFileHistory(parseInt(limit), parseInt(offset), 'conversion');

  res.status(200).json({
    success: true,
    data: {
      conversions: history,
      total: history.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// Background conversion processing function — uses doUpdateJob/doUpdateHistory (works for both auth and guest)
async function processConversion(mainJobId, conversionJobs, targetFormat, req) {
  const { convertFile } = await import('../services/conversionService.mjs');
  const concurrency = parseInt(process.env.CONCURRENCY || '2');
  await runWithConcurrency(conversionJobs, async (job) => {
    try {
      await doUpdateJob(job.jobId, { status: 'processing', progress: 0, logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Starting conversion...' }]) });
      const fileHistory = await resolveHistory(job.fileHistoryId);
      const result = await convertFile(fileHistory.original_path, targetFormat, fileHistory.original_filename, (progress, log) => {
        doUpdateJob(job.jobId, { status: 'processing', progress, logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: log }]) });
      });

      let download_url = null;
      let supabasePath = null;
      try {
        const { uploadToSupabase } = await import('../services/supabaseService.js');
        const sup = await uploadToSupabase(result.path, `converted/${path.basename(result.path)}`);
        download_url = sup.publicUrl;
        supabasePath = sup.supabasePath;
        try { fs.unlinkSync(result.path); } catch {}
      } catch (supErr) {
        console.warn('[CONVERT] Supabase upload failed:', supErr.message);
        download_url = `/api/processed/${path.basename(result.path)}`;
      }

      await doUpdateHistory(job.fileHistoryId, { processed_filename: result.filename, processed_path: result.path, download_url, supabase_path: supabasePath, processed_size: result.size, processing_time: result.processingTime, status: 'completed' });
      await doUpdateJob(job.jobId, { status: 'completed', progress: 100, logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Conversion completed successfully' }]) });
    } catch (error) {
      console.error('[CONVERT] Error:', error.message);
      await doUpdateJob(job.jobId, { status: 'failed', progress: 0, logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: `Conversion failed: ${error.message}` }]) });
      await doUpdateHistory(job.fileHistoryId, { status: 'failed', error_message: error.message });
    }
  }, concurrency);
}

export default router;

