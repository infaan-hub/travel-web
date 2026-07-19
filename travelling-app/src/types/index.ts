export interface Destination {
  id: string;
  name: string;
  country: string;
  image: string;
  price: number;
  duration: string;
  rating: number;
  reviews: number;
  category: string;
  description: string;
  isFavorite?: boolean;
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  duration: string;
  destination: string;
  category: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  includes: string[];
  excludes: string[];
  isFavorite?: boolean;
}

export interface Booking {
  id: string;
  tourId: string;
  tourTitle: string;
  tourImage: string;
  fullName: string;
  email: string;
  phone: string;
  destination: string;
  travelDate: string;
  adults: number;
  children: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  country: string;
}

export interface Review {
  id: string;
  userName: string;
  avatar: string;
  rating: number;
  content: string;
  date: string;
}

export interface TravelTip {
  id: string;
  title: string;
  content: string;
  category: string;
  image: string;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  count: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'promo' | 'tip' | 'system';
  read: boolean;
  createdAt: string;
}
