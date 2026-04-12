import express from 'express';
import { uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { addFileHistory, updateFileHistory, addProcessingJob, updateProcessingJob, getFileHistoryById, getFileHistory, getProcessingJob } from '../services/databaseService.js';
import { guestAddFileHistory, guestUpdateFileHistory, guestGetFileHistory, guestAddJob, guestUpdateJob, guestGetJob } from '../services/guestJobStore.mjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { extractArchive, checkArchiveEncryption } from '../services/archiveExtractionService.mjs';

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

// ─── Password-check endpoint ─────────────────────────────────────────────────
// POST /api/extraction/archive/check
// Accepts a single archive file, returns { encrypted: boolean }
router.post('/archive/check',
  uploadMultiple, handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const file = req.files[0];
    try {
      const result = await checkArchiveEncryption(file.path);
      // Clean up the temp upload
      try { fs.unlinkSync(file.path); } catch { }
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      try { fs.unlinkSync(file.path); } catch { }
      return res.status(500).json({ success: false, error: err.message });
    }
  })
);



// Text extraction endpoint
router.post('/extract', uploadMultiple, handleUploadError, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded for text extraction' });
  }

  const { mode, includeMetadata, language } = req.body;
  const validModes = ['auto', 'ocr', 'native', 'hybrid'];
  const extractionMode = validModes.includes(String(mode)) ? String(mode) : 'auto';
  const withMetadata = String(includeMetadata) === 'true' || includeMetadata === true;

  const jobId = uuidv4();
  const extractionJobs = [];

  for (const file of req.files) {
    const fileHistoryId = await saveFileHistory(req, {
      original_filename: file.originalname,
      original_path: file.path,
      operation_type: 'extraction',
      operation_details: { extractionMode, outputFormat: 'txt', includeMetadata: withMetadata, language: language || 'auto', mimetype: file.mimetype, size: file.size },
      file_size: file.size,
    });
    const jobId2 = `${jobId}-${fileHistoryId}`;
    await saveProcessingJob(req, jobId2, fileHistoryId, 'extraction');
    extractionJobs.push({ jobId: jobId2, fileHistoryId, originalFile: file.originalname, extractionMode, outputFormat: 'txt' });
  }

  processExtraction(jobId, extractionJobs, extractionMode, withMetadata, language || 'auto', req);

  res.status(200).json({
    success: true,
    message: 'Text extraction started',
    data: {
      jobId,
      totalFiles: extractionJobs.length,
      extractionMode,
      outputFormat: 'txt',
      includeMetadata: withMetadata,
      language: language || 'auto',
      jobs: extractionJobs.map(job => ({ jobId: job.jobId, originalFile: job.originalFile, extractionMode: job.extractionMode, outputFormat: job.outputFormat }))
    }
  });
}));

// Get extraction status
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
      extractedFile: fileHistory?.processed_filename,
      downloadUrl: fileHistory?.download_url || null
    }
  });
}));

// Get extraction modes info
router.get('/modes', asyncHandler(async (req, res) => {
  const extractionModes = [
    {
      value: 'auto',
      label: 'Auto Detect',
      description: 'Automatically detect text extraction method',
      icon: '🔍',
      supportedTypes: ['All file types']
    },
    {
      value: 'ocr',
      label: 'OCR Only',
      description: 'Use Optical Character Recognition',
      icon: '👁️',
      supportedTypes: ['Images', 'Scanned documents', 'PDFs']
    },
    {
      value: 'native',
      label: 'Native Text',
      description: 'Extract from text-based documents',
      icon: '📝',
      supportedTypes: ['PDFs', 'Word documents', 'Text files', 'Excel files']
    },
    {
      value: 'hybrid',
      label: 'Hybrid',
      description: 'Combine OCR and native extraction',
      icon: '🔄',
      supportedTypes: ['All file types']
    }
  ];

  res.status(200).json({
    success: true,
    data: extractionModes
  });
}));

// Get supported languages
router.get('/languages', asyncHandler(async (req, res) => {
  const languages = [
    { value: 'auto', label: 'Auto Detect', description: 'Automatically detect language' },
    { value: 'en', label: 'English', description: 'English text recognition' },
    { value: 'es', label: 'Spanish', description: 'Spanish text recognition' },
    { value: 'fr', label: 'French', description: 'French text recognition' },
    { value: 'de', label: 'German', description: 'German text recognition' },
    { value: 'zh', label: 'Chinese', description: 'Chinese text recognition' },
    { value: 'ja', label: 'Japanese', description: 'Japanese text recognition' },
    { value: 'ko', label: 'Korean', description: 'Korean text recognition' },
    { value: 'ru', label: 'Russian', description: 'Russian text recognition' },
    { value: 'ar', label: 'Arabic', description: 'Arabic text recognition' },
    { value: 'hi', label: 'Hindi', description: 'Hindi text recognition' }
  ];

  res.status(200).json({
    success: true,
    data: languages
  });
}));

