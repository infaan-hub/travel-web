const BACKEND_BASE = 'http://localhost:8000';

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
  '<rect fill="#1a1a2e" width="400" height="300"/>' +
  '</svg>'
);

export function getImageUrl(url) {
  if (!url) return PLACEHOLDER;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/media/')) return `${BACKEND_BASE}${url}`;
  return `${BACKEND_BASE}/media/${url}`;
}