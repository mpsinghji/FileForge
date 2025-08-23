import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export async function setupDatabase() {
  try {
    db = await open({
      filename: path.join(__dirname, '../data/fileforge.db'),
      driver: sqlite3.Database
    });

    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS file_history (
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

      CREATE TABLE IF NOT EXISTS processing_jobs (
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

      CREATE TABLE IF NOT EXISTS file_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_history_id INTEGER,
        metadata_key TEXT NOT NULL,
        metadata_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_history_id) REFERENCES file_history (id)
      );

      CREATE INDEX IF NOT EXISTS idx_file_history_operation_type ON file_history(operation_type);
      CREATE INDEX IF NOT EXISTS idx_file_history_status ON file_history(status);
      CREATE INDEX IF NOT EXISTS idx_file_history_created_at ON file_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_job_id ON processing_jobs(job_id);
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
    `);

    console.log('✅ Database setup completed');
    return db;
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

export async function getDatabase() {
  if (!db) {
    await setupDatabase();
  }
  return db;
}

export async function addFileHistory(fileData) {
  const db = await getDatabase();
  const {
    original_filename,
    original_path,
    operation_type,
    operation_details,
    file_size
  } = fileData;

  const result = await db.run(`
    INSERT INTO file_history 
    (original_filename, original_path, operation_type, operation_details, file_size)
    VALUES (?, ?, ?, ?, ?)
  `, [original_filename, original_path, operation_type, JSON.stringify(operation_details), file_size]);

  return result.lastID;
}

export async function updateFileHistory(id, updateData) {
  const db = await getDatabase();
  const {
    processed_filename,
    processed_path,
    processed_size,
    processing_time,
    status,
    error_message
  } = updateData;

  await db.run(`
    UPDATE file_history 
    SET processed_filename = ?, processed_path = ?, processed_size = ?, 
        processing_time = ?, status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [processed_filename, processed_path, processed_size, processing_time, status, error_message, id]);
}

export async function getFileHistory(limit = 50, offset = 0, operation_type = null) {
  const db = await getDatabase();
  
  let query = `
    SELECT * FROM file_history 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;
  let params = [limit, offset];

  if (operation_type) {
    query = `
      SELECT * FROM file_history 
      WHERE operation_type = ?
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    params = [operation_type, limit, offset];
  }

  return await db.all(query, params);
}

export async function getFileHistoryById(id) {
  const db = await getDatabase();
  return await db.get('SELECT * FROM file_history WHERE id = ?', [id]);
}

export async function addProcessingJob(jobData) {
  const db = await getDatabase();
  const {
    job_id,
    file_history_id,
    operation_type
  } = jobData;

  await db.run(`
    INSERT INTO processing_jobs 
    (job_id, file_history_id, operation_type)
    VALUES (?, ?, ?)
  `, [job_id, file_history_id, operation_type]);
}

export async function updateProcessingJob(job_id, updateData) {
  const db = await getDatabase();
  const {
    status,
    progress,
    logs
  } = updateData;

  await db.run(`
    UPDATE processing_jobs 
    SET status = ?, progress = ?, logs = ?, updated_at = CURRENT_TIMESTAMP
    WHERE job_id = ?
  `, [status, progress, JSON.stringify(logs), job_id]);
}

export async function getProcessingJob(job_id) {
  const db = await getDatabase();
  return await db.get('SELECT * FROM processing_jobs WHERE job_id = ?', [job_id]);
}

export async function addFileMetadata(file_history_id, metadata) {
  const db = await getDatabase();
  
  for (const [key, value] of Object.entries(metadata)) {
    await db.run(`
      INSERT INTO file_metadata (file_history_id, metadata_key, metadata_value)
      VALUES (?, ?, ?)
    `, [file_history_id, key, JSON.stringify(value)]);
  }
}

export async function getFileMetadata(file_history_id) {
  const db = await getDatabase();
  const metadata = await db.all(`
    SELECT metadata_key, metadata_value FROM file_metadata 
    WHERE file_history_id = ?
  `, [file_history_id]);

  const result = {};
  metadata.forEach(item => {
    result[item.metadata_key] = JSON.parse(item.metadata_value);
  });

  return result;
}

export async function cleanupOldFiles(days = 7) {
  const db = await getDatabase();
  
  // Get old file records
  const oldFiles = await db.all(`
    SELECT original_path, processed_path FROM file_history 
    WHERE created_at < datetime('now', '-${days} days')
    AND status = 'completed'
  `);

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
  await db.run(`
    DELETE FROM file_history 
    WHERE created_at < datetime('now', '-${days} days')
    AND status = 'completed'
  `);

  return oldFiles.length;
}
