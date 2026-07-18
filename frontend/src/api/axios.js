import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
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
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          const res = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh });
          localStorage.setItem('access_token', res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  register: (data) => api.post('/register/', data),
  adminRegister: (data) => api.post('/admin/register/', data),
  login: (data) => api.post('/token/', data),
  getUser: () => api.get('/user/'),
  updateUser: (data) => api.patch('/user/', data),
};

const formDataConfig = (data) => {
  if (data instanceof FormData) {
    return { headers: { 'Content-Type': undefined } };
  }
};

export const toursAPI = {
  getAll: (params) => api.get('/tours/', { params }),
  getById: (id) => api.get(`/tours/${id}/`),
  create: (data) => api.post('/tours/', data, formDataConfig(data)),
  update: (id, data) => api.patch(`/tours/${id}/`, data, formDataConfig(data)),
  delete: (id) => api.delete(`/tours/${id}/`),
  getGallery: (tourId) => api.get(`/tours/${tourId}/gallery/`),
  addGalleryImage: (tourId, data) => api.post(`/tours/${tourId}/gallery/`, data, formDataConfig(data)),
  deleteGalleryImage: (tourId, imageId) => api.delete(`/tours/${tourId}/gallery/${imageId}/`),
  reorderGallery: (tourId, order) => api.put(`/tours/${tourId}/gallery/reorder/`, { order }),
};

export const tripsAPI = {
  getAll: (params) => api.get('/tips/', { params }),
  getById: (id) => api.get(`/tips/${id}/`),
  create: (data) => api.post('/tips/', data, formDataConfig(data)),
  update: (id, data) => api.patch(`/tips/${id}/`, data, formDataConfig(data)),
  delete: (id) => api.delete(`/tips/${id}/`),
};

export const attractionsAPI = {
  getAll: (params) => api.get('/attractions/', { params }),
  getById: (id) => api.get(`/attractions/${id}/`),
  create: (data) => api.post('/attractions/', data, formDataConfig(data)),
  update: (id, data) => api.patch(`/attractions/${id}/`, data, formDataConfig(data)),
  delete: (id) => api.delete(`/attractions/${id}/`),
};

export const bookingsAPI = {
  getAll: () => api.get('/bookings/'),
  create: (data) => api.post('/bookings/', data),
  getById: (id) => api.get(`/bookings/${id}/`),
  cancel: (id) => api.patch(`/bookings/${id}/`, { status: 'cancelled' }),
};

export const contactAPI = {
  send: (data) => api.post('/contact/', data),
  getAll: (params) => api.get('/messages/', { params }),
  getById: (id) => api.get(`/messages/${id}/`),
  update: (id, data) => api.patch(`/messages/${id}/`, data),
  delete: (id) => api.delete(`/messages/${id}/`),
};

export const profileAPI = {
  get: () => api.get('/profile/'),
  update: (data) => api.patch('/profile/', data, formDataConfig(data)),
  removeImage: () => api.delete('/profile/'),
  updateImage: (formData) => api.patch('/profile/', formData, formDataConfig(formData)),
};

export const reviewsAPI = {
  getAll: (params) => api.get('/reviews/', { params }),
  getStats: () => api.get('/reviews/stats/'),
  create: (data) => api.post('/reviews/', data),
  update: (id, data) => api.patch(`/reviews/${id}/`, data),
  delete: (id) => api.delete(`/reviews/${id}/`),
  approve: (id, data) => api.patch(`/reviews/${id}/approve/`, data),
  getTourReviews: (tourId) => api.get(`/tours/${tourId}/reviews/`),
  createTourReview: (tourId, data) => api.post(`/tours/${tourId}/reviews/create/`, data),
  updateOwn: (id, data) => api.patch(`/reviews/${id}/user/`, data),
  deleteOwn: (id) => api.delete(`/reviews/${id}/user/`),
};

export const homeSettingsAPI = {
  get: () => api.get('/home-settings/'),
  update: (data) => api.patch('/home-settings/admin/', data, formDataConfig(data)),
};

export const adminAPI = {
  getStats: () => api.get('/dashboard/stats/'),
  getAnalytics: () => api.get('/analytics/'),
  getAllBookings: (params) => api.get('/all-bookings/', { params }),
  getAllUsers: () => api.get('/users/'),
  getUser: (id) => api.get(`/users/${id}/`),
  updateUser: (id, data) => api.put(`/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/users/${id}/`),
  updateBookingStatus: (id, status) => api.patch(`/bookings/${id}/`, { status }),
  deleteBooking: (id) => api.delete(`/bookings/${id}/`),
};

export const customerAPI = {
  getDashboard: () => api.get('/dashboard/'),
};

export const geocodeAPI = {
  search: (location) => api.get('/geocode/', { params: { location } }),
};

export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics/'),
  trackVisit: (data) => api.post('/track-visit/', data),
};

export const routeAPI = {
  calculate: (data) => api.post('/route/calculate/', data),
};
