import express from 'express';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload.mjs';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { addFileHistory } from '../utils/database.mjs';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Single file upload
router.post('/single', uploadSingle, handleUploadError, asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  const file = req.file;
  const fileInfo = {
    original_filename: file.originalname,
    original_path: file.path,
    operation_type: 'upload',
    operation_details: {
      mimetype: file.mimetype,
      size: file.size,
      encoding: file.encoding
    },
    file_size: file.size
  };

  // Add to database
  const fileHistoryId = await addFileHistory(fileInfo);

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      id: fileHistoryId,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      uploadUrl: `/uploads/${path.basename(file.path)}`
    }
  });
}));

// Multiple files upload
router.post('/multiple', uploadMultiple, handleUploadError, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files uploaded'
    });
  }

  const uploadedFiles = [];
  const fileHistoryIds = [];

  for (const file of req.files) {
    const fileInfo = {
      original_filename: file.originalname,
      original_path: file.path,
      operation_type: 'upload',
      operation_details: {
        mimetype: file.mimetype,
        size: file.size,
        encoding: file.encoding
      },
      file_size: file.size
    };

    // Add to database
    const fileHistoryId = await addFileHistory(fileInfo);
    fileHistoryIds.push(fileHistoryId);

    uploadedFiles.push({
      id: fileHistoryId,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      uploadUrl: `/uploads/${path.basename(file.path)}`
    });
  }

  res.status(200).json({
    success: true,
    message: `${uploadedFiles.length} files uploaded successfully`,
    data: {
      files: uploadedFiles,
      totalFiles: uploadedFiles.length,
      totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0)
    }
  });
}));

// Get file info
router.get('/info/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join('uploads', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }

  const stats = fs.statSync(filePath);
  const fileInfo = {
    filename,
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    path: filePath,
    downloadUrl: `/uploads/${filename}`
  };

  res.status(200).json({
    success: true,
    data: fileInfo
  });
}));

// Delete file
router.delete('/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join('uploads', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }

  try {
    fs.unlinkSync(filePath);
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
}));

// List uploaded files
router.get('/list', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const uploadsDir = 'uploads';

  if (!fs.existsSync(uploadsDir)) {
    return res.status(200).json({
      success: true,
      data: {
        files: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  }

  const files = fs.readdirSync(uploadsDir)
    .filter(file => {
      const filePath = path.join(uploadsDir, file);
      return fs.statSync(filePath).isFile();
    })
    .map(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        downloadUrl: `/uploads/${file}`
      };
    })
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  const totalFiles = fs.readdirSync(uploadsDir).filter(file => {
    const filePath = path.join(uploadsDir, file);
    return fs.statSync(filePath).isFile();
  }).length;

  res.status(200).json({
    success: true,
    data: {
      files,
      total: totalFiles,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// Get upload statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const uploadsDir = 'uploads';

  if (!fs.existsSync(uploadsDir)) {
    return res.status(200).json({
      success: true,
      data: {
        totalFiles: 0,
        totalSize: 0,
        averageSize: 0,
        fileTypes: {}
      }
    });
  }

  const files = fs.readdirSync(uploadsDir).filter(file => {
    const filePath = path.join(uploadsDir, file);
    return fs.statSync(filePath).isFile();
  });

  let totalSize = 0;
  const fileTypes = {};

  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;

    const ext = path.extname(file).toLowerCase();
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  });

  const stats = {
    totalFiles: files.length,
    totalSize,
    averageSize: files.length > 0 ? Math.round(totalSize / files.length) : 0,
    fileTypes
  };

  res.status(200).json({
    success: true,
    data: stats
  });
}));

export default router;
