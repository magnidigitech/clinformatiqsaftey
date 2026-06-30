import api from '@/services/api';

/**
 * Search MedDRA terms by query string.
 * @param {string} query - Search query
 * @param {number} [limit=20] - Max results to return
 * @returns {Promise<Array>}
 */
export async function searchTerms(query, limit = 20) {
  const response = await api.get('/meddra/search', {
    params: { q: query, limit },
  });
  return response.data;
}

/**
 * Get a Preferred Term by code.
 * @param {string} code - MedDRA PT code
 * @returns {Promise<Object>}
 */
export async function getPT(code) {
  const response = await api.get(`/meddra/pt/${code}`);
  return response.data;
}

/**
 * Get all System Organ Classes.
 * @returns {Promise<Array>}
 */
export async function getSOCs() {
  const response = await api.get('/meddra/socs');
  return response.data;
}
