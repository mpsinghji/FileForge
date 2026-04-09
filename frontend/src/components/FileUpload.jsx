import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDarkMode } from '../App';

const FILE_ICONS = {
  image: { icon: '🖼️', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-500/10 border-pink-500/30' },
  video: { icon: '🎥', color: 'from-purple-500 to-violet-500', bg: 'bg-purple-500/10 border-purple-500/30' },
  audio: { icon: '🎵', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10 border-blue-500/30' },
  pdf:   { icon: '📄', color: 'from-red-500 to-orange-500', bg: 'bg-red-500/10 border-red-500/30' },
  doc:   { icon: '📝', color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-400/10 border-blue-400/30' },
  zip:   { icon: '📦', color: 'from-amber-500 to-yellow-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  other: { icon: '📁', color: 'from-gray-400 to-slate-500', bg: 'bg-gray-500/10 border-gray-500/30' },
};

function getFileCategory(file) {
  if (!file) return 'other';
  const { type = '', name = '' } = file;
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type.includes('pdf')) return 'pdf';
  if (type.includes('doc') || type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'doc';
  if (name.match(/\.(zip|rar|7z|tar|gz|bz2|iso|cab)$/i)) return 'zip';
  return 'other';
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function FileCard({ item, idx, onRemove, darkMode }) {
  const [entered, setEntered] = useState(false);
  const cat = getFileCategory(item.file);
  const meta = FILE_ICONS[cat];

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), idx * 60);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <div
      className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${darkMode
        ? `${meta.bg} hover:bg-gray-700/60`
        : `${meta.bg.replace('/10', '/20')} hover:shadow-md`
      }`}
    >
      {/* Thumbnail / Icon */}
      <div className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border ${
        darkMode ? 'border-gray-600' : 'border-white/60'
      } shadow-sm`}>
        {item.preview && cat === 'image' ? (
          <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
        ) : item.preview && cat === 'video' ? (
          <video src={item.preview} className="w-full h-full object-cover" muted />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${meta.color} bg-opacity-20`}>
            <span className="text-2xl">{meta.icon}</span>
          </div>
        )}
        {/* Format badge */}
        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] font-bold px-1 py-0.5 rounded-tl-md leading-none">
          {item.file.name.split('.').pop()?.toUpperCase().slice(0, 4)}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          {item.file.name}
        </p>
        <div className={`flex items-center gap-2 mt-0.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span>{formatBytes(item.file.size)}</span>
          <span className="w-1 h-1 rounded-full bg-current opacity-40" />
          <span className={`capitalize px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${meta.color} text-white`}>
            {cat}
          </span>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(idx)}
        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 ${
          darkMode
            ? 'bg-red-900/60 hover:bg-red-700 text-red-300 hover:text-white'
            : 'bg-red-100 hover:bg-red-500 text-red-500 hover:text-white'
        }`}
        aria-label={`Remove ${item.file.name}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function FileUpload({ files = [], setFiles, onFilesAdded }) {
  const { darkMode } = useDarkMode();
  const [isDragging, setIsDragging] = useState(false);
  const [dragCount, setDragCount] = useState(0);
  const inputRef = useRef(null);

  const mergeFiles = useCallback((newFiles) => {
    setFiles(prev => {
      const all = [...prev, ...newFiles];
      return all.filter(
        (file, index, self) =>
          index === self.findIndex(f => f.name === file.name && f.size === file.size)
      );
    });
  }, [setFiles]);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    mergeFiles(selected);
    if (onFilesAdded) onFilesAdded(selected);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setDragCount(0);
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length) return;
    mergeFiles(dropped);
    if (onFilesAdded) onFilesAdded(dropped);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setDragCount(c => c + 1);
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragCount(c => {
      const next = c - 1;
      if (next <= 0) setIsDragging(false);
      return Math.max(0, next);
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createPreview = (file) => {
    try {
      if (file.type?.startsWith("image/") || file.type?.startsWith("video/") || file.type?.startsWith("audio/")) {
        return URL.createObjectURL(file);
      }
      return null;
    } catch { return null; }
  };

  const filesWithPreview = files.map(f => ({ file: f, preview: createPreview(f) }));

  useEffect(() => {
    return () => filesWithPreview.forEach(fp => {
      if (fp.preview) try { URL.revokeObjectURL(fp.preview); } catch {}
    });
  }, [filesWithPreview]);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 select-none overflow-hidden ${
          isDragging
            ? darkMode
              ? 'border-indigo-400 bg-indigo-900/30 shadow-lg shadow-indigo-500/10'
              : 'border-indigo-500 bg-indigo-50/80 shadow-lg shadow-indigo-200'
            : darkMode
              ? 'border-gray-600 hover:border-indigo-500 bg-gray-800/40 hover:bg-indigo-900/10'
              : 'border-gray-200 hover:border-indigo-400 bg-gray-50/60 hover:bg-indigo-50/30'
        }`}
      >
        {/* Animated glow ring when dragging */}
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl ring-2 ring-indigo-500/40 animate-pulse pointer-events-none" />
        )}

        {/* Upload icon area */}
        <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          isDragging
            ? 'bg-indigo-500 scale-110 shadow-lg shadow-indigo-500/30'
            : darkMode
              ? 'bg-gray-700 group-hover:bg-indigo-900'
              : 'bg-white shadow-md'
        }`}>
          {isDragging ? (
            <svg className="w-8 h-8 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          ) : (
            <svg className={`w-8 h-8 transition-colors ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
        </div>

        <p className={`text-base font-semibold mb-1 transition-colors ${
          isDragging
            ? 'text-indigo-500'
            : darkMode ? 'text-gray-200' : 'text-gray-700'
        }`}>
          {isDragging ? 'Drop files here!' : 'Drag & drop your files'}
        </p>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          or <span className={`font-semibold underline underline-offset-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>browse to upload</span>
        </p>

        {/* Accepted types chips */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {['Images', 'Videos', 'Audio', 'PDF', 'ZIP'].map(t => (
            <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors ${
              darkMode
                ? 'bg-gray-700/60 border-gray-600 text-gray-400'
                : 'bg-white border-gray-200 text-gray-500'
            }`}>{t}</span>
          ))}
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.docx,.zip,.rar,.7z,.iso"
        />
      </div>

      {/* File List */}
      {filesWithPreview.length > 0 && (
        <div className="space-y-2">
          <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <span>{filesWithPreview.length} file{filesWithPreview.length > 1 ? 's' : ''} selected</span>
            <button
              onClick={() => setFiles([])}
              className={`text-xs font-medium transition-colors ${
                darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'
              }`}
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 custom-scrollbar">
            {filesWithPreview.map((item, idx) => (
              <FileCard
                key={`${item.file.name}-${item.file.size}-${idx}`}
                item={item}
                idx={idx}
                onRemove={removeFile}
                darkMode={darkMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
