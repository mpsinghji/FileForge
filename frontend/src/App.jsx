import React, { useState, useEffect, createContext, useContext } from 'react';
import Sidebar from './components/Sidebar';
import WorkspaceTabs from './components/WorkspaceTabs';
import { useWorkspace } from './store/useWorkspace';
import { useAuth } from './store/useAuth';
import ConversionPanel from './components/ConversionPanel';
import CompressionPanel from './components/CompressionPanel';
import TextExtractionPanel from './components/TextExtractionPanel';
import ArchiveExtractionPanel from './components/ArchiveExtractionPanel';
import PDFSplitterPanel from './components/PDFSplitterPanel';
import PDFMergerPanel from './components/PDFMergerPanel';
import FileEncryptorPanel from './components/FileEncryptorPanel';
import QRCodePanel from './components/QRCodePanel';
import ArchiveCreationPanel from './components/ArchiveCreationPanel';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';
import AuthModal from './components/AuthModal';
import { useLanguage } from './contexts/LanguageContext';
import * as api from './services/api';
import { getJobStatus } from './services/api';
import { addToLocalHistory } from './utils/localHistory';

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
  const { tabs, activeTabId, setTabPanel, setTabFiles } = useWorkspace();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState([]);
  const [doneFiles, setDoneFiles] = useState([]);
  const { t } = useLanguage();

  // Authentication state from persistent store
  const { isAuthenticated, user, logout: logoutStore, checkAuth } = useAuth();
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
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    const tabFiles = activeTab?.files || [];
    
    // QR code generation doesn't need files
    if (operationType !== 'qr-generate' && tabFiles.length === 0) {
      setLogs(prev => [...prev, '❌ No files selected for processing']);
      return;
    }

    setIsProcessing(true);
    setProgressPercent(0);
    setLogs([]);
    setDoneFiles([]);

    try {
      setLogs(prev => [...prev, '🚀 Starting file processing...']);

      // Handle QR code generation separately (no files needed)
      if (operationType === 'qr-generate') {
        setLogs(prev => [...prev, '📱 Generating QR code...']);
        setProgressPercent(50);
        
        const initialResponse = await api.generateQRCode(options);
        
        if (!initialResponse || !initialResponse.success || !initialResponse.data) {
          throw new Error(initialResponse?.error || 'Failed to generate QR code');
        }
        
        setLogs(prev => [...prev, '✅ QR code generated successfully!']);
        const resultData = initialResponse.data;
        setDoneFiles([{
          originalFile: 'QR Code',
          processedFile: resultData.filename,
          download_url: resultData.download_url,
          format: resultData.format,
          size: resultData.size
        }]);
        setProgressPercent(100);
        setLogs(prev => [...prev, '🎉 QR code ready for download!']);
        return;
      }

      for (let i = 0; i < tabFiles.length; i++) {
        const file = tabFiles[i];
        setLogs(prev => [...prev, `📁 Processing: ${file.name}`]);
        setProgressPercent((i / tabFiles.length) * 50);

        let initialResponse;
        switch (operationType) {
          case 'conversion':
            initialResponse = await api.convertFile(file, options.targetFormat);
            break;
          case 'compression':
            initialResponse = await api.compressFile(file, options.compressionLevel, options.quality, options.removeMetadata);
            break;
          case 'extraction':
          case 'text-extraction':
            initialResponse = await api.extractText(file, options.mode, options.includeMetadata, options.language);
            break;
          case 'archive-extraction':
            if (i === 0) {
              initialResponse = await api.extractArchive(tabFiles, { extractPath: options.extractPath, overwriteExisting: options.overwriteExisting, password: options.password });
            } else {
              continue; // Skip remaining iterations for archive
            }
            break;
          case 'pdf-split':
            initialResponse = await api.splitPDF(file, options);
            console.log('[PDF SPLIT] Response:', initialResponse);
            
            // Handle multiple PDF files
            if (initialResponse && initialResponse.success && initialResponse.data && initialResponse.data.files) {
              setLogs(prev => [...prev, `✅ Split into ${initialResponse.data.totalFiles} PDF files`]);
              
              initialResponse.data.files.forEach((pdfFile, idx) => {
                console.log(`[PDF SPLIT] Processing file ${idx + 1}:`, pdfFile);
                
                const doneItem = {
                  originalFile: `${file.name} - Part ${idx + 1}`,
                  processedFile: pdfFile.filename,
                  download_url: pdfFile.download_url,
                  pages: pdfFile.pages,
                  size: pdfFile.size
                };
                setDoneFiles(prev => [...prev, doneItem]);
                
                // Add to local history
                addToLocalHistory({
                  operationType: 'pdf-split',
                  originalFile: file.name,
                  processedFile: pdfFile.filename,
                  status: 'completed',
                  size: pdfFile.size,
                  pages: pdfFile.pages
                });
              });
              
              setProgressPercent(100);
              setLogs(prev => [...prev, '🎉 All PDF files ready for download!']);
              continue; // Skip the rest of the loop for this file
            } else {
              console.error('[PDF SPLIT] Invalid response:', initialResponse);
              throw new Error('PDF split failed - invalid response from server');
            }
            break;
          case 'pdf-merge':
            if (i === 0) {
              initialResponse = await api.mergePDFs(tabFiles);
            } else {
              continue; // Skip remaining iterations for merge
            }
            break;
          case 'file-encrypt':
            initialResponse = await api.encryptFile(file, options.password);
            break;
          case 'file-decrypt':
            initialResponse = await api.decryptFile(file, options.password);
            break;
          case 'archive-create':
            if (i === 0) {
              initialResponse = await api.createArchive(tabFiles, options);
            } else {
              continue; // Skip remaining iterations for archive
            }
            break;
          case 'qr-generate':
            initialResponse = await api.generateQRCode(options);
            break;
          default:
            throw new Error(`Unknown operation type: ${operationType}`);
        }

        if (!initialResponse || !initialResponse.success || !initialResponse.data) {
          throw new Error(initialResponse?.error || 'Failed to start processing');
        }

        // Handle async polling for conversion/compression
        if (operationType === 'conversion' || operationType === 'compression') {
          const jobs = initialResponse.data.jobs || [];
          const currentJob = jobs.find(j => j.originalFile === file.name) || jobs[0];

          if (currentJob && currentJob.jobId) {
            // Poll for completion
            let status = 'processing';
            let resultData = null;

            while (status === 'processing' || status === 'pending') {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every 1s

              let statusRes;
              if (operationType === 'compression') {
                statusRes = await api.getCompressionStatus(currentJob.jobId);
              } else {
                statusRes = await api.getJobStatus(currentJob.jobId);
              }

              if (statusRes.success) {
                status = statusRes.data.status;
                resultData = statusRes.data;
                // Update logs with real-time messages if available
                if (statusRes.data.logs && statusRes.data.logs.length > 0) {
                  const lastLog = statusRes.data.logs[statusRes.data.logs.length - 1];
                  // Optional: enable unique log lines only
                }
              } else {
                throw new Error('Failed to check job status');
              }
            }

            if (status === 'completed' && resultData) {
              setLogs(prev => [...prev, `✅ Successfully processed: ${file.name}`]);
              setLogs(prev => [...prev, `📁 Converted file: ${resultData.processedFile || resultData.compressedFile || 'Unknown'}`]);

              // Format sizes
              const formatSize = (bytes) => {
                if (!bytes) return 'Unknown';
                if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
                return (bytes / 1024).toFixed(2) + ' KB';
              };

              const originalSize = resultData.originalSize || file.size; // fallback
              const newSize = resultData.processedSize || resultData.compressedSize || resultData.outputSize;

              if (newSize) {
                setLogs(prev => [...prev, `📊 Original size: ${formatSize(originalSize)}`]);
                setLogs(prev => [...prev, `📉 New size: ${formatSize(newSize)}`]);
                if (originalSize > 0) {
                  const ratio = Math.round(((originalSize - newSize) / originalSize) * 100);
                  setLogs(prev => [...prev, `⚡ Compression: ${ratio}% savings`]);
                }
              } else {
                setLogs(prev => [...prev, `📊 File size: Unknown (Async processing)`]);
              }
              
              setDoneFiles(prev => [...prev, {
                originalFile: file.name,
                processedFile: resultData.processedFile || resultData.compressedFile || resultData.extractedFile || 'Unknown',
                download_url: resultData.downloadUrl
              }]);

            } else {
              throw new Error(resultData?.error || 'Processing failed');
            }
          } else {
            // Fallback if no jobId (should not happen with new backend)
            setLogs(prev => [...prev, `⚠️ Job started but no ID returned. Check History for results.`]);
          }
        } else if (operationType === 'archive-extraction') {
          // Archive extraction — synchronous, results come directly
          const results = initialResponse.data?.results || [];
          for (const r of results) {
            if (r.success) {
              setLogs(prev => [...prev, `✅ Extracted: ${r.original} — ${r.filesExtracted ?? '?'} files`]);
              const doneItem = {
                originalFile: r.original,
                processedFile: r.filename,
                filesExtracted: r.filesExtracted,
                processingTime: r.processingTime,
                download_url: r.download_url,
              };
              setDoneFiles(prev => [...prev, doneItem]);
              
              // Add to local history
              addToLocalHistory({
                operationType: 'archive-extraction',
                originalFile: r.original,
                processedFile: r.filename,
                status: 'completed',
                filesExtracted: r.filesExtracted,
                processingTime: r.processingTime
              });
            } else {
              setLogs(prev => [...prev, `❌ Failed: ${r.original} — ${r.error}`]);
            }
          }
          break; // archive processes all files at once, skip the loop
        } else if (operationType === 'pdf-merge' || operationType === 'file-encrypt' || operationType === 'file-decrypt' || operationType === 'archive-create' || operationType === 'qr-generate') {
          // Synchronous operations with direct results
          setLogs(prev => [...prev, `✅ Successfully processed: ${file?.name || operationType === 'qr-generate' ? 'QR Code' : 'Archive'}`]);
          const resultData = initialResponse.data;
          const doneItem = {
            originalFile: file?.name || (operationType === 'qr-generate' ? 'QR Code' : 'Archive'),
            processedFile: resultData.filename,
            download_url: resultData.download_url,
            totalFiles: resultData.totalFiles,
            totalPages: resultData.totalPages,
            filesCount: resultData.filesCount,
            format: resultData.format,
            size: resultData.size,
            isPasswordProtected: resultData.isPasswordProtected,
            compressionLevel: resultData.compressionLevel
          };
          setDoneFiles(prev => [...prev, doneItem]);
          
          // Add to local history
          addToLocalHistory({
            operationType: operationType,
            originalFile: doneItem.originalFile,
            processedFile: doneItem.processedFile,
            status: 'completed',
            size: doneItem.size,
            totalFiles: doneItem.totalFiles,
            totalPages: doneItem.totalPages,
            filesCount: doneItem.filesCount,
            format: doneItem.format,
            isPasswordProtected: doneItem.isPasswordProtected,
            compressionLevel: doneItem.compressionLevel
          });
          
          if (operationType === 'pdf-merge' || operationType === 'qr-generate' || operationType === 'archive-create') break; // single operation
        } else {
          // Synchronous/Other operations
          setLogs(prev => [...prev, `✅ Successfully processed: ${file.name}`]);
          if (initialResponse.data) {
            // other generic handling
          }
        }

        setProgressPercent(((i + 1) / tabFiles.length) * 100);
        setLogs(prev => [...prev, `🔗 Download available in History tab`]);
      }

      setLogs(prev => [...prev, '🎉 All files processed successfully!']);
    } catch (error) {
      console.error('Processing error:', error);
      setLogs(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      // Comprehensive state reset to ensure recovery from errors
      setIsProcessing(false);
      setProgressPercent(100); // Always complete the progress bar
    }
  };

  // Authentication functions
  const checkAuthStatus = async () => {
    // Check if user is authenticated using persistent store
    if (checkAuth()) {
      try {
        const response = await api.getProfile();
        if (response.success) {
          // User is still valid, no need to update store as it's already persistent
          console.log('User authenticated from persistent store');
        } else {
          // Token is invalid, logout
          logoutStore();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        logoutStore();
      }
    }
    setIsLoading(false);
  };

  const handleAuthSuccess = (authData) => {
    // Auth state is now managed by Zustand store, just close modal
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Logout is now handled by Zustand store
      logoutStore();
    }
  };

  const handleReset = () => {
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    setTabFiles(activeTab.id, []);
    setProgressPercent(0);
    setLogs([]);
    setDoneFiles([]);
    setIsProcessing(false); // Ensure processing flag is reset
  };

  const handleDownload = async (item) => {
    if (item.download_url) {
      if (item.download_url.startsWith('http')) {
        const url = new URL(item.download_url);
        url.searchParams.set('download', item.processedFile || item.originalFile || 'download');
        const a = document.createElement('a');
        a.href = url.toString();
        a.target = '_blank';
        a.download = item.processedFile || item.originalFile || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const filename = item.processedFile || item.originalFile;
        api.downloadFile(filename).catch(err => {
          console.error('Download failed:', err);
          alert('Failed to download file.');
        });
      }
    }
  };

  // Check authentication status on component mount
  useEffect(() => {
    // Skip authentication check - allow direct access
    setIsLoading(false);
    // checkAuthStatus();
  }, []);

  const renderActivePanel = () => {
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    const panel = activeTab?.panel || activePanel;
    switch (activePanel) {
      case 'conversion':
        return (
          <ConversionPanel
            files={activeTab?.files || []}
            setFiles={(f) => setTabFiles(activeTab.id, typeof f === 'function' ? f(activeTab.files) : f)}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            doneFiles={doneFiles}
            onDownload={handleDownload}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'compression':
        return (
          <CompressionPanel
            files={activeTab?.files || []}
            setFiles={(f) => setTabFiles(activeTab.id, typeof f === 'function' ? f(activeTab.files) : f)}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            doneFiles={doneFiles}
            onDownload={handleDownload}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'text-extraction':
        return (
          <TextExtractionPanel
            files={activeTab?.files || []}
            setFiles={(f) => setTabFiles(activeTab.id, typeof f === 'function' ? f(activeTab.files) : f)}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            doneFiles={doneFiles}
            onDownload={handleDownload}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'archive-extraction':
        return (
          <ArchiveExtractionPanel
            files={activeTab?.files || []}
            setFiles={(f) => setTabFiles(activeTab.id, typeof f === 'function' ? f(activeTab.files) : f)}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            doneFiles={doneFiles}
            onDownload={handleDownload}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'pdf-splitter':
        return (
          <PDFSplitterPanel
            files={activeTab?.files || []}
            setFiles={(f) => setTabFiles(activeTab.id, typeof f === 'function' ? f(activeTab.files) : f)}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            doneFiles={doneFiles}
            onDownload={handleDownload}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'pdf-merger':
        return (
          <PDFMergerPanel
            files={activeTab?.files || []}
            setFiles={(f) => setTabFiles(activeTab.id, typeof f === 'function' ? f(activeTab.files) : f)}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            doneFiles={doneFiles}
            onDownload={handleDownload}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'file-encryptor':
        return (
          <FileEncryptorPanel
            files={activeTab?.files || []}
            setFiles={(f) => setTabFiles(activeTab.id, typeof f === 'function' ? f(activeTab.files) : f)}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            doneFiles={doneFiles}
            onDownload={handleDownload}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'qr-generator':
        return (
          <QRCodePanel
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            doneFiles={doneFiles}
            onDownload={handleDownload}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      case 'archive-creation':
        return (
          <ArchiveCreationPanel
            files={activeTab?.files || []}
            setFiles={(f) => setTabFiles(activeTab.id, typeof f === 'function' ? f(activeTab.files) : f)}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            logs={logs}
            doneFiles={doneFiles}
            onDownload={handleDownload}
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
            doneFiles={doneFiles}
            onDownload={handleDownload}
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

  // Skip authentication - allow direct access
  // if (!isAuthenticated) {
  //   return (
  //     <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
  //       <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-slate-50 to-blue-50'} flex items-center justify-center`}>
  //         <div className="text-center">
  //           <h1 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>FileForge</h1>
  //           <p className={`mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Your all-in-one file processing solution</p>
  //           <button
  //             onClick={() => setShowAuthModal(true)}
  //             className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
  //           >
  //             Get Started
  //           </button>
  //         </div>

  //         <AuthModal
  //           isOpen={showAuthModal}
  //           onClose={() => setShowAuthModal(false)}
  //           onAuthSuccess={handleAuthSuccess}
  //         />
  //       </div>
  //     </DarkModeContext.Provider>
  //   );
  // }

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
        {/* User info and logout button */}
        {/* <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>FileForge</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('nav.welcome')}, {user?.username || user?.email}
                </span>
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-full transition-colors ${darkMode
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
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          </div>
        </div> */}

        <div className="flex h-screen">
          <Sidebar activePanel={activePanel} setActivePanel={(p) => {
              if (p === activePanel) return;
              const active = tabs.find(t => t.id === activeTabId);
              if (active) {
                setTabFiles(active.id, []);
                setTabPanel(active.id, p);
              }
              setProgressPercent(0);
              setLogs([]);
              setDoneFiles([]);
              setActivePanel(p);
            }} />

          <main className="flex-1 overflow-y-auto">
            <WorkspaceTabs />
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