// Get extraction history
router.get('/history', asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const history = await getFileHistory(parseInt(limit), parseInt(offset), 'extraction', null);

  res.status(200).json({
    success: true,
    data: {
      extractions: history,
      total: history.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// Get extraction statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const history = await getFileHistory(1000, 0, 'extraction', null);

  const completedExtractions = history.filter(item => item.status === 'completed');

  if (completedExtractions.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        totalFiles: 0,
        averageProcessingTime: 0,
        extractionByMode: {},
        extractionByFormat: {},
        averageTextLength: 0
      }
    });
  }

  const averageProcessingTime = completedExtractions.reduce((sum, item) => sum + (item.processing_time || 0), 0) / completedExtractions.length;

  // Group by extraction mode
  const extractionByMode = {};
  completedExtractions.forEach(item => {
    const details = JSON.parse(item.operation_details || '{}');
    const mode = details.extractionMode || 'unknown';
    if (!extractionByMode[mode]) {
      extractionByMode[mode] = { count: 0, averageTime: 0 };
    }
    extractionByMode[mode].count++;
    extractionByMode[mode].averageTime += item.processing_time || 0;
  });

  // Calculate average times for each mode
  Object.keys(extractionByMode).forEach(mode => {
    const data = extractionByMode[mode];
    data.averageTime = Math.round((data.averageTime / data.count) * 100) / 100;
  });

  // Group by output format
  const extractionByFormat = {};
  completedExtractions.forEach(item => {
    const details = JSON.parse(item.operation_details || '{}');
    const format = details.outputFormat || 'unknown';
    if (!extractionByFormat[format]) {
      extractionByFormat[format] = { count: 0 };
    }
    extractionByFormat[format].count++;
  });

  res.status(200).json({
    success: true,
    data: {
      totalFiles: completedExtractions.length,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      extractionByMode,
      extractionByFormat
    }
  });
}));

// Background extraction processing function
async function processExtraction(mainJobId, extractionJobs, extractionMode, includeMetadata, language) {
  const { extractText } = await import('../services/extractionService.mjs');

  for (const job of extractionJobs) {
    try {
      // Update job status to processing
      await doUpdateJob(job.jobId, {
        status: 'processing',
        progress: 0,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Starting text extraction...' }])
      });

      // Get file history
      const fileHistory = await resolveHistory(job.fileHistoryId);

      // Extract text
      const result = await extractText(
        fileHistory.original_path,
        extractionMode,
        includeMetadata,
        language,
        fileHistory.original_filename,
        (progress, log) => {
          doUpdateJob(job.jobId, {
            status: 'processing',
            progress,
            logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: log }])
          });
        }
      );

      const { uploadToSupabase } = await import('../services/supabaseService.js');
      const supabaseResult = await uploadToSupabase(result.path, `extracted/${path.basename(result.path)}`);

      // Update file history with results
      await doUpdateHistory(job.fileHistoryId, {
        processed_filename: result.filename,
        processed_path: result.path,
        download_url: supabaseResult.publicUrl,
        supabase_path: supabaseResult.supabasePath,
        processed_size: result.size,
        processing_time: result.processingTime,
        status: 'completed'
      });

      // Add metadata if requested
      if (includeMetadata && result.metadata) {
        // Need to import addFileMetadata manually or avoid it if not required here.
        // Wait, addFileMetadata is not correctly imported in the original code, but we keep it intact.
        await import('../services/databaseService.js').then(m => {
          if (m.addFileMetadata) m.addFileMetadata(job.fileHistoryId, result.metadata);
        });
      }

      // Update job status to completed
      await doUpdateJob(job.jobId, {
        status: 'completed',
        progress: 100,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Text extraction completed successfully' }])
      });

      if (supabaseResult.publicUrl) {
        import('fs').then(fsMod => fsMod.unlink(result.path, () => {}));
      }

    } catch (error) {
      console.error(`Extraction failed for job ${job.jobId}:`, error);

      // Update job status to failed
      await doUpdateJob(job.jobId, {
        status: 'failed',
        progress: 0,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: `Extraction failed: ${error.message}` }])
      });

      // Update file history with error
      await doUpdateHistory(job.fileHistoryId, {
        status: 'failed',
        error_message: error.message
      });
    }
  }
}

