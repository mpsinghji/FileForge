import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import uploadRoutes from './routes/upload.mjs';
import conversionRoutes from './routes/conversion.mjs';
import compressionRoutes from './routes/compression.mjs';
import extractionRoutes from './routes/extraction.mjs';
import historyRoutes from './routes/history.mjs';
import authRoutes from './routes/auth.mjs';

import { errorHandler } from './middleware/errorHandler.mjs';
import connectdb from './utils/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config/config.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(compression());

app.use(morgan('combined'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/processed', express.static(path.join(__dirname, 'processed')));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversion', conversionRoutes);
app.use('/api/compression', compressionRoutes);
app.use('/api/extraction', extractionRoutes);
app.use('/api/history', historyRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'FileForge Backend API',
    version: '1.0.0',
    endpoints: {
      upload: '/api/upload',
      conversion: '/api/conversion',
      compression: '/api/compression',
      extraction: '/api/extraction',
      history: '/api/history'
    }
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

app.use(errorHandler);

async function startServer() {
  try {
    console.log('🔄 Starting server initialization...');
    
    console.log('🔄 Connecting to MongoDB...');
    await connectdb();
    console.log('✅ MongoDB connection established');
    
    console.log('🔄 Creating directories...');
    const fs = await import('fs');
    const dirs = ['uploads', 'processed', 'temp'];
    
    for (const dir of dirs) {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
    console.log('✅ Directories created');
    
    console.log('🔄 Starting HTTP server...');
    const server = app.listen(PORT, () => {
      console.log(`🚀 FileForge Backend Server running on port ${PORT}`);
      console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
    
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
    
    console.log('✅ HTTP server started');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
