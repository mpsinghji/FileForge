import React, { useState } from 'react';

function SettingsPanel() {
	const [settings, setSettings] = useState({
		autoSave: true,
		notifications: true,
		darkMode: false,
		language: 'en',
		maxFileSize: 100,
		concurrentProcessing: 3,
		tempFileRetention: 24,
		outputQuality: 'high',
		storageLocation: 'local',
		cloudSync: false,
		autoCleanup: true,
		retentionDays: 30,
		encryptFiles: false,
		requirePassword: false,
		sessionTimeout: 30,
	});

	const handleSettingChange = (key, value) => {
		setSettings(prev => ({ ...prev, [key]: value }));
	};

	const languages = [
		{ value: 'en', label: 'English' },
		{ value: 'es', label: 'Español' },
		{ value: 'fr', label: 'Français' },
		{ value: 'de', label: 'Deutsch' },
		{ value: 'zh', label: '中文' },
		{ value: 'ja', label: '日本語' },
	];

	const qualityOptions = [
		{ value: 'low', label: 'Low', description: 'Faster processing, smaller files' },
		{ value: 'medium', label: 'Medium', description: 'Balanced quality and speed' },
		{ value: 'high', label: 'High', description: 'Best quality, slower processing' },
	];

	const storageOptions = [
		{ value: 'local', label: 'Local Storage', description: 'Store files on your device' },
		{ value: 'cloud', label: 'Cloud Storage', description: 'Store files in the cloud' },
		{ value: 'hybrid', label: 'Hybrid', description: 'Use both local and cloud storage' },
	];

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-2xl shadow-lg p-6">
				<div className="flex items-center space-x-3 mb-4">
					<div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
						<span className="text-white text-2xl">⚙️</span>
					</div>
					<div>
						<h1 className="text-3xl font-bold text-gray-800">Settings</h1>
						<p className="text-gray-600">Configure your FileForge preferences</p>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-2xl shadow-lg p-6">
				<h2 className="text-xl font-semibold text-gray-800 mb-4">General Settings</h2>
				<div className="space-y-4">
					<label className="flex items-center justify-between cursor-pointer">
						<div>
							<div className="font-medium text-gray-800">Auto Save</div>
							<div className="text-sm text-gray-500">Automatically save processing results</div>
						</div>
						<input type="checkbox" checked={settings.autoSave} onChange={(e) => handleSettingChange('autoSave', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
					</label>

					<label className="flex items-center justify-between cursor-pointer">
						<div>
							<div className="font-medium text-gray-800">Notifications</div>
							<div className="text-sm text-gray-500">Show notifications for completed tasks</div>
						</div>
						<input type="checkbox" checked={settings.notifications} onChange={(e) => handleSettingChange('notifications', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
					</label>

					<label className="flex items-center justify-between cursor-pointer">
						<div>
							<div className="font-medium text-gray-800">Dark Mode</div>
							<div className="text-sm text-gray-500">Use dark theme interface</div>
						</div>
						<input type="checkbox" checked={settings.darkMode} onChange={(e) => handleSettingChange('darkMode', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
					</label>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
						<select value={settings.language} onChange={(e) => handleSettingChange('language', e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
							{languages.map((lang) => (
								<option key={lang.value} value={lang.value}>{lang.label}</option>
							))}
						</select>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-2xl shadow-lg p-6">
				<h2 className="text-xl font-semibold text-gray-800 mb-4">Processing Settings</h2>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Maximum File Size (MB)</label>
						<input type="range" min="10" max="500" value={settings.maxFileSize} onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
						<div className="flex justify-between text-sm text-gray-500 mt-1">
							<span>10 MB</span>
							<span>{settings.maxFileSize} MB</span>
							<span>500 MB</span>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Concurrent Processing</label>
						<input type="range" min="1" max="10" value={settings.concurrentProcessing} onChange={(e) => handleSettingChange('concurrentProcessing', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
						<div className="flex justify-between text-sm text-gray-500 mt-1">
							<span>1 file</span>
							<span>{settings.concurrentProcessing} files</span>
							<span>10 files</span>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Output Quality</label>
						<div className="space-y-2">
							{qualityOptions.map((option) => (
								<label key={option.value} className="flex items-center space-x-3 cursor-pointer">
									<input type="radio" name="quality" value={option.value} checked={settings.outputQuality === option.value} onChange={(e) => handleSettingChange('outputQuality', e.target.value)} className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
									<div>
										<div className="font-medium text-gray-800">{option.label}</div>
										<div className="text-sm text-gray-500">{option.description}</div>
									</div>
								</label>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-2xl shadow-lg p-6">
				<h2 className="text-xl font-semibold text-gray-800 mb-4">Storage Settings</h2>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Storage Location</label>
						<div className="space-y-2">
							{storageOptions.map((option) => (
								<label key={option.value} className="flex items-center space-x-3 cursor-pointer">
									<input type="radio" name="storage" value={option.value} checked={settings.storageLocation === option.value} onChange={(e) => handleSettingChange('storageLocation', e.target.value)} className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
									<div>
										<div className="font-medium text-gray-800">{option.label}</div>
										<div className="text-sm text-gray-500">{option.description}</div>
									</div>
								</label>
							))}
						</div>
					</div>

					<label className="flex items-center justify-between cursor-pointer">
						<div>
							<div className="font-medium text-gray-800">Cloud Sync</div>
							<div className="text-sm text-gray-500">Sync files across devices</div>
						</div>
						<input type="checkbox" checked={settings.cloudSync} onChange={(e) => handleSettingChange('cloudSync', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
					</label>

					<label className="flex items-center justify-between cursor-pointer">
						<div>
							<div className="font-medium text-gray-800">Auto Cleanup</div>
							<div className="text-sm text-gray-500">Automatically delete old files</div>
						</div>
						<input type="checkbox" checked={settings.autoCleanup} onChange={(e) => handleSettingChange('autoCleanup', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
					</label>

					{settings.autoCleanup && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Retention Period (days)</label>
							<input type="number" min="1" max="365" value={settings.retentionDays} onChange={(e) => handleSettingChange('retentionDays', parseInt(e.target.value))} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
						</div>
					)}
				</div>
			</div>

			<div className="bg-white rounded-2xl shadow-lg p-6">
				<h2 className="text-xl font-semibold text-gray-800 mb-4">Security Settings</h2>
				<div className="space-y-4">
					<label className="flex items-center justify-between cursor-pointer">
						<div>
							<div className="font-medium text-gray-800">Encrypt Files</div>
							<div className="text-sm text-gray-500">Encrypt processed files for security</div>
						</div>
						<input type="checkbox" checked={settings.encryptFiles} onChange={(e) => handleSettingChange('encryptFiles', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
					</label>

					<label className="flex items-center justify-between cursor-pointer">
						<div>
							<div className="font-medium text-gray-800">Require Password</div>
							<div className="text-sm text-gray-500">Require password for sensitive operations</div>
						</div>
						<input type="checkbox" checked={settings.requirePassword} onChange={(e) => handleSettingChange('requirePassword', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
					</label>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
						<input type="range" min="5" max="120" value={settings.sessionTimeout} onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
						<div className="flex justify-between text-sm text-gray-500 mt-1">
							<span>5 min</span>
							<span>{settings.sessionTimeout} min</span>
							<span>120 min</span>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-2xl shadow-lg p-6">
				<h2 className="text-xl font-semibold text-gray-800 mb-4">Actions</h2>
				<div className="space-y-3">
					<button className="w-full py-3 px-6 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">Save Settings</button>
					<button className="w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">Reset to Defaults</button>
					<button className="w-full py-3 px-6 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors">Clear All Data</button>
				</div>
			</div>
		</div>
	);
}

export default SettingsPanel;