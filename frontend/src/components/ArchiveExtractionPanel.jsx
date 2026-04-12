import React, { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';
import * as api from '../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const EXT_ICON = {
  pdf: '📄', zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '📦', gz: '📦',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', webp: '🖼️',
  mp4: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬',
  mp3: '🎵', wav: '🎵', flac: '🎵',
  txt: '📋', md: '📋', csv: '📋', json: '📋', xml: '📋',
  docx: '📝', doc: '📝', pptx: '📊', xlsx: '📈',
  js: '⚙️', ts: '⚙️', py: '🐍', java: '☕',
  exe: '🖥️', dll: '🖥️',
  html: '🌐', css: '🎨',
};

function fileExt(name = '') { return (name.split('.').pop() || '').toLowerCase(); }
function fileIcon(name = '') { return EXT_ICON[fileExt(name)] || '📄'; }

// ─── Component ────────────────────────────────────────────────────────────────

function ArchiveExtractionPanel({
  files, setFiles, isProcessing, progressPercent, logs,
  onProcess, onReset, doneFiles, onDownload
}) {
  const { darkMode } = useDarkMode();
  const [extractPath, setExtractPath] = useState('extracted');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [extractPassword, setExtractPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password detection
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // File checklist state (populated after extraction)
  const [fileList, setFileList] = useState([]);       // [{ name, relativePath, size }]
  const [selectedFiles, setSelectedFiles] = useState(new Set()); // Set of relativePaths
  const [extractedBundle, setExtractedBundle] = useState(null);  // the done-file item

  const dm = darkMode;

  // ── password detection on file upload ──
  useEffect(() => {
    if (files.length === 0) {
      setPasswordRequired(false);
      setPasswordError('');
      setExtractPassword('');
      setFileList([]);
      setSelectedFiles(new Set());
      setExtractedBundle(null);
      return;
    }
    const file = files[0];
    const ext = file.name.split('.').pop().toLowerCase();
    const archiveExts = ['zip', 'rar', '7z', 'gz', 'tar', 'bz2', 'xz', 'cab', 'iso'];
    if (!archiveExts.includes(ext)) return;

    (async () => {
      setCheckingPassword(true);
      setPasswordRequired(false);
      setPasswordError('');
      try {
        const res = await api.checkArchivePassword(file);
        if (res?.data?.encrypted) setPasswordRequired(true);
      } catch (_) {}
      finally { setCheckingPassword(false); }
    })();
  }, [files]);

  // ── populate file list from doneFiles ──
  useEffect(() => {
    if (doneFiles && doneFiles.length > 0) {
      const df = doneFiles[0];
      setExtractedBundle(df);

      if (df.fileList && Array.isArray(df.fileList) && df.fileList.length > 0) {
        setFileList(df.fileList);
        // Select all by default
        setSelectedFiles(new Set(df.fileList.map(f => f.relativePath)));
      } else {
        // No list from backend — create a synthetic one-item list
        setFileList([{
          name: df.processedFile || df.originalFile || 'extracted.zip',
          relativePath: '__bundle__',
          size: df.size || 0,
        }]);
        setSelectedFiles(new Set(['__bundle__']));
      }
    } else {
      setFileList([]);
      setSelectedFiles(new Set());
      setExtractedBundle(null);
    }
  }, [doneFiles]);

  const canProcess = files.length > 0 && !checkingPassword && (!passwordRequired || extractPassword.length > 0);

  const handleStartExtraction = () => {
    if (passwordRequired && !extractPassword) {
      setPasswordError('This archive is password-protected. Please enter the password.');
      return;
    }
    setPasswordError('');
    setFileList([]);
    setSelectedFiles(new Set());
    setExtractedBundle(null);
    onProcess('archive-extraction', { extractPath, overwriteExisting, password: extractPassword });
  };

  // ── selection helpers ──
  const allSelected = fileList.length > 0 && fileList.every(f => selectedFiles.has(f.relativePath));
  const noneSelected = fileList.length === 0 || fileList.every(f => !selectedFiles.has(f.relativePath));

  const toggleAll = () => {
    if (allSelected) setSelectedFiles(new Set());
    else setSelectedFiles(new Set(fileList.map(f => f.relativePath)));
  };

  const toggleFile = (relativePath) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(relativePath)) next.delete(relativePath);
      else next.add(relativePath);
      return next;
    });
  };

  const handleDownloadAll = () => {
    if (extractedBundle) onDownload(extractedBundle);
  };

  // For individual file download — we point to the bundle and note the filename
  const handleDownloadSelected = () => {
    if (!extractedBundle) return;
    // For the download-all-selected scenario, we just download the full bundle
    // (individual-file streaming would need a separate backend endpoint)
    onDownload(extractedBundle);
  };

  const handleDownloadSingle = (filePath) => {
    if (!extractedBundle) return;
    // Download the whole bundle — in a future enhancement a separate endpoint can serve individual files
    onDownload(extractedBundle);
  };

  const selectedCount = fileList.filter(f => selectedFiles.has(f.relativePath)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl">📦</span>
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${dm ? 'text-white' : 'text-gray-800'}`}>Archive Extraction</h1>
            <p className={dm ? 'text-gray-300' : 'text-gray-600'}>
              Extract ZIP, RAR, 7Z, TAR and more — browse & download individual files
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Upload */}
          <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Upload Archive</h2>
            <FileUpload files={files} setFiles={setFiles} />

            {checkingPassword && (
              <div className="mt-4 flex items-center gap-2 text-sm text-indigo-500 animate-pulse">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Scanning archive for encryption...
              </div>
            )}
            {!checkingPassword && passwordRequired && (
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                <span className="text-lg">🔒</span>
                <div>
                  <div className="font-semibold">Password Required</div>
                  <div className="text-xs opacity-80">This archive is encrypted. Enter the password below before extracting.</div>
                </div>
              </div>
            )}
          </div>

          {/* Extraction Settings */}
          <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Extraction Settings</h2>

            {/* Password */}
            <div className="mb-5">
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${dm ? 'text-gray-200' : 'text-gray-700'}`}>
                {passwordRequired ? (
                  <span className="flex items-center gap-1 text-amber-600 font-semibold">🔒 Archive Password <span className="text-red-500">*</span></span>
                ) : (
                  <span>Archive Password <span className="text-xs font-normal opacity-60">(optional)</span></span>
                )}
                {extractPassword && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">● PROTECTED</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={extractPassword}
                  onChange={e => { setExtractPassword(e.target.value); setPasswordError(''); }}
                  placeholder={passwordRequired ? 'Enter password to unlock archive' : 'Enter password if archive is protected'}
                  className={`w-full p-3 pr-12 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    passwordRequired && !extractPassword
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : passwordError
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                      : dm
                      ? 'border-gray-600 bg-gray-700 text-white'
                      : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-lg select-none ${dm ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {showPassword ? '👁️' : '🔐'}
                </button>
              </div>
              {passwordError && <p className="mt-2 text-sm text-red-500 flex items-center gap-1"><span>⚠️</span> {passwordError}</p>}
            </div>

            {/* Overwrite */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={e => setOverwriteExisting(e.target.checked)}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div>
                <div className={`font-medium text-sm ${dm ? 'text-white' : 'text-gray-800'}`}>Overwrite Existing Files</div>
                <div className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>Replace files if they already exist</div>
              </div>
            </label>
          </div>

          {/* Supported formats */}
          <div className={`p-4 rounded-xl border ${dm ? 'bg-gradient-to-r from-indigo-900 to-blue-900 border-indigo-700' : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'}`}>
            <h3 className={`font-medium mb-3 text-sm ${dm ? 'text-white' : 'text-gray-800'}`}>Supported Formats</h3>
            <div className="flex flex-wrap gap-2">
              {['ZIP', 'RAR', '7Z', 'TAR', 'GZ', 'BZ2', 'XZ', 'ISO', 'CAB'].map(f => (
                <span key={f} className={`text-xs px-2 py-1 rounded-lg font-mono font-semibold ${dm ? 'bg-indigo-800 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* Process controls */}
          <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>
            <div className="space-y-3">
              <button
                onClick={handleStartExtraction}
                disabled={!canProcess || isProcessing}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                  canProcess && !isProcessing
                    ? passwordRequired && !extractPassword
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
                    : dm
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extracting...</span>
                  </div>
                ) : checkingPassword ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Scanning archive...</span>
                  </div>
                ) : passwordRequired && !extractPassword ? (
                  '🔒 Enter Password to Continue'
                ) : (
                  '🚀 Start Extraction'
                )}
              </button>

              <button
                onClick={() => { onReset(); setPasswordRequired(false); setExtractPassword(''); setPasswordError(''); setFileList([]); setSelectedFiles(new Set()); setExtractedBundle(null); }}
                className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 ${dm ? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Progress</h2>
            <ProgressStatus progressPercent={progressPercent} currentFile={files[0] || null} logs={logs} />
          </div>

          {/* ── File Checklist (shown after extraction) ── */}
          {fileList.length > 0 && extractedBundle && (
            <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-xl font-semibold ${dm ? 'text-white' : 'text-gray-800'}`}>
                  📂 Extracted Files
                </h2>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${dm ? 'bg-indigo-800 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>
                  {fileList.length} file{fileList.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Select-all bar */}
              <div className={`flex items-center justify-between mb-3 pb-3 border-b ${dm ? 'border-gray-700' : 'border-gray-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className={`text-sm font-medium ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </span>
                </label>
                <span className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedCount} of {fileList.length} selected
                </span>
              </div>

              {/* File list */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 mb-4">
                {fileList.map((f, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                      selectedFiles.has(f.relativePath)
                        ? dm ? 'bg-indigo-900/40 border border-indigo-600' : 'bg-indigo-50 border border-indigo-200'
                        : dm ? 'hover:bg-gray-700 border border-transparent' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(f.relativePath)}
                      onChange={() => toggleFile(f.relativePath)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 flex-shrink-0"
                    />
                    <span className="text-base flex-shrink-0">{fileIcon(f.name)}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium truncate ${dm ? 'text-gray-200' : 'text-gray-800'}`}>{f.name}</div>
                      {f.relativePath !== f.name && f.relativePath !== '__bundle__' && (
                        <div className={`text-xs truncate ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{f.relativePath}</div>
                      )}
                    </div>
                    {f.size > 0 && (
                      <span className={`text-xs flex-shrink-0 ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatBytes(f.size)}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* Download action buttons */}
              <div className="space-y-2">
                {/* Download All */}
                <button
                  onClick={handleDownloadAll}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>⬇️</span>
                  <span>Download All as ZIP ({fileList.length} files)</span>
                </button>

                {/* Download Selected */}
                <button
                  onClick={handleDownloadSelected}
                  disabled={noneSelected}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    !noneSelected
                      ? dm
                        ? 'bg-indigo-800 text-indigo-200 hover:bg-indigo-700'
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      : dm
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>📦</span>
                  <span>Download Selected ({selectedCount})</span>
                </button>

                {/* Per-file download — shown when multiple files exist */}
                {fileList.length > 1 && (
                  <div className={`mt-3 pt-3 border-t ${dm ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`text-xs mb-2 font-medium ${dm ? 'text-gray-400' : 'text-gray-500'}`}>Individual file downloads:</p>
                    <div className="space-y-1">
                      {fileList.filter(f => selectedFiles.has(f.relativePath)).map((f, idx) => (
                        <div key={idx} className={`flex items-center justify-between py-1.5 px-3 rounded-lg ${dm ? 'bg-gray-750 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{fileIcon(f.name)}</span>
                            <span className={`text-xs truncate ${dm ? 'text-gray-300' : 'text-gray-700'}`}>{f.name}</span>
                          </div>
                          <button
                            onClick={() => handleDownloadSingle(f.relativePath)}
                            className="ml-2 flex-shrink-0 text-xs px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:scale-105 transition-all"
                          >
                            ↓
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ArchiveExtractionPanel;