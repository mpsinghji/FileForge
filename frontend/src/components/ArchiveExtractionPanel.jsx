import React, { useState } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';

function ArchiveExtractionPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset }) {
	const { darkMode } = useDarkMode();
	const [extractPath, setExtractPath] = useState('extracted');
	const [preserveStructure, setPreserveStructure] = useState(true);
	const [overwriteExisting, setOverwriteExisting] = useState(false);
	const [extractPassword, setExtractPassword] = useState('');

	// const supportedArchives = [
	// 	{ format: 'ZIP', icon: '📦', description: 'ZIP Archive', extensions: ['.zip'] },
	// 	{ format: 'RAR', icon: '📦', description: 'RAR Archive', extensions: ['.rar'] },
	// 	{ format: '7Z', icon: '📦', description: '7-Zip Archive', extensions: ['.7z'] },
	// 	{ format: 'TAR', icon: '📦', description: 'TAR Archive', extensions: ['.tar', '.tar.gz', '.tar.bz2'] },
	// 	{ format: 'ISO', icon: '💿', description: 'ISO Image', extensions: ['.iso'] },
	// 	{ format: 'CAB', icon: '📦', description: 'CAB Archive', extensions: ['.cab'] },
	// ];

	const canProcess = files.length > 0;

	return (
		<div className="space-y-6">
			{/* 7-Zip Notice */}


			<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
				<div className="flex items-center space-x-3 mb-4">
					<div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
						<span className="text-white text-2xl">📦</span>
					</div>
					<div>
						<h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Archive Extraction</h1>
						<p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Extract files from various archive formats</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Upload Archives</h2>
						<FileUpload files={files} setFiles={setFiles} />
					</div>

					{/* <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Extraction Settings</h2>

						<div className="mb-6">
							<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
								Extract to Folder
							</label>
							<input
								type="text"
								value={extractPath}
								onChange={(e) => setExtractPath(e.target.value)}
								placeholder="Enter folder name"
								className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'
									}`}
							/>
							<p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Files will be extracted to: ./{extractPath}/</p>
						</div>

						<div className="mb-6">
							<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
								Archive Password (if required)
							</label>
							<input
								type="password"
								value={extractPassword}
								onChange={(e) => setExtractPassword(e.target.value)}
								placeholder="Enter password if archive is protected"
								className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'
									}`}
							/>
						</div>

						<div className="space-y-4">
							<label className="flex items-center space-x-3 cursor-pointer">
								<input
									type="checkbox"
									checked={preserveStructure}
									onChange={(e) => setPreserveStructure(e.target.checked)}
									className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
								/>
								<div>
									<div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>Preserve Folder Structure</div>
									<div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Maintain original directory structure</div>
								</div>
							</label>

							<label className="flex items-center space-x-3 cursor-pointer">
								<input
									type="checkbox"
									checked={overwriteExisting}
									onChange={(e) => setOverwriteExisting(e.target.checked)}
									className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
								/>
								<div>
									<div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>Overwrite Existing Files</div>
									<div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Replace files if they already exist</div>
								</div>
							</label>
						</div>
					</div> */}
					{/* <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Supported Formats</h2>
						<div className="grid grid-cols-2 gap-3">
							{supportedArchives.map((archive) => (
								<div key={archive.format} className={`flex items-center space-x-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'
									}`}>
									<span className="text-2xl">{archive.icon}</span>
									<div>
										<div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{archive.format}</div>
										<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{archive.description}</div>
									</div>
								</div>
							))}
						</div>
					</div> */}
					<div className={`mt-6 p-4 rounded-xl border ${
							darkMode 
								? 'bg-gradient-to-r from-indigo-900 to-blue-900 border-indigo-700' 
								: 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
						}`}>
							<h3 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Supported File Types</h3>
							<div className="grid grid-cols-2 gap-2 text-sm">
								<div className="flex items-center space-x-2">
									<span>📦</span>
									<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>ZIP</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>📦</span>
									<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>RAR</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>📦</span>
									<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>7Z</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>📦</span>
									<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>TAR</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>💿</span>
									<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>ISO</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>📦</span>
									<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>CAB</span>
								</div>
							</div>
						</div>
				</div>

				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>

						<div className="space-y-4">
							<button
								onClick={() => onProcess('archive-extraction', { extractPath, overwriteExisting, password: extractPassword })}
								disabled={!canProcess || isProcessing}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${canProcess && !isProcessing
										? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
										: darkMode
											? 'bg-gray-700 text-gray-400 cursor-not-allowed'
											: 'bg-gray-200 text-gray-400 cursor-not-allowed'
									}`}
							>
								{isProcessing ? (
									<div className="flex items-center justify-center space-x-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										<span>Extracting...</span>
									</div>
								) : (
									'Start Extraction'
								)}
							</button>

							<button
								onClick={onReset}
								className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 ${darkMode
										? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
										: 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
									}`}
							>
								Reset All
							</button>
						</div>

						{files.length > 0 && (
							<div className={`mt-6 p-4 rounded-xl border ${darkMode
									? 'bg-gradient-to-r from-indigo-900 to-blue-900 border-indigo-700'
									: 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
								}`}>
								<h3 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Archive Preview</h3>
								<div className="space-y-3">
									{files.map((file, index) => {
										const fileSize = (file.size / 1024 / 1024).toFixed(2);
										return (
											<div key={index} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'
												}`}>
												<div className="flex items-center space-x-3">
													<span className="text-2xl">📦</span>
													<div>
														<div className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{file.name}</div>
														<div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Archive • {fileSize} MB</div>
													</div>
												</div>
												<div className="text-right">
													<div className="text-sm font-medium text-indigo-600">Ready to extract</div>
													<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>to ./{extractPath}/</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>

					

					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Progress</h2>
						<ProgressStatus
							progressPercent={progressPercent}
							currentFile={files[0] || null}
							logs={logs}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ArchiveExtractionPanel;