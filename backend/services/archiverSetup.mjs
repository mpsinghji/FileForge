import archiver from 'archiver';
import archiverEncrypted from 'archiver-zip-encrypted';

// Register the encrypted ZIP format ONCE globally.
// Both archiveCreationService and encryptionService import from here
// so the format is never double-registered.
let registered = false;
if (!registered) {
  try {
    archiver.registerFormat('zip-encrypted', archiverEncrypted);
    registered = true;
    console.log('[ARCHIVER SETUP] zip-encrypted format registered');
  } catch (err) {
    // Already registered — safe to ignore
    if (!err.message?.includes('already registered')) {
      throw err;
    }
  }
}

export default archiver;
