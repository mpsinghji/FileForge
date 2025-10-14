import { useAuth } from '../store/useAuth';

const API_BASE_URL = '/api';

// Get auth token from Zustand store
const getAuthToken = () => {
  const state = useAuth.getState();
  return state.accessToken;
};

const getRefreshToken = () => {
  const state = useAuth.getState();
  return state.refreshToken;
};

// Add auth header to requests
const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    } catch (parseError) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  return response.json();
};

// Refresh tokens helper
const refreshTokens = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success && data?.data?.accessToken) {
      // Update Zustand store instead of localStorage
      useAuth.getState().updateTokens({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken || refreshToken
      });
      return data.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
};

// Auth-aware fetch that retries once after refresh on 401
const authFetch = async (url, options = {}) => {
  const withAuth = {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getAuthHeaders(),
    },
  };
  let res = await fetch(url, withAuth);
  if (res.status === 401) {
    const newToken = await refreshTokens();
    if (newToken) {
      const retry = {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${newToken}`,
        },
      };
      res = await fetch(url, retry);
    }
  }
  return res;
};


// Authentication functions
export const login = async (email, password) => {
  console.log('Attempting login with:', { email, password: '***' });
  
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  console.log('Login response status:', response.status);
  const result = await handleResponse(response);
  console.log('Login response:', result);
  return result;
};

export const signup = async (username, email, password) => {
  console.log('Attempting signup with:', { username, email, password: '***' });
  
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });

  console.log('Signup response status:', response.status);
  const result = await handleResponse(response);
  console.log('Signup response:', result);
  return result;
};

export const logout = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};

export const getProfile = async () => {
  const response = await authFetch(`${API_BASE_URL}/auth/profile`);

  return handleResponse(response);
};

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  return handleResponse(response);
};


export const convertFile = async (file, targetFormat) => {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('targetFormat', targetFormat);

  const response = await fetch(`${API_BASE_URL}/conversion/convert`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  return handleResponse(response);
};


export const compressFile = async (file, compressionLevel = 6, quality = 'high', removeMetadata = false) => {
  const formData = new FormData();
  formData.append('files', file); 
  formData.append('compressionLevel', compressionLevel);
  formData.append('quality', quality);
  formData.append('removeMetadata', removeMetadata);

  const response = await fetch(`${API_BASE_URL}/compression/compress`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  return handleResponse(response);
};


export const extractText = async (file, mode = 'auto', includeMetadata = false, language = 'auto') => {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('mode', mode);
  formData.append('includeMetadata', includeMetadata);
  formData.append('language', language);

  const response = await fetch(`${API_BASE_URL}/extraction/extract`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return handleResponse(response);
};

export const extractTextWithOptions = async (file, { mode = 'auto', includeMetadata = false, language = 'auto' } = {}) => {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('mode', mode);
  formData.append('includeMetadata', includeMetadata);
  formData.append('language', language);

  const response = await fetch(`${API_BASE_URL}/extraction/extract`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return handleResponse(response);
};


export const getSupportedFormats = async () => {
  const response = await fetch(`${API_BASE_URL}/conversion/formats`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(response);
};

export const estimateConversion = async ({ kind, quality, sizeBytes }) => {
  const response = await fetch(`${API_BASE_URL}/conversion/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ kind, quality, sizeBytes }),
  });
  return handleResponse(response);
};

export const suggestFormats = async ({ filename, mimetype, sizeBytes }) => {
  const response = await fetch(`${API_BASE_URL}/conversion/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ filename, mimetype, sizeBytes }),
  });
  return handleResponse(response);
};

export const getExtractionLanguages = async () => {
  const response = await fetch(`${API_BASE_URL}/extraction/languages`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(response);
};

export const testArchiveService = async () => {
  const response = await fetch(`${API_BASE_URL}/extraction/test-archive`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(response);
};

export const extractArchive = async (files, { extractPath = 'extracted', overwriteExisting = false, password = '' } = {}) => {
  const formData = new FormData();
  for (const f of files) formData.append('files', f);
  formData.append('extractPath', extractPath);
  formData.append('overwriteExisting', overwriteExisting);
  if (password) formData.append('password', password);
  const response = await fetch(`${API_BASE_URL}/extraction/archive`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return handleResponse(response);
};

// Local settings persistence (placeholder for server-backed prefs)
export const saveSettings = (settings) => {
  localStorage.setItem('ff_settings', JSON.stringify(settings));
  return { success: true };
};

export const loadSettings = () => {
  const raw = localStorage.getItem('ff_settings');
  return raw ? JSON.parse(raw) : null;
};


export const getJobStatus = async (jobId) => {
  const response = await fetch(`${API_BASE_URL}/conversion/status/${jobId}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(response);
};


export const getHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/history`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};

export const deleteHistoryItem = async (id) => {
  const response = await fetch(`${API_BASE_URL}/history/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};

export const downloadFile = async (filename) => {
  const response = await fetch(`${API_BASE_URL}/uploads/${filename}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error('Download failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
