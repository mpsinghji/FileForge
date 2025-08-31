import User from '../models/User.js';
import FileHistory from '../models/FileHistory.js';
import ProcessingJob from '../models/ProcessingJob.js';

// User operations
export const createUser = async (userData) => {
  try {
    const user = new User(userData);
    return await user.save();
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern.username) {
        throw new Error('Username already exists');
      }
      if (error.keyPattern.email) {
        throw new Error('Email already exists');
      }
    }
    throw error;
  }
};

export const findUserByEmail = async (email) => {
  try {
    return await User.findOne({ email });
  } catch (error) {
    throw error;
  }
};

export const findUserByUsername = async (username) => {
  try {
    return await User.findOne({ username });
  } catch (error) {
    throw error;
  }
};

export const findUserById = async (id) => {
  try {
    return await User.findById(id);
  } catch (error) {
    throw error;
  }
};

// File History operations
export const addFileHistory = async (fileData) => {
  try {
    const fileHistory = new FileHistory(fileData);
    const savedFile = await fileHistory.save();
    return savedFile._id;
  } catch (error) {
    throw error;
  }
};

export const updateFileHistory = async (id, updateData) => {
  try {
    return await FileHistory.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

export const getFileHistory = async (limit = 50, offset = 0, operation_type = null, user_id = null) => {
  try {
    let query = {};
    
    if (operation_type && user_id) {
      query = { operation_type, user_id };
    } else if (operation_type) {
      query = { operation_type };
    } else if (user_id) {
      query = { user_id };
    }

    return await FileHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('user_id', 'username email');
  } catch (error) {
    throw error;
  }
};

export const getFileHistoryById = async (id) => {
  try {
    return await FileHistory.findById(id).populate('user_id', 'username email');
  } catch (error) {
    throw error;
  }
};

export const deleteFileHistory = async (id) => {
  try {
    // Also delete associated processing jobs
    await ProcessingJob.deleteMany({ file_history_id: id });
    
    // Delete the file history record
    const result = await FileHistory.findByIdAndDelete(id);
    return result;
  } catch (error) {
    throw error;
  }
};

export const getFileHistoryStats = async (user_id = null) => {
  try {
    let matchStage = {};
    if (user_id) {
      matchStage = { user_id };
    }

    const stats = await FileHistory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$operation_type',
          count: { $sum: 1 },
          totalSize: { $sum: '$file_size' },
          avgProcessingTime: { $avg: '$processing_time' }
        }
      }
    ]);

    const totalFiles = await FileHistory.countDocuments(matchStage);
    const completedFiles = await FileHistory.countDocuments({ ...matchStage, status: 'completed' });
    const failedFiles = await FileHistory.countDocuments({ ...matchStage, status: 'failed' });

    return {
      totalFiles,
      completedFiles,
      failedFiles,
      operationStats: stats
    };
  } catch (error) {
    throw error;
  }
};

// Processing Job operations
export const addProcessingJob = async (jobData) => {
  try {
    const processingJob = new ProcessingJob(jobData);
    return await processingJob.save();
  } catch (error) {
    throw error;
  }
};

export const updateProcessingJob = async (job_id, updateData) => {
  try {
    return await ProcessingJob.findOneAndUpdate(
      { job_id },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

export const getProcessingJob = async (job_id) => {
  try {
    return await ProcessingJob.findOne({ job_id }).populate('file_history_id');
  } catch (error) {
    throw error;
  }
};

// Cleanup operations
export const cleanupOldFiles = async (days = 7, user_id = null) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let query = {
      createdAt: { $lt: cutoffDate },
      status: 'completed'
    };

    // If user_id is provided, only cleanup that user's files
    if (user_id) {
      query.user_id = user_id;
    }

    const oldFiles = await FileHistory.find(query);

    // Delete old files from filesystem
    const fs = await import('fs');
    for (const file of oldFiles) {
      try {
        if (file.original_path && fs.existsSync(file.original_path)) {
          fs.unlinkSync(file.original_path);
        }
        if (file.processed_path && fs.existsSync(file.processed_path)) {
          fs.unlinkSync(file.processed_path);
        }
      } catch (error) {
        console.error(`Failed to delete file: ${error.message}`);
      }
    }

    // Delete old records from database
    const result = await FileHistory.deleteMany(query);

    return result.deletedCount;
  } catch (error) {
    throw error;
  }
};
