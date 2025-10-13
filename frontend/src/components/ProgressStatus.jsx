import React from 'react';
import { useDarkMode } from '../App';

function ProgressStatus({ progressPercent, currentFile, logs }) {
  const { darkMode } = useDarkMode();
  
  return (
    <div className="mt-8">
      <h2 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Progress & Logs</h2>

      <div className={`w-full rounded-full h-4 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-4 bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {currentFile ? `Processing: ${currentFile.name}` : 'No file being processed'}
      </p>

      <div className={`mt-4 p-3 h-40 overflow-y-auto rounded font-mono text-xs whitespace-pre-line ${
        darkMode 
          ? 'bg-gray-700 text-gray-200' 
          : 'bg-gray-100 text-gray-700'
      }`}>
        {logs.length > 0 ? logs.join('\n') : 'Logs will appear here...'}
      </div>
    </div>
  );
}

export default ProgressStatus;
