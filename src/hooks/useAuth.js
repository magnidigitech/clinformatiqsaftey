import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import * as authService from '@/services/authService';

/**
 * Hook that wraps the auth store and provides login/logout/register functions
 * that integrate with the auth service and navigation.
 */
export function useAuth() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, setAuth, logout: storeLogout, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Login Admin.
   */
  const loginAdmin = useCallback(
    async (username, password) => {
      setLoading(true);
      setError(null);
      try {
        const data = await authService.loginAdmin(username, password);
        setAuth(data.user, data.token);
        navigate('/admin');
        return data;
      } catch (err) {
        const message =
          err.response?.data?.message || 'Login failed. Please try again.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, navigate]
  );

  /**
   * Login User.
   */
  const loginUser = useCallback(
    async (username, password) => {
      setLoading(true);
      setError(null);
      try {
        const data = await authService.loginUser(username, password);
        setAuth(data.user, data.token);
        navigate('/');
        return data;
      } catch (err) {
        const message =
          err.response?.data?.message || 'Login failed. Please try again.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, navigate]
  );

  /**
   * Register Admin.
   */
  const registerAdmin = useCallback(
    async (userData) => {
      setLoading(true);
      setError(null);
      try {
        const data = await authService.registerAdmin(userData);
        setAuth(data.user, data.token);
        navigate('/admin');
        return data;
      } catch (err) {
        const message =
          err.response?.data?.message || 'Registration failed. Please try again.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, navigate]
  );

  /**
   * Register User.
   */
  const registerUser = useCallback(
    async (userData) => {
      setLoading(true);
      setError(null);
      try {
        const data = await authService.registerUser(userData);
        setAuth(data.user, data.token);
        navigate('/');
        return data;
      } catch (err) {
        const message =
          err.response?.data?.message || 'Registration failed. Please try again.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, navigate]
  );

  /**
   * Logout and redirect to login page.
   */
  const logout = useCallback(() => {
    storeLogout();
    navigate('/login');
  }, [storeLogout, navigate]);

  /**
   * Refresh current user data from the server.
   */
  const refreshUser = useCallback(async () => {
    try {
      const data = await authService.getMe();
      updateUser(data.user || data);
    } catch {
      // Silently fail - interceptor handles 401
    }
  }, [updateUser]);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    loginAdmin,
    loginUser,
    registerAdmin,
    registerUser,
    logout,
    refreshUser,
    clearError: () => setError(null),
  };
}

export default useAuth;
