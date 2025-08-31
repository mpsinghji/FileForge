import mongoose from 'mongoose';

const fileHistorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  original_filename: {
    type: String,
    required: true
  },
  original_path: {
    type: String,
    required: true
  },
  processed_filename: {
    type: String,
    default: null
  },
  processed_path: {
    type: String,
    default: null
  },
  operation_type: {
    type: String,
    required: true,
    enum: ['conversion', 'compression', 'extraction', 'archive_extraction']
  },
  operation_details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  file_size: {
    type: Number,
    required: true
  },
  processed_size: {
    type: Number,
    default: null
  },
  processing_time: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'processing', 'completed', 'failed']
  },
  error_message: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

const FileHistory = mongoose.model('FileHistory', fileHistorySchema);

export default FileHistory;
