import api from '@/services/api';

/**
 * Login admin.
 */
export async function loginAdmin(username, password) {
  const response = await api.post('/auth/login-admin', { username, password });
  return response.data.data;
}

/**
 * Login user.
 */
export async function loginUser(username, password) {
  const response = await api.post('/auth/login-user', { username, password });
  return response.data.data;
}

/**
 * Register admin.
 */
export async function registerAdmin(data) {
  const response = await api.post('/auth/register-admin', data);
  return response.data.data;
}

/**
 * Register user.
 */
export async function registerUser(data) {
  const response = await api.post('/auth/register-user', data);
  return response.data.data;
}

/**
 * Get all organisations.
 */
export async function getOrganisations() {
  const response = await api.get('/auth/organisations');
  return response.data.data;
}

/**
 * Get the currently authenticated user's profile.
 * @returns {Promise<Object>}
 */
export async function getMe() {
  const response = await api.get('/auth/me');
  return response.data.data;
}
