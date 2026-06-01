import axios from "axios";

const api = axios.create({
  baseURL: "https://workshift-o5sm.onrender.com",
  timeout: 20000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const cacheManager = {
  get: (key) => {
    try {
      const cached = localStorage.getItem(`app_cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 30 * 1000) {
          return data;
        }
      }
    } catch (e) {
      console.error("Cache read error:", e);
    }
    return null;
  },
  set: (key, data) => {
    try {
      localStorage.setItem(
        `app_cache_${key}`,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.error("Cache write error:", e);
    }
  },
  clear: (key) => {
    if (key) {
      localStorage.removeItem(`app_cache_${key}`);
      return;
    }

    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("app_cache_")) {
        localStorage.removeItem(k);
      }
    });
  },
  invalidate: (key) => {
    if (!key) return;

    const cached = localStorage.getItem(`app_cache_${key}`);
    if (cached) {
      const { data } = JSON.parse(cached);
      localStorage.setItem(
        `app_cache_${key}`,
        JSON.stringify({
          data,
          timestamp: 0,
        })
      );
    }
  },
};

export const triggerRefresh = (dataType = "all") => {
  window.dispatchEvent(new CustomEvent("app-refresh", { detail: { dataType } }));
};

export const isRequestCanceled = (error) => {
  return (
    axios.isCancel(error) ||
    error?.name === "AbortError" ||
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

export const initRefreshOnRouteChange = () => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      triggerRefresh("all");
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};

export default api;
