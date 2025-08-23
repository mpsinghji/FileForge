import React, { useState } from 'react';

function History({ historyItems, onDownload, onReprocess, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = historyItems.filter(item =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">History</h2>

      <input
        type="text"
        placeholder="Search files..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 p-2 border border-gray-300 rounded w-full max-w-sm"
      />

      {filteredHistory.length === 0 ? (
        <p className="text-gray-500">No history entries found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Filename</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Type</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-center font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 truncate max-w-xs">{item.filename}</td>
                  <td className="px-4 py-2">{item.type}</td>
                  <td className="px-4 py-2">{item.date}</td>
                  <td className="px-4 py-2">{item.status}</td>
                  <td className="px-4 py-2 flex justify-center space-x-3">
                    <button
                      onClick={() => onDownload(item)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Download"
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={() => onReprocess(item)}
                      className="text-green-600 hover:text-green-800"
                      title="Reprocess"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default History;