// Test archive extraction endpoint
router.get('/test-archive', authenticateToken, asyncHandler(async (req, res) => {
  console.log('[ARCHIVE TEST] Testing archive extraction service');

  try {
    // Test if the service can be imported
    const { extractArchive } = await import('../services/archiveExtractionService.mjs');
    console.log('[ARCHIVE TEST] Service imported successfully');

    res.status(200).json({
      success: true,
      message: 'Archive extraction service is available',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ARCHIVE TEST] Service test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Archive extraction endpoint
router.post('/archive',
  (req, res, next) => {
    console.log('[ROUTE DEBUG] /archive endpoint hit');
    console.log('[ROUTE DEBUG] Headers:', JSON.stringify(req.headers));
    next();
  },
  /* authenticateToken, */ uploadMultiple, handleUploadError, asyncHandler(async (req, res) => {
    console.log('[ARCHIVE ROUTE DEBUG] Archive extraction request received');
    console.log('[ARCHIVE ROUTE DEBUG] Files:', req.files ? req.files.map(f => ({ name: f.originalname, path: f.path, size: f.size })) : 'No files');
    console.log('[ARCHIVE ROUTE DEBUG] Body:', req.body);

    if (!req.files || req.files.length === 0) {
      console.log('[ARCHIVE ROUTE DEBUG] No files uploaded');
      return res.status(400).json({ success: false, error: 'No archives uploaded' });
    }

    const { extractPath = 'extracted', overwriteExisting = false, password = '' } = req.body;

    const results = [];
    for (const file of req.files) {
      try {
        console.log('[ARCHIVE ROUTE] Processing:', file.originalname);
        const r = await extractArchive(
          file.path,
          {
            extractPath,
            overwriteExisting: String(overwriteExisting) === 'true' || overwriteExisting === true,
            password: password || undefined,
          },
          (progress, message) => {
            console.log(`[ARCHIVE ROUTE] ${progress}% - ${message}`);
          }
        );

        // ── Build a flat file listing from the extraction output dir ──
        let fileList = [];
        if (r.path && fs.existsSync(r.path)) {
          fileList = listExtractedFiles(r.path);
        }

        // Bundle the extracted folder into a single ZIP for clean one-click download
        let download_url = null;
        let bundleFilename = null;
        if (r.path && fs.existsSync(r.path)) {
          try {
            const archiver = (await import('archiver')).default;
            const baseName = path.basename(file.originalname, path.extname(file.originalname));
            bundleFilename = `${baseName}-extracted.zip`;
            const bundlePath = path.join('processed', bundleFilename);
            await new Promise((resolve, reject) => {
              const output = fs.createWriteStream(bundlePath);
              const archive = archiver('zip', { zlib: { level: 6 } });
              output.on('close', resolve);
              archive.on('error', reject);
              archive.pipe(output);
              archive.directory(r.path, false);
              archive.finalize();
            });
            try {
              const { uploadToSupabase } = await import('../services/supabaseService.js');
              const sup = await uploadToSupabase(bundlePath, `extracted/${bundleFilename}`);
              download_url = sup.publicUrl;
              try { fs.unlinkSync(bundlePath); } catch { }
            } catch (supErr) {
              console.warn('[ARCHIVE ROUTE] Supabase upload failed:', supErr.message);
              download_url = `/api/processed/${bundleFilename}`;
            }
            try { fs.rmSync(r.path, { recursive: true, force: true }); } catch { }
          } catch (bundleErr) {
            console.error('[ARCHIVE ROUTE] Bundle failed:', bundleErr.message);
          }
        }

        results.push({
          original: file.originalname,
          success: true,
          filesExtracted: r.filesExtracted,
          size: r.size,
          processingTime: r.processingTime,
          download_url,
          filename: bundleFilename || r.filename,
          fileList,
        });
      } catch (error) {
        console.error('[ARCHIVE ROUTE] Error for', file.originalname, ':', error.message);
        let userMessage = error.message;
        if (userMessage.startsWith('PASSWORD_REQUIRED:')) {
          userMessage = userMessage.replace('PASSWORD_REQUIRED:', '').trim();
        } else if (userMessage.startsWith('WRONG_PASSWORD:')) {
          userMessage = userMessage.replace('WRONG_PASSWORD:', '').trim();
        }
        results.push({ original: file.originalname, error: userMessage, success: false });
      }
    }

    const allFailed = results.every(r => r.success === false);
    if (allFailed) {
      const firstError = results[0]?.error || 'Archive extraction failed';
      return res.status(400).json({ 
        success: false, 
        error: firstError,
        data: { results } 
      });
    }
    res.status(200).json({ success: true, data: { results } });
  }));

// ─── Helper: recursively list all files in an extracted dir ──────────────────
function listExtractedFiles(rootDir) {
  const items = [];
  const walk = (dir, base) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else {
        let size = 0;
        try { size = fs.statSync(fullPath).size; } catch { }
        items.push({ name: entry.name, relativePath: relPath, size });
      }
    }
  };
  walk(rootDir, '');
  return items;
}

export default router;
