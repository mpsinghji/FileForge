const API_BASE_URL = 'http://localhost:3000/api';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// File Upload API
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('files', file); // Changed from 'file' to 'files' to match backend expectation

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(response);
};

// File Conversion API
export const convertFile = async (file, targetFormat, applyOCR = false) => {
  console.log('Converting file:', file.name, 'to format:', targetFormat);
  
  const formData = new FormData();
  formData.append('files', file); // Changed from 'file' to 'files' to match backend expectation
  formData.append('targetFormat', targetFormat);
  formData.append('applyOCR', applyOCR);

  console.log('FormData contents:');
  for (let [key, value] of formData.entries()) {
    console.log(key, ':', value);
  }

  const response = await fetch(`${API_BASE_URL}/conversion/convert`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(response);
};

// File Compression API
export const compressFile = async (file, compressionLevel = 6, quality = 'high', removeMetadata = false) => {
  const formData = new FormData();
  formData.append('files', file); // Changed from 'file' to 'files' to match backend expectation
  formData.append('compressionLevel', compressionLevel);
  formData.append('quality', quality);
  formData.append('removeMetadata', removeMetadata);

  const response = await fetch(`${API_BASE_URL}/compression/compress`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(response);
};

// Text Extraction API
export const extractText = async (file, mode = 'auto', outputFormat = 'txt', includeMetadata = true, language = 'eng') => {
  const formData = new FormData();
  formData.append('files', file); // Changed from 'file' to 'files' to match backend expectation
  formData.append('mode', mode);
  formData.append('outputFormat', outputFormat);
  formData.append('includeMetadata', includeMetadata);
  formData.append('language', language);

  const response = await fetch(`${API_BASE_URL}/extraction/extract`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(response);
};

// Get supported formats
export const getSupportedFormats = async () => {
  const response = await fetch(`${API_BASE_URL}/conversion/formats`);
  return handleResponse(response);
};

// Get job status
export const getJobStatus = async (jobId) => {
  const response = await fetch(`${API_BASE_URL}/conversion/status/${jobId}`);
  return handleResponse(response);
};

// Get processing history
export const getHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/history`);
  return handleResponse(response);
};

// Download processed file
export const downloadFile = async (filePath) => {
  const response = await fetch(`${API_BASE_URL}/upload/download/${encodeURIComponent(filePath)}`);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  return response.blob();
};
