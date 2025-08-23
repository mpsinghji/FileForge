import React from 'react';

function ProgressStatus({ progressPercent, currentFile, logs }) {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">Progress & Logs</h2>

      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="h-4 bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="mt-2 text-sm text-gray-600">
        {currentFile ? `Processing: ${currentFile.name}` : 'No file being processed'}
      </p>

      <div className="mt-4 p-3 bg-gray-100 h-40 overflow-y-auto rounded font-mono text-xs text-gray-700 whitespace-pre-line">
        {logs.length > 0 ? logs.join('\n') : 'Logs will appear here...'}
      </div>
    </div>
  );
}

export default ProgressStatus;
