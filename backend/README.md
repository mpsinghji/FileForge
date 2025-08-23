# FileForge Backend API

A comprehensive backend API for file processing, conversion, compression, and OCR text extraction.

## Features

### Module 1: File Upload Interface
- **Multi-file upload support** with drag-and-drop
- **File type validation** for images, documents, videos, audio, and archives
- **Progress tracking** and real-time status updates
- **File management** with metadata storage

### Module 2: File Conversion & Compression
- **Format conversion** for images (JPG, PNG, WebP, GIF, BMP, TIFF)
- **Video conversion** (MP4, AVI, MOV, WMV, FLV, WebM)
- **Audio conversion** (MP3, WAV, OGG, AAC, FLAC)
- **Document conversion** (PDF, DOCX, TXT)
- **Compression levels** (Light, Medium, High, Extreme)
- **Quality preservation** options

### Module 3: OCR & Content Extraction
- **OCR text extraction** from images and scanned documents
- **Native text extraction** from PDFs, Word documents, and text files
- **Hybrid extraction** combining OCR and native methods
- **Multi-language support** (English, Spanish, French, German, Chinese, Japanese, etc.)
- **Output formats** (TXT, DOCX, PDF, JSON)

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- FFmpeg (for video/audio processing)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd FileForge/backend

# Install dependencies
npm install

# Create necessary directories
mkdir -p uploads processed temp data logs

# Set up environment variables
cp config/config.env.example config/config.env
# Edit config/config.env with your settings

# Start the server
npm start

# For development with auto-reload
npm run dev
```

## API Endpoints

### File Upload
```
POST /api/upload/single          # Single file upload
POST /api/upload/multiple        # Multiple files upload
GET  /api/upload/list           # List uploaded files
GET  /api/upload/info/:filename # Get file info
DELETE /api/upload/:filename    # Delete file
GET  /api/upload/stats          # Upload statistics
```

### File Conversion
```
POST /api/conversion/convert    # Convert files
GET  /api/conversion/status/:jobId # Get conversion status
GET  /api/conversion/formats    # Get supported formats
GET  /api/conversion/history    # Conversion history
```

### File Compression
```
POST /api/compression/compress  # Compress files
GET  /api/compression/status/:jobId # Get compression status
GET  /api/compression/levels    # Get compression levels
GET  /api/compression/history   # Compression history
GET  /api/compression/stats     # Compression statistics
```

### Text Extraction
```
POST /api/extraction/extract    # Extract text from files
GET  /api/extraction/status/:jobId # Get extraction status
GET  /api/extraction/modes      # Get extraction modes
GET  /api/extraction/languages  # Get supported languages
GET  /api/extraction/history    # Extraction history
GET  /api/extraction/stats      # Extraction statistics
```

### History & Statistics
```
GET  /api/history              # Get processing history
GET  /api/history/:id          # Get specific history item
GET  /api/history/stats/overview # Overall statistics
GET  /api/history/stats/:operationType # Operation-specific stats
DELETE /api/history/cleanup    # Cleanup old files
```

## Usage Examples

### Upload Files
```javascript
// Single file upload
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/upload/single', {
  method: 'POST',
  body: formData
});

// Multiple files upload
const formData = new FormData();
Array.from(fileInput.files).forEach(file => {
  formData.append('files', file);
});

const response = await fetch('/api/upload/multiple', {
  method: 'POST',
  body: formData
});
```

### Convert Files
```javascript
const formData = new FormData();
formData.append('files', file);
formData.append('targetFormat', 'png');
formData.append('quality', 'high');
formData.append('applyOCR', 'false');

const response = await fetch('/api/conversion/convert', {
  method: 'POST',
  body: formData
});

const { jobId } = await response.json();

// Check status
const statusResponse = await fetch(`/api/conversion/status/${jobId}`);
const status = await statusResponse.json();
```

### Compress Files
```javascript
const formData = new FormData();
formData.append('files', file);
formData.append('compressionLevel', 'medium');
formData.append('preserveQuality', 'true');
formData.append('removeMetadata', 'false');

const response = await fetch('/api/compression/compress', {
  method: 'POST',
  body: formData
});
```

### Extract Text
```javascript
const formData = new FormData();
formData.append('files', file);
formData.append('extractionMode', 'auto');
formData.append('outputFormat', 'txt');
formData.append('includeMetadata', 'true');
formData.append('language', 'en');

const response = await fetch('/api/extraction/extract', {
  method: 'POST',
  body: formData
});
```

## Configuration

### Environment Variables
```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# File Upload Configuration
MAX_FILE_SIZE=104857600  # 100MB
MAX_FILES=10
UPLOAD_PATH=./uploads
PROCESSED_PATH=./processed
TEMP_PATH=./temp

# Processing Configuration
MAX_CONCURRENT_JOBS=5
JOB_TIMEOUT=300000
FILE_RETENTION_DAYS=7

# Security Configuration
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## Database Schema

### File History Table
```sql
CREATE TABLE file_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  processed_filename TEXT,
  processed_path TEXT,
  operation_type TEXT NOT NULL,
  operation_details TEXT,
  file_size INTEGER,
  processed_size INTEGER,
  processing_time REAL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Processing Jobs Table
```sql
CREATE TABLE processing_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT UNIQUE NOT NULL,
  file_history_id INTEGER,
  operation_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  logs TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_history_id) REFERENCES file_history (id)
);
```

## Error Handling

The API uses standard HTTP status codes and returns error responses in the following format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "status": 400,
    "details": "Additional error details"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Rate Limiting

- **Default limit**: 100 requests per 15 minutes per IP
- **Upload endpoints**: 50 requests per 15 minutes per IP
- **Processing endpoints**: 30 requests per 15 minutes per IP

## File Retention

- **Uploaded files**: Retained for 7 days by default
- **Processed files**: Retained for 7 days by default
- **Temporary files**: Cleaned up immediately after processing
- **Database records**: Retained indefinitely (configurable)

## Performance Optimization

- **Concurrent processing**: Up to 5 jobs simultaneously
- **Memory management**: Automatic cleanup of temporary files
- **Database indexing**: Optimized queries with proper indexes
- **File streaming**: Efficient handling of large files

## Security Features

- **CORS protection**: Configurable origin restrictions
- **Rate limiting**: Prevents abuse and DoS attacks
- **File validation**: Type and size restrictions
- **Input sanitization**: Protection against malicious input
- **Error handling**: No sensitive information in error messages

## Monitoring & Logging

- **Request logging**: All API requests logged with timestamps
- **Error logging**: Detailed error information for debugging
- **Performance metrics**: Processing times and success rates
- **File statistics**: Upload and processing statistics

## Development

### Running Tests
```bash
npm test
```

### Code Linting
```bash
npm run lint
```

### Database Migration
```bash
npm run migrate
```

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Set up SSL/TLS certificates
4. Configure database backups
5. Set up monitoring and logging
6. Configure load balancing if needed

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Support

For issues and questions:
- Check the API documentation
- Review error logs
- Test with smaller files first
- Ensure all dependencies are installed

## License

This project is licensed under the ISC License.
