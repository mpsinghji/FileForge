import React from 'react';

function ProcessControl({ files, canProcess, onProcess, onReset, isProcessing }) {
  return (
    <div className="flex space-x-4 mt-6">
      <button
        disabled={!canProcess || isProcessing}
        onClick={onProcess}
        className={`flex-1 py-2 px-4 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isProcessing ? 'Processing...' : 'Process Files'}
      </button>
      <button
        onClick={onReset}
        className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        Reset
      </button>
    </div>
  );
}

export default ProcessControl;
