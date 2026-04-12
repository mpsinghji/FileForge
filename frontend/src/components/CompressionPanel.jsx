import React, { useState } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
	if (!bytes || bytes === 0) return '—';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────
function CompressionPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset, doneFiles, onDownload }) {
	const { darkMode } = useDarkMode();
	const [compressionLevel, setCompressionLevel] = useState('medium');
	const dm = darkMode;

	const compressionLevels = [
		{ value: 'light', label: 'Light', description: 'Minimal compression, fast processing', savings: '10-20%' },
		{ value: 'medium', label: 'Medium', description: 'Balanced compression and quality', savings: '30-50%' },
		{ value: 'high', label: 'High', description: 'Maximum compression, smaller files', savings: '50-70%' },
	];

	const canProcess = files.length > 0;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
				<div className="flex items-center space-x-3 mb-4">
					<div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
						<span className="text-white text-2xl">🗜️</span>
					</div>
					<div>
						<h1 className={`text-3xl font-bold ${dm ? 'text-white' : 'text-gray-800'}`}>File Compression</h1>
						<p className={dm ? 'text-gray-300' : 'text-gray-600'}>Reduce file sizes while maintaining quality</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* ── Left column ── */}
				<div className="space-y-6">
					{/* Upload */}
					<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Upload Files</h2>
						<FileUpload files={files} setFiles={setFiles} />
					</div>

					{/* Compression Settings */}
					<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Compression Settings</h2>
						<div className="mb-6">
							<label className={`block text-sm font-medium mb-3 ${dm ? 'text-gray-200' : 'text-gray-700'}`}>
								Compression Level
							</label>
							<div className="space-y-3">
								{compressionLevels.map((level) => (
									<button
										key={level.value}
										onClick={() => setCompressionLevel(level.value)}
										className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
											compressionLevel === level.value
												? dm
													? 'border-indigo-400 bg-indigo-900 text-indigo-200'
													: 'border-indigo-500 bg-indigo-50 text-indigo-700'
												: dm
												? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700 text-gray-200'
												: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-3">
												<div className={`w-3 h-3 rounded-full ${
													level.value === 'light' ? 'bg-indigo-300' :
													level.value === 'medium' ? 'bg-indigo-400' : 'bg-indigo-500'
												}`} />
												<div>
													<div className="font-medium">{level.label}</div>
													<div className={`text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{level.description}</div>
												</div>
											</div>
											<div className="text-right">
												<div className="text-sm font-medium text-indigo-600">{level.savings}</div>
												<div className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-400'}`}>estimated</div>
											</div>
										</div>
									</button>
								))}
							</div>
						</div>

						{/* File preview panel */}
						{files.length > 0 && (
							<div className={`p-4 rounded-xl border ${dm ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
								<h3 className={`font-medium mb-3 text-sm ${dm ? 'text-white' : 'text-gray-800'}`}>Files to Compress</h3>
								<div className="space-y-2">
									{files.map((file, index) => {
										const originalSize = (file.size / 1024 / 1024).toFixed(2);
										return (
											<div key={index} className={`flex items-center justify-between p-3 rounded-lg ${dm ? 'bg-gray-600' : 'bg-white'}`}>
												<div className="flex items-center space-x-3 min-w-0">
													<span className={dm ? 'text-gray-400' : 'text-gray-500'}>📄</span>
													<div className="min-w-0">
														<div className={`font-medium text-sm truncate ${dm ? 'text-gray-200' : 'text-gray-700'}`}>{file.name}</div>
														<div className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{originalSize} MB original</div>
													</div>
												</div>
												<div className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ml-2 ${dm ? 'bg-indigo-800 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>
													Ready
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* ── Right column ── */}
				<div className="space-y-6">
					{/* Process Controls */}
					<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>
						<div className="space-y-3">
							<button
								onClick={() => onProcess('compression', {
									compressionLevel: compressionLevel,
									quality: 'high',
									removeMetadata: false
								})}
								disabled={!canProcess || isProcessing}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
									canProcess && !isProcessing
										? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
										: dm
										? 'bg-gray-700 text-gray-400 cursor-not-allowed'
										: 'bg-gray-200 text-gray-400 cursor-not-allowed'
								}`}
							>
								{isProcessing ? (
									<div className="flex items-center justify-center space-x-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>Compressing...</span>
									</div>
								) : (
									'🗜️ Start Compression'
								)}
							</button>
							<button
								onClick={onReset}
								className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 ${
									dm
										? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
										: 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
								}`}
							>
								Reset All
							</button>
						</div>
					</div>

					{/* Progress */}
					<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Progress</h2>
						<ProgressStatus
							progressPercent={progressPercent}
							currentFile={files[0] || null}
							logs={logs}
						/>
					</div>

					{/* Download section — shows ACTUAL sizes from API */}
					{doneFiles && doneFiles.length > 0 && (
						<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
							<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>📥 Download Compressed Files</h2>
							<div className="space-y-3">
								{doneFiles.map((item, idx) => {
									// Use actual sizes returned by the API
									const origBytes = item.originalSize || 0;
									const newBytes = item.compressedSize || item.processedSize || item.size || 0;
									const ratio = origBytes > 0 && newBytes > 0
										? Math.round(((origBytes - newBytes) / origBytes) * 100)
										: item.compressionRatio || null;
									const sizeKnown = origBytes > 0 && newBytes > 0;

									return (
										<div key={idx} className={`p-4 rounded-xl border-2 ${dm ? 'bg-gray-700 border-gray-600' : 'bg-indigo-50 border-indigo-200'}`}>
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-3 min-w-0">
													<span className="text-2xl">🗜️</span>
													<div className="min-w-0">
														<div className={`font-medium text-sm truncate ${dm ? 'text-gray-200' : 'text-gray-800'}`}>
															{item.processedFile || item.originalFile}
														</div>
														<div className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
															Compressed from {item.originalFile}
														</div>
													</div>
												</div>
												{item.download_url && (
													<button
														onClick={() => onDownload(item)}
														className="ml-3 flex-shrink-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
													>
														⬇️ Download
													</button>
												)}
											</div>

											{/* Actual size comparison */}
											{sizeKnown ? (
												<div className={`flex items-center gap-3 mt-2 p-2 rounded-lg text-xs ${dm ? 'bg-gray-600' : 'bg-white'}`}>
													<span className={dm ? 'text-gray-300' : 'text-gray-600'}>
														<span className="font-medium">Original:</span> {formatBytes(origBytes)}
													</span>
													<span className="text-indigo-400">→</span>
													<span className={dm ? 'text-gray-300' : 'text-gray-600'}>
														<span className="font-medium">Compressed:</span> {formatBytes(newBytes)}
													</span>
													{ratio !== null && (
														<span className={`ml-auto font-bold px-2 py-0.5 rounded-full ${
															ratio > 0
																? dm ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
																: dm ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
														}`}>
															{ratio > 0 ? `${ratio}% saved` : 'No reduction'}
														</span>
													)}
												</div>
											) : ratio !== null ? (
												<div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${dm ? 'bg-gray-600' : 'bg-white'}`}>
													<span className={`font-bold px-2 py-0.5 rounded-full ${ratio > 0 ? dm ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700' : dm ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>
														{ratio > 0 ? `${ratio}% saved` : 'No reduction'}
													</span>
												</div>
											) : null}
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default CompressionPanel;
