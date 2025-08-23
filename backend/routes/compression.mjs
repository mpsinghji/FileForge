import express from 'express';
import { uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { addFileHistory, updateFileHistory, addProcessingJob, updateProcessingJob, getFileHistoryById } from '../utils/database.mjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// File compression endpoint
router.post('/compress', uploadMultiple, handleUploadError, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files uploaded for compression'
    });
  }

  const { 
    compressionLevel = 'medium', 
    preserveQuality = true, 
    removeMetadata = false 
  } = req.body;

  // Validate compression level
  const validLevels = ['light', 'medium', 'high', 'extreme'];
  if (!validLevels.includes(compressionLevel)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid compression level. Must be one of: light, medium, high, extreme'
    });
  }

  const jobId = uuidv4();
  const compressionJobs = [];

  // Process each file
  for (const file of req.files) {
    const fileHistoryId = await addFileHistory({
      original_filename: file.originalname,
      original_path: file.path,
      operation_type: 'compression',
      operation_details: {
        compressionLevel,
        preserveQuality,
        removeMetadata,
        mimetype: file.mimetype,
        size: file.size
      },
      file_size: file.size
    });

    await addProcessingJob({
      job_id: `${jobId}-${fileHistoryId}`,
      file_history_id: fileHistoryId,
      operation_type: 'compression'
    });

    compressionJobs.push({
      jobId: `${jobId}-${fileHistoryId}`,
      fileHistoryId,
      originalFile: file.originalname,
      compressionLevel
    });
  }

  // Start compression process in background
  processCompression(jobId, compressionJobs, compressionLevel, preserveQuality, removeMetadata);

  res.status(200).json({
    success: true,
    message: 'Compression started',
    data: {
      jobId,
      totalFiles: compressionJobs.length,
      compressionLevel,
      preserveQuality,
      removeMetadata,
      jobs: compressionJobs.map(job => ({
        jobId: job.jobId,
        originalFile: job.originalFile,
        compressionLevel: job.compressionLevel
      }))
    }
  });
}));

// Get compression status
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

  res.status(200).json({
    success: true,
    data: {
      jobId: job.job_id,
      status: job.status,
      progress: job.progress,
      logs: job.logs ? JSON.parse(job.logs) : [],
      originalFile: fileHistory.original_filename,
      originalSize: fileHistory.file_size,
      compressedFile: fileHistory.processed_filename,
      compressedSize: fileHistory.processed_size,
      compressionRatio: fileHistory.processed_size ? 
        Math.round(((fileHistory.file_size - fileHistory.processed_size) / fileHistory.file_size) * 100) : 0,
      downloadUrl: fileHistory.processed_path ? `/processed/${path.basename(fileHistory.processed_path)}` : null
    }
  });
}));

// Get compression levels info
router.get('/levels', asyncHandler(async (req, res) => {
  const compressionLevels = [
    {
      value: 'light',
      label: 'Light',
      description: 'Minimal compression, fast processing',
      savings: '10-20%',
      quality: 'Excellent',
      speed: 'Fast'
    },
    {
      value: 'medium',
      label: 'Medium',
      description: 'Balanced compression and quality',
      savings: '30-50%',
      quality: 'Very Good',
      speed: 'Medium'
    },
    {
      value: 'high',
      label: 'High',
      description: 'Maximum compression, smaller files',
      savings: '50-70%',
      quality: 'Good',
      speed: 'Slow'
    },
    {
      value: 'extreme',
      label: 'Extreme',
      description: 'Ultra compression, may affect quality',
      savings: '70-90%',
      quality: 'Acceptable',
      speed: 'Very Slow'
    }
  ];

  res.status(200).json({
    success: true,
    data: compressionLevels
  });
}));

// Get compression history
router.get('/history', asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const history = await getFileHistory(parseInt(limit), parseInt(offset), 'compression');

  // Calculate compression ratios
  const historyWithRatios = history.map(item => ({
    ...item,
    compressionRatio: item.processed_size ? 
      Math.round(((item.file_size - item.processed_size) / item.file_size) * 100) : 0
  }));

  res.status(200).json({
    success: true,
    data: {
      compressions: historyWithRatios,
      total: historyWithRatios.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// Get compression statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const history = await getFileHistory(1000, 0, 'compression');
  
  const completedCompressions = history.filter(item => item.status === 'completed' && item.processed_size);
  
  if (completedCompressions.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        totalFiles: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 0,
        averageProcessingTime: 0,
        compressionByLevel: {}
      }
    });
  }

  const totalOriginalSize = completedCompressions.reduce((sum, item) => sum + item.file_size, 0);
  const totalCompressedSize = completedCompressions.reduce((sum, item) => sum + item.processed_size, 0);
  const averageCompressionRatio = Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100);
  const averageProcessingTime = completedCompressions.reduce((sum, item) => sum + (item.processing_time || 0), 0) / completedCompressions.length;

  // Group by compression level
  const compressionByLevel = {};
  completedCompressions.forEach(item => {
    const details = JSON.parse(item.operation_details || '{}');
    const level = details.compressionLevel || 'unknown';
    if (!compressionByLevel[level]) {
      compressionByLevel[level] = {
        count: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageRatio: 0
      };
    }
    compressionByLevel[level].count++;
    compressionByLevel[level].totalOriginalSize += item.file_size;
    compressionByLevel[level].totalCompressedSize += item.processed_size;
  });

  // Calculate average ratios for each level
  Object.keys(compressionByLevel).forEach(level => {
    const data = compressionByLevel[level];
    data.averageRatio = Math.round(((data.totalOriginalSize - data.totalCompressedSize) / data.totalOriginalSize) * 100);
  });

  res.status(200).json({
    success: true,
    data: {
      totalFiles: completedCompressions.length,
      totalOriginalSize,
      totalCompressedSize,
      averageCompressionRatio,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      compressionByLevel
    }
  });
}));

// Background compression processing function
async function processCompression(mainJobId, compressionJobs, compressionLevel, preserveQuality, removeMetadata) {
  const { compressFile } = await import('../services/compressionService.mjs');

  for (const job of compressionJobs) {
    try {
      // Update job status to processing
      await updateProcessingJob(job.jobId, {
        status: 'processing',
        progress: 0,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Starting compression...' }])
      });

      // Get file history
      const fileHistory = await getFileHistoryById(job.fileHistoryId);
      
      // Compress file
      const result = await compressFile(
        fileHistory.original_path,
        compressionLevel,
        preserveQuality,
        removeMetadata,
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

      // Update job status to completed
      await updateProcessingJob(job.jobId, {
        status: 'completed',
        progress: 100,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Compression completed successfully' }])
      });

    } catch (error) {
      console.error(`Compression failed for job ${job.jobId}:`, error);

      // Update job status to failed
      await updateProcessingJob(job.jobId, {
        status: 'failed',
        progress: 0,
        logs: JSON.stringify([{ timestamp: new Date().toISOString(), message: `Compression failed: ${error.message}` }])
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
