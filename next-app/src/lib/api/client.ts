"use client";

import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Surface field-level validation errors so forms can render them inline.
    if (error.response?.data?.errors && typeof error.response.data.errors === "object") {
      error.fieldErrors = error.response.data.errors;
    }
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/token/refresh/") &&
      !originalRequest.url?.includes("/token/") &&
      !originalRequest.url?.includes("/user/")
    ) {
      originalRequest._retry = true;
      try {
        await axios.post("/api/token/refresh/", {}, { withCredentials: true });
        return api(originalRequest);
      } catch {
        // The page handles the unauthenticated state.
      }
    }
    return Promise.reject(error);
  },
);

export default api;

const formDataConfig = (data: unknown) =>
  data instanceof FormData ? { headers: { "Content-Type": undefined } } : undefined;

type Params = Record<string, unknown>;

export const authAPI = {
  register: (data: Record<string, unknown>) => api.post("/register/", data),
  adminRegister: (data: Record<string, unknown>, setupToken?: string) =>
    api.post("/admin/register/", data, {
      headers: setupToken ? { "X-Admin-Setup-Token": setupToken } : undefined,
    }),
  login: (data: { username: string; password: string }) => api.post("/token/", data),
  logout: () => api.post("/auth/logout/"),
  getUser: () => api.get("/user/"),
  updateUser: (data: Record<string, unknown>) => api.patch("/user/", data),
  refresh: () => api.post("/token/refresh/", {}),
};

export const toursAPI = {
  getAll: (params?: Params) => api.get("/tours/", { params }),
  getById: (id: string | number) => api.get(`/tours/${id}/`),
  create: (data: FormData | Record<string, unknown>) =>
    api.post("/tours/", data, formDataConfig(data)),
  update: (id: string | number, data: FormData | Record<string, unknown>) =>
    api.patch(`/tours/${id}/`, data, formDataConfig(data)),
  delete: (id: string | number) => api.delete(`/tours/${id}/`),
  getGallery: (tourId: string | number) => api.get(`/tours/${tourId}/gallery/`),
  addGalleryImage: (tourId: string | number, data: FormData) =>
    api.post(`/tours/${tourId}/gallery/`, data, formDataConfig(data)),
  deleteGalleryImage: (tourId: string | number, imageId: string | number) =>
    api.delete(`/tours/${tourId}/gallery/${imageId}/`),
  reorderGallery: (tourId: string | number, order: unknown[]) =>
    api.put(`/tours/${tourId}/gallery/reorder/`, { order }),
};

export const tripsAPI = {
  getAll: (params?: Params) => api.get("/tips/", { params }),
  getById: (id: string | number) => api.get(`/tips/${id}/`),
  create: (data: FormData | Record<string, unknown>) =>
    api.post("/tips/", data, formDataConfig(data)),
  update: (id: string | number, data: FormData | Record<string, unknown>) =>
    api.patch(`/tips/${id}/`, data, formDataConfig(data)),
  delete: (id: string | number) => api.delete(`/tips/${id}/`),
};

export const attractionsAPI = {
  getAll: (params?: Params) => api.get("/attractions/", { params }),
  getById: (id: string | number) => api.get(`/attractions/${id}/`),
  create: (data: FormData | Record<string, unknown>) =>
    api.post("/attractions/", data, formDataConfig(data)),
  update: (id: string | number, data: FormData | Record<string, unknown>) =>
    api.patch(`/attractions/${id}/`, data, formDataConfig(data)),
  delete: (id: string | number) => api.delete(`/attractions/${id}/`),
};

export const bookingsAPI = {
  getAll: () => api.get("/bookings/"),
  create: (data: Record<string, unknown>) => api.post("/bookings/", data),
  getById: (id: string | number) => api.get(`/bookings/${id}/`),
  cancel: (id: string | number) => api.patch(`/bookings/${id}/`, { status: "cancelled" }),
};

