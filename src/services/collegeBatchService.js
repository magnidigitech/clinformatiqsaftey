import api from '@/services/api';

/**
 * Fetch all Colleges and In-House organisations with batches & user counts
 */
export async function getColleges() {
  const response = await api.get('/colleges');
  return response.data.data;
}

/**
 * Create a new College or In-House unit
 */
export async function createCollege(data) {
  const response = await api.post('/colleges', data);
  return response.data.data;
}

/**
 * Update an existing College or In-House unit
 */
export async function updateCollege(id, data) {
  const response = await api.put(`/colleges/${id}`, data);
  return response.data.data;
}

/**
 * Delete a College
 */
export async function deleteCollege(id) {
  const response = await api.delete(`/colleges/${id}`);
  return response.data;
}

/**
 * Fetch all batches, optionally filtered by org_id
 */
export async function getBatches(orgId = null) {
  const params = orgId ? { org_id: orgId } : {};
  const response = await api.get('/batches', { params });
  return response.data.data;
}

/**
 * Create a new Batch
 */
export async function createBatch(data) {
  const response = await api.post('/batches', data);
  return response.data.data;
}

/**
 * Update a Batch
 */
export async function updateBatch(id, data) {
  const response = await api.put(`/batches/${id}`, data);
  return response.data.data;
}

/**
 * Delete a Batch
 */
export async function deleteBatch(id) {
  const response = await api.delete(`/batches/${id}`);
  return response.data;
}

/**
 * Bulk assign students to a specific batch
 */
export async function assignStudentsToBatch(batchId, userIds) {
  const response = await api.post(`/batches/${batchId}/assign`, { user_ids: userIds });
  return response.data;
}

/**
 * Bulk revoke students from a batch
 */
export async function revokeStudentsFromBatch(batchId, userIds = []) {
  const response = await api.post(`/batches/${batchId}/revoke`, { user_ids: userIds });
  return response.data;
}

/**
 * Bulk assign selected users to a College and Batch
 */
export async function bulkAssignUsersBatch(userIds, orgId, batchId) {
  const response = await api.post('/users/bulk-assign-batch', {
    user_ids: userIds,
    org_id: orgId,
    batch_id: batchId
  });
  return response.data;
}

/**
 * Bulk revoke batch from selected users
 */
export async function bulkRevokeUsersBatch(userIds) {
  const response = await api.post('/users/bulk-revoke-batch', { user_ids: userIds });
  return response.data;
}
