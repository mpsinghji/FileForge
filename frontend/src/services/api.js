const API_BASE_URL = 'http://localhost:3001/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};


export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
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
    body: formData,
  });

  return handleResponse(response);
};


export const getSupportedFormats = async () => {
  const response = await fetch(`${API_BASE_URL}/conversion/formats`);
  return handleResponse(response);
};


export const getJobStatus = async (jobId) => {
  const response = await fetch(`${API_BASE_URL}/conversion/status/${jobId}`);
  return handleResponse(response);
};


export const getHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/history`);
  return handleResponse(response);
};


export const downloadFile = async (filePath) => {
  const response = await fetch(`${API_BASE_URL}/upload/download/${encodeURIComponent(filePath)}`);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  return response.blob();
};
