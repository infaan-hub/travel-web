import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.get('/user/')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('is_staff', res.data.is_staff || false);
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/token/', { username, password });
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    const userRes = await api.get('/user/');
    setUser(userRes.data);
    localStorage.setItem('is_staff', userRes.data.is_staff || false);
    return userRes.data;
  };

  const register = async (username, email, password) => {
    const res = await api.post('/register/', { username, email, password });
    return res.data;
  };

  const adminRegister = async (username, email, password) => {
    const res = await api.post('/admin/register/', { username, email, password });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('is_staff');
    setUser(null);
  };

  const isAdmin = user?.is_staff || localStorage.getItem('is_staff') === 'true';

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, adminRegister, logout,
      isAuthenticated: !!user,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
