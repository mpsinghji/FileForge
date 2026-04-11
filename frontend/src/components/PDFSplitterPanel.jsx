import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';
import * as api from '../services/api';

function PDFSplitterPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset, doneFiles, onDownload }) {
	const { darkMode } = useDarkMode();
	const [splitMode, setSplitMode] = useState('pages');
	const [pagesPerFile, setPagesPerFile] = useState(1);
	const [customRanges, setCustomRanges] = useState('');

	const handleStartSplit = () => {
		let ranges = [];
		if (splitMode === 'ranges' && customRanges) {
			// Parse ranges like "1-5, 6-10" or individual pages like "2, 4, 6"
			ranges = customRanges.split(',').map(r => {
				const trimmed = r.trim();
				
				// Check if it's a range (contains dash) or single page
				if (trimmed.includes('-')) {
					const parts = trimmed.split('-');
					const start = parseInt(parts[0]);
					const end = parseInt(parts[1]);
					return { start, end };
				} else {
					// Single page - treat as range of 1 page
					const page = parseInt(trimmed);
					return { start: page, end: page };
				}
			}).filter(r => !isNaN(r.start) && !isNaN(r.end) && r.start > 0 && r.end > 0);
			
			console.log('[PDF SPLIT FRONTEND] Parsed ranges:', ranges);
			
			if (ranges.length === 0) {
				alert('Invalid range format. Please enter:\n- Ranges: 1-3, 5-7\n- Individual pages: 2, 4, 6\n- Mixed: 1-3, 5, 7-9');
				return;
			}
		}
		onProcess('pdf-split', { mode: splitMode, pagesPerFile, ranges });
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:scale-[1.01] transition-transform duration-200`}>
				<div className="flex items-center space-x-3 mb-2">
					<div className="w-12 h-12 bg-gradient-to-br from-red-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
						<span className="text-white text-2xl">✂️</span>
					</div>
					<div>
						<h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>PDF Splitter</h1>
						<p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Split PDF files into multiple documents</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left column */}
				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Upload PDF</h2>
						<FileUpload files={files} setFiles={setFiles} accept=".pdf" />
					</div>

					{/* Split Settings */}
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Split Settings</h2>

						<div className="mb-6">
							<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Split Mode</label>
							<select
								value={splitMode}
								onChange={(e) => setSplitMode(e.target.value)}
								className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
							>
								<option value="pages">📄 Split by Pages</option>
								<option value="ranges">📊 Custom Ranges</option>
							</select>
						</div>

						{splitMode === 'pages' && (
							<div className="mb-6">
								<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Pages per File</label>
								<input
									type="number"
									min="1"
									value={pagesPerFile}
									onChange={(e) => setPagesPerFile(parseInt(e.target.value) || 1)}
									className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
								/>
								<p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Number of pages in each split file</p>
							</div>
						)}

						{splitMode === 'ranges' && (
							<div className="mb-6">
								<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Custom Ranges</label>
								<textarea
									value={customRanges}
									onChange={(e) => setCustomRanges(e.target.value)}
									placeholder="Examples:&#10;Ranges: 1-5, 6-10&#10;Pages: 2, 4, 6&#10;Mixed: 1-3, 5, 7-9"
									rows="4"
									className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-500' : 'border-gray-300 placeholder-gray-400'}`}
								/>
								<p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
									Enter page ranges (1-5), individual pages (2, 4), or mix both
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Right column */}
				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>

						<div className="space-y-4">
							<button
								onClick={handleStartSplit}
								disabled={files.length === 0 || isProcessing}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform ${
									files.length > 0 && !isProcessing
										? 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:shadow-lg hover:scale-105 active:scale-95'
										: darkMode
										? 'bg-gray-700 text-gray-400 cursor-not-allowed'
										: 'bg-gray-200 text-gray-400 cursor-not-allowed'
								}`}
							>
								{isProcessing ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>Splitting...</span>
									</div>
								) : (
									'✂️ Split PDF'
								)}
							</button>

							<button
								onClick={onReset}
								className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${darkMode ? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
							>
								Reset All
							</button>
						</div>
					</div>

					{/* Progress */}
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Progress</h2>
						<ProgressStatus
							progressPercent={progressPercent}
							currentFile={files[0] || null}
							logs={logs}
						/>
					</div>

					{/* Download section */}
					{doneFiles && doneFiles.length > 0 && (
						<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
							<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>📥 Download Split PDFs</h2>
							<div className="space-y-3">
								{doneFiles.map((item, idx) => (
									<div key={idx} className={`flex items-center justify-between p-4 rounded-xl border-2 transform hover:scale-[1.02] transition-all duration-200 ${darkMode ? 'bg-gray-700 border-gray-600 hover:border-red-500' : 'bg-red-50 border-red-200 hover:border-red-400'}`}>
										<div className="flex items-center gap-3 min-w-0">
											<span className="text-2xl flex-shrink-0">📄</span>
											<div className="min-w-0">
												<div className={`font-medium text-sm truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.originalFile}</div>
												<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
													{item.pages ? `Pages: ${item.pages}` : 'PDF file'}
													{item.size && ` • ${(item.size / 1024).toFixed(1)} KB`}
												</div>
											</div>
										</div>
										{item.download_url && (
											<button
												onClick={() => onDownload(item)}
												className="ml-3 flex-shrink-0 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1"
											>
												⬇️ Download
											</button>
										)}
									</div>
								))}
							</div>
							<div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
								<p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
									✅ Successfully split into {doneFiles.length} PDF file{doneFiles.length > 1 ? 's' : ''}
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default PDFSplitterPanel;
