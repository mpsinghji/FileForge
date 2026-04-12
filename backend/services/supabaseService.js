import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types'; // Note: Node might default to no mime package. Let's rely on extension or pass it.

let supabaseInstance = null;
let isInitialized = false;

function getSupabaseClient() {
  if (!isInitialized) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';
    
    if (supabaseUrl && supabaseKey) {
      supabaseInstance = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('⚠️ Supabase credentials not found. Uploads to Supabase will be skipped.');
    }
    isInitialized = true;
  }
  return supabaseInstance;
}

const BUCKET_NAME = 'fileforge';

/**
 * Uploads a local file to Supabase Storage.
 * @param {string} localFilePath - Path to the local file
 * @param {string} destinationKey - The storage key/path in the bucket
 * @returns {Promise<Object>} Object containing publicUrl and path in Supabase
 */
export const uploadToSupabase = async (localFilePath, destinationKey) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log(`[Supabase] Skipped upload for ${destinationKey} (client not initialized)`);
    return { supabasePath: null, publicUrl: null };
  }

  try {
    const fileBuffer = fs.readFileSync(localFilePath);
    // Determine content type from file extension, default to octet-stream
    const ext = path.extname(localFilePath).slice(1);
    const contentType = getContentType(ext);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(destinationKey, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(destinationKey);

    // Append ?download=filename to force browsers to save the file rather than display it inline
    const forceDownloadUrl = `${urlData.publicUrl}?download=${encodeURIComponent(path.basename(localFilePath))}`;

    return {
      supabasePath: data.path,
      publicUrl: forceDownloadUrl,
    };
  } catch (error) {
    console.error(`Supabase upload failed for ${localFilePath}:`, error);
    throw error;
  }
};

/**
 * Deletes a file from Supabase Storage.
 * @param {string} destinationKey - The storage key/path in the bucket
 * @returns {Promise<boolean>} True if successful
 */
export const deleteFromSupabase = async (destinationKey) => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([destinationKey]);
      
    if (error) {
      console.error(`Failed to delete ${destinationKey} from Supabase:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error deleting ${destinationKey} from Supabase:`, error);
    return false;
  }
};

// Helper function to guess content type (since "mime-types" might not be installed)
function getContentType(ext) {
  const types = {
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'zip': 'application/zip',
    'csv': 'text/csv'
  };
  return types[ext.toLowerCase()] || 'application/octet-stream';
}
