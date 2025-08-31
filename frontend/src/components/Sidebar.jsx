import React from 'react';
import { useDarkMode } from '../App';

function Sidebar({ activePanel, setActivePanel }) {
  const { darkMode } = useDarkMode();
  const menuItems = [
    {
      id: 'conversion',
      label: 'File Conversion',
      icon: '🔄',
      description: 'Convert files between formats'
    },
    {
      id: 'compression',
      label: 'Compression',
      icon: '🗜️',
      description: 'Compress files to reduce size'
    },
    {
      id: 'text-extraction',
      label: 'Text Extraction',
      icon: '📝',
      description: 'Extract text from documents'
    },
    {
      id: 'archive-extraction',
      label: 'Archive Extraction',
      icon: '📦',
      description: 'Extract files from archives'
    },
    {
      id: 'history',
      label: 'History',
      icon: '📋',
      description: 'View processing history'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      description: 'Configure application settings'
    }
  ];

  return (
    <div className={`w-80 shadow-xl border-r flex flex-col ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <div>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>FileForge</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>File Processing Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 group hover:shadow-md ${
              activePanel === item.id
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                : darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  activePanel === item.id ? 'text-white' : darkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  {item.label}
                </h3>
                <p className={`text-sm ${
                  activePanel === item.id ? 'text-blue-100' : darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {item.description}
                </p>
              </div>
              {activePanel === item.id && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
          </button>
        ))}
      </nav>

      <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`rounded-lg p-3 ${
          darkMode 
            ? 'bg-gradient-to-r from-indigo-900 to-blue-900' 
            : 'bg-gradient-to-r from-indigo-50 to-blue-50'
        }`}>
          <div className="flex items-center space-x-2">
          </div>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Ready to process files</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;

