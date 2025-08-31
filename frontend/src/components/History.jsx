import React, { useState } from 'react';

function History({ historyItems, onDownload, onReprocess, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredHistory = historyItems.filter(item => {
    const matchesSearch = item.original_filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.processed_filename?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.operation_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleOpenFile = (item, fileType = 'original') => {
    let fileUrl;
    if (fileType === 'original') {
      fileUrl = item.originalFileUrl;
    } else {
      fileUrl = item.processedFileUrl;
    }
    
    if (fileUrl) {
      // Open file instantly in new tab
      window.open(fileUrl, '_blank');
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.original_filename}"? This will remove the file from both the database and local storage.`)) {
      await onDelete(item);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getOperationIcon = (operationType) => {
    switch (operationType) {
      case 'conversion': return '🔄';
      case 'compression': return '🗜️';
      case 'extraction': return '📄';
      case 'archive_extraction': return '📦';
      case 'upload': return '📁';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">File History</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Operations</option>
            <option value="conversion">Conversion</option>
            <option value="compression">Compression</option>
            <option value="extraction">Extraction</option>
            <option value="archive_extraction">Archive Extraction</option>
            <option value="upload">Upload</option>
          </select>
          
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📁</div>
          <p className="text-gray-500 text-lg">No history entries found.</p>
          <p className="text-gray-400 text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Size
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            {getOperationIcon(item.operation_type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.original_filename}
                          </p>
                          {item.processed_filename && item.processed_filename !== item.original_filename && (
                            <p className="text-sm text-gray-500 truncate">
                              → {item.processed_filename}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {item.operation_type.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <p className="font-medium">{formatDate(item.createdAt)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.status && (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <p className="font-medium">{formatFileSize(item.file_size)}</p>
                        {item.processed_size && (
                          <p className="text-xs text-gray-500">
                            → {formatFileSize(item.processed_size)}
                            {item.operation_type === 'compression' && (
                              <span className="ml-1 text-green-600">
                                ({Math.round(((item.file_size - item.processed_size) / item.file_size) * 100)}% saved)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        {/* Open Original File */}
                        <button
                          onClick={() => handleOpenFile(item, 'original')}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Open Original File"
                        >
                          📁
                        </button>
                        
                        {/* Open Processed File (if exists) */}
                        {item.processedFileUrl && (
                          <button
                            onClick={() => handleOpenFile(item, 'processed')}
                            className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors"
                            title="Open Processed File"
                          >
                            📄
                          </button>
                        )}
                        
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default History;
