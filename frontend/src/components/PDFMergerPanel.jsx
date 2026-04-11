import React, { useEffect, useState } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';

function PDFMergerPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset, doneFiles, onDownload }) {
	const { darkMode } = useDarkMode();
	const [pdfPreviews, setPdfPreviews] = useState([]);

	useEffect(() => {
		if (files.length > 0) {
			const previews = files.map((file, idx) => ({
				name: file.name,
				size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
				index: idx + 1
			}));
			setPdfPreviews(previews);
		} else {
			setPdfPreviews([]);
		}
	}, [files]);

	return (
		<div className="space-y-6">
			<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:scale-[1.01] transition-transform duration-200`}>
				<div className="flex items-center space-x-3 mb-2">
					<div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
						<span className="text-white text-2xl">📑</span>
					</div>
					<div>
						<h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>PDF Merger</h1>
						<p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Combine multiple PDF files into one</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Upload PDFs</h2>
						<FileUpload files={files} setFiles={setFiles} accept=".pdf" multiple />
						<p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Upload at least 2 PDF files to merge</p>
					</div>

					{/* 3D PDF Stack Preview */}
					{pdfPreviews.length > 0 && (
						<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
							<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>PDF Stack Preview</h2>
							<div className="relative h-64 flex items-center justify-center perspective-1000">
								{pdfPreviews.map((pdf, idx) => {
									const totalFiles = pdfPreviews.length;
									const offset = (idx - (totalFiles - 1) / 2) * 8;
									const rotation = (idx - (totalFiles - 1) / 2) * 3;
									const zIndex = totalFiles - idx;
									
									return (
										<div
											key={idx}
											className={`absolute w-40 h-52 rounded-lg shadow-2xl transition-all duration-300 hover:scale-110 hover:z-50 cursor-pointer ${
												darkMode ? 'bg-gradient-to-br from-purple-700 to-indigo-700' : 'bg-gradient-to-br from-purple-100 to-indigo-100'
											}`}
											style={{
												transform: `translateX(${offset}px) translateY(${-Math.abs(offset) * 0.5}px) rotateY(${rotation}deg) rotateZ(${rotation * 0.5}deg)`,
												zIndex: zIndex,
												boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
											}}
										>
											<div className="p-4 h-full flex flex-col justify-between">
												<div>
													<div className="text-center mb-2">
														<span className={`text-4xl ${darkMode ? 'opacity-80' : 'opacity-60'}`}>📄</span>
													</div>
													<div className={`text-xs font-bold text-center mb-1 ${darkMode ? 'text-purple-200' : 'text-purple-800'}`}>
														PDF #{pdf.index}
													</div>
												</div>
												<div className={`text-[10px] text-center truncate ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
													{pdf.name}
												</div>
												<div className={`text-[9px] text-center ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}>
													{pdf.size}
												</div>
											</div>
										</div>
									);
								})}
							</div>
							<div className={`mt-4 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
								{pdfPreviews.length} PDF{pdfPreviews.length > 1 ? 's' : ''} ready to merge
							</div>
						</div>
					)}
				</div>

				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>
						<div className="space-y-4">
							<button
								onClick={() => onProcess('pdf-merge', {})}
								disabled={files.length < 2 || isProcessing}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform ${
									files.length >= 2 && !isProcessing
										? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:scale-105 active:scale-95'
										: darkMode
										? 'bg-gray-700 text-gray-400 cursor-not-allowed'
										: 'bg-gray-200 text-gray-400 cursor-not-allowed'
								}`}
							>
								{isProcessing ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>Merging...</span>
									</div>
								) : (
									'🔗 Merge PDFs'
								)}
							</button>
							<button onClick={onReset} className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${darkMode ? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
								Reset All
							</button>
						</div>
					</div>

					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Progress</h2>
						<ProgressStatus progressPercent={progressPercent} currentFile={files[0] || null} logs={logs} />
					</div>

					{doneFiles && doneFiles.length > 0 && (
						<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
							<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>📥 Download Results</h2>
							<div className="space-y-3">
								{doneFiles.map((item, idx) => (
									<div key={idx} className={`flex items-center justify-between p-4 rounded-xl border-2 transform hover:scale-[1.02] transition-all duration-200 ${darkMode ? 'bg-gray-700 border-gray-600 hover:border-purple-500' : 'bg-purple-50 border-purple-200 hover:border-purple-400'}`}>
										<div className="flex items-center gap-3 min-w-0">
											<span className="text-2xl flex-shrink-0">📑</span>
											<div className="min-w-0">
												<div className={`font-medium text-sm truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.processedFile || 'merged.pdf'}</div>
												<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
													{item.totalPages ? `${item.totalPages} pages` : ''} {item.filesCount ? `from ${item.filesCount} files` : ''}
												</div>
											</div>
										</div>
										{item.download_url && (
											<button onClick={() => onDownload(item)} className="ml-3 flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1">
												⬇️ Download
											</button>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default PDFMergerPanel;
