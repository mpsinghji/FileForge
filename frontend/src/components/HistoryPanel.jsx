import React, { useState } from 'react';

function HistoryPanel({ historyItems, onDownload, onReprocess, onDelete }) {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const items = Array.isArray(historyItems) ? historyItems : [];

  const operations = [
    { value: 'all', label: 'All Operations', icon: '📋' },
    { value: 'conversion', label: 'Conversions', icon: '🔄' },
    { value: 'compression', label: 'Compressions', icon: '🗜️' },
    { value: 'extraction', label: 'Extractions', icon: '📦' },
    { value: 'text-extraction', label: 'Text Extraction', icon: '📝' },
  ];

  const statusColors = {
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  const getOperationIcon = (operation) => {
    const op = operations.find(op => op.value === operation);
    return op ? op.icon : '📋';
  };

  const getOperationLabel = (operation) => {
    const op = operations.find(op => op.value === operation);
    return op ? op.label : 'Unknown';
  };

  const formatFileSize = (size) => {
    if (!Number.isFinite(size)) return '-';
    if (size < 1) return `${(size * 1024).toFixed(1)} KB`;
    return `${size.toFixed(1)} MB`;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Unknown time';
    const timestamp = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(timestamp.getTime())) return 'Unknown time';
    const now = new Date();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filterType === 'all' || item.operation === filterType;
    const name = (item.fileName || '').toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalOps = items.length;
  const totalCompleted = items.filter(i => i.status === 'completed').length;
  const totalFailed = items.filter(i => i.status === 'failed').length;
  const totalSizeMb = items.reduce((sum, i) => sum + (Number.isFinite(i.fileSize) ? i.fileSize : 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl">📋</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Processing History</h1>
            <p className="text-gray-600">View and manage your file processing history</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Operation</label>
            <div className="flex flex-wrap gap-2">
              {operations.map((operation) => (
                <button
                  key={operation.value}
                  onClick={() => setFilterType(operation.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filterType === operation.value
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{operation.icon}</span>
                  {operation.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:w-80">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Files</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Recent Operations</h2>
          <div className="text-sm text-gray-500">
            {filteredItems.length} of {totalOps} items
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No history found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id || item.fileName} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{getOperationIcon(item.operation)}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{item.fileName || 'Untitled file'}</h3>
                      <p className="text-sm text-gray-500">
                        {getOperationLabel(item.operation)} • {formatTimestamp(item.timestamp)}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        {(item.fromFormat && item.toFormat) && (
                          <span className="text-xs text-gray-400">
                            {String(item.fromFormat).toUpperCase()} → {String(item.toFormat).toUpperCase()}
                          </span>
                        )}
                        {(Number.isFinite(item.fileSize) || Number.isFinite(item.resultSize)) && (
                          <span className="text-xs text-gray-400">
                            {formatFileSize(item.fileSize)}{Number.isFinite(item.resultSize) ? ` → ${formatFileSize(item.resultSize)}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {item.status && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-700'}`}>
                        {item.status}
                      </span>
                    )}
                    
                    {item.downloadUrl && item.status === 'completed' && (
                      <a
                        href={item.downloadUrl}
                        download
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        📥 Download Converted File
                      </a>
                    )}
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onDownload && onDownload(item)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        📥
                      </button>
                      <button
                        onClick={() => onReprocess && onReprocess(item)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Reprocess"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => onDelete && onDelete(item)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">📊</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{totalOps}</div>
              <div className="text-sm text-gray-500">Total Operations</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{totalCompleted}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">❌</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{totalFailed}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">💾</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{formatFileSize(totalSizeMb)}</div>
              <div className="text-sm text-gray-500">Total Size</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryPanel;
