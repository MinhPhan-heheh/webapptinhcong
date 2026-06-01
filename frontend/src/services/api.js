import axios from "axios";

const api = axios.create({
  baseURL: "https://workshift-o5sm.onrender.com",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log("Token being sent:", token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==================== CACHE MANAGER ====================
export const cacheManager = {
  get: (key) => {
    try {
      const cached = localStorage.getItem(`app_cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache có hiệu lực trong 30 giây (giảm xuống để dữ liệu luôn mới)
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
      localStorage.setItem(`app_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error("Cache write error:", e);
    }
  },
  clear: (key) => {
    if (key) {
      localStorage.removeItem(`app_cache_${key}`);
    } else {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith("app_cache_")) {
          localStorage.removeItem(k);
        }
      });
    }
  },
  // Đánh dấu cache cần refresh
  invalidate: (key) => {
    if (key) {
      const cached = localStorage.getItem(`app_cache_${key}`);
      if (cached) {
        const { data } = JSON.parse(cached);
        localStorage.setItem(`app_cache_${key}`, JSON.stringify({
          data,
          timestamp: 0 // Hết hạn ngay
        }));
      }
    }
  }
};

// ==================== REFRESH EVENT ====================
export const triggerRefresh = (dataType = "all") => {
  window.dispatchEvent(new CustomEvent("app-refresh", { detail: { dataType } }));
};

// Lắng nghe route change để refresh dữ liệu
export const initRefreshOnRouteChange = () => {
  let lastPathname = window.location.pathname;
  
  // Lắng nghe popstate (back/forward)
  window.addEventListener("popstate", () => {
    if (lastPathname !== window.location.pathname) {
      lastPathname = window.location.pathname;
      triggerRefresh("all");
    }
  });
  
  // Lắng nghe khi tab được focus lại
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      triggerRefresh("all");
    }
  });
};

export default api;