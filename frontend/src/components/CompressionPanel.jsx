import React, { useState } from 'react';
import FileUpload from './FileUpload';
import ProgressStatus from './ProgressStatus';

function CompressionPanel({ files, setFiles, isProcessing, progressPercent, logs, onProcess, onReset }) {
	const [compressionLevel, setCompressionLevel] = useState('medium');
	const [preserveQuality, setPreserveQuality] = useState(true);
	const [removeMetadata, setRemoveMetadata] = useState(false);

	const compressionLevels = [
		{ value: 'light', label: 'Light', description: 'Minimal compression, fast processing', savings: '10-20%' },
		{ value: 'medium', label: 'Medium', description: 'Balanced compression and quality', savings: '30-50%' },
		{ value: 'high', label: 'High', description: 'Maximum compression, smaller files', savings: '50-70%' },
		{ value: 'extreme', label: 'Extreme', description: 'Ultra compression, may affect quality', savings: '70-90%' },
	];

	const canProcess = files.length > 0;

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-2xl shadow-lg p-6">
				<div className="flex items-center space-x-3 mb-4">
					<div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
						<span className="text-white text-2xl">🗜️</span>
					</div>
					<div>
						<h1 className="text-3xl font-bold text-gray-800">File Compression</h1>
						<p className="text-gray-600">Reduce file sizes while maintaining quality</p>
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
						<h2 className="text-xl font-semibold text-gray-800 mb-4">Compression Settings</h2>
						
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-3">
								Compression Level
							</label>
							<div className="space-y-3">
								{compressionLevels.map((level) => (
									<button
										key={level.value}
										onClick={() => setCompressionLevel(level.value)}
										className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
											compressionLevel === level.value
												? 'border-indigo-500 bg-indigo-50 text-indigo-700'
												: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-3">
												<div className={`w-3 h-3 rounded-full ${
													level.value === 'light' ? 'bg-indigo-300' :
													level.value === 'medium' ? 'bg-indigo-400' :
													level.value === 'high' ? 'bg-indigo-500' : 'bg-indigo-600'
												}`}></div>
												<div>
													<div className="font-medium">{level.label}</div>
													<div className="text-sm text-gray-500">{level.description}</div>
												</div>
											</div>
											<div className="text-right">
												<div className="text-sm font-medium text-indigo-600">{level.savings}</div>
												<div className="text-xs text-gray-400">size reduction</div>
											</div>
										</div>
									</button>
								))}
							</div>
						</div>

						<div className="space-y-4">
							<label className="flex items-center space-x-3 cursor-pointer">
								<input
									type="checkbox"
									checked={preserveQuality}
									onChange={(e) => setPreserveQuality(e.target.checked)}
									className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
								/>
								<div>
									<div className="font-medium text-gray-800">Preserve Quality</div>
									<div className="text-sm text-gray-500">Maintain original quality when possible</div>
								</div>
							</label>

							<label className="flex items-center space-x-3 cursor-pointer">
								<input
									type="checkbox"
									checked={removeMetadata}
									onChange={(e) => setRemoveMetadata(e.target.checked)}
									className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
								/>
								<div>
									<div className="font-medium text-gray-800">Remove Metadata</div>
									<div className="text-sm text-gray-500">Strip EXIF data and other metadata for smaller files</div>
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
								onClick={() => onProcess('compression', {
									compressionLevel: compressionLevel,
									quality: preserveQuality ? 'high' : 'medium',
									removeMetadata: removeMetadata
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
										<span>Compressing...</span>
									</div>
								) : (
									'Start Compression'
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
							<div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
								<h3 className="font-medium text-gray-800 mb-3">Compression Preview</h3>
								<div className="space-y-3">
									{files.map((file, index) => {
										const originalSize = (file.size / 1024 / 1024).toFixed(2);
										const savings = compressionLevels.find(l => l.value === compressionLevel)?.savings || '30-50%';
										const savingsRange = savings.split('-');
										const maxSavings = parseInt(savingsRange[1]);
										const estimatedSize = (file.size * (100 - maxSavings) / 100 / 1024 / 1024).toFixed(2);
										
										return (
											<div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
												<div className="flex items-center space-x-3">
													<span className="text-gray-500">📄</span>
													<div>
														<div className="font-medium text-gray-700">{file.name}</div>
														<div className="text-sm text-gray-500">{originalSize} MB → ~{estimatedSize} MB</div>
													</div>
												</div>
												<div className="text-right">
													<div className="text-sm font-medium text-indigo-600">{savings}</div>
													<div className="text-xs text-gray-400">reduction</div>
												</div>
											</div>
										);
									})}
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

export default CompressionPanel;

