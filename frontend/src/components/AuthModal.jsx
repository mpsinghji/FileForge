import React, { useState } from 'react';
import { useDarkMode } from '../App';
import * as api from '../services/api';

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { darkMode } = useDarkMode();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (isLogin) {
      if (!formData.email) newErrors.email = 'Email is required';
      if (!formData.password) newErrors.password = 'Password is required';
    } else {
      if (!formData.username) newErrors.username = 'Username is required';
      if (!formData.email) newErrors.email = 'Email is required';
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      let response;
      if (isLogin) {
        response = await api.login(formData.email, formData.password);
      } else {
        response = await api.signup(formData.username, formData.email, formData.password);
      }

      if (response.success) {
        // Store token in localStorage
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Reset form
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        onAuthSuccess(response.data);
        onClose();
      }
    } catch (error) {
      console.error('Auth error:', error);
      setErrors({
        general: error.message || 'An error occurred. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Transparent background overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className={`relative rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 transform transition-all ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

                 {/* Header */}
         <div className="text-center mb-8">
           <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
             {isLogin ? 'Welcome Back' : 'Create Account'}
           </h2>
           <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
             {isLogin ? 'Sign in to your account' : 'Join FileForge today'}
           </p>
         </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <div className={`border px-4 py-3 rounded-lg ${
              darkMode 
                ? 'bg-red-900 border-red-700 text-red-200' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {errors.general}
            </div>
          )}

                     {!isLogin && (
             <div>
               <label htmlFor="username" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                 Username
               </label>
               <input
                 type="text"
                 id="username"
                 name="username"
                 value={formData.username}
                 onChange={handleInputChange}
                 className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                   errors.username ? 'border-red-300' : darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'
                 }`}
                 placeholder="Enter your username"
               />
               {errors.username && (
                 <p className="mt-1 text-sm text-red-400">{errors.username}</p>
               )}
             </div>
           )}

                     <div>
             <label htmlFor="email" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
               Email
             </label>
             <input
               type="email"
               id="email"
               name="email"
               value={formData.email}
               onChange={handleInputChange}
               className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                 errors.email ? 'border-red-300' : darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'
               }`}
               placeholder="Enter your email"
             />
             {errors.email && (
               <p className="mt-1 text-sm text-red-400">{errors.email}</p>
             )}
           </div>

                     <div>
             <label htmlFor="password" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
               Password
             </label>
             <input
               type="password"
               id="password"
               name="password"
               value={formData.password}
               onChange={handleInputChange}
               className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                 errors.password ? 'border-red-300' : darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'
               }`}
               placeholder="Enter your password"
             />
             {errors.password && (
               <p className="mt-1 text-sm text-red-400">{errors.password}</p>
             )}
           </div>

                     {!isLogin && (
             <div>
               <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                 Confirm Password
               </label>
               <input
                 type="password"
                 id="confirmPassword"
                 name="confirmPassword"
                 value={formData.confirmPassword}
                 onChange={handleInputChange}
                 className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                   errors.confirmPassword ? 'border-red-300' : darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'
                 }`}
                 placeholder="Confirm your password"
               />
               {errors.confirmPassword && (
                 <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
               )}
             </div>
           )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

                 {/* Toggle mode */}
         <div className="mt-6 text-center">
           <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
             {isLogin ? "Don't have an account? " : "Already have an account? "}
             <button
               onClick={toggleMode}
               className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
             >
               {isLogin ? 'Sign up' : 'Sign in'}
             </button>
           </p>
         </div>
      </div>
    </div>
  );
};

export default AuthModal;
