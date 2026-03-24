// path: src/helpers/api_helper.jsx
import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./coe_token_storage";
import { REFRESH } from "./url_helper";
import { notifyError } from "./notify";

const API_URL = import.meta.env.VITE_APP_API_URL;

const axiosApi = axios.create({
  baseURL: API_URL,
});

let isRefreshing = false;
let refreshQueue = [];

const enqueue = (cb) => refreshQueue.push(cb);

const flushQueue = (err, newToken) => {
  refreshQueue.forEach((cb) => cb(err, newToken));
  refreshQueue = [];
};

// Request interceptor: attach Authorization if access token exists
axiosApi.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor: on 401, refresh once and retry original request
axiosApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;

    if (!error?.response || !original) {
      return Promise.reject(error);
    }

    const url = original.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout");

    // Never refresh on auth endpoints
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !original._retry) {
      original._retry = true;

      const rt = getRefreshToken();

      if (!rt) {
        clearTokens();
        notifyError("Session expired. Please login again.");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // If refresh already running, wait then retry
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          enqueue((err, newAccessToken) => {
            if (err || !newAccessToken) {
              return reject(err || error);
            }

            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${newAccessToken}`;
            resolve(axiosApi(original));
          });
        });
      }

      isRefreshing = true;

      try {
        // Use raw axios to avoid interceptor recursion
        const res = await axios.post(`${API_URL}${REFRESH}`, {
          refreshToken: rt,
        });

        // IMPORTANT: refresh token is rotated; replace BOTH
        setTokens({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        });

        isRefreshing = false;
        flushQueue(null, res.data.accessToken);

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${res.data.accessToken}`;

        return axiosApi(original);
      } catch (refreshErr) {
        isRefreshing = false;
        flushQueue(refreshErr, null);

        clearTokens();
        notifyError("Session expired. Please login again.");
        window.location.href = "/login";

        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

const normalizeRequestData = (data) => {
  if (data === undefined) return {};
  if (data === null) return null;

  if (
    typeof FormData !== "undefined" &&
    data instanceof FormData
  ) {
    return data;
  }

  if (
    typeof Blob !== "undefined" &&
    data instanceof Blob
  ) {
    return data;
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === "object") {
    return { ...data };
  }

  return data;
};

// Skote-style wrappers
export async function get(url, config = {}) {
  return axiosApi.get(url, { ...config }).then((response) => response.data);
}

export async function post(url, data, config = {}) {
  return axiosApi
    .post(url, normalizeRequestData(data), { ...config })
    .then((response) => response.data);
}

export async function put(url, data, config = {}) {
  return axiosApi
    .put(url, normalizeRequestData(data), { ...config })
    .then((response) => response.data);
}

// Added for PATCH endpoints (still uses the central axios instance + interceptors)
export async function patch(url, data, config = {}) {
  return axiosApi
    .patch(url, normalizeRequestData(data), { ...config })
    .then((response) => response.data);
}

export async function del(url, config = {}) {
  return axiosApi.delete(url, { ...config }).then((response) => response.data);
}

export { axiosApi };