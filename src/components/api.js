const API_BASE = import.meta.env.VITE_API_URL;

export const apiFetch = (endpoint, options = {}) => {
  return fetch(`${API_BASE}${endpoint}`, options);
};
export const getImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  // strip leading slash to avoid double // when concatenating with API_BASE
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${API_BASE}/${clean}`
}