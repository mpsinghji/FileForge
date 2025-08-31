import mongoose from 'mongoose';

const processingJobSchema = new mongoose.Schema({
  job_id: {
    type: String,
    required: true,
    unique: true
  },
  file_history_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileHistory',
    required: true
  },
  operation_type: {
    type: String,
    required: true,
    enum: ['conversion', 'compression', 'extraction', 'archive_extraction']
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'processing', 'completed', 'failed']
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  logs: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

const ProcessingJob = mongoose.model('ProcessingJob', processingJobSchema);

export default ProcessingJob;
