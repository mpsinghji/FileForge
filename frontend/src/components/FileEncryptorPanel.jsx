import React, { useState } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';

function FileEncryptorPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset, doneFiles, onDownload }) {
	const { darkMode } = useDarkMode();
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [mode, setMode] = useState('encrypt');

	const passwordsMatch = password === confirmPassword || confirmPassword === '';
	const canProcess = files.length > 0 && (
		mode === 'decrypt'
			? password.length > 0
			: password.length > 0 && passwordsMatch && confirmPassword.length > 0
	);

	const dm = darkMode;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
				<div className="flex items-center space-x-3 mb-2">
					<div className="w-12 h-12 bg-gradient-to-br from-green-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
						<span className="text-white text-2xl">🔐</span>
					</div>
					<div>
						<h1 className={`text-3xl font-bold ${dm ? 'text-white' : 'text-gray-800'}`}>File Encryptor</h1>
						<p className={dm ? 'text-gray-300' : 'text-gray-600'}>Encrypt or decrypt files with AES-256 — any file type supported</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* ── Left column ── */}
				<div className="space-y-6">
					{/* Upload */}
					<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Upload File</h2>
						<FileUpload files={files} setFiles={setFiles} />
					</div>

					{/* Supported file types info */}
					<div className={`rounded-2xl shadow-lg p-5 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-base font-semibold mb-3 ${dm ? 'text-white' : 'text-gray-800'}`}>🗂️ What Can You Encrypt?</h2>
						<p className={`text-sm mb-3 ${dm ? 'text-gray-300' : 'text-gray-600'}`}>
							Any file type is supported — the file is wrapped in an AES-256 encrypted ZIP container.
						</p>
						<div className="grid grid-cols-2 gap-2">
							{[
								['📄', 'PDF / Word / Excel'],
								['🖼️', 'Images (JPG, PNG…)'],
								['🎬', 'Videos (MP4, MKV…)'],
								['🎵', 'Audio (MP3, FLAC…)'],
								['🗜️', 'Archives (ZIP, RAR…)'],
								['⚙️', 'Code & Text files'],
								['🖥️', 'Executables & DLLs'],
								['📋', 'Any other file type'],
							].map(([icon, label], i) => (
								<div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${dm ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
									<span className="text-base">{icon}</span>
									<span>{label}</span>
								</div>
							))}
						</div>
						<div className={`mt-3 p-3 rounded-xl text-xs ${dm ? 'bg-teal-900/40 text-teal-300 border border-teal-700' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
							<strong>ℹ️ Note:</strong> The encrypted output is a <code>.zip</code> file. Use the Decrypt mode (or any ZIP tool with the password) to restore your original file.
						</div>
					</div>
				</div>

				{/* ── Right column ── */}
				<div className="space-y-6">
					{/* Encryption Settings */}
					<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Encryption Settings</h2>

						{/* Mode */}
						<div className="mb-6">
							<label className={`block text-sm font-medium mb-2 ${dm ? 'text-gray-200' : 'text-gray-700'}`}>Mode</label>
							<select
								value={mode}
								onChange={(e) => { setMode(e.target.value); setPassword(''); setConfirmPassword(''); }}
								className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 ${dm ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
							>
								<option value="encrypt">🔒 Encrypt File</option>
								<option value="decrypt">🔓 Decrypt File</option>
							</select>
						</div>

						{/* Password */}
						<div className="mb-6">
							<label className={`block text-sm font-medium mb-2 ${dm ? 'text-gray-200' : 'text-gray-700'}`}>
								Password {mode === 'encrypt' && <span className="text-xs opacity-60">(any length)</span>}
							</label>
							<div className="relative">
								<input
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder={mode === 'encrypt' ? 'Enter encryption password' : 'Enter decryption password'}
									className={`w-full p-3 pr-12 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 ${dm ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className={`absolute right-3 top-1/2 -translate-y-1/2 text-lg ${dm ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
								>
									{showPassword ? '👁️' : '🔐'}
								</button>
							</div>
						</div>

						{/* Confirm password for encrypt mode */}
						{mode === 'encrypt' && (
							<div className="mb-6">
								<label className={`block text-sm font-medium mb-2 ${dm ? 'text-gray-200' : 'text-gray-700'}`}>Confirm Password</label>
								<input
									type={showPassword ? 'text' : 'password'}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Re-enter password"
									className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
										confirmPassword && !passwordsMatch
											? 'border-red-400 bg-red-50 dark:bg-red-900/20'
											: dm
											? 'border-gray-600 bg-gray-700 text-white'
											: 'border-gray-300'
									}`}
								/>
								{confirmPassword && !passwordsMatch && (
									<p className="mt-2 text-sm text-red-500">Passwords do not match</p>
								)}
							</div>
						)}

						{/* Security info */}
						<div className={`p-4 rounded-xl border ${dm ? 'bg-gradient-to-r from-green-900 to-teal-900 border-green-700' : 'bg-gradient-to-r from-green-50 to-teal-50 border-green-200'}`}>
							<h3 className={`font-medium mb-2 text-sm ${dm ? 'text-white' : 'text-gray-800'}`}>Security Features</h3>
							<ul className={`text-xs space-y-1 ${dm ? 'text-gray-300' : 'text-gray-600'}`}>
								<li>✓ AES-256 encryption (ZIP standard)</li>
								<li>✓ Password-protected ZIP container</li>
								<li>✓ Compatible with WinRAR, 7-Zip, etc.</li>
								<li>✓ No file type restrictions</li>
							</ul>
						</div>
					</div>

					{/* Process Controls */}
					<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>
						<div className="space-y-3">
							<button
								onClick={() => onProcess(mode === 'encrypt' ? 'file-encrypt' : 'file-decrypt', { password })}
								disabled={!canProcess || isProcessing}
								title={!canProcess && files.length === 0 ? 'Upload a file first' : !canProcess && password.length === 0 ? 'Enter a password' : ''}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
									canProcess && !isProcessing
										? 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:shadow-lg hover:scale-105'
										: dm
										? 'bg-gray-700 text-gray-400 cursor-not-allowed'
										: 'bg-gray-200 text-gray-400 cursor-not-allowed'
								}`}
							>
								{isProcessing ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>{mode === 'encrypt' ? 'Encrypting...' : 'Decrypting...'}</span>
									</div>
								) : (
									mode === 'encrypt' ? '🔒 Encrypt File' : '🔓 Decrypt File'
								)}
							</button>
							<button
								onClick={() => { onReset(); setPassword(''); setConfirmPassword(''); }}
								className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 ${dm ? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
							>
								Reset All
							</button>
						</div>
					</div>

					{/* Progress */}
					<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>Progress</h2>
						<ProgressStatus progressPercent={progressPercent} currentFile={files[0] || null} logs={logs} />
					</div>

					{/* Download results */}
					{doneFiles && doneFiles.length > 0 && (
						<div className={`rounded-2xl shadow-lg p-6 ${dm ? 'bg-gray-800' : 'bg-white'}`}>
							<h2 className={`text-xl font-semibold mb-4 ${dm ? 'text-white' : 'text-gray-800'}`}>📥 Download Results</h2>
							<div className="space-y-3">
								{doneFiles.map((item, idx) => (
									<div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${dm ? 'bg-gray-700 border-gray-600' : 'bg-green-50 border-green-200'}`}>
										<div className="flex items-center gap-3 min-w-0">
											<span className="text-2xl flex-shrink-0">{mode === 'encrypt' ? '🔒' : '🔓'}</span>
											<div className="min-w-0">
												<div className={`font-medium text-sm truncate ${dm ? 'text-gray-200' : 'text-gray-800'}`}>{item.processedFile}</div>
												<div className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
													{mode === 'encrypt' ? 'Encrypted successfully' : 'Decrypted successfully'}
												</div>
											</div>
										</div>
										{item.download_url && (
											<button
												onClick={() => onDownload(item)}
												className="ml-3 flex-shrink-0 bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1"
											>
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

export default FileEncryptorPanel;
