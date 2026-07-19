const BASE_URL = 'http://10.0.2.2:8000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const api = {
  tours: {
    getAll: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/tours${qs}`);
    },
    getById: (id: number) => request<any>(`/tours/${id}/`),
  },
  bookings: {
    create: (data: any) =>
      request<any>('/bookings/', { method: 'POST', body: JSON.stringify(data) }),
    getByUser: (userId: number) => request<any[]>(`/bookings/?user=${userId}`),
  },
  reviews: {
    getAll: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/reviews${qs}`);
    },
  },
  attractions: {
    getAll: () => request<any[]>('/attractions/'),
  },
  homeSettings: {
    get: () => request<any>('/home-settings/'),
  },
};
