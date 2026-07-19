import { Platform } from 'react-native';

const API_BASE = 'http://10.0.2.2:8000';

export function getImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/media/')) return `${API_BASE}${url}`;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
}
