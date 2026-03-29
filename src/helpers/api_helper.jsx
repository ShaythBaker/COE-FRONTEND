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
import { decodeJwt } from "./coe_jwt";

const API_URL = import.meta.env.VITE_APP_API_URL;

const axiosApi = axios.create({
  baseURL: API_URL,
});

let isRefreshing = false;
let refreshQueue = [];
let didShowSessionExpiredToast = false;

const enqueue = cb => refreshQueue.push(cb);

const flushQueue = (err, newToken) => {
  refreshQueue.forEach(cb => cb(err, newToken));
  refreshQueue = [];
};

const setLegacyAuthUserFromTokenPair = ({ accessToken, refreshToken }) => {
  const decoded = decodeJwt(accessToken);

  if (!decoded) return;

  const legacyUser = {
    id: decoded?.sub || null,
    email: decoded?.EMAIL || null,
    COMPANY_ID: decoded?.COMPANY_ID || null,
    ROLES: Array.isArray(decoded?.ROLES) ? decoded.ROLES : [],
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
  };

  localStorage.setItem("user", JSON.stringify(legacyUser));
  localStorage.setItem("authUser", JSON.stringify(legacyUser));
};

const clearLegacyAuthUser = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("authUser");
};

const redirectToLogin = () => {
  clearTokens();
  clearLegacyAuthUser();

  if (!didShowSessionExpiredToast) {
    didShowSessionExpiredToast = true;
    notifyError("Session expired. Please login again.");
    setTimeout(() => {
      didShowSessionExpiredToast = false;
    }, 1500);
  }

  window.location.href = "/login";
};

axiosApi.interceptors.request.use(config => {
  const token = getAccessToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosApi.interceptors.response.use(
  response => response,
  async error => {
    const original = error?.config;

    if (!error?.response || !original) {
      return Promise.reject(error);
    }

    const url = original.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout");

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !original._retry) {
      original._retry = true;

      const rt = getRefreshToken();

      if (!rt) {
        redirectToLogin();
        return Promise.reject(error);
      }

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
        const res = await axios.post(`${API_URL}${REFRESH}`, {
          refreshToken: rt,
        });

        const newTokens = {
          accessToken: res?.data?.accessToken,
          refreshToken: res?.data?.refreshToken,
        };

        setTokens(newTokens);
        setLegacyAuthUserFromTokenPair(newTokens);

        isRefreshing = false;
        flushQueue(null, newTokens.accessToken);

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newTokens.accessToken}`;

        return axiosApi(original);
      } catch (refreshErr) {
        isRefreshing = false;
        flushQueue(refreshErr, null);
        redirectToLogin();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

const normalizeRequestData = data => {
  if (data === undefined) return {};
  if (data === null) return null;

  if (typeof FormData !== "undefined" && data instanceof FormData) {
    return data;
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
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

export async function get(url, config = {}) {
  return axiosApi.get(url, { ...config }).then(response => response.data);
}

export async function post(url, data, config = {}) {
  return axiosApi
    .post(url, normalizeRequestData(data), { ...config })
    .then(response => response.data);
}

export async function put(url, data, config = {}) {
  return axiosApi
    .put(url, normalizeRequestData(data), { ...config })
    .then(response => response.data);
}

export async function patch(url, data, config = {}) {
  return axiosApi
    .patch(url, normalizeRequestData(data), { ...config })
    .then(response => response.data);
}

export async function del(url, config = {}) {
  return axiosApi.delete(url, { ...config }).then(response => response.data);
}

export { axiosApi };