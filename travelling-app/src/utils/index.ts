import { Platform } from 'react-native';

export function formatPrice(price: number, currency = '$'): string {
  return `${currency}${price.toLocaleString()}`;
}

export function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getPlatform() {
  return {
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    isWeb: Platform.OS === 'web',
  };
}

export const MOCK_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200',
  zanzibar: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800',
  serengeti: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800',
  kilimanjaro: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800',
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  safari: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  culture: 'https://images.unsplash.com/photo-1536867325871-9a6b6d9f5c7b?w=800',
  mountains: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
  sunset: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  avatar2: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  avatar3: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
  destination1: 'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=800',
  destination2: 'https://images.unsplash.com/photo-1506462945848-239d1fabb99a?w=800',
  destination3: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
  destination4: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800',
  destination5: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800',
  destination6: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800',
  promo: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
};
