import { useState, useEffect, useCallback } from 'react';
import * as caseService from '@/services/caseService';
import useUIStore from '@/store/uiStore';

/**
 * Hook for fetching and managing the cases list with CRUD operations.
 * @param {Object} [initialFilters] - Optional initial filters
 */
export function useCases(initialFilters = {}) {
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const addNotification = useUIStore((state) => state.addNotification);

  /**
   * Fetch cases with current filters.
   */
  const fetchCases = useCallback(async (overrideFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await caseService.getCases(overrideFilters || filters);
      const caseList = response.data || response.cases || response;
      const validCases = Array.isArray(caseList) ? caseList : [];
      setCases(validCases);
      setTotal(response.total || validCases.length);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch cases';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Create a new case and return it.
   */
  const createCase = useCallback(async (data) => {
    try {
      const newCase = await caseService.createCase(data);
      addNotification({ type: 'success', message: 'New case created' });
      return newCase;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create case';
      addNotification({ type: 'error', message });
      throw err;
    }
  }, [addNotification]);

  /**
   * Delete a case by ID and refresh the list.
   */
  const deleteCase = useCallback(
    async (id) => {
      try {
        await caseService.deleteCase(id);
        addNotification({ type: 'success', message: 'Case deleted' });
        await fetchCases();
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to delete case';
        addNotification({ type: 'error', message });
        throw err;
      }
    },
    [addNotification, fetchCases]
  );

  /**
   * Submit a case for review.
   */
  const submitCase = useCallback(
    async (id) => {
      try {
        const updated = await caseService.submitCase(id);
        addNotification({ type: 'success', message: 'Case submitted for review' });
        await fetchCases();
        return updated;
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to submit case';
        addNotification({ type: 'error', message });
        throw err;
      }
    },
    [addNotification, fetchCases]
  );

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return {
    cases,
    total,
    loading,
    error,
    filters,
    setFilters,
    fetchCases,
    createCase,
    deleteCase,
    submitCase,
    refresh: fetchCases,
  };
}

export default useCases;
