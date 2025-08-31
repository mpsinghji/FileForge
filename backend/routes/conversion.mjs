import express from 'express';
import { uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { addFileHistory, updateFileHistory, addProcessingJob, updateProcessingJob, getFileHistoryById } from '../services/databaseService.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// File conversion endpoint
router.post('/convert', authenticateToken, uploadMultiple, handleUploadError, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files uploaded for conversion'
    });
  }

  const { targetFormat } = req.body;

  console.log('Received conversion request:', { targetFormat, files: req.files.map(f => ({ name: f.originalname, type: f.mimetype })) });

  if (!targetFormat) {
    return res.status(400).json({
      success: false,
      error: 'Target format is required'
    });
  }

  // Validate target format
  const supportedFormats = {
    images: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'],
    videos: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
    audio: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
    documents: ['pdf', 'docx', 'txt']
  };

  const isValidFormat = Object.values(supportedFormats).flat().includes(targetFormat.toLowerCase());
  if (!isValidFormat) {
    return res.status(400).json({
      success: false,
      error: `Unsupported target format: ${targetFormat}`
    });
  }

  const jobId = uuidv4();
  const conversionJobs = [];

  // Process each file
  for (const file of req.files) {
    const fileHistoryId = await addFileHistory({
      original_filename: file.originalname,
      original_path: file.path,
      operation_type: 'conversion',
      operation_details: {
        targetFormat,
        mimetype: file.mimetype,
        size: file.size
      },
      file_size: file.size,
      user_id: req.user.userId
    });

    await addProcessingJob({
      job_id: `${jobId}-${fileHistoryId}`,
      file_history_id: fileHistoryId,
      operation_type: 'conversion'
    });

    conversionJobs.push({
      jobId: `${jobId}-${fileHistoryId}`,
      fileHistoryId,
      originalFile: file.originalname,
      targetFormat
    });
  }

  // Start conversion process in background
  processConversion(jobId, conversionJobs, targetFormat);

  res.status(200).json({
    success: true,
    message: 'Conversion started',
    data: {
      jobId,
      totalFiles: conversionJobs.length,
      targetFormat,
      jobs: conversionJobs.map(job => ({
        jobId: job.jobId,
        originalFile: job.originalFile,
        targetFormat: job.targetFormat
      }))
    }
  });
}));

// Get conversion status
router.get('/status/:jobId', authenticateToken, asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await getProcessingJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  const fileHistory = await getFileHistoryById(job.file_history_id);

  res.status(200).json({
    success: true,
    data: {
      jobId: job.job_id,
      status: job.status,
      progress: job.progress,
      logs: job.logs ? JSON.parse(job.logs) : [],
      originalFile: fileHistory.original_filename,
      processedFile: fileHistory.processed_filename,
      downloadUrl: fileHistory.processed_path ? `/processed/${path.basename(fileHistory.processed_path)}` : null
    }
  });
}));

// Get supported formats
router.get('/formats', authenticateToken, asyncHandler(async (req, res) => {
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

// Get conversion history
router.get('/history', authenticateToken, asyncHandler(async (req, res) => {
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

// Background conversion processing function
async function processConversion(mainJobId, conversionJobs, targetFormat) {
  const { convertFile } = await import('../services/conversionService.mjs');

  for (const job of conversionJobs) {
    try {
      await updateProcessingJob(job.jobId, {
        status: 'processing',
        progress: 0,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Starting conversion...' }])
      });

      const fileHistory = await getFileHistoryById(job.fileHistoryId);
      
      const result = await convertFile(
        fileHistory.original_path,
        targetFormat,
        (progress, log) => {
          updateProcessingJob(job.jobId, {
            status: 'processing',
            progress,
            logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: log }])
          });
        }
      );

      await updateFileHistory(job.fileHistoryId, {
        processed_filename: result.filename,
        processed_path: result.path,
        processed_size: result.size,
        processing_time: result.processingTime,
        status: 'completed'
      });

      await updateProcessingJob(job.jobId, {
        status: 'completed',
        progress: 100,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Conversion completed successfully' }])
      });

    } catch (error) {
      console.error(`Conversion failed for job ${job.jobId}:`, error);

      await updateProcessingJob(job.jobId, {
        status: 'failed',
        progress: 0,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: `Conversion failed: ${error.message}` }])
      });

      await updateFileHistory(job.fileHistoryId, {
        status: 'failed',
        error_message: error.message
      });
    }
  }
}

export default router;
