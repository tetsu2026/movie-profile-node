import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 401レスポンス時にリフレッシュトークンで自動リトライ
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 認証不要の公開ページではログインへリダイレクトしない
    const isPublicPage = window.location.pathname === '/'
      || window.location.pathname.startsWith('/users/')
      || window.location.pathname === '/login'
      || window.location.pathname === '/register';

    // リフレッシュエンドポイント自体が失敗した場合はリダイレクト
    if (error.response?.status === 401 && originalRequest.url === '/auth/refresh') {
      if (!isPublicPage) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // 401かつリトライ未実施の場合
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 公開ページでは自動リフレッシュを試行しない
      if (isPublicPage) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
