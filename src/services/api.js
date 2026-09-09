import axios from 'axios';
import useAuthStore from '@/store/authStore';

const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

const API_BASE_URL = isElectron
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach Authorization header from store or directly from localStorage
api.interceptors.request.use(
  (config) => {
    let token = useAuthStore.getState().token;
    if (!token && typeof window !== 'undefined' && window.localStorage) {
      token = localStorage.getItem('Clinformatiq_token') || localStorage.getItem('token') || localStorage.getItem('clinformatiq_token');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 by clearing auth and immediately redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Never trigger automatic logout/redirect for background unlock teardown requests
      const reqUrl = error.config?.url || '';
      if (reqUrl.includes('/unlock')) {
        return Promise.reject(error);
      }

      const { logout, user } = useAuthStore.getState();
      const role = user?.role;
      logout();

      const publicPaths = ['/login', '/register', '/admin-login', '/admin-register', '/users'];
      if (!publicPaths.includes(window.location.pathname)) {
        const redirectTarget = role === 'ADMIN' ? '/admin-login' : '/login';
        window.location.replace(redirectTarget);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
