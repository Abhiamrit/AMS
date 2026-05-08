import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Redirect to login if unauthorized (except for /auth/me)
      if (!err.config.url.includes('/auth/me')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
