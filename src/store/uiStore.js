import { create } from 'zustand';

const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  activeModal: null,
  notifications: [],

  /**
   * Toggle the sidebar collapsed state.
   */
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  /**
   * Set sidebar collapsed state explicitly.
   */
  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  /**
   * Open a modal by name/type with optional data.
   */
  openModal: (modalName, data = null) =>
    set({ activeModal: { name: modalName, data } }),

  /**
   * Close the active modal.
   */
  closeModal: () =>
    set({ activeModal: null }),

  /**
   * Add a notification to the stack.
   * @param {{ type: 'success'|'error'|'warning'|'info', message: string, title?: string }} notification
   */
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: Date.now() + Math.random(),
          timestamp: Date.now(),
          ...notification,
        },
      ],
    })),

  /**
   * Remove a notification by ID.
   */
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  /**
   * Clear all notifications.
   */
  clearNotifications: () =>
    set({ notifications: [] }),
}));

export default useUIStore;
