import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { 
  getFileHistory, 
  getFileHistoryById, 
  getFileMetadata, 
  cleanupOldFiles 
} from '../utils/database.mjs';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Get all processing history
router.get('/', asyncHandler(async (req, res) => {
  const { 
    limit = 50, 
    offset = 0, 
    operation_type = null,
    status = null,
    start_date = null,
    end_date = null
  } = req.query;

  let history = await getFileHistory(parseInt(limit), parseInt(offset), operation_type);

  // Filter by status if provided
  if (status) {
    history = history.filter(item => item.status === status);
  }

  // Filter by date range if provided
  if (start_date || end_date) {
    history = history.filter(item => {
      const itemDate = new Date(item.created_at);
      const start = start_date ? new Date(start_date) : null;
      const end = end_date ? new Date(end_date) : null;

      if (start && end) {
        return itemDate >= start && itemDate <= end;
      } else if (start) {
        return itemDate >= start;
      } else if (end) {
        return itemDate <= end;
      }
      return true;
    });
  }

  // Calculate additional metrics for each item
  const historyWithMetrics = history.map(item => {
    const metrics = {
      ...item,
      compressionRatio: null,
      processingTimeFormatted: null,
      fileSizeFormatted: null,
      processedSizeFormatted: null
    };

    // Calculate compression ratio for compression operations
    if (item.operation_type === 'compression' && item.processed_size) {
      metrics.compressionRatio = Math.round(((item.file_size - item.processed_size) / item.file_size) * 100);
    }

    // Format processing time
    if (item.processing_time) {
      metrics.processingTimeFormatted = `${Math.round(item.processing_time * 100) / 100}s`;
    }

    // Format file sizes
    metrics.fileSizeFormatted = formatFileSize(item.file_size);
    if (item.processed_size) {
      metrics.processedSizeFormatted = formatFileSize(item.processed_size);
    }

    return metrics;
  });

  res.status(200).json({
    success: true,
    data: {
      history: historyWithMetrics,
      total: historyWithMetrics.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      filters: {
        operation_type,
        status,
        start_date,
        end_date
      }
    }
  });
}));

// Get specific file history by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const fileHistory = await getFileHistoryById(parseInt(id));

  if (!fileHistory) {
    return res.status(404).json({
      success: false,
      error: 'File history not found'
    });
  }

  // Get metadata if available
  const metadata = await getFileMetadata(parseInt(id));

  // Calculate metrics
  const metrics = {
    ...fileHistory,
    compressionRatio: null,
    processingTimeFormatted: null,
    fileSizeFormatted: formatFileSize(fileHistory.file_size),
    processedSizeFormatted: fileHistory.processed_size ? formatFileSize(fileHistory.processed_size) : null,
    downloadUrl: fileHistory.processed_path ? `/processed/${path.basename(fileHistory.processed_path)}` : null,
    originalUrl: `/uploads/${path.basename(fileHistory.original_path)}`,
    metadata
  };

  if (fileHistory.operation_type === 'compression' && fileHistory.processed_size) {
    metrics.compressionRatio = Math.round(((fileHistory.file_size - fileHistory.processed_size) / fileHistory.file_size) * 100);
  }

  if (fileHistory.processing_time) {
    metrics.processingTimeFormatted = `${Math.round(fileHistory.processing_time * 100) / 100}s`;
  }

  res.status(200).json({
    success: true,
    data: metrics
  });
}));

