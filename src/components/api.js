const API_BASE = import.meta.env.VITE_API_URL;

export const apiFetch = (endpoint, options = {}) => {
  return fetch(`${API_BASE}${endpoint}`, options);
};
export const getImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_BASE}/${path}`
}