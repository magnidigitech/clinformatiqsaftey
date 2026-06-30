import api from '@/services/api';

/**
 * Get a list of cases with optional filters.
 * @param {Object} [filters] - { status, search, page, limit }
 * @returns {Promise<{ cases: Array, total: number, page: number, limit: number }>}
 */
export async function getCases(filters = {}) {
  const response = await api.get('/cases', { params: filters });
  return response.data;
}

/**
 * Get a single case by ID.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getCase(id) {
  const response = await api.get(`/cases/${id}`);
  return response.data;
}

/**
 * Create a new empty case.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createCase(data) {
  const response = await api.post('/cases', data);
  return response.data;
}

/**
 * Update a case by ID.
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateCase(id, data) {
  const response = await api.put(`/cases/${id}`, data);
  return response.data;
}

/**
 * Delete a case by ID.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteCase(id) {
  const response = await api.delete(`/cases/${id}`);
  return response.data;
}

/**
 * Submit a case for review.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function submitCase(id) {
  const response = await api.post(`/cases/${id}/submit`);
  return response.data;
}

/**
 * Lock a case for editing.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function lockCase(id) {
  const response = await api.post(`/cases/${id}/lock`);
  return response.data;
}

/**
 * Unlock a case.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function unlockCase(id) {
  const response = await api.post(`/cases/${id}/unlock`);
  return response.data;
}

/**
 * Get the revision history (audit logs) for a case.
 * @param {string} id
 * @returns {Promise<{ success: boolean, data: Array }>}
 */
export async function getCaseRevisions(id) {
  const response = await api.get(`/cases/${id}/revisions`);
  return response.data;
}
