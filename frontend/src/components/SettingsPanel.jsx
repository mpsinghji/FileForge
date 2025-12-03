import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import { useDarkMode } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

function SettingsPanel() {
    const { darkMode, toggleDarkMode } = useDarkMode();
    const { language, setLanguage, t } = useLanguage();
    const [settings, setSettings] = useState({
        autoSave: true,
        notifications: true,
        darkMode: darkMode,
        language: language,
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

    // Sync local settings with global dark mode when it changes externally
    useEffect(() => {
        setSettings(prev => ({ ...prev, darkMode }));
    }, [darkMode]);

    // Sync local settings with global language when it changes externally
    useEffect(() => {
        setSettings(prev => ({ ...prev, language }));
    }, [language]);

    useEffect(() => {
        const saved = api.loadSettings();
        if (saved) setSettings((prev) => ({ ...prev, ...saved, darkMode, language }));
    }, []);

    useEffect(() => {
        api.saveSettings(settings);
    }, [settings]);

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleDarkModeToggle = (e) => {
        const isEnabled = e.target.checked;
        toggleDarkMode(); // Toggle global theme
        handleSettingChange('darkMode', isEnabled); // Update local setting
    };

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setLanguage(newLang); // Update global language
        handleSettingChange('language', newLang); // Update local setting
    };

    const languages = [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
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
            <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-2xl">⚙️</span>
                    </div>
                    <div>
                        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('settings.title')}</h1>
                        <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{t('settings.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>{t('settings.general')}</h2>
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('settings.autoSave')}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('settings.autoSave.desc')}</div>
                        </div>
                        <input type="checkbox" checked={settings.autoSave} onChange={(e) => handleSettingChange('autoSave', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('settings.notifications')}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('settings.notifications.desc')}</div>
                        </div>
                        <input type="checkbox" checked={settings.notifications} onChange={(e) => handleSettingChange('notifications', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('settings.darkMode')}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('settings.darkMode.desc')}</div>
                        </div>
                        <input type="checkbox" checked={darkMode} onChange={handleDarkModeToggle} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    </label>

                    <div>
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>{t('settings.language')}</label>
                        <select value={language} onChange={handleLanguageChange} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                            {languages.map((lang) => (
                                <option key={lang.value} value={lang.value}>{lang.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>{t('settings.processing')}</h2>
                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>{t('settings.maxFileSize')}</label>
                        <input type="range" min="10" max="500" value={settings.maxFileSize} onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-sm text-gray-500 mt-1">
                            <span>10 MB</span>
                            <span>{settings.maxFileSize} MB</span>
                            <span>500 MB</span>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>{t('settings.concurrentProcessing')}</label>
                        <input type="range" min="1" max="10" value={settings.concurrentProcessing} onChange={(e) => handleSettingChange('concurrentProcessing', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-sm text-gray-500 mt-1">
                            <span>1 file</span>
                            <span>{settings.concurrentProcessing} files</span>
                            <span>10 files</span>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>{t('settings.outputQuality')}</label>
                        <div className="space-y-2">
                            {qualityOptions.map((option) => (
                                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                                    <input type="radio" name="quality" value={option.value} checked={settings.outputQuality === option.value} onChange={(e) => handleSettingChange('outputQuality', e.target.value)} className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                    <div>
                                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{option.label}</div>
                                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{option.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>{t('settings.storage')}</h2>
                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>{t('settings.storageLocation')}</label>
                        <div className="space-y-2">
                            {storageOptions.map((option) => (
                                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                                    <input type="radio" name="storage" value={option.value} checked={settings.storageLocation === option.value} onChange={(e) => handleSettingChange('storageLocation', e.target.value)} className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                    <div>
                                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{option.label}</div>
                                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{option.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('settings.cloudSync')}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('settings.cloudSync.desc')}</div>
                        </div>
                        <input type="checkbox" checked={settings.cloudSync} onChange={(e) => handleSettingChange('cloudSync', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('settings.autoCleanup')}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('settings.autoCleanup.desc')}</div>
                        </div>
                        <input type="checkbox" checked={settings.autoCleanup} onChange={(e) => handleSettingChange('autoCleanup', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    </label>

                    {settings.autoCleanup && (
                        <div>
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>{t('settings.retentionPeriod')}</label>
                            <input type="number" min="1" max="365" value={settings.retentionDays} onChange={(e) => handleSettingChange('retentionDays', parseInt(e.target.value))} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    )}
                </div>
            </div>

            <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>{t('settings.security')}</h2>
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('settings.encryptFiles')}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('settings.encryptFiles.desc')}</div>
                        </div>
                        <input type="checkbox" checked={settings.encryptFiles} onChange={(e) => handleSettingChange('encryptFiles', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('settings.requirePassword')}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('settings.requirePassword.desc')}</div>
                        </div>
                        <input type="checkbox" checked={settings.requirePassword} onChange={(e) => handleSettingChange('requirePassword', e.target.checked)} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    </label>

                    <div>
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>{t('settings.sessionTimeout')}</label>
                        <input type="range" min="5" max="120" value={settings.sessionTimeout} onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-sm text-gray-500 mt-1">
                            <span>5 min</span>
                            <span>{settings.sessionTimeout} min</span>
                            <span>120 min</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>{t('settings.actions')}</h2>
                <div className="space-y-3">
                    <button className={`w-full py-3 px-6 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => api.saveSettings(settings)}>{t('settings.save')}</button>
                    <button className="w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors" onClick={() => setSettings({
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
                    })}>{t('settings.reset')}</button>
                    <button className={`w-full py-3 px-6 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors ${darkMode ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => { localStorage.clear(); window.location.reload(); }}>{t('settings.clearData')}</button>
                </div>
            </div>
        </div>
    );
}

export default SettingsPanel;