export const contactAPI = {
  send: (data: Record<string, unknown>) => api.post("/contact/", data),
  getAll: (params?: Params) => api.get("/messages/", { params }),
  getById: (id: string | number) => api.get(`/messages/${id}/`),
  update: (id: string | number, data: Record<string, unknown>) =>
    api.patch(`/messages/${id}/`, data),
  delete: (id: string | number) => api.delete(`/messages/${id}/`),
};

export const profileAPI = {
  get: () => api.get("/profile/"),
  update: (data: FormData | Record<string, unknown>) =>
    api.patch("/profile/", data, formDataConfig(data)),
  removeImage: () => api.delete("/profile/"),
  updateImage: (formData: FormData) => api.patch("/profile/", formData, formDataConfig(formData)),
};

export const reviewsAPI = {
  getAll: (params?: Params) => api.get("/reviews/", { params }),
  getStats: () => api.get("/reviews/stats/"),
  create: (data: Record<string, unknown>) => api.post("/reviews/", data),
  update: (id: string | number, data: Record<string, unknown>) =>
    api.patch(`/reviews/${id}/`, data),
  delete: (id: string | number) => api.delete(`/reviews/${id}/`),
  approve: (id: string | number, data: Record<string, unknown>) =>
    api.patch(`/reviews/${id}/approve/`, data),
  getTourReviews: (tourId: string | number) => api.get(`/tours/${tourId}/reviews/`),
  createTourReview: (tourId: string | number, data: Record<string, unknown>) =>
    api.post(`/tours/${tourId}/reviews/create/`, data),
  updateOwn: (id: string | number, data: Record<string, unknown>) =>
    api.patch(`/reviews/${id}/user/`, data),
  deleteOwn: (id: string | number) => api.delete(`/reviews/${id}/user/`),
};

export const homeSettingsAPI = {
  get: () => api.get("/home-settings/"),
  update: (data: FormData | Record<string, unknown>) =>
    api.patch("/home-settings/admin/", data, formDataConfig(data)),
};

export const adminAPI = {
  getStats: () => api.get("/dashboard/stats/"),
  getAnalytics: () => api.get("/analytics/"),
  getAllBookings: (params?: Params) => api.get("/all-bookings/", { params }),
  getAllUsers: () => api.get("/users/"),
  getUser: (id: string | number) => api.get(`/users/${id}/`),
  updateUser: (id: string | number, data: Record<string, unknown>) =>
    api.put(`/users/${id}/`, data),
  deleteUser: (id: string | number) => api.delete(`/users/${id}/`),
  updateBookingStatus: (id: string | number, status: string) =>
    api.patch(`/bookings/${id}/`, { status }),
  deleteBooking: (id: string | number) => api.delete(`/bookings/${id}/`),
};

export const customerAPI = {
  getDashboard: () => api.get("/dashboard/"),
};

export const geocodeAPI = {
  search: (location: string) => api.get("/geocode/", { params: { location } }),
};

export const analyticsAPI = {
  getAnalytics: () => api.get("/analytics/"),
  trackVisit: (data: Record<string, unknown>) => api.post("/track-visit/", data),
};

export const routeAPI = {
  calculate: (data: Record<string, unknown>) => api.post("/route/calculate/", data),
};

export const travelDriversAPI = {
  getAll: () => api.get("/travel-drivers/"),
  getById: (id: string | number) => api.get(`/travel-drivers/${id}/`),
  create: (data: FormData | Record<string, unknown>) =>
    api.post("/travel-drivers/", data, formDataConfig(data)),
  update: (id: string | number, data: FormData | Record<string, unknown>) =>
    api.patch(`/travel-drivers/${id}/`, data, formDataConfig(data)),
  delete: (id: string | number) => api.delete(`/travel-drivers/${id}/`),
};

