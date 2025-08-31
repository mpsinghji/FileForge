const API_BASE_URL = 'http://localhost:3001/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
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
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

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


export const extractText = async (file) => {
  const formData = new FormData();
  formData.append('files', file); 
  formData.append('mode', 'auto');
  formData.append('includeMetadata', false);
  formData.append('language', 'auto');

  const response = await fetch(`${API_BASE_URL}/extraction/extract`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
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
