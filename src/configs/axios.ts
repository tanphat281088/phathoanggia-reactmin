/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import type { NavigateFunction } from "react-router-dom";
import { URL_CONSTANTS } from "./api-route-config";
import { store } from "../redux/store";
import { setAuthLogout } from "../redux/slices/auth.slice";

let isRefreshing = false;
let failedQueue: any[] = [];
let isRedirecting = false;
let navigateRef: NavigateFunction | null = null;

export const setNavigate = (navigate: NavigateFunction) => {
  navigateRef = navigate;
};

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// ======================== REQUEST INTERCEPTOR ========================
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // giữ nguyên key đang dùng
    const refreshToken = localStorage.getItem("refresh_token");
    const deviceId = localStorage.getItem("device_id");

    if (token) {
      (config.headers as any)["Authorization"] = `Bearer ${token}`;
    }
    if (refreshToken) {
      (config.headers as any)["Refresh-Token"] = refreshToken;
    }
    if (deviceId) {
      (config.headers as any)["Device-Id"] = deviceId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ======================== RESPONSE INTERCEPTOR ========================
axios.interceptors.response.use(
  // Giữ nguyên “flatten response”
  (response) => {
    return (response as any).data ? (response as any).data : response;
  },
  async (error) => {
    const resp = error?.response;
    const status: number | undefined = resp?.status;
    const data = resp?.data;
    const originalRequest = error.config || {};

// --- Hide harmless 403 for preload endpoints (anywhere) ---
const reqMethod = String(originalRequest?.method || 'GET').toUpperCase();
let reqPathname = '';
try {
  const base = originalRequest?.baseURL || axios.defaults.baseURL || window.location.origin;
  const u = new URL(String(originalRequest?.url || ''), base);
  reqPathname = u.pathname.replace(/^\/api/, '');
} catch {
  reqPathname = String(originalRequest?.url || '');
}

const isAuthMe      = /\/auth\/me$/.test(reqPathname);
const isPermList    = /\/danh-sach-phan-quyen$/.test(reqPathname);
const isRoleOptions = /\/vai-tro\/options$/.test(reqPathname);
const isHrModule    = /^\/nhan-su(\/|$)/.test(reqPathname);

const isHarmless403 = isAuthMe || isPermList || isRoleOptions || isHrModule;

if (status === 403 && (isHarmless403 || (reqMethod === 'GET' && (isPermList || isRoleOptions || isHrModule)))) {
  (error as any).__suppressToast = true; // helper sẽ im lặng
  return Promise.resolve({ success: true, data: null, suppressed: true });
}



    // Nếu không có response (network error, CORS, v.v) => trả về luôn
    if (!resp) return Promise.reject(error);

    // [FIX] Tránh vòng lặp refresh cho chính endpoint /auth/refresh
    const isRefreshUrl =
      typeof originalRequest?.url === "string" &&
      originalRequest.url.includes("/auth/refresh");

    // [FIX] Chuẩn hoá điều kiện kích hoạt REFRESH:
    // - 401
    // - Không phải request /auth/refresh
    // - Chưa retry request này
    if (status === 401 && !isRefreshUrl && !originalRequest.__isRetry) {
      // Nếu đang refresh → xếp hàng đợi, chờ refresh xong rồi retry
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axios(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // [FIX] Gọi REFRESH đúng chuẩn BE:
        //  - Dùng POST /auth/refresh
        //  - Gửi Refresh-Token (và Device-Id nếu có)
        const rt = localStorage.getItem("refresh_token") || "";
        const did = localStorage.getItem("device_id") || "";

        // Vì interceptor success đã "flatten", kết quả ở đây là payload trực tiếp
        const refreshRes: any = await axios.post(
          "/auth/refresh",
          null,
          {
            headers: {
              "Accept": "application/json",
              // [FIX] refresh dựa vào refresh token – KHÔNG dùng Bearer cũ
              "Refresh-Token": rt,
              ...(did ? { "Device-Id": did } : {}),
            },
          }
        );

        // [FIX] Đọc trực tiếp do đã flatten: refreshRes.success, refreshRes.data?.access_token
        const ok = !!refreshRes && (refreshRes.success === true || refreshRes.code === "OK");
        const newAccess = refreshRes?.data?.access_token;
        const newRefresh = refreshRes?.data?.refresh_token;

        if (!ok || !newAccess) {
          throw new Error("REFRESH_FAILED");
        }

        // Lưu token mới (giữ nguyên key hiện có: token/refresh_token)
        localStorage.setItem("token", String(newAccess));
        if (newRefresh) {
          localStorage.setItem("refresh_token", String(newRefresh));
        }

        // Dọn hàng đợi (thành công)
        processQueue(null);

        // [FIX] Gắn lại Authorization mới cho request đang retry
        originalRequest.__isRetry = true;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;

        // Retry request ban đầu
        return axios(originalRequest);
      } catch (refreshError) {
        // Dọn hàng đợi (thất bại)
        processQueue(refreshError);

        // [FIX] Nếu refresh thất bại → đăng xuất & điều hướng Login (không fallback dữ liệu)
        if (!isRedirecting && window.location.pathname !== URL_CONSTANTS.LOGIN) {
          isRedirecting = true;
          try {
            store.dispatch(setAuthLogout());
          } catch {
            // noop
          }
          // Xoá token local
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("device_id");

          if (navigateRef) {
            navigateRef(URL_CONSTANTS.LOGIN);
          } else {
            window.location.href = URL_CONSTANTS.LOGIN;
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 401 nhưng KHÔNG thuộc case refresh (ví dụ token không hợp lệ) → logout (giữ logic cũ)
    if (status === 401 && data?.error_code !== "TOKEN_EXPIRED" && !isRedirecting) {
      isRedirecting = true;
      if (window.location.pathname !== URL_CONSTANTS.LOGIN) {
        try {
          store.dispatch(setAuthLogout());
        } catch {
          // noop
        }
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("device_id");

        if (navigateRef) {
          navigateRef(URL_CONSTANTS.LOGIN);
        } else {
          window.location.href = URL_CONSTANTS.LOGIN;
        }
      }
    }

    return Promise.reject(error);
  }
);

// ======================== DEFAULTS ========================
axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.headers.common["Accept"] = "application/json";
// axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

export default axios;
