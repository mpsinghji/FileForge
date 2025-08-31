import React, { useState, useEffect, createContext, useContext } from 'react';
import Sidebar from './components/Sidebar';
import ConversionPanel from './components/ConversionPanel';
import CompressionPanel from './components/CompressionPanel';
import TextExtractionPanel from './components/TextExtractionPanel';
import ArchiveExtractionPanel from './components/ArchiveExtractionPanel';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';
import AuthModal from './components/AuthModal';
import * as api from './services/api';

// Global Dark Mode Context
const DarkModeContext = createContext();

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

function App() {
  const [activePanel, setActivePanel] = useState('conversion');
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState([]);
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Global Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Apply dark mode to document
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleProcess = async (operationType, options = {}) => {
    if (files.length === 0) {
      setLogs(prev => [...prev, '❌ No files selected for processing']);
      return;
    }

    setIsProcessing(true);
    setProgressPercent(0);
    setLogs([]);

    try {
      setLogs(prev => [...prev, '🚀 Starting file processing...']);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setLogs(prev => [...prev, `📁 Processing: ${file.name}`]);
        setProgressPercent((i / files.length) * 50);

        let result;
        switch (operationType) {
          case 'conversion':
            result = await api.convertFile(file, options.targetFormat);
            break;
          case 'compression':
            result = await api.compressFile(file, options.compressionLevel, options.quality, options.removeMetadata);
            break;
          case 'extraction':
            result = await api.extractText(file, options.mode, options.includeMetadata, options.language);
            break;
          default:
            throw new Error(`Unknown operation type: ${operationType}`);
        }

        setProgressPercent(((i + 1) / files.length) * 100);
        setLogs(prev => [...prev, `✅ Successfully processed: ${file.name}`]);
        
        if (result) {
          setLogs(prev => [...prev, `📁 Converted file: ${result.filename || result.outputPath || 'Unknown'}`]);
          setLogs(prev => [...prev, `📊 File size: ${result.size || result.outputSize ? ((result.size || result.outputSize) / 1024).toFixed(1) : 'Unknown'} KB`]);
        } else {
          setLogs(prev => [...prev, `❌ No conversion result received`]);
        }
        
        setLogs(prev => [...prev, `🔗 Download available in History tab`]);
      }

      setLogs(prev => [...prev, '🎉 All files processed successfully!']);
    } catch (error) {
      console.error('Processing error:', error);
      setLogs(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Authentication functions
  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const response = await api.getProfile();
        if (response.success) {
          setIsAuthenticated(true);
          setUser(response.data.user);
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  };

  const handleAuthSuccess = (authData) => {
    setIsAuthenticated(true);
    setUser(authData.user);
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setProgressPercent(0);
    setLogs([]);
  };

  const handleDownload = async (item) => {
    if (item.downloadUrl) {
      try {
        const response = await fetch(item.downloadUrl);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.result?.filename || `converted_${item.filename}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'conversion':
        return (
          <ConversionPanel
            files={files}
            setFiles={setFiles}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'compression':
        return (
          <CompressionPanel
            files={files}
            setFiles={setFiles}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'text-extraction':
        return (
          <TextExtractionPanel
            files={files}
            setFiles={setFiles}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'archive-extraction':
        return (
          <ArchiveExtractionPanel
            files={files}
            setFiles={setFiles}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
             case 'history':
         return <HistoryPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return (
          <ConversionPanel
            files={files}
            setFiles={setFiles}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-slate-50 to-blue-50'} flex items-center justify-center`}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Loading...</p>
          </div>
        </div>
      </DarkModeContext.Provider>
    );
  }

  // Show auth modal if not authenticated
  if (!isAuthenticated) {
    return (
      <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-slate-50 to-blue-50'} flex items-center justify-center`}>
          <div className="text-center">
            <h1 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>FileForge</h1>
            <p className={`mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Your all-in-one file processing solution</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
          
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={handleAuthSuccess}
          />
        </div>
      </DarkModeContext.Provider>
    );
  }

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
        {/* User info and logout button */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>FileForge</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Welcome, {user?.username || user?.email}
                </span>
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-full transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                <button
                  onClick={handleLogout}
                  className={`text-sm transition-colors ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex h-screen">
          <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} />
          
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              {renderActivePanel()}
            </div>
          </main>
        </div>
      </div>
    </DarkModeContext.Provider>
  );
}

export default App;
