import React, { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';
import * as api from '../services/api';

function ArchiveExtractionPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset, doneFiles, onDownload }) {
	const { darkMode } = useDarkMode();
	const [extractPath, setExtractPath] = useState('extracted');
	const [preserveStructure, setPreserveStructure] = useState(true);
	const [overwriteExisting, setOverwriteExisting] = useState(false);
	const [extractPassword, setExtractPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);

	// Password detection state
	const [passwordRequired, setPasswordRequired] = useState(false);
	const [checkingPassword, setCheckingPassword] = useState(false);
	const [passwordError, setPasswordError] = useState('');

	// Check encryption when files change
	useEffect(() => {
		if (files.length === 0) {
			setPasswordRequired(false);
			setPasswordError('');
			setExtractPassword('');
			return;
		}
		const file = files[0];
		const ext = file.name.split('.').pop().toLowerCase();
		const archiveExts = ['zip', 'rar', '7z', 'gz', 'tar', 'bz2', 'xz', 'cab', 'iso'];
		if (!archiveExts.includes(ext)) return;

		(async () => {
			setCheckingPassword(true);
			setPasswordRequired(false);
			setPasswordError('');
			try {
				const res = await api.checkArchivePassword(file);
				if (res?.data?.encrypted) {
					setPasswordRequired(true);
				}
			} catch (_) {
				// silently ignore check errors - let extraction tell us
			} finally {
				setCheckingPassword(false);
			}
		})();
	}, [files]);

	const canProcess = files.length > 0 && !checkingPassword && (!passwordRequired || extractPassword.length > 0);

	const handleStartExtraction = () => {
		if (passwordRequired && !extractPassword) {
			setPasswordError('This archive is password-protected. Please enter the password to extract it.');
			return;
		}
		setPasswordError('');
		onProcess('archive-extraction', { extractPath, overwriteExisting, password: extractPassword });
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
				<div className="flex items-center space-x-3 mb-2">
					<div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
						<span className="text-white text-2xl">📦</span>
					</div>
					<div>
						<h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Archive Extraction</h1>
						<p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Extract ZIP, RAR, 7Z, TAR, ISO and more — with password support</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left column */}
				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Upload Archives</h2>
						<FileUpload files={files} setFiles={setFiles} />

						{/* Encryption detection banner */}
						{checkingPassword && (
							<div className="mt-4 flex items-center gap-2 text-sm text-indigo-500 animate-pulse">
								<div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
								Scanning archive for encryption...
							</div>
						)}
						{!checkingPassword && passwordRequired && (
							<div className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
								<span className="text-lg">🔒</span>
								<div>
									<div className="font-semibold">Password Required</div>
									<div className="text-xs opacity-80">This archive is encrypted. Enter the password below before extracting.</div>
								</div>
							</div>
						)}
					</div>

					{/* Extraction Settings */}
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Extraction Settings</h2>

						{/* Password field — always shown but highlighted if required */}
						<div className="mb-6">
							<label className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
								{passwordRequired ? (
									<span className="flex items-center gap-1 text-amber-600 font-semibold">🔒 Archive Password <span className="text-red-500">*</span></span>
								) : (
									<span>Archive Password <span className="text-xs font-normal opacity-60">(optional)</span></span>
								)}
								{extractPassword && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">● PROTECTED</span>}
							</label>
							<div className="relative">
								<input
									type={showPassword ? 'text' : 'password'}
									value={extractPassword}
									onChange={(e) => { setExtractPassword(e.target.value); setPasswordError(''); }}
									placeholder={passwordRequired ? 'Enter password to unlock archive' : 'Enter password if archive is protected'}
									className={`w-full p-3 pr-12 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
										passwordRequired && !extractPassword
											? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
											: passwordError
											? 'border-red-400 bg-red-50 dark:bg-red-900/20'
											: darkMode
											? 'border-gray-600 bg-gray-700 text-white'
											: 'border-gray-300'
									}`}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className={`absolute right-3 top-1/2 -translate-y-1/2 text-lg select-none ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
								>
									{showPassword ? '👁️' : '🔐'}
								</button>
							</div>
							{passwordError && (
								<p className="mt-2 text-sm text-red-500 flex items-center gap-1">
									<span>⚠️</span> {passwordError}
								</p>
							)}
						</div>

						{/* Extract path */}
						<div className="mb-6">
							<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Extract to Folder</label>
							<input
								type="text"
								value={extractPath}
								onChange={(e) => setExtractPath(e.target.value)}
								placeholder="extracted"
								className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
							/>
							<p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Output will be bundled as a single ZIP file for download</p>
						</div>

						<div className="space-y-3">
							<label className="flex items-center gap-3 cursor-pointer">
								<input type="checkbox" checked={preserveStructure} onChange={(e) => setPreserveStructure(e.target.checked)} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
								<div>
									<div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Preserve Folder Structure</div>
									<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Maintain original directory layout</div>
								</div>
							</label>
							<label className="flex items-center gap-3 cursor-pointer">
								<input type="checkbox" checked={overwriteExisting} onChange={(e) => setOverwriteExisting(e.target.checked)} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
								<div>
									<div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Overwrite Existing Files</div>
									<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Replace files if they already exist</div>
								</div>
							</label>
						</div>
					</div>

					{/* Supported formats */}
					<div className={`p-4 rounded-xl border ${darkMode ? 'bg-gradient-to-r from-indigo-900 to-blue-900 border-indigo-700' : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'}`}>
						<h3 className={`font-medium mb-3 text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Supported Formats</h3>
						<div className="flex flex-wrap gap-2">
							{['ZIP', 'RAR', '7Z', 'TAR', 'GZ', 'BZ2', 'XZ', 'ISO', 'CAB'].map(f => (
								<span key={f} className={`text-xs px-2 py-1 rounded-lg font-mono font-semibold ${darkMode ? 'bg-indigo-800 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>{f}</span>
							))}
						</div>
					</div>
				</div>

				{/* Right column */}
				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>

						<div className="space-y-4">
							<button
								onClick={handleStartExtraction}
								disabled={!canProcess || isProcessing}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
									canProcess && !isProcessing
										? passwordRequired && !extractPassword
											? 'bg-amber-500 text-white hover:bg-amber-600'
											: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
										: darkMode
										? 'bg-gray-700 text-gray-400 cursor-not-allowed'
										: 'bg-gray-200 text-gray-400 cursor-not-allowed'
								}`}
							>
								{isProcessing ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>Extracting...</span>
									</div>
								) : checkingPassword ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
										<span>Scanning archive...</span>
									</div>
								) : passwordRequired && !extractPassword ? (
									'🔒 Enter Password to Continue'
								) : (
									'🚀 Start Extraction'
								)}
							</button>

							<button
								onClick={() => { onReset(); setPasswordRequired(false); setExtractPassword(''); setPasswordError(''); }}
								className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 ${darkMode ? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
							>
								Reset All
							</button>
						</div>

						{/* Archive preview */}
						{files.length > 0 && (
							<div className={`mt-6 p-4 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
								<h3 className={`font-medium mb-3 text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Archive Preview</h3>
								<div className="space-y-2">
									{files.map((file, index) => {
										const fileSize = (file.size / 1024 / 1024).toFixed(2);
										return (
											<div key={index} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white'}`}>
												<div className="flex items-center gap-3">
													<span className="text-2xl">📦</span>
													<div>
														<div className={`font-medium text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{file.name}</div>
														<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
															{fileSize} MB {passwordRequired ? '• 🔒 Encrypted' : '• ✅ Ready'}
														</div>
													</div>
												</div>
												<div className={`text-xs px-2 py-1 rounded-full font-semibold ${passwordRequired ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
													{passwordRequired ? '🔒 Locked' : 'Ready'}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>

					{/* Progress */}
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Progress</h2>
						<ProgressStatus
							progressPercent={progressPercent}
							currentFile={files[0] || null}
							logs={logs}
						/>
					</div>

					{/* Download section */}
					{doneFiles && doneFiles.length > 0 && (
						<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
							<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>📥 Download Results</h2>
							<div className="space-y-3">
								{doneFiles.map((item, idx) => (
									<div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-indigo-50 border-indigo-200'}`}>
										<div className="flex items-center gap-3 min-w-0">
											<span className="text-2xl flex-shrink-0">📦</span>
											<div className="min-w-0">
												<div className={`font-medium text-sm truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.originalFile}</div>
												<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
													{item.filesExtracted ? `${item.filesExtracted} files extracted` : 'Extracted'}
													{item.processingTime ? ` • ${item.processingTime.toFixed(1)}s` : ''}
												</div>
											</div>
										</div>
										{item.download_url && (
											<button
												onClick={() => onDownload(item)}
												className="ml-3 flex-shrink-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1"
											>
												⬇️ Download ZIP
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

export default ArchiveExtractionPanel;