import React from 'react';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';

function TextExtractionPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset }) {
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
				</div>

				<div className="space-y-6">
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4">Process Controls</h2>
						
						<div className="space-y-4">
							<button
								onClick={() => onProcess('extraction', {
									mode: 'auto',
									includeMetadata: false,
									language: 'auto'
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

