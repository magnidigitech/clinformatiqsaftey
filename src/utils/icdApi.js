import api from '../services/api';

export async function searchIcd(query) {
  if (!query || query.trim() === '') return [];
  
  try {
    const res = await api.get(`/icd/search?q=${encodeURIComponent(query)}`);
    return res.data || [];
  } catch (err) {
    console.error('ICD search failed', err);
    return [];
  }
}

// Helper to strip HTML tags from the title
export function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

export async function getEntityLineage(entityIdUrl) {
  if (!entityIdUrl) return { block: '', category: '' };
  
  try {
    const res = await api.get(`/icd/lineage?url=${encodeURIComponent(entityIdUrl)}`);
    return res.data || { block: '', category: '' };
  } catch (err) {
    console.error('Failed to get lineage', err);
    return { block: '', category: '' };
  }
}