// Get processing statistics
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const { start_date = null, end_date = null } = req.query;

  // Get all history for statistics
  const allHistory = await getFileHistory(10000, 0);

  // Filter by date range if provided
  let filteredHistory = allHistory;
  if (start_date || end_date) {
    filteredHistory = allHistory.filter(item => {
      const itemDate = new Date(item.created_at);
      const start = start_date ? new Date(start_date) : null;
      const end = end_date ? new Date(end_date) : null;

      if (start && end) {
        return itemDate >= start && itemDate <= end;
      } else if (start) {
        return itemDate >= start;
      } else if (end) {
        return itemDate <= end;
      }
      return true;
    });
  }

  // Calculate statistics
  const stats = {
    totalFiles: filteredHistory.length,
    totalSize: filteredHistory.reduce((sum, item) => sum + item.file_size, 0),
    totalProcessedSize: filteredHistory.reduce((sum, item) => sum + (item.processed_size || 0), 0),
    averageProcessingTime: 0,
    operationsByType: {},
    statusDistribution: {},
    recentActivity: []
  };

  // Calculate average processing time
  const completedItems = filteredHistory.filter(item => item.processing_time);
  if (completedItems.length > 0) {
    stats.averageProcessingTime = completedItems.reduce((sum, item) => sum + item.processing_time, 0) / completedItems.length;
  }

  // Group by operation type
  filteredHistory.forEach(item => {
    if (!stats.operationsByType[item.operation_type]) {
      stats.operationsByType[item.operation_type] = {
        count: 0,
        totalSize: 0,
        averageTime: 0,
        completed: 0,
        failed: 0
      };
    }
    
    const opStats = stats.operationsByType[item.operation_type];
    opStats.count++;
    opStats.totalSize += item.file_size;
    
    if (item.processing_time) {
      opStats.averageTime += item.processing_time;
    }
    
    if (item.status === 'completed') {
      opStats.completed++;
    } else if (item.status === 'failed') {
      opStats.failed++;
    }
  });

  // Calculate average times for each operation type
  Object.keys(stats.operationsByType).forEach(opType => {
    const opStats = stats.operationsByType[opType];
    const completedOps = filteredHistory.filter(item => 
      item.operation_type === opType && item.processing_time
    );
    if (completedOps.length > 0) {
      opStats.averageTime = opStats.averageTime / completedOps.length;
    }
  });

  // Status distribution
  filteredHistory.forEach(item => {
    stats.statusDistribution[item.status] = (stats.statusDistribution[item.status] || 0) + 1;
  });

  // Recent activity (last 10 items)
  stats.recentActivity = filteredHistory
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)
    .map(item => ({
      id: item.id,
      operation_type: item.operation_type,
      original_filename: item.original_filename,
      status: item.status,
      created_at: item.created_at,
      file_size: formatFileSize(item.file_size)
    }));

  // Format sizes
  stats.totalSizeFormatted = formatFileSize(stats.totalSize);
  stats.totalProcessedSizeFormatted = formatFileSize(stats.totalProcessedSize);
  stats.averageProcessingTimeFormatted = `${Math.round(stats.averageProcessingTime * 100) / 100}s`;

  res.status(200).json({
    success: true,
    data: stats
  });
}));

// Get operation-specific statistics
router.get('/stats/:operationType', asyncHandler(async (req, res) => {
  const { operationType } = req.params;
  const { start_date = null, end_date = null } = req.query;

  const history = await getFileHistory(10000, 0, operationType);

  // Filter by date range if provided
  let filteredHistory = history;
  if (start_date || end_date) {
    filteredHistory = history.filter(item => {
      const itemDate = new Date(item.created_at);
      const start = start_date ? new Date(start_date) : null;
      const end = end_date ? new Date(end_date) : null;

      if (start && end) {
        return itemDate >= start && itemDate <= end;
      } else if (start) {
        return itemDate >= start;
      } else if (end) {
        return itemDate <= end;
      }
      return true;
    });
  }

  const completedItems = filteredHistory.filter(item => item.status === 'completed');
  const failedItems = filteredHistory.filter(item => item.status === 'failed');

  const stats = {
    operationType,
    totalFiles: filteredHistory.length,
    completedFiles: completedItems.length,
    failedFiles: failedItems.length,
    successRate: filteredHistory.length > 0 ? Math.round((completedItems.length / filteredHistory.length) * 100) : 0,
    totalSize: filteredHistory.reduce((sum, item) => sum + item.file_size, 0),
    averageProcessingTime: 0,
    averageFileSize: 0
  };

  if (completedItems.length > 0) {
    stats.averageProcessingTime = completedItems.reduce((sum, item) => sum + (item.processing_time || 0), 0) / completedItems.length;
    stats.averageFileSize = filteredHistory.reduce((sum, item) => sum + item.file_size, 0) / filteredHistory.length;
  }

  // Operation-specific metrics
  if (operationType === 'compression') {
    const compressedItems = completedItems.filter(item => item.processed_size);
    if (compressedItems.length > 0) {
      const totalOriginalSize = compressedItems.reduce((sum, item) => sum + item.file_size, 0);
      const totalCompressedSize = compressedItems.reduce((sum, item) => sum + item.processed_size, 0);
      stats.averageCompressionRatio = Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100);
      stats.totalSpaceSaved = totalOriginalSize - totalCompressedSize;
    }
  }

  // Format values
  stats.totalSizeFormatted = formatFileSize(stats.totalSize);
  stats.averageFileSizeFormatted = formatFileSize(stats.averageFileSize);
  stats.averageProcessingTimeFormatted = `${Math.round(stats.averageProcessingTime * 100) / 100}s`;
  if (stats.totalSpaceSaved) {
    stats.totalSpaceSavedFormatted = formatFileSize(stats.totalSpaceSaved);
  }

  res.status(200).json({
    success: true,
    data: stats
  });
}));

// Cleanup old files
router.delete('/cleanup', asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const deletedCount = await cleanupOldFiles(parseInt(days));

  res.status(200).json({
    success: true,
    message: `Cleaned up ${deletedCount} old files`,
    data: {
      deletedFiles: deletedCount,
      cleanupDays: parseInt(days)
    }
  });
}));

// Helper function to format file sizes
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
