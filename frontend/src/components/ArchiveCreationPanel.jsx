import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';
import * as api from '../services/api';

function ArchiveCreationPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset, doneFiles, onDownload }) {
	const { darkMode } = useDarkMode();
	const [archiveFormat, setArchiveFormat] = useState('zip');
	const [archiveName, setArchiveName] = useState('');
	const [usePassword, setUsePassword] = useState(false);
	const [password, setPassword] = useState('');
	const [compressionLevel, setCompressionLevel] = useState(5);
	const [formats, setFormats] = useState([]);
	const [compressionLevels, setCompressionLevels] = useState([]);

	// Load formats and compression levels
	useEffect(() => {
		const loadOptions = async () => {
			try {
				const [formatsRes, levelsRes] = await Promise.all([
					api.getArchiveFormats(),
					api.getArchiveCompressionLevels()
				]);
				if (formatsRes.success) setFormats(formatsRes.data);
				if (levelsRes.success) setCompressionLevels(levelsRes.data);
			} catch (error) {
				console.error('Failed to load archive options:', error);
			}
		};
		loadOptions();
	}, []);

	const handleCreateArchive = () => {
		const options = {
			format: archiveFormat,
			compressionLevel: compressionLevel,
			archiveName: archiveName || `archive-${Date.now()}`
		};
		if (usePassword && password) {
			options.password = password;
		}
		onProcess('archive-create', options);
	};

	const formatFileSize = (bytes) => {
		if (!bytes) return 'Unknown';
		if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
		return (bytes / 1024).toFixed(2) + ' KB';
	};

	const totalSize = files.reduce((sum, f) => sum + f.size, 0);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:scale-[1.01] transition-transform duration-200`}>
				<div className="flex items-center space-x-3 mb-2">
					<div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
						<span className="text-white text-2xl">📦</span>
					</div>
					<div>
						<h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Archive Creator</h1>
						<p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Create compressed archives from multiple files</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left column */}
				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Upload Files</h2>
						<FileUpload files={files} setFiles={setFiles} multiple={true} />
						
						{/* Files Preview */}
						{files.length > 0 && (
							<div className={`mt-4 p-4 rounded-xl border-2 ${darkMode ? 'bg-gradient-to-br from-gray-700 to-gray-600 border-purple-500' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-300'}`}>
								<div className="flex items-center justify-between mb-3">
									<h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
										{files.length} file{files.length > 1 ? 's' : ''} selected
									</h3>
									<span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
										Total: {formatFileSize(totalSize)}
									</span>
								</div>
								<div className="space-y-2 max-h-48 overflow-y-auto">
									{files.map((file, idx) => (
										<div key={idx} className={`flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
											<span className="text-lg">📄</span>
											<div className="flex-1 min-w-0">
												<div className={`text-sm truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{file.name}</div>
												<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatFileSize(file.size)}</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Archive Settings */}
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transform hover:shadow-xl transition-all duration-200`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Archive Settings</h2>

						{/* Archive Name */}
						<div className="mb-4">
							<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Archive Name (optional)</label>
							<input
								type="text"
								value={archiveName}
								onChange={(e) => setArchiveName(e.target.value)}
								placeholder="my-archive"
								className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
							/>
							<p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Leave empty for auto-generated name</p>
						</div>

						{/* Format Selection */}
						<div className="mb-4">
							<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Archive Format</label>
							<div className="grid grid-cols-2 gap-3">
								{formats.map((fmt) => (
									<button
										key={fmt.value}
										onClick={() => setArchiveFormat(fmt.value)}
										className={`p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
											archiveFormat === fmt.value
												? darkMode
													? 'border-purple-500 bg-purple-900/30'
													: 'border-purple-500 bg-purple-50'
												: darkMode
												? 'border-gray-600 bg-gray-700 hover:border-gray-500'
												: 'border-gray-300 hover:border-gray-400'
										}`}
									>
										<div className="text-2xl mb-1">{fmt.icon}</div>
										<div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{fmt.label}</div>
										<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{fmt.description}</div>
									</button>
								))}
							</div>
						</div>

						{/* Compression Level */}
						<div className="mb-4">
							<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
								Compression Level: {compressionLevels.find(l => l.value === compressionLevel)?.label || compressionLevel}
							</label>
							<input
								type="range"
								min="0"
								max="9"
								value={compressionLevel}
								onChange={(e) => setCompressionLevel(parseInt(e.target.value))}
								className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-purple-600"
							/>
							<div className="flex justify-between text-xs mt-1">
								<span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Faster</span>
								<span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Smaller</span>
							</div>
							<p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
								{compressionLevels.find(l => l.value === compressionLevel)?.description || 'Adjust compression'}
							</p>
						</div>

						{/* Password Protection */}
						<div className="mb-4">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={usePassword}
									onChange={(e) => setUsePassword(e.target.checked)}
									className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
								/>
								<span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
									🔒 Password Protection (AES-256)
								</span>
							</label>
						</div>

						{usePassword && (
							<div className="mb-4">
								<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Password</label>
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Enter password (no restrictions)"
									className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-500' : 'border-gray-300 placeholder-gray-400'}`}
								/>
								<p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
									Archive will be encrypted with AES-256. Can be opened with any ZIP tool.
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
								onClick={handleCreateArchive}
								disabled={files.length === 0 || isProcessing || (usePassword && !password)}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform ${
									files.length > 0 && !isProcessing && (!usePassword || password)
										? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:scale-105 active:scale-95'
										: darkMode
										? 'bg-gray-700 text-gray-400 cursor-not-allowed'
										: 'bg-gray-200 text-gray-400 cursor-not-allowed'
								}`}
							>
								{isProcessing ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>Creating Archive...</span>
									</div>
								) : (
									'📦 Create Archive'
								)}
							</button>

							<button
								onClick={onReset}
								className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${darkMode ? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
							>
								Reset All
							</button>
						</div>

						{/* Info Box */}
						<div className={`mt-6 p-4 rounded-xl ${darkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
							<h3 className={`font-semibold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>💡 Tips</h3>
							<ul className={`text-sm space-y-1 ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>
								<li>• ZIP format works everywhere</li>
								<li>• Password protection uses AES-256 encryption</li>
								<li>• No external software required!</li>
								<li>• Can be opened with WinRAR, 7-Zip, or built-in tools</li>
							</ul>
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
							<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>📥 Download Archive</h2>
							<div className="space-y-3">
								{doneFiles.map((item, idx) => (
									<div key={idx} className={`p-4 rounded-xl border-2 transform hover:scale-[1.02] transition-all duration-200 ${darkMode ? 'bg-gray-700 border-gray-600 hover:border-purple-500' : 'bg-purple-50 border-purple-200 hover:border-purple-400'}`}>
										<div className="flex items-center justify-between mb-3">
											<div className="flex items-center gap-3 min-w-0">
												<span className="text-2xl flex-shrink-0">📦</span>
												<div className="min-w-0">
													<div className={`font-medium text-sm truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.processedFile}</div>
													<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
														{item.filesCount} files • {formatFileSize(item.size)}
													</div>
												</div>
											</div>
										</div>
										<div className="flex flex-wrap gap-2 mb-3">
											<span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
												{item.format?.toUpperCase()}
											</span>
											{item.isPasswordProtected && (
												<span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'}`}>
													🔒 Protected
												</span>
											)}
											<span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
												Level {item.compressionLevel}
											</span>
										</div>
										{item.download_url && (
											<button
												onClick={() => onDownload(item)}
												className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
											>
												⬇️ Download Archive
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

export default ArchiveCreationPanel;
