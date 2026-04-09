import React from 'react';
import { useDarkMode } from '../App';

function ProgressStatus({ progressPercent, currentFile, logs, doneFiles = [], onDownload }) {
  const { darkMode } = useDarkMode();
  
  return (
    <div className="mt-8 flex flex-col h-full">
      <h2 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Progress & Logs</h2>

      <div className={`w-full rounded-full h-4 overflow-hidden mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-4 bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {currentFile ? `Processing: ${currentFile.name}` : 'No file being processed'}
      </p>

      <div className={`mt-4 p-3 flex-1 min-h-[160px] max-h-[300px] overflow-y-auto rounded font-mono text-xs whitespace-pre-line ${
        darkMode 
          ? 'bg-gray-700 text-gray-200' 
          : 'bg-gray-100 text-gray-700'
      }`}>
        {logs.length > 0 ? logs.join('\n') : 'Logs will appear here...'}
      </div>

      {doneFiles && doneFiles.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Ready to Download</h3>
          <div className="flex flex-col gap-2">
            {doneFiles.map((file, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'} shadow-sm`}>
                <div className="flex flex-col truncate mr-4">
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'} truncate`}>{file.processedFile}</span>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>from {file.originalFile}</span>
                </div>
                <button 
                  onClick={() => onDownload && onDownload(file)}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressStatus;
