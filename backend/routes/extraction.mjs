import express from 'express';
import { uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { addFileHistory, updateFileHistory, addProcessingJob, updateProcessingJob, addFileMetadata, getFileHistoryById, getFileHistory, getProcessingJob } from '../utils/database.mjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Text extraction endpoint
router.post('/extract', uploadMultiple, handleUploadError, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files uploaded for text extraction'
    });
  }

  const { mode, includeMetadata, language } = req.body;
  const extractionMode = (mode || 'auto');
  const withMetadata = String(includeMetadata) === 'true' || includeMetadata === true;

  // Validate extraction mode
  const validModes = ['auto', 'ocr', 'native', 'hybrid'];
  if (!validModes.includes(extractionMode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid extraction mode. Must be one of: auto, ocr, native, hybrid'
    });
  }

  const jobId = uuidv4();
  const extractionJobs = [];

  // Process each file
  for (const file of req.files) {
    const fileHistoryId = await addFileHistory({
      original_filename: file.originalname,
      original_path: file.path,
      operation_type: 'extraction',
      operation_details: {
        extractionMode,
        outputFormat: 'txt',
        includeMetadata: withMetadata,
        language: language || 'auto',
        mimetype: file.mimetype,
        size: file.size
      },
      file_size: file.size
    });

    await addProcessingJob({
      job_id: `${jobId}-${fileHistoryId}`,
      file_history_id: fileHistoryId,
      operation_type: 'extraction'
    });

    extractionJobs.push({
      jobId: `${jobId}-${fileHistoryId}`,
      fileHistoryId,
      originalFile: file.originalname,
      extractionMode,
      outputFormat: 'txt'
    });
  }

  // Start extraction process in background
  processExtraction(jobId, extractionJobs, extractionMode, withMetadata, language || 'auto');

  res.status(200).json({
    success: true,
    message: 'Text extraction started',
    data: {
      jobId,
      totalFiles: extractionJobs.length,
      extractionMode,
      outputFormat: 'txt',
      includeMetadata,
      language,
      jobs: extractionJobs.map(job => ({
        jobId: job.jobId,
        originalFile: job.originalFile,
        extractionMode: job.extractionMode,
        outputFormat: job.outputFormat
      }))
    }
  });
}));

// Get extraction status
router.get('/status/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await getProcessingJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  const fileHistory = await getFileHistoryById(job.file_history_id);
  const metadata = await getFileMetadata(job.file_history_id);

  res.status(200).json({
    success: true,
    data: {
      jobId: job.job_id,
      status: job.status,
      progress: job.progress,
      logs: job.logs ? JSON.parse(job.logs) : [],
      originalFile: fileHistory.original_filename,
      extractedFile: fileHistory.processed_filename,
      downloadUrl: fileHistory.processed_path ? `/processed/${path.basename(fileHistory.processed_path)}` : null,
      metadata: includeMetadata ? metadata : null
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
  const history = await getFileHistory(parseInt(limit), parseInt(offset), 'extraction');

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
  const history = await getFileHistory(1000, 0, 'extraction');
  
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
      await updateProcessingJob(job.jobId, {
        status: 'processing',
        progress: 0,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Starting text extraction...' }])
      });

      // Get file history
      const fileHistory = await getFileHistoryById(job.fileHistoryId);
      
      // Extract text
      const result = await extractText(
        fileHistory.original_path,
        extractionMode,
        includeMetadata,
        language,
        (progress, log) => {
          updateProcessingJob(job.jobId, {
            status: 'processing',
            progress,
            logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: log }])
          });
        }
      );

      // Update file history with results
      await updateFileHistory(job.fileHistoryId, {
        processed_filename: result.filename,
        processed_path: result.path,
        processed_size: result.size,
        processing_time: result.processingTime,
        status: 'completed'
      });

      // Add metadata if requested
      if (includeMetadata && result.metadata) {
        await addFileMetadata(job.fileHistoryId, result.metadata);
      }

      // Update job status to completed
      await updateProcessingJob(job.jobId, {
        status: 'completed',
        progress: 100,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Text extraction completed successfully' }])
      });

    } catch (error) {
      console.error(`Extraction failed for job ${job.jobId}:`, error);

      // Update job status to failed
      await updateProcessingJob(job.jobId, {
        status: 'failed',
        progress: 0,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: `Extraction failed: ${error.message}` }])
      });

      // Update file history with error
      await updateFileHistory(job.fileHistoryId, {
        status: 'failed',
        error_message: error.message
      });
    }
  }
}

export default router;
