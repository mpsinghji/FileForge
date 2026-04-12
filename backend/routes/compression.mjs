import express from 'express';
import { uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { addFileHistory, updateFileHistory, addProcessingJob, updateProcessingJob, getFileHistoryById, getProcessingJob } from '../services/databaseService.js';
import { guestAddFileHistory, guestUpdateFileHistory, guestGetFileHistory, guestAddJob, guestUpdateJob, guestGetJob } from '../services/guestJobStore.mjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the request has a real authenticated user */
function isAuthenticated(req) {
  return !!(req.user && req.user.userId);
}

/**
 * Save file history to DB (auth users) or in-memory store (guests).
 * Always returns a string/ObjectId that can be used as fileHistoryId.
 */
async function saveFileHistory(req, data) {
  if (isAuthenticated(req)) {
    try {
      return await addFileHistory({ ...data, user_id: req.user.userId, is_guest: false });
    } catch (dbErr) {
      console.error('[DB] addFileHistory failed:', dbErr.message);
    }
  }
  // Guest: save to in-memory store, mark as guest
  return guestAddFileHistory({ ...data, user_id: null, is_guest: true });
}

async function saveProcessingJob(req, jobId, fileHistoryId, operationType) {
  if (isAuthenticated(req)) {
    try {
      await addProcessingJob({ job_id: jobId, file_history_id: fileHistoryId, operation_type: operationType });
      return;
    } catch (dbErr) {
      console.error('[DB] addProcessingJob failed:', dbErr.message);
    }
  }
  guestAddJob(jobId, fileHistoryId, operationType);
}

async function getJobStatus(req, jobId) {
  // Try DB first (for auth users)
  try {
    const job = await getProcessingJob(jobId);
    if (job) return { source: 'db', job };
  } catch (_) {}
  // Fall back to in-memory store (guest)
  const job = guestGetJob(jobId);
  if (job) return { source: 'guest', job };
  return null;
}

async function getHistoryRecord(req, historyId) {
  try {
    const r = await getFileHistoryById(historyId);
    if (r) return r;
  } catch (_) {}
  return guestGetFileHistory(historyId);
}

// ─── File compression endpoint ────────────────────────────────────────────────
router.post('/compress', authenticateToken, uploadMultiple, handleUploadError, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded for compression' });
  }

  const { compressionLevel = 'medium', preserveQuality = true, removeMetadata = false } = req.body;

  // Coerce — never reject, just default to 'medium'
  const validLevels = ['light', 'medium', 'high', 'extreme'];
  const safeLevel = validLevels.includes(String(compressionLevel)) ? String(compressionLevel) : 'medium';

  const jobId = uuidv4();
  const compressionJobs = [];

  for (const file of req.files) {
    const fileHistoryId = await saveFileHistory(req, {
      original_filename: file.originalname,
      original_path: file.path,
      operation_type: 'compression',
      operation_details: { compressionLevel: safeLevel, preserveQuality, removeMetadata, mimetype: file.mimetype, size: file.size },
      file_size: file.size,
    });

    const jobId2 = `${jobId}-${fileHistoryId}`;
    await saveProcessingJob(req, jobId2, fileHistoryId, 'compression');
    compressionJobs.push({ jobId: jobId2, fileHistoryId, originalFile: file.originalname, compressionLevel: safeLevel });
  }

  processCompression(jobId, compressionJobs, safeLevel, preserveQuality, removeMetadata, req);

  res.status(200).json({
    success: true,
    message: 'Compression started',
    data: {
      jobId,
      totalFiles: compressionJobs.length,
      compressionLevel: safeLevel,
      preserveQuality,
      removeMetadata,
      jobs: compressionJobs.map(job => ({ jobId: job.jobId, originalFile: job.originalFile, compressionLevel: job.compressionLevel }))
    }
  });
}));

// ─── Multi-file archive creation (ZIP/7z) ────────────────────────────────────
router.post('/archive', asyncHandler(async (req, res) => {
  const { files = [], outputFormat = 'zip', compressionLevel = 'medium', archiveName = null, password = null } = req.body;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'files must be a non-empty array of paths' });
  }
  const { createArchiveFromFiles } = await import('../services/compressionService.mjs');
  const result = await createArchiveFromFiles(files, outputFormat, compressionLevel, archiveName, password, null);
  res.status(200).json({ success: true, data: result });
}));

