import axios from "axios";
import { toast } from "react-toastify";
import { KeyUri } from "../shared/key";

const axiosInstance = axios.create({
  baseURL: KeyUri.BACKENDURI,
  headers: {
    'Accept': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];
let _store = null;
let _isLoggingOut = false;

const clearAuthHeaders = () => {
  delete axiosInstance.defaults.headers.common.Authorization;
  delete axios.defaults.headers.common.Authorization;
};

export const injectStore = (store) => {
  _store = store;
};

export const toastError = (error) => {
  if (_isLoggingOut || error?._isAuthError) return;
  const msg =
    error?.response?.data?.message ||
    (error?.response?.statusText ? `Failed: ${error.response.statusText}` : null) ||
    error?.message ||
    'Something went wrong';
  toast.error(msg);
};

export const forceLogout = () => {
  if (_isLoggingOut) return;
  _isLoggingOut = true;
  isRefreshing = false;
  failedQueue = [];
  clearAuthHeaders();
  localStorage.clear();
  if (_store) {
    const { clearAuth } = require("../ReduxApi/auth");
    _store.dispatch(clearAuth());
  }
  toast.info("Session expired. Please log in again.");
  setTimeout(() => {
    _isLoggingOut = false;
    window.location.replace("/");
  }, 1500);
};

// Proactively check token expiry by decoding JWT exp claim
export const getTokenExpiryMs = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const expiryMs = getTokenExpiryMs(token);
  return !expiryMs || expiryMs <= Date.now();
};

// Check on tab focus — catches the case where user leaves and comes back
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) {
        forceLogout();
      }
    }
  });
}

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    // Proactive check before every request
    if (token && isTokenExpired(token)) {
      forceLogout();
      return Promise.reject(new Error('Token expired'));
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      config.transformRequest = [];
    } else {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        forceLogout();
        error._isAuthError = true;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${KeyUri.BACKENDURI}/auth/refresh`, {
          refresh_token: refreshToken
        });

        localStorage.setItem("token", data.token);
        localStorage.setItem("refreshToken", data.refresh_token);

        axiosInstance.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        originalRequest.headers.Authorization = `Bearer ${data.token}`;

        processQueue(null, data.token);
        isRefreshing = false;

        return axiosInstance(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        forceLogout();
        err._isAuthError = true;
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
