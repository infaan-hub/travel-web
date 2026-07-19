import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = await AsyncStorage.getItem('refresh_token');
        if (refresh) {
          const res = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh });
          await AsyncStorage.setItem('access_token', res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        }
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'is_staff']);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

const formDataConfig = (data: any) => {
  if (data instanceof FormData) {
    return { headers: { 'Content-Type': 'multipart/form-data' } };
  }
  return {};
};

export const authAPI = {
  register: (data: any) => api.post('/register/', data),
  adminRegister: (data: any) => api.post('/admin/register/', data),
  login: (data: any) => api.post('/token/', data),
  getUser: () => api.get('/user/'),
  updateUser: (data: any) => api.patch('/user/', data),
};

export const toursAPI = {
  getAll: (params?: any) => api.get('/tours/', { params }),
  getById: (id: number) => api.get(`/tours/${id}/`),
  create: (data: any) => api.post('/tours/', data, formDataConfig(data)),
  update: (id: number, data: any) => api.patch(`/tours/${id}/`, data, formDataConfig(data)),
  delete: (id: number) => api.delete(`/tours/${id}/`),
  getGallery: (tourId: number) => api.get(`/tours/${tourId}/gallery/`),
  addGalleryImage: (tourId: number, data: any) => api.post(`/tours/${tourId}/gallery/`, data, formDataConfig(data)),
  deleteGalleryImage: (tourId: number, imageId: number) => api.delete(`/tours/${tourId}/gallery/${imageId}/`),
  reorderGallery: (tourId: number, order: any) => api.put(`/tours/${tourId}/gallery/reorder/`, { order }),
};

export const tripsAPI = {
  getAll: (params?: any) => api.get('/tips/', { params }),
  getById: (id: number) => api.get(`/tips/${id}/`),
  create: (data: any) => api.post('/tips/', data, formDataConfig(data)),
  update: (id: number, data: any) => api.patch(`/tips/${id}/`, data, formDataConfig(data)),
  delete: (id: number) => api.delete(`/tips/${id}/`),
};

export const attractionsAPI = {
  getAll: (params?: any) => api.get('/attractions/', { params }),
  getById: (id: number) => api.get(`/attractions/${id}/`),
  create: (data: any) => api.post('/attractions/', data, formDataConfig(data)),
  update: (id: number, data: any) => api.patch(`/attractions/${id}/`, data, formDataConfig(data)),
  delete: (id: number) => api.delete(`/attractions/${id}/`),
};

export const bookingsAPI = {
  getAll: () => api.get('/bookings/'),
  create: (data: any) => api.post('/bookings/', data),
  getById: (id: number) => api.get(`/bookings/${id}/`),
  cancel: (id: number) => api.patch(`/bookings/${id}/`, { status: 'cancelled' }),
};

export const contactAPI = {
  send: (data: any) => api.post('/contact/', data),
  getAll: (params?: any) => api.get('/messages/', { params }),
  getById: (id: number) => api.get(`/messages/${id}/`),
  update: (id: number, data: any) => api.patch(`/messages/${id}/`, data),
  delete: (id: number) => api.delete(`/messages/${id}/`),
};

export const profileAPI = {
  get: () => api.get('/profile/'),
  update: (data: any) => api.patch('/profile/', data, formDataConfig(data)),
  removeImage: () => api.delete('/profile/'),
};

export const reviewsAPI = {
  getAll: (params?: any) => api.get('/reviews/', { params }),
  getStats: () => api.get('/reviews/stats/'),
  create: (data: any) => api.post('/reviews/', data),
  update: (id: number, data: any) => api.patch(`/reviews/${id}/`, data),
  delete: (id: number) => api.delete(`/reviews/${id}/`),
  approve: (id: number, data: any) => api.patch(`/reviews/${id}/approve/`, data),
  getTourReviews: (tourId: number) => api.get(`/tours/${tourId}/reviews/`),
  createTourReview: (tourId: number, data: any) => api.post(`/tours/${tourId}/reviews/create/`, data),
  updateOwn: (id: number, data: any) => api.patch(`/reviews/${id}/user/`, data),
  deleteOwn: (id: number) => api.delete(`/reviews/${id}/user/`),
};

export const homeSettingsAPI = {
  get: () => api.get('/home-settings/'),
  update: (data: any) => api.patch('/home-settings/admin/', data, formDataConfig(data)),
};

export const adminAPI = {
  getStats: () => api.get('/dashboard/stats/'),
  getAnalytics: () => api.get('/analytics/'),
  getAllBookings: (params?: any) => api.get('/all-bookings/', { params }),
  getAllUsers: () => api.get('/users/'),
  getUser: (id: number) => api.get(`/users/${id}/`),
  updateUser: (id: number, data: any) => api.put(`/users/${id}/`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}/`),
  updateBookingStatus: (id: number, status: string) => api.patch(`/bookings/${id}/`, { status }),
  deleteBooking: (id: number) => api.delete(`/bookings/${id}/`),
};

export const customerAPI = {
  getDashboard: () => api.get('/dashboard/'),
};

export const geocodeAPI = {
  search: (location: string) => api.get('/geocode/', { params: { location } }),
};

export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics/'),
  trackVisit: (data: any) => api.post('/track-visit/', data),
};

export const routeAPI = {
  calculate: (data: any) => api.post('/route/calculate/', data),
};
