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
  download_url: {
    type: String,
    default: null
  },
  supabase_path: {
    type: String,
    default: null
  },
  operation_type: {
    type: String,
    required: true,
    enum: ['conversion', 'compression', 'extraction', 'archive_extraction', 'archive-create', 'pdf-split', 'pdf-merge', 'file-encrypt', 'file-decrypt', 'qr-generate']
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
  },
  expires_at: {
    type: Date,
    default: function() {
      // Set expiry to 7 days from creation
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      return expiryDate;
    },
    index: true
  }
}, {
  timestamps: true
});

fileHistorySchema.index({ user_id: 1, createdAt: -1 });
fileHistorySchema.index({ operation_type: 1, status: 1, createdAt: -1 });
fileHistorySchema.index({ original_filename: 'text' });
fileHistorySchema.index({ expires_at: 1 }); // Index for efficient expiry queries

const FileHistory = mongoose.model('FileHistory', fileHistorySchema);

export default FileHistory;
