import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import logger from './services/logger.js';
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
import cron from 'node-cron';
import { cleanupOldFiles } from './services/databaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config/config.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const USE_HTTPS = String(process.env.HTTPS || 'false') === 'true';
const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:5173',
  'https://mpji-fileforge.vercel.app'
];
const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...DEFAULT_FRONTEND_ORIGINS, ...configuredOrigins])];

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients and same-origin requests with no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '120')
});
app.use('/api/', limiter);

app.use(compression());

app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use((req, res, next) => {
  console.log(`[REQUEST DEBUG] ${req.method} ${req.url}`);
  next();
});

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

    // Clean up temporary files on startup
    await cleanupTempFiles();

    console.log('🔄 Starting server...');
    let server;
    if (USE_HTTPS) {
      const fs = await import('fs');
      const https = await import('https');
      const keyPath = process.env.SSL_KEY_PATH;
      const certPath = process.env.SSL_CERT_PATH;
      if (!keyPath || !certPath) {
        console.warn('⚠️ HTTPS enabled but SSL paths missing; falling back to HTTP');
        server = app.listen(PORT, () => {
          console.log(`🚀 HTTP server on :${PORT}`);
        });
      } else {
        const options = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
        server = https.createServer(options, app).listen(PORT, () => {
          console.log(`🔐 HTTPS server on :${PORT}`);
        });
      }
    } else {
      server = app.listen(PORT, () => {
        console.log(`🚀 HTTP server on :${PORT}`);
      });
    }

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    console.log('✅ HTTP server started');

    // Schedule auto-clean daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
      try {
        const days = parseInt(process.env.CLEANUP_DAYS || '7');
        const deleted = await cleanupOldFiles(days);
        console.log(`🧹 Auto-clean: removed ${deleted} old records/files (> ${days} days)`);
      } catch (err) {
        console.error('Auto-clean failed:', err);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

async function cleanupTempFiles() {
  console.log('🧹 Cleaning up temporary files...');
  const fs = await import('fs');
  const dirs = ['uploads', 'temp', 'processed'];

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file === '.gitkeep') continue;
          fs.unlinkSync(path.join(dirPath, file));
        }
      } catch (err) {
        console.warn(`⚠️ Failed to clean ${dir}:`, err.message);
      }
    }
  }
  console.log('✅ Temporary files cleaned');
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

// Prevent crashes on unhandled rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  logger.error('Unhandled promise rejection:', reason);
  process.exit(1); // Exit to allow restart
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  logger.error('Uncaught exception:', error);
  process.exit(1); // Exit to allow restart
});
