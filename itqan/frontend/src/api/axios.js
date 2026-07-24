import axios from 'axios';

// هذا هو الرابط الأساسي الذي ستستخدمه جميع أجزاء التطبيق للاتصال بالباك إند
export const API_BASE_URL = "https://itqan-a1a1-production.up.railway.app/api";

const instance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة الـ Token تلقائياً لكل الطلبات
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
