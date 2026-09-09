import { create } from 'zustand';

const TOKEN_KEY = 'Clinformatiq_token';
const USER_KEY = 'Clinformatiq_user';

const getInitialAuthState = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token') || localStorage.getItem('clinformatiq_token');
      const userStr = localStorage.getItem(USER_KEY) || localStorage.getItem('user') || localStorage.getItem('clinformatiq_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        return { user, token, isAuthenticated: true };
      }
    }
  } catch (e) {
    console.error('Failed to parse auth from localStorage:', e);
  }
  return { user: null, token: null, isAuthenticated: false };
};

const initialAuth = getInitialAuthState();

const useAuthStore = create((set) => ({
  user: initialAuth.user,
  token: initialAuth.token,
  isAuthenticated: initialAuth.isAuthenticated,

  /**
   * Set authenticated user and token. Persists to localStorage.
   */
  setAuth: (user, token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (_) {}
    set({ user, token, isAuthenticated: true });
  },

  /**
   * Clear auth state and remove persisted data.
   */
  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('clinformatiq_token');
      localStorage.removeItem('clinformatiq_user');
    } catch (_) {}
    set({ user: null, token: null, isAuthenticated: false });
  },

  /**
   * Initialize auth state from localStorage on app startup.
   */
  initialize: () => {
    const auth = getInitialAuthState();
    set(auth);
  },

  /**
   * Update user profile data without changing token.
   */
  updateUser: (userData) => {
    set((state) => {
      const updatedUser = { ...state.user, ...userData };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      } catch (_) {}
      return { user: updatedUser };
    });
  },
}));

export default useAuthStore;