// ─── Get compression status ───────────────────────────────────────────────────
router.get('/status/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const found = await getJobStatus(req, jobId);

  if (!found) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  const { job } = found;
  const fileHistory = await getHistoryRecord(req, job.file_history_id);

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
      originalSize: fileHistory?.file_size,
      compressionRatio: fileHistory?.processed_size && fileHistory?.file_size
        ? Math.round(((fileHistory.file_size - fileHistory.processed_size) / fileHistory.file_size) * 100)
        : null,
      downloadUrl: fileHistory?.download_url || null
    }
  });
}));

// ─── Get compression levels ───────────────────────────────────────────────────
router.get('/levels', asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      levels: [
        { value: 'light', label: 'Light', description: 'Minimal compression, preserves maximum quality', estimatedReduction: '10-20%' },
        { value: 'medium', label: 'Medium', description: 'Balanced compression and quality', estimatedReduction: '30-50%' },
        { value: 'high', label: 'High', description: 'Maximum compression, smaller file sizes', estimatedReduction: '50-70%' },
        { value: 'extreme', label: 'Extreme', description: 'Extreme compression, may reduce quality', estimatedReduction: '60-80%' }
      ]
    }
  });
}));

// ─── Get compression history ──────────────────────────────────────────────────
router.get('/history', asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  let history = [];
  if (isAuthenticated(req)) {
    const { getFileHistory } = await import('../services/databaseService.js');
    history = await getFileHistory(parseInt(limit), parseInt(offset), 'compression', req.user.userId);
  }
  res.status(200).json({ success: true, data: { compressions: history, total: history.length } });
}));

// ─── Get compression stats ────────────────────────────────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { totalCompressions: 0, note: 'Stats available for authenticated users only' } });
}));

// ─── Background compression processing ───────────────────────────────────────
async function processCompression(mainJobId, compressionJobs, compressionLevel, preserveQuality, removeMetadata, req) {
  const { compressFile } = await import('../services/compressionService.mjs');
  const { runWithConcurrency } = await import('../services/queue.mjs');
  const concurrency = parseInt(process.env.CONCURRENCY || '2');

  const updateJob = isAuthenticated(req)
    ? (id, data) => updateProcessingJob(id, data).catch(e => guestUpdateJob(id, data))
    : (id, data) => guestUpdateJob(id, data);

  const updateHistory = isAuthenticated(req)
    ? (id, data) => updateFileHistory(id, data).catch(e => guestUpdateFileHistory(id, data))
    : (id, data) => guestUpdateFileHistory(id, data);

  await runWithConcurrency(compressionJobs, async (job) => {
    try {
      await updateJob(job.jobId, { status: 'processing', progress: 0, logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Starting compression...' }]) });

      const fileHistory = await getHistoryRecord(req, job.fileHistoryId);
      const result = await compressFile(
        fileHistory.original_path,
        compressionLevel,
        preserveQuality,
        removeMetadata,
        fileHistory.original_filename,
        (progress, log) => {
          updateJob(job.jobId, { status: 'processing', progress, logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: log }]) });
        }
      );

      let download_url = null;
      try {
        const { uploadToSupabase } = await import('../services/supabaseService.js');
        const sup = await uploadToSupabase(result.path, `compressed/${path.basename(result.path)}`);
        download_url = sup.publicUrl;
        try { fs.unlinkSync(result.path); } catch {}
      } catch (supErr) {
        console.warn('[COMPRESS] Supabase upload failed:', supErr.message);
        download_url = `/api/processed/${path.basename(result.path)}`;
      }

      await updateHistory(job.fileHistoryId, {
        processed_filename: result.filename,
        processed_path: result.path,
        download_url,
        processed_size: result.size,
        original_size: result.originalSize,
        processing_time: result.processingTime,
        status: 'completed'
      });
      await updateJob(job.jobId, { status: 'completed', progress: 100, logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Compression completed' }]) });
    } catch (error) {
      console.error('[COMPRESS] Error:', error.message);
      await updateJob(job.jobId, { status: 'failed', progress: 0, logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: `Compression failed: ${error.message}` }]) });
      await updateHistory(job.fileHistoryId, { status: 'failed', error_message: error.message });
    }
  }, concurrency);
}

export default router;
