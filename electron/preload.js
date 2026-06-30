// ─── PharmaVigil – Electron Preload Script ───────────────────────────────────
// Runs in a sandboxed context before the renderer page loads.  Exposes a
// minimal, whitelisted API surface via contextBridge so the React app can
// communicate with the main process without enabling nodeIntegration.
// ──────────────────────────────────────────────────────────────────────────────

const { contextBridge, ipcRenderer } = require('electron')

// ─── Channel Whitelists ──────────────────────────────────────────────────────
const SEND_CHANNELS = [
  'save-data',
  'open-file',
]

const INVOKE_CHANNELS = [
  'get-data',
  'dialog:open',
  'app-info',
]

const RECEIVE_CHANNELS = [
  'save-data',
  'open-file',
  'get-data',
  'app-info',
]

// ─── Exposed API ─────────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Fire-and-forget message to the main process.
   * @param {string} channel - One of the whitelisted SEND channels
   * @param {*} data - Serialisable payload
   */
  send (channel, data) {
    if (SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data)
    } else {
      console.warn(`[preload] Blocked send on non-whitelisted channel: ${channel}`)
    }
  },

  /**
   * Request/response style call to the main process.
   * @param {string} channel - One of the whitelisted INVOKE channels
   * @param {*} data - Serialisable payload
   * @returns {Promise<*>}
   */
  invoke (channel, data) {
    if (INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
    console.warn(`[preload] Blocked invoke on non-whitelisted channel: ${channel}`)
    return Promise.reject(new Error(`Channel "${channel}" is not allowed`))
  },

  /**
   * Subscribe to messages from the main process.
   * Returns an unsubscribe function for easy cleanup in React useEffect hooks.
   * @param {string} channel - One of the whitelisted RECEIVE channels
   * @param {Function} callback - (event, ...args) => void
   * @returns {() => void} Unsubscribe function
   */
  on (channel, callback) {
    if (RECEIVE_CHANNELS.includes(channel)) {
      // Wrap to strip the raw IPC event for security
      const handler = (_event, ...args) => callback(...args)
      ipcRenderer.on(channel, handler)

      // Return a cleanup function
      return () => {
        ipcRenderer.removeListener(channel, handler)
      }
    }
    console.warn(`[preload] Blocked on-listener for non-whitelisted channel: ${channel}`)
    return () => {} // noop cleanup
  },
})
