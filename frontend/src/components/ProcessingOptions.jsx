import React from 'react';

function ProcessingOptions({
  convertFormat,
  setConvertFormat,
  applyOCR,
  setApplyOCR,
  applyCompression,
  setApplyCompression,
  availableFormats
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Processing Options</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="format-select" className="block text-sm font-medium text-gray-700 mb-1">
            Convert to format
          </label>
          <select
            id="format-select"
            value={convertFormat}
            onChange={(e) => setConvertFormat(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select format</option>
            {availableFormats.map((format) => (
              <option key={format.value} value={format.value}>{format.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            id="ocr-toggle"
            type="checkbox"
            checked={applyOCR}
            onChange={(e) => setApplyOCR(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="ocr-toggle" className="ml-2 block text-sm text-gray-700 cursor-pointer" title="Extract text from images/scans">
            Apply OCR (Text Extraction)
          </label>
        </div>

        <div className="flex items-center">
          <input
            id="compression-toggle"
            type="checkbox"
            checked={applyCompression}
            onChange={(e) => setApplyCompression(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="compression-toggle" className="ml-2 block text-sm text-gray-700 cursor-pointer" title="Compress output files to save space">
            Enable Compression
          </label>
        </div>
      </div>
    </div>
  );
}

export default ProcessingOptions;
