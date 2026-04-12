import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';
import * as api from '../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const FILE_TYPE_ICON = {
  pdf: '📄', docx: '📝', doc: '📝', pptx: '📊', xlsx: '📈', xls: '📈',
  txt: '📋', md: '📋', csv: '📋', json: '📋', xml: '📋', html: '🌐',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', webp: '🖼️',
  js: '⚙️', ts: '⚙️', py: '🐍', java: '☕', cpp: '⚙️', cs: '⚙️',
  eml: '📧', odt: '📝', yaml: '📋', yml: '📋',
};

function fileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPE_ICON[ext] || '📄';
}

const SUPPORTED_TYPES = [
  { icon: '📄', label: 'PDF Documents', exts: '.pdf' },
  { icon: '📝', label: 'Word (DOCX / DOC)', exts: '.docx, .doc' },
  { icon: '📊', label: 'PowerPoint (PPTX)', exts: '.pptx' },
  { icon: '📈', label: 'Excel (XLSX / XLS)', exts: '.xlsx, .xls' },
  { icon: '📝', label: 'OpenDocument (ODT)', exts: '.odt' },
  { icon: '🖼️', label: 'Images via OCR', exts: '.jpg, .png, .gif, .bmp, .webp, .tiff' },
  { icon: '📋', label: 'Plain Text / Markdown', exts: '.txt, .md, .rtf, .log, .csv' },
  { icon: '🌐', label: 'HTML / XML', exts: '.html, .htm, .xml' },
  { icon: '📋', label: 'Data / Config', exts: '.json, .yaml, .yml, .ini, .env' },
  { icon: '⚙️', label: 'Code Files', exts: '.js, .ts, .py, .java, .cpp, .c, .cs, .go, .rb, .php, .sql, .sh' },
  { icon: '📧', label: 'Email (.eml)', exts: '.eml' },
];

const EXTRACTION_MODES = [
  { value: 'auto', label: '🔍 Auto Detect', desc: 'Best method chosen automatically' },
  { value: 'native', label: '📝 Native', desc: 'Direct text parsing for docs & code' },
  { value: 'ocr', label: '👁️ OCR', desc: 'Visual text recognition from images' },
  { value: 'hybrid', label: '🔄 Hybrid', desc: 'Native first, OCR as fallback' },
];

// ─── Component ────────────────────────────────────────────────────────────────

function TextExtractionPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset, doneFiles, onDownload }) {
  const { darkMode } = useDarkMode();
  const canProcess = files.length > 0;

  const [languages, setLanguages] = useState([]);
  const [ocrLang, setOcrLang] = useState('auto');
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [extractionMode, setExtractionMode] = useState('auto');
  const [showTypes, setShowTypes] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.getExtractionLanguages();
        if (resp.success) setLanguages(resp.data);
      } catch (_) {}
    })();
  }, []);

  const dm = darkMode;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl">📝</span>
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${dm ? 'text-white' : 'text-gray-800'}`}>Text Extraction</h1>
            <p className={dm ? 'text-gray-300' : 'text-gray-600'}>
              Extract text from documents, images, code files and more
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Upload */}
          <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Upload Files</h2>
            <FileUpload files={files} setFiles={setFiles} />
          </div>

          {/* Supported types — collapsible */}
          <div className={`rounded-2xl shadow-lg overflow-hidden ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <button
              onClick={() => setShowTypes(v => !v)}
              className={`w-full flex items-center justify-between p-5 text-left transition-colors ${dm ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
            >
              <span className={`font-semibold text-base ${dm ? 'text-white' : 'text-gray-800'}`}>
                📂 Supported File Types
              </span>
              <span className={`text-lg transition-transform duration-300 ${showTypes ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {showTypes && (
              <div className={`px-5 pb-5 border-t ${dm ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {SUPPORTED_TYPES.map((t, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${dm ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className="text-xl flex-shrink-0">{t.icon}</span>
                      <div className="min-w-0">
                        <div className={`font-medium text-sm ${dm ? 'text-gray-200' : 'text-gray-800'}`}>{t.label}</div>
                        <div className={`text-xs mt-0.5 font-mono ${dm ? 'text-indigo-300' : 'text-indigo-600'}`}>{t.exts}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* Settings */}
          <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Extraction Settings</h2>

            {/* Mode selector */}
            <div className="mb-5">
              <label className={`block text-sm font-medium mb-2 ${dm ? 'text-gray-200' : 'text-gray-700'}`}>
                Extraction Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EXTRACTION_MODES.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setExtractionMode(m.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                      extractionMode === m.value
                        ? dm
                          ? 'border-indigo-400 bg-indigo-900/50 text-indigo-200'
                          : 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : dm
                        ? 'border-gray-600 hover:border-gray-500 text-gray-300'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-semibold text-sm">{m.label}</div>
                    <div className={`text-xs mt-0.5 ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* OCR language — only relevant for OCR / auto / hybrid */}
            {(extractionMode === 'auto' || extractionMode === 'ocr' || extractionMode === 'hybrid') && (
              <div className="mb-5">
                <label className={`block text-sm font-medium mb-2 ${dm ? 'text-gray-200' : 'text-gray-700'}`}>
                  OCR Language
                </label>
                <select
                  value={ocrLang}
                  onChange={e => setOcrLang(e.target.value)}
                  className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    dm ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="auto">Auto Detect</option>
                  {languages.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Include metadata */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={e => setIncludeMetadata(e.target.checked)}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div>
                <div className={`font-medium text-sm ${dm ? 'text-white' : 'text-gray-800'}`}>Include Metadata</div>
                <div className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
                  Prepend file info (author, page count, sheet count, etc.) to the output
                </div>
              </div>
            </label>
          </div>

          {/* Process controls */}
          <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>

            <div className="space-y-3">
              <button
                onClick={() => onProcess('extraction', { mode: extractionMode, includeMetadata, language: ocrLang })}
                disabled={!canProcess || isProcessing}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                  canProcess && !isProcessing
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
                    : dm
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extracting...</span>
                  </div>
                ) : (
                  '📝 Start Extraction'
                )}
              </button>

              <button
                onClick={onReset}
                className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 ${
                  dm
                    ? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                    : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
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

          {/* Download results */}
          {doneFiles && doneFiles.length > 0 && (
            <div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>📥 Download Extracted Text</h2>
              <div className="space-y-3">
                {doneFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                      dm ? 'bg-gray-700 border-gray-600' : 'bg-indigo-50 border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{fileIcon(item.processedFile || item.originalFile)}</span>
                      <div className="min-w-0">
                        <div className={`font-medium text-sm truncate ${dm ? 'text-gray-200' : 'text-gray-800'}`}>
                          {item.processedFile || item.originalFile}
                        </div>
                        <div className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
                          Extracted from {item.originalFile}
                        </div>
                      </div>
                    </div>
                    {item.download_url && (
                      <button
                        onClick={() => onDownload(item)}
                        className="ml-3 flex-shrink-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
                      >
                        ⬇️ Download
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TextExtractionPanel;
