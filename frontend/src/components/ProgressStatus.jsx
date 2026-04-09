import React, { useEffect, useRef, useState } from 'react';
import { useDarkMode } from '../App';

function ProgressStatus({ progressPercent, currentFile, logs, doneFiles = [], onDownload }) {
  const { darkMode } = useDarkMode();
  const logsEndRef = useRef(null);
  const [displayPercent, setDisplayPercent] = useState(0);
  const [animatedWidth, setAnimatedWidth] = useState(0);

  // Smooth counter animation
  useEffect(() => {
    const target = progressPercent || 0;
    const step = Math.ceil(Math.abs(target - displayPercent) / 10);
    if (displayPercent === target) return;
    const timer = setInterval(() => {
      setDisplayPercent(prev => {
        if (prev >= target) { clearInterval(timer); return target; }
        return Math.min(prev + step, target);
      });
    }, 30);
    return () => clearInterval(timer);
  }, [progressPercent]);

  // Animate bar width
  useEffect(() => {
    const t = setTimeout(() => setAnimatedWidth(progressPercent || 0), 50);
    return () => clearTimeout(t);
  }, [progressPercent]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const isActive = progressPercent > 0 && progressPercent < 100;
  const isDone = progressPercent >= 100;
  const isIdle = !progressPercent || progressPercent === 0;

  const getStatusColor = () => {
    if (isDone) return 'from-emerald-500 to-green-400';
    if (isActive) return 'from-indigo-600 via-blue-500 to-purple-500';
    return darkMode ? 'from-gray-600 to-gray-500' : 'from-gray-300 to-gray-400';
  };

  const getLogIcon = (log) => {
    if (log.startsWith('✅') || log.startsWith('🎉')) return 'success';
    if (log.startsWith('❌')) return 'error';
    if (log.startsWith('🚀') || log.startsWith('📁') || log.startsWith('⚡')) return 'info';
    if (log.startsWith('📉') || log.startsWith('📊')) return 'stat';
    if (log.startsWith('🔗')) return 'link';
    return 'default';
  };

  const logBg = (type) => {
    const map = {
      success: darkMode ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
      error: darkMode ? 'bg-red-900/40 border-red-700/50 text-red-300' : 'bg-red-50 border-red-200 text-red-700',
      info: darkMode ? 'bg-blue-900/30 border-blue-700/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700',
      stat: darkMode ? 'bg-purple-900/30 border-purple-700/40 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700',
      link: darkMode ? 'bg-indigo-900/30 border-indigo-700/40 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700',
      default: darkMode ? 'bg-gray-700/50 border-gray-600/50 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600',
    };
    return map[type] || map.default;
  };

  return (
    <div className="space-y-5">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
            isDone ? 'bg-emerald-400' :
            isActive ? 'bg-blue-400 animate-pulse' :
            darkMode ? 'bg-gray-600' : 'bg-gray-300'
          }`} />
          <span className={`text-sm font-semibold tracking-wide ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {isDone ? 'Completed' : isActive ? 'Processing...' : 'Ready'}
          </span>
        </div>
        <span className={`text-2xl font-bold tabular-nums transition-all duration-300 ${
          isDone ? 'text-emerald-400' :
          isActive ? 'text-indigo-400' :
          darkMode ? 'text-gray-500' : 'text-gray-400'
        }`}>
          {displayPercent.toFixed(0)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className={`relative w-full h-3 rounded-full overflow-hidden shadow-inner ${
          darkMode ? 'bg-gray-700/80' : 'bg-gray-100'
        }`}>
          {/* Animated gradient fill */}
          <div
            className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${getStatusColor()} transition-all duration-700 ease-out`}
            style={{ width: `${animatedWidth}%` }}
          />
          {/* Shimmer overlay when active */}
          {isActive && (
            <div
              className="absolute top-0 left-0 h-full rounded-full overflow-hidden"
              style={{ width: `${animatedWidth}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-between px-0.5">
          {[0, 25, 50, 75, 100].map(step => (
            <div
              key={step}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                (progressPercent || 0) >= step
                  ? isDone ? 'bg-emerald-400' : 'bg-indigo-500'
                  : darkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current file pill */}
      {currentFile && isActive && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
          darkMode
            ? 'bg-indigo-900/30 border-indigo-700/50 text-indigo-300'
            : 'bg-indigo-50 border-indigo-200 text-indigo-700'
        }`}>
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="truncate font-medium">{currentFile.name}</span>
        </div>
      )}

      {/* Logs */}
      <div className={`relative rounded-xl border overflow-hidden ${
        darkMode ? 'bg-gray-900/50 border-gray-700/60' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className={`flex items-center justify-between px-4 py-2 border-b text-xs font-semibold uppercase tracking-widest ${
          darkMode ? 'bg-gray-800/60 border-gray-700/60 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'
        }`}>
          <span>Activity Log</span>
          {logs.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}>{logs.length}</span>
          )}
        </div>
        <div className="p-3 space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? (
            <div className={`text-center py-6 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              <div className="text-2xl mb-1">📋</div>
              <div>Activity will appear here</div>
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono leading-relaxed transition-all ${logBg(getLogIcon(log))}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {log}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Done Files - Download Cards */}
      {doneFiles && doneFiles.length > 0 && (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <span>✅</span> <span>Ready to Download ({doneFiles.length})</span>
          </div>
          {doneFiles.map((file, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden flex items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                darkMode
                  ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/20 border-emerald-700/50 hover:border-emerald-600/70'
                  : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  darkMode ? 'bg-emerald-800/50' : 'bg-emerald-100'
                }`}>
                  <span className="text-lg">📥</span>
                </div>
                <div className="truncate">
                  <div className={`text-sm font-semibold truncate ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                    {file.processedFile}
                  </div>
                  <div className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    from {file.originalFile}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onDownload && onDownload(file)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm ${
                  darkMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProgressStatus;
