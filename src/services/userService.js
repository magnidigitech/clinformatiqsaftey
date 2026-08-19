import api from '@/services/api';

/**
 * Fetch all users
 */
export async function getUsers() {
  const response = await api.get('/users');
  return response.data.data;
}

/**
 * Create a new user
 */
export async function createUser(userData) {
  const response = await api.post('/users', userData);
  return response.data.data;
}

/**
 * Bulk create users from array
 */
export async function bulkCreateUsers(users) {
  const response = await api.post('/users/bulk', { users });
  return response.data;
}

/**
 * Update user details/role/status
 */
export async function updateUser(userId, data) {
  const response = await api.put(`/users/${userId}`, data);
  return response.data.data;
}

/**
 * Remove / Delete a user
 */
export async function deleteUser(userId) {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
}

/**
 * Bulk delete multiple users
 */
export async function bulkDeleteUsers(userIds) {
  const response = await api.post('/users/bulk-delete', { user_ids: userIds });
  return response.data;
}

/**
 * Fetch all active login sessions
 */
export async function getActiveSessions() {
  const response = await api.get('/users/sessions');
  return response.data.data;
}

/**
 * Revoke a single session
 */
export async function revokeSession(sessionId) {
  const response = await api.delete(`/users/sessions/${sessionId}`);
  return response.data;
}

/**
 * Bulk revoke multiple sessions at once
 */
export async function bulkRevokeSessions(sessionIds) {
  const response = await api.post('/users/sessions/bulk-revoke', { session_ids: sessionIds });
  return response.data;
}

/**
 * Revoke all active sessions for a specific user
 */
export async function revokeUserSessions(userId) {
  const response = await api.delete(`/users/sessions/user/${userId}`);
  return response.data;
}
