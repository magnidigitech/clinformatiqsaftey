import { create } from 'zustand';

const TOKEN_KEY = 'Clinformatiq_token';
const USER_KEY = 'Clinformatiq_user';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  /**
   * Set authenticated user and token. Persists to localStorage.
   */
  setAuth: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  /**
   * Clear auth state and remove persisted data.
   */
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  /**
   * Initialize auth state from localStorage on app startup.
   */
  initialize: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  /**
   * Update user profile data without changing token.
   */
  updateUser: (userData) => {
    set((state) => {
      const updatedUser = { ...state.user, ...userData };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));

useAuthStore.getState().initialize();

export default useAuthStore;
