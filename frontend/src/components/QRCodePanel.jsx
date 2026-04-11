import React, { useState } from 'react';
import { useDarkMode } from '../App';
import ProgressStatus from './ProgressStatus';

function QRCodePanel({ isProcessing, progressPercent, logs, onProcess, onReset, doneFiles, onDownload }) {
	const { darkMode } = useDarkMode();
	const [text, setText] = useState('');
	const [size, setSize] = useState(512);
	const [format, setFormat] = useState('png');
	const [errorCorrectionLevel, setErrorCorrectionLevel] = useState('M');
	const [darkColor, setDarkColor] = useState('#000000');
	const [lightColor, setLightColor] = useState('#FFFFFF');

	const canProcess = text.trim().length > 0;

	return (
		<div className="space-y-6">
			<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
				<div className="flex items-center space-x-3 mb-2">
					<div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
						<span className="text-white text-2xl">📱</span>
					</div>
					<div>
						<h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>QR Code Generator</h1>
						<p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Create QR codes from text or URLs</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>QR Code Content</h2>
						<textarea
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Enter text, URL, or any data to encode..."
							rows="6"
							className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
						/>
						<p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enter any text, URL, contact info, WiFi credentials, etc.</p>
					</div>

					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>QR Code Settings</h2>

						<div className="grid grid-cols-2 gap-4 mb-4">
							<div>
								<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Size (px)</label>
								<input
									type="number"
									min="128"
									max="2048"
									step="64"
									value={size}
									onChange={(e) => setSize(parseInt(e.target.value) || 512)}
									className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Format</label>
								<select
									value={format}
									onChange={(e) => setFormat(e.target.value)}
									className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
								>
									<option value="png">PNG</option>
									<option value="svg">SVG</option>
								</select>
							</div>
						</div>

						<div className="mb-4">
							<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Error Correction</label>
							<select
								value={errorCorrectionLevel}
								onChange={(e) => setErrorCorrectionLevel(e.target.value)}
								className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
							>
								<option value="L">Low (7%)</option>
								<option value="M">Medium (15%)</option>
								<option value="Q">Quartile (25%)</option>
								<option value="H">High (30%)</option>
							</select>
							<p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Higher levels allow more damage recovery</p>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Dark Color</label>
								<div className="flex gap-2">
									<input
										type="color"
										value={darkColor}
										onChange={(e) => setDarkColor(e.target.value)}
										className="w-12 h-10 rounded cursor-pointer"
									/>
									<input
										type="text"
										value={darkColor}
										onChange={(e) => setDarkColor(e.target.value)}
										className={`flex-1 p-2 border rounded-lg text-sm ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
									/>
								</div>
							</div>
							<div>
								<label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Light Color</label>
								<div className="flex gap-2">
									<input
										type="color"
										value={lightColor}
										onChange={(e) => setLightColor(e.target.value)}
										className="w-12 h-10 rounded cursor-pointer"
									/>
									<input
										type="text"
										value={lightColor}
										onChange={(e) => setLightColor(e.target.value)}
										className={`flex-1 p-2 border rounded-lg text-sm ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>
						<div className="space-y-4">
							<button
								onClick={() => onProcess('qr-generate', { text, size, format, errorCorrectionLevel, darkColor, lightColor })}
								disabled={!canProcess || isProcessing}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
									canProcess && !isProcessing
										? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg hover:scale-105'
										: darkMode
										? 'bg-gray-700 text-gray-400 cursor-not-allowed'
										: 'bg-gray-200 text-gray-400 cursor-not-allowed'
								}`}
							>
								{isProcessing ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>Generating...</span>
									</div>
								) : (
									'📱 Generate QR Code'
								)}
							</button>
							<button onClick={() => { onReset(); setText(''); }} className={`w-full py-3 px-6 rounded-xl font-medium border-2 transition-all duration-200 ${darkMode ? 'text-gray-300 border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
								Reset All
							</button>
						</div>
					</div>

					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Progress</h2>
						<ProgressStatus progressPercent={progressPercent} currentFile={null} logs={logs} />
					</div>

					{doneFiles && doneFiles.length > 0 && (
						<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
							<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>📥 Download QR Code</h2>
							<div className="space-y-3">
								{doneFiles.map((item, idx) => (
									<div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
										<div className="flex items-center gap-3 min-w-0">
											<span className="text-2xl flex-shrink-0">📱</span>
											<div className="min-w-0">
												<div className={`font-medium text-sm truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.processedFile}</div>
												<div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
													{item.format?.toUpperCase()} • {item.size ? `${(item.size / 1024).toFixed(1)} KB` : ''}
												</div>
											</div>
										</div>
										{item.download_url && (
											<button onClick={() => onDownload(item)} className="ml-3 flex-shrink-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1">
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

export default QRCodePanel;
