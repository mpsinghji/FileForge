import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import { useDarkMode } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../store/useAuth';

function SettingsPanel() {
    const { darkMode, toggleDarkMode } = useDarkMode();
    const { language, setLanguage, t } = useLanguage();
    const { logout } = useAuth();
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

    // Profile state
    const [profile, setProfile] = useState({
        username: '',
        email: '',
        currentPassword: '',
        password: '',
        confirmPassword: ''
    });
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

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

        // Load user profile
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const response = await api.getProfile();
            if (response.success) {
                setProfile(prev => ({
                    ...prev,
                    username: response.data.user.username,
                    email: response.data.user.email
                }));
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    };

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

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setProfileMessage({ type: '', text: '' });

        if (profile.password && profile.password !== profile.confirmPassword) {
            setProfileMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (profile.password && !profile.currentPassword) {
            setProfileMessage({ type: 'error', text: 'Current password is required to set a new password' });
            return;
        }

        setIsLoadingProfile(true);
        try {
            const updateData = {
                username: profile.username,
                email: profile.email
            };
            if (profile.password) {
                updateData.password = profile.password;
                updateData.currentPassword = profile.currentPassword;
            }

            const response = await api.updateProfile(updateData);
            if (response.success) {
                setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
                setProfile(prev => ({ ...prev, password: '', confirmPassword: '', currentPassword: '' }));
            } else {
                setProfileMessage({ type: 'error', text: response.error || 'Failed to update profile' });
            }
        } catch (error) {
            setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const languages = [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
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

            {/* User Profile Section */}
            <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>User Profile</h2>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                    {profileMessage.text && (
                        <div className={`p-3 rounded-lg ${profileMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {profileMessage.text}
                        </div>
                    )}

                    <div>
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-1`}>Username</label>
                        <input
                            type="text"
                            name="username"
                            value={profile.username}
                            onChange={handleProfileChange}
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-1`}>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={profile.email}
                            onChange={handleProfileChange}
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} mb-3`}>Change Password (Optional)</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-1`}>Current Password (Required for password change)</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={profile.currentPassword}
                                    onChange={handleProfileChange}
                                    placeholder="Current password"
                                    className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-1`}>New Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={profile.password}
                                        onChange={handleProfileChange}
                                        placeholder="Leave blank to keep current"
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-1`}>Confirm Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={profile.confirmPassword}
                                        onChange={handleProfileChange}
                                        placeholder="Confirm new password"
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isLoadingProfile}
                            className={`px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors ${isLoadingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoadingProfile ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>

            <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>{t('settings.general')}</h2>
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t('settings.darkMode')}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{t('settings.darkMode.desc')}</div>
                        </div>
                        <input type="checkbox" checked={darkMode} onChange={handleDarkModeToggle} className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    </label>

                    <div>
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>{t('settings.language')}</label>
                        <select value={language} onChange={handleLanguageChange} className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                            {languages.map((lang) => (
                                <option key={lang.value} value={lang.value}>{lang.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className={`rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>{t('settings.actions')}</h2>
                <div className="space-y-3">
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
                    <button
                        className={`w-full py-3 px-6 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors`}
                        onClick={async () => {
                            try {
                                await api.logout();
                            } catch (e) {
                                console.error('Logout API failed', e);
                            }
                            logout(); // Clear local state
                            window.location.reload();
                        }}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SettingsPanel;