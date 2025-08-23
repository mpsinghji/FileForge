import React, { useState } from 'react';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';

function TextExtractionPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset }) {
	const [extractionMode, setExtractionMode] = useState('auto');
	const [outputFormat, setOutputFormat] = useState('txt');
	const [includeMetadata, setIncludeMetadata] = useState(false);
	const [language, setLanguage] = useState('auto');

	const extractionModes = [
		{ value: 'auto', label: 'Auto Detect', description: 'Automatically detect text extraction method', icon: '🔍' },
		{ value: 'ocr', label: 'OCR Only', description: 'Use Optical Character Recognition', icon: '👁️' },
		{ value: 'native', label: 'Native Text', description: 'Extract from text-based documents', icon: '📝' },
		{ value: 'hybrid', label: 'Hybrid', description: 'Combine OCR and native extraction', icon: '🔄' },
	];

	const outputFormats = [
		{ value: 'txt', label: 'Plain Text (.txt)', icon: '📄' },
		{ value: 'docx', label: 'Word Document (.docx)', icon: '📝' },
		{ value: 'pdf', label: 'PDF Document (.pdf)', icon: '📕' },
		{ value: 'json', label: 'JSON Format (.json)', icon: '📊' },
	];

	const languages = [
		{ value: 'auto', label: 'Auto Detect', description: 'Automatically detect language' },
		{ value: 'en', label: 'English', description: 'English text recognition' },
		{ value: 'es', label: 'Spanish', description: 'Spanish text recognition' },
		{ value: 'fr', label: 'French', description: 'French text recognition' },
		{ value: 'de', label: 'German', description: 'German text recognition' },
		{ value: 'zh', label: 'Chinese', description: 'Chinese text recognition' },
		{ value: 'ja', label: 'Japanese', description: 'Japanese text recognition' },
	];

	const canProcess = files.length > 0;

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-2xl shadow-lg p-6">
				<div className="flex items-center space-x-3 mb-4">
					<div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
						<span className="text-white text-2xl">📝</span>
					</div>
					<div>
						<h1 className="text-3xl font-bold text-gray-800">Text Extraction</h1>
						<p className="text-gray-600">Extract text from images, documents, and scanned files</p>
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
						<h2 className="text-xl font-semibold text-gray-800 mb-4">Extraction Settings</h2>
						
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-3">
								Extraction Mode
							</label>
							<div className="grid grid-cols-2 gap-3">
								{extractionModes.map((mode) => (
									<button
										key={mode.value}
										onClick={() => setExtractionMode(mode.value)}
										className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
											extractionMode === mode.value
												? 'border-indigo-500 bg-indigo-50 text-indigo-700'
												: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
										}`}
									>
										<div className="flex items-center space-x-3">
											<span className="text-2xl">{mode.icon}</span>
											<div>
												<div className="font-medium">{mode.label}</div>
												<div className="text-xs text-gray-500">{mode.description}</div>
											</div>
										</div>
									</button>
								))}
							</div>
						</div>

						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-3">
								Output Format
							</label>
							<div className="grid grid-cols-2 gap-3">
								{outputFormats.map((format) => (
									<button
										key={format.value}
										onClick={() => setOutputFormat(format.value)}
										className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
											outputFormat === format.value
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

						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-3">
								Language
							</label>
							<select
								value={language}
								onChange={(e) => setLanguage(e.target.value)}
								className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							>
								{languages.map((lang) => (
									<option key={lang.value} value={lang.value}>
										{lang.label} - {lang.description}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-4">
							<label className="flex items-center space-x-3 cursor-pointer">
								<input
									type="checkbox"
									checked={includeMetadata}
									onChange={(e) => setIncludeMetadata(e.target.checked)}
									className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
								/>
								<div>
									<div className="font-medium text-gray-800">Include Metadata</div>
									<div className="text-sm text-gray-500">Include file metadata in extraction results</div>
								</div>
							</label>
						</div>
					</div>
				</div>

				<div className="space-y-6">
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4">Process Controls</h2>
						
						<div className="space-y-4">
							<button
								onClick={() => onProcess('extraction', {
									mode: extractionMode,
									outputFormat: outputFormat,
									includeMetadata: includeMetadata,
									language: language
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
										<span>Extracting...</span>
									</div>
								) : (
									'Start Extraction'
								)}
							</button>

							<button
								onClick={onReset}
								className="w-full py-3 px-6 rounded-xl font-medium text-gray-600 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
							>
								Reset All
							</button>
						</div>

						<div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
							<h3 className="font-medium text-gray-800 mb-3">Supported File Types</h3>
							<div className="grid grid-cols-2 gap-2 text-sm">
								<div className="flex items-center space-x-2">
									<span>📄</span>
									<span className="text-gray-600">PDF Documents</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>🖼️</span>
									<span className="text-gray-600">Images (JPG, PNG)</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>📝</span>
									<span className="text-gray-600">Word Documents</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>📊</span>
									<span className="text-gray-600">Excel Spreadsheets</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>📋</span>
									<span className="text-gray-600">Text Files</span>
								</div>
								<div className="flex items-center space-x-2">
									<span>🎥</span>
									<span className="text-gray-600">Video Files</span>
								</div>
							</div>
						</div>
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

export default TextExtractionPanel;

