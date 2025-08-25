import React, { useState } from 'react';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';

function ConversionPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset }) {
	const [convertFormat, setConvertFormat] = useState('');

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



	const canProcess = files.length > 0 && convertFormat !== '';

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-2xl shadow-lg p-6">
				<div className="flex items-center space-x-3 mb-4">
					<div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
						<span className="text-white text-2xl">🔄</span>
					</div>
					<div>
						<h1 className="text-3xl font-bold text-gray-800">File Conversion</h1>
						<p className="text-gray-600">Convert your files to different formats with ease</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="space-y-6">
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Files</h2>
						<FileUpload files={files} setFiles={setFiles} />
					</div>

					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4">Conversion Options</h2>
						
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-3">
								Target Format
							</label>
							<div className="grid grid-cols-2 gap-3">
								{availableFormats.map((format) => (
									<button
										key={format.value}
										onClick={() => setConvertFormat(format.value)}
										className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
											convertFormat === format.value
												? 'border-indigo-500 bg-indigo-50 text-indigo-700'
												: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
										}`}
									>
										<div className="flex items-center space-x-3">
											<span className="text-2xl">{format.icon}</span>
											<div>
												<div className="font-medium">{format.label}</div>
												<div className="text-xs text-gray-500 uppercase">{format.value}</div>
											</div>
										</div>
									</button>
								))}
							</div>
						</div>




					</div>
				</div>

				<div className="space-y-6">
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4">Process Controls</h2>
						
						<div className="space-y-4">
							<button
								onClick={() => onProcess('conversion', {
									targetFormat: convertFormat
								})}
								disabled={!canProcess || isProcessing}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
									canProcess && !isProcessing
										? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
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
								className="w-full py-3 px-6 rounded-xl font-medium text-gray-600 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
							>
								Reset All
							</button>
						</div>

						{files.length > 0 && (
							<div className="mt-6 p-4 bg-gray-50 rounded-xl">
								<h3 className="font-medium text-gray-800 mb-2">Selected Files</h3>
								<div className="space-y-2">
									{files.map((file, index) => (
										<div key={index} className="flex items-center space-x-3 text-sm">
											<span className="text-gray-500">📄</span>
											<span className="text-gray-700">{file.name}</span>
											<span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4">Progress</h2>
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

