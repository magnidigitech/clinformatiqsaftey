import api from '@/services/api';

/**
 * Get the workflow state for a case.
 * @param {string} caseId
 * @returns {Promise<Object>}
 */
export async function getWorkflow(caseId) {
  const response = await api.get(`/cases/${caseId}/workflow`);
  return response.data;
}

/**
 * Advance the workflow for a case (e.g., submit, approve, request revision).
 * @param {string} caseId
 * @param {Object} data - { action, comment? }
 * @returns {Promise<Object>}
 */
export async function advanceWorkflow(caseId, data) {
  const response = await api.post(`/cases/${caseId}/workflow`, data);
  return response.data;
}
