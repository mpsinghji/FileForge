import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../App';
import * as api from '../services/api';

function HistoryPanel() {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { darkMode } = useDarkMode();

  // Fetch history data from MongoDB
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      console.log('Fetching history...'); // Debug log
      
      // Check if user is authenticated
      const token = localStorage.getItem('authToken');
      console.log('Auth token:', token ? 'Present' : 'Missing'); // Debug log
      
      const response = await api.getHistory();
      console.log('API Response:', response); // Debug log
      
      if (response.success) {
        const historyData = response.data.history || [];
        console.log('History Data:', historyData); // Debug log
        console.log('First item structure:', historyData[0]); // Debug log
        console.log('Data type:', typeof historyData); // Debug log
        console.log('Is array:', Array.isArray(historyData)); // Debug log
        
        setHistoryItems(historyData);
      } else {
        console.error('API returned success: false:', response);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get the actual data from MongoDB document
  const getItemData = (item) => {
    // Handle both direct properties and nested _doc properties
    return item._doc || item;
  };

  // Get file type icon based on filename extension
  const getFileTypeIcon = (filename) => {
    if (!filename) return '📄';
    
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // Document files
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) return '📄';
    if (['xls', 'xlsx', 'csv'].includes(extension)) return '📊';
    if (['ppt', 'pptx'].includes(extension)) return '📽️';
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) return '🖼️';
    if (['tiff', 'tif'].includes(extension)) return '🖼️';
    
    // Video files
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) return '🎥';
    
    // Audio files
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(extension)) return '🎵';
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) return '📦';
    
    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'xml'].includes(extension)) return '💻';
    if (['py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs'].includes(extension)) return '💻';
    
    // Default
    return '📄';
  };

  const operations = [
    { value: 'all', label: 'All Operations', icon: '📋' },
    { value: 'conversion', label: 'Conversions', icon: '🔄' },
    { value: 'compression', label: 'Compressions', icon: '🗜️' },
    { value: 'extraction', label: 'Extractions', icon: '📦' },
    { value: 'archive_extraction', label: 'Archive Extraction', icon: '📦' },
    { value: 'upload', label: 'Uploads', icon: '📁' },
  ];

  const statusColors = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };

  const getOperationIcon = (operation) => {
    const op = operations.find(op => op.value === operation);
    return op ? op.icon : '📋';
  };

  const getOperationLabel = (operation) => {
    const op = operations.find(op => op.value === operation);
    return op ? op.label : 'Unknown';
  };

  const formatFileSize = (bytes) => {
    if (!bytes || !Number.isFinite(bytes)) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Unknown time';
    const timestamp = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(timestamp.getTime())) return 'Unknown time';
    
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredItems = historyItems.filter(item => {
    const itemData = getItemData(item);
    const matchesFilter = filterType === 'all' || itemData.operation_type === filterType;
    const name = (itemData.original_filename || '').toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalOps = historyItems.length;
  const totalCompleted = historyItems.filter(i => getItemData(i).status === 'completed').length;
  const totalFailed = historyItems.filter(i => getItemData(i).status === 'failed').length;
  const totalSizeBytes = historyItems.reduce((sum, i) => sum + (getItemData(i).file_size || 0), 0);

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="space-y-6 p-6">


        <div className={`rounded-2xl shadow-lg p-6 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-2xl">📋</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Processing History</h1>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                View and manage your file processing history
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-blue-50'
            }`}>
              <div className="text-2xl font-bold text-blue-600">{totalOps}</div>
              <div className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Total Operations</div>
            </div>
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-green-50'
            }`}>
              <div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
              <div className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>Completed</div>
            </div>
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-red-50'
            }`}>
              <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
              <div className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Failed</div>
            </div>
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-purple-50'
            }`}>
              <div className="text-2xl font-bold text-purple-600">{formatFileSize(totalSizeBytes)}</div>
              <div className={`text-sm ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>Total Size</div>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl shadow-lg p-6 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>Filter by Operation</label>
              <div className="flex flex-wrap gap-2">
                {operations.map((operation) => (
                  <button
                    key={operation.value}
                    onClick={() => setFilterType(operation.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      filterType === operation.value
                        ? 'bg-indigo-500 text-white'
                        : darkMode 
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
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
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>Search Files</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by filename..."
                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300'
                }`}
              />
            </div>
          </div>
        </div>

        <div className={`rounded-2xl shadow-lg p-6 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recent Operations</h2>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {filteredItems.length} of {totalOps} items
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium mb-2">No history found</h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item, index) => {
                const itemData = getItemData(item);
                // Ensure we have a unique key for each item
                const itemKey = itemData._id || itemData.id || `item-${index}`;
                
                return (
                  <div key={itemKey} className={`border rounded-xl p-4 hover:shadow-md transition-all duration-200 ${
                    darkMode 
                      ? 'border-gray-600 hover:bg-gray-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <span className="text-2xl">{getFileTypeIcon(itemData.original_filename)}</span>
                        </div>
                        <div>
                          <h3 className="font-medium">{itemData.original_filename || 'Untitled file'}</h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {getOperationLabel(itemData.operation_type)} • {formatTimestamp(itemData.createdAt)}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                              {formatFileSize(itemData.file_size)}
                              {itemData.processed_size && ` → ${formatFileSize(itemData.processed_size)}`}
                            </span>
                            {itemData.status && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[itemData.status] || 'bg-gray-100 text-gray-700'}`}>
                                {itemData.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Operation Type Icon */}
                      <div className={`p-3 rounded-lg ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <span className="text-2xl">{getOperationIcon(itemData.operation_type)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryPanel;
