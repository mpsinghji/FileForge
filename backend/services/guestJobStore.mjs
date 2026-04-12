/**
 * In-memory job store for guest (unauthenticated) sessions.
 *
 * Strategy:
 *   - Logged-in users  → jobs tracked in MongoDB via databaseService
 *   - Guest users      → jobs tracked in this Map (no DB writes at all)
 *
 * Jobs auto-expire after 2 hours to prevent memory growth.
 */

import { v4 as uuidv4 } from 'uuid';

const EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

/** @type {Map<string, object>} */
const jobs = new Map();

/** @type {Map<string, object>} */
const histories = new Map();

// ─── File history ─────────────────────────────────────────────────────────────

/**
 * Save guest file history entry.
 * @returns {string} Generated ID (string, not ObjectId)
 */
export function guestAddFileHistory(data) {
  const id = uuidv4();
  histories.set(id, { _id: id, ...data, createdAt: new Date().toISOString() });
  return id;
}

export function guestUpdateFileHistory(id, updateData) {
  const existing = histories.get(String(id));
  if (existing) {
    histories.set(String(id), { ...existing, ...updateData, updatedAt: new Date().toISOString() });
  }
}

export function guestGetFileHistory(id) {
  return histories.get(String(id)) || null;
}

// ─── Processing jobs ──────────────────────────────────────────────────────────

/**
 * Add a guest processing job.
 */
export function guestAddJob(jobId, fileHistoryId, operationType) {
  jobs.set(jobId, {
    job_id: jobId,
    file_history_id: fileHistoryId,
    operation_type: operationType,
    status: 'pending',
    progress: 0,
    logs: '[]',
    createdAt: Date.now(),
  });
}

export function guestUpdateJob(jobId, updateData) {
  const existing = jobs.get(jobId);
  if (existing) {
    jobs.set(jobId, { ...existing, ...updateData });
  }
}

export function guestGetJob(jobId) {
  return jobs.get(jobId) || null;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function runCleanup() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > EXPIRY_MS) jobs.delete(id);
  }
  for (const [id, h] of histories) {
    if (h.createdAt && now - new Date(h.createdAt).getTime() > EXPIRY_MS) {
      histories.delete(id);
    }
  }
}

// Run cleanup every 30 min; `.unref()` so it doesn't prevent process exit
setInterval(runCleanup, 30 * 60 * 1000).unref();
