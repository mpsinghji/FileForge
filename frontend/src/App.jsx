import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ConversionPanel from './components/ConversionPanel';
import CompressionPanel from './components/CompressionPanel';
import TextExtractionPanel from './components/TextExtractionPanel';
import ArchiveExtractionPanel from './components/ArchiveExtractionPanel';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';
import * as api from './services/api';

function App() {
  const [activePanel, setActivePanel] = useState('conversion');
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);

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
            result = await api.convertFile(file, options.targetFormat, options.applyOCR);
            break;
          case 'compression':
            result = await api.compressFile(file, options.compressionLevel, options.quality, options.removeMetadata);
            break;
          case 'extraction':
            result = await api.extractText(file, options.mode, options.outputFormat, options.includeMetadata, options.language);
            break;
          default:
            throw new Error(`Unknown operation type: ${operationType}`);
        }

        setProgressPercent(((i + 1) / files.length) * 100);
        setLogs(prev => [...prev, `✅ Successfully processed: ${file.name}`]);
        
        // Add to history
        setHistoryItems(prev => [...prev, {
          id: Date.now() + i,
          filename: file.name,
          operation: operationType,
          status: 'completed',
          timestamp: new Date().toISOString(),
          result: result
        }]);
      }

      setLogs(prev => [...prev, '🎉 All files processed successfully!']);
    } catch (error) {
      console.error('Processing error:', error);
      setLogs(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setProgressPercent(0);
    setLogs([]);
  };

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
        return (
          <HistoryPanel
            historyItems={historyItems}
            onDownload={() => {}}
            onReprocess={() => {}}
            onDelete={() => {}}
          />
        );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      
      <div className="flex h-screen">
        <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} />
        
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {renderActivePanel()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
