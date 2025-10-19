// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-op1c06n9l-everest-ans-projects.vercel.app';

export const API_ENDPOINTS = {
  // Auth endpoints
  SEND_CODE: `${API_BASE_URL}/api/auth/send-code`,
  VERIFY_LOGIN: `${API_BASE_URL}/api/auth/verify-login`,
  WALLET_LOGIN: `${API_BASE_URL}/api/auth/wallet-login`,
  ALIPAY_LOGIN: `${API_BASE_URL}/api/auth/alipay-login`,
  GET_ME: `${API_BASE_URL}/api/auth/me`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/health`
};

// API helper function
export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const response = await fetch(endpoint, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
};

export default API_BASE_URL;

