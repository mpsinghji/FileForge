import React from 'react';
import { useDarkMode } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

function Sidebar({ activePanel, setActivePanel }) {
  const { darkMode } = useDarkMode();
  const { t } = useLanguage();

  const menuItems = [
    {
      id: 'conversion',
      label: t('sidebar.conversion'),
      icon: '🔄',
      description: t('sidebar.conversion.desc')
    },
    {
      id: 'compression',
      label: t('sidebar.compression'),
      icon: '🗜️',
      description: t('sidebar.compression.desc')
    },
    {
      id: 'text-extraction',
      label: t('sidebar.textExtraction'),
      icon: '📝',
      description: t('sidebar.textExtraction.desc')
    },
    {
      id: 'archive-extraction',
      label: t('sidebar.archiveExtraction'),
      icon: '📦',
      description: t('sidebar.archiveExtraction.desc')
    },
    {
      id: 'pdf-splitter',
      label: 'PDF Splitter',
      icon: '✂️',
      description: 'Split PDF into pages'
    },
    {
      id: 'pdf-merger',
      label: 'PDF Merger',
      icon: '📑',
      description: 'Merge multiple PDFs'
    },
    {
      id: 'file-encryptor',
      label: 'File Encryptor',
      icon: '🔐',
      description: 'Encrypt/decrypt files'
    },
    {
      id: 'qr-generator',
      label: 'QR Generator',
      icon: '📱',
      description: 'Create QR codes'
    },
    {
      id: 'archive-creation',
      label: 'Archive Creator',
      icon: '🗜️',
      description: 'Create compressed archives'
    },
    {
      id: 'history',
      label: t('sidebar.history'),
      icon: '📋',
      description: t('sidebar.history.desc')
    },
    {
      id: 'settings',
      label: t('sidebar.settings'),
      icon: '⚙️',
      description: t('sidebar.settings.desc')
    }
  ];

  return (
    <div className={`w-80 shadow-xl border-r flex flex-col h-screen overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`p-6 border-b flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <div>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('app.name')}</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('app.tagline')}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 group hover:shadow-md ${activePanel === item.id
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
              : darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <h3 className={`font-semibold ${activePanel === item.id ? 'text-white' : darkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                  {item.label}
                </h3>
                <p className={`text-sm ${activePanel === item.id ? 'text-blue-100' : darkMode ? 'text-gray-400' : 'text-gray-500'
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

      <div className={`p-4 border-t flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`rounded-lg p-3 ${darkMode
          ? 'bg-gradient-to-r from-indigo-900 to-blue-900'
          : 'bg-gradient-to-r from-indigo-50 to-blue-50'
          }`}>
          <div className="flex items-center space-x-2">
          </div>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('sidebar.ready')}</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