export const travelVehiclesAPI = {
  getAll: () => api.get("/travel-vehicles/"),
  getById: (id: string | number) => api.get(`/travel-vehicles/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/travel-vehicles/", data),
  update: (id: string | number, data: Record<string, unknown>) =>
    api.patch(`/travel-vehicles/${id}/`, data),
  delete: (id: string | number) => api.delete(`/travel-vehicles/${id}/`),
};

export const workspacesAPI = {
  getAll: (params?: Params) => api.get("/workspaces/", { params }),
  getById: (id: string | number) => api.get(`/workspaces/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/workspaces/", data),
  update: (id: string | number, data: Record<string, unknown>) =>
    api.patch(`/workspaces/${id}/`, data),
  delete: (id: string | number) => api.delete(`/workspaces/${id}/`),
  addTour: (workspaceId: string | number, data: Record<string, unknown>) =>
    api.post(`/workspaces/${workspaceId}/tours/`, data),
  removeTour: (workspaceId: string | number, tourId: string | number) =>
    api.delete(`/workspaces/${workspaceId}/tours/${tourId}/`),
  addTravel: (workspaceId: string | number, data: Record<string, unknown>) =>
    api.post(`/workspaces/${workspaceId}/travel/`, data),
  removeTravel: (workspaceId: string | number, travelId: string) =>
    api.delete(`/workspaces/${workspaceId}/travel/${travelId}/`),
  addHotel: (workspaceId: string | number, data: Record<string, unknown>) =>
    api.post(`/workspaces/${workspaceId}/hotels/`, data),
  removeHotel: (workspaceId: string | number, hotelId: string | number) =>
    api.delete(`/workspaces/${workspaceId}/hotels/${hotelId}/`),
  addRoom: (workspaceId: string | number, data: Record<string, unknown>) =>
    api.post(`/workspaces/${workspaceId}/rooms/`, data),
  removeRoom: (workspaceId: string | number, roomId: string | number) =>
    api.delete(`/workspaces/${workspaceId}/rooms/${roomId}/`),
  completeTask: (workspaceId: string | number, taskId: string | number) =>
    api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/`, { completed: true }),
  uncompleteTask: (workspaceId: string | number, taskId: string | number) =>
    api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/`, { completed: false }),
  submitPricing: (workspaceId: string | number, data: Record<string, unknown>) =>
    api.post(`/workspaces/${workspaceId}/pricing/`, data),
  approve: (workspaceId: string | number) =>
    api.patch(`/workspaces/${workspaceId}/`, { status: "approved" }),
};

export const roomsAPI = {
  getAll: (params?: Params) => api.get("/rooms/", { params }),
  getById: (id: string | number) => api.get(`/rooms/${id}/`),
  create: (data: Record<string, unknown>) => api.post("/rooms/", data),
  update: (id: string | number, data: Record<string, unknown>) =>
    api.patch(`/rooms/${id}/`, data),
  delete: (id: string | number) => api.delete(`/rooms/${id}/`),
};

export const hotelsAPI = {
  getAll: (params?: Params) => api.get("/hotels/", { params }),
  getById: (id: string | number) => api.get(`/hotels/${id}/`),
  create: (data: FormData | Record<string, unknown>) =>
    api.post("/hotels/", data, formDataConfig(data)),
  update: (id: string | number, data: FormData | Record<string, unknown>) =>
    api.patch(`/hotels/${id}/`, data, formDataConfig(data)),
  delete: (id: string | number) => api.delete(`/hotels/${id}/`),
};

export const workspaceTasksAPI = {
  getAll: (workspaceId: string | number) => api.get(`/workspaces/${workspaceId}/tasks/`),
  create: (workspaceId: string | number, data: Record<string, unknown>) =>
    api.post(`/workspaces/${workspaceId}/tasks/`, data),
  update: (workspaceId: string | number, taskId: string | number, data: Record<string, unknown>) =>
    api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/`, data),
  delete: (workspaceId: string | number, taskId: string | number) =>
    api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/`),
};
