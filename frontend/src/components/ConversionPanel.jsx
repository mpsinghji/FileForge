import React, { useState } from 'react';
import { useDarkMode } from '../App';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';
import * as api from '../services/api';

function ConversionPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset }) {
	const { darkMode } = useDarkMode();
	const [convertFormat, setConvertFormat] = useState('');
	const [suggestions, setSuggestions] = useState([]);
	const [estimate, setEstimate] = useState(null);

	const allFormats = [
		{ value: 'jpg', label: 'JPG (Image)', icon: '🖼️', type: 'image' },
		{ value: 'png', label: 'PNG (Image)', icon: '🖼️', type: 'image' },
		{ value: 'webp', label: 'WebP (Image)', icon: '🖼️', type: 'image' },
		{ value: 'gif', label: 'GIF (Image)', icon: '🖼️', type: 'image' },
		{ value: 'tiff', label: 'TIFF (Image)', icon: '🖼️', type: 'image' },
		{ value: 'mp4', label: 'MP4 (Video)', icon: '🎥', type: 'video' },
		{ value: 'avi', label: 'AVI (Video)', icon: '🎥', type: 'video' },
		{ value: 'mov', label: 'MOV (Video)', icon: '🎥', type: 'video' },
		{ value: 'wmv', label: 'WMV (Video)', icon: '🎥', type: 'video' },
		{ value: 'flv', label: 'FLV (Video)', icon: '🎥', type: 'video' },
		{ value: 'webm', label: 'WebM (Video)', icon: '🎥', type: 'video' },
		{ value: 'mp3', label: 'MP3 (Audio)', icon: '🎵', type: 'audio' },
		{ value: 'wav', label: 'WAV (Audio)', icon: '🎵', type: 'audio' },
		{ value: 'ogg', label: 'OGG (Audio)', icon: '🎵', type: 'audio' },
		{ value: 'aac', label: 'AAC (Audio)', icon: '🎵', type: 'audio' },
		{ value: 'flac', label: 'FLAC (Audio)', icon: '🎵', type: 'audio' },
		{ value: 'pdf', label: 'PDF (Document)', icon: '📄', type: 'document' },
		{ value: 'docx', label: 'DOCX (Document)', icon: '📄', type: 'document' },
		{ value: 'txt', label: 'TXT (Text)', icon: '📝', type: 'document' },
	];

	const getFileType = (file) => {
		if (file.type.startsWith('image/')) return 'image';
		if (file.type.startsWith('video/')) return 'video';
		if (file.type.startsWith('audio/')) return 'audio';
		if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) return 'document';
		return 'unknown';
	};

	const getAvailableFormats = () => {
		if (files.length === 0) return [];

		const fileTypes = files.map(getFileType);
		const uniqueTypes = [...new Set(fileTypes)];

		if (uniqueTypes.length === 1) {
			const fileType = uniqueTypes[0];

			if (fileType === 'document' && files.some(f => f.name.toLowerCase().endsWith('.pdf'))) {
				return allFormats.filter(format => format.type === 'image');
			}

			return allFormats.filter(format => format.type === fileType);
		}

		return allFormats;
	};

	const availableFormats = getAvailableFormats();

	const handleFilesAdded = async (added) => {
		if (!added || added.length === 0) return;
		try {
			const f = added[0];
			const resp = await api.suggestFormats({ filename: f.name, mimetype: f.type, sizeBytes: f.size });
			if (resp.success) {
				setSuggestions(resp.data.suggestions || []);
				setEstimate(resp.data.estimates || null);
			}
		} catch (_) { }
	};

	const canProcess = files.length > 0 && convertFormat !== '';

	return (
		<div className="space-y-6">
			<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
				<div className="flex items-center space-x-3 mb-4">
					<div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
						<span className="text-white text-2xl">🔄</span>
					</div>
					<div>
						<h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>File Conversion</h1>
						<p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Convert your files to different formats with ease</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-2 gap-6">
				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Upload Files</h2>
						<FileUpload files={files} setFiles={setFiles} onFilesAdded={handleFilesAdded} />
					</div>

					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Conversion Options</h2>

						<div className="mb-6">
							<label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
								Target Format
							</label>
							<div className="grid grid-cols-2 gap-3">
								{availableFormats.map((format) => (
									<button
										key={format.value}
										onClick={() => setConvertFormat(format.value)}
										className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${convertFormat === format.value
												? darkMode
													? 'border-indigo-400 bg-indigo-900 text-indigo-200'
													: 'border-indigo-500 bg-indigo-50 text-indigo-700'
												: darkMode
													? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700 text-gray-200'
													: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
											}`}
									>
										<div className="flex items-center space-x-3">
											<span className="text-2xl">{format.icon}</span>
											<div>
												<div className="font-medium">{format.label}</div>
												<div className={`text-xs uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{format.value}</div>
											</div>

											{(suggestions.length > 0 || estimate) && (
												<div className={`rounded-2xl shadow-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
													<h2 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Suggestions</h2>
													{suggestions.length > 0 && (
														<ul className={`mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
															{suggestions.map((s, i) => (
																<li key={i}>👉 {s.reason}: Try {s.target.toUpperCase()}</li>
															))}
														</ul>
													)}
													{estimate && (
														<div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
															Estimated size: {estimate.mp4 ? (estimate.mp4 / 1024 / 1024).toFixed(2) : '-'} MB
														</div>
													)}
												</div>
											)}
										</div>
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-6">
					<div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
						<h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Process Controls</h2>

						<div className="space-y-4">
							<button
								onClick={() => onProcess('conversion', {
									targetFormat: convertFormat
								})}
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
										<span>Processing...</span>
									</div>
								) : (
									'Start Conversion'
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
							<div className={`mt-6 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
								<h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Selected Files</h3>
								<div className="space-y-2">
									{files.map((file, index) => (
										<div key={index} className="flex items-center space-x-3 text-sm">
											<span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>📄</span>
											<span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{file.name}</span>
											<span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
										</div>
									))}
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

export default ConversionPanel;

