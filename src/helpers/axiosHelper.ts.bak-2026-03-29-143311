import axios from "../configs/axios";
import { toast } from "../utils/toast";

export const handleAxiosError = (error: unknown) => {
  const isAxios = (axios as any).isAxiosError?.(error);
  const e: any = error as any;

  if (isAxios) {
    const resp   = e?.response;
    const status = resp?.status as number | undefined;
    const data   = resp?.data;

    // Cờ suppress (nếu interceptor/caller đã gắn)
    const suppressedFlag = e?.__suppressToast === true || data?.suppressed === true;

    // Lấy pathname của request (bất kể baseURL/query), bỏ /api cho dễ match
    let reqPath = "";
    try {
      const base = (axios as any).defaults?.baseURL || window.location.origin;
      const u = new URL(String(e?.config?.url || ""), base);
      reqPath = u.pathname.replace(/^\/api/, "");
    } catch {
      reqPath = String(e?.config?.url || "");
    }

    // Những endpoint preload đọc-only hay 403 với NHÂN_VIÊN
    const isPreloadRead =
      /\/auth\/me$/.test(reqPath) ||
      /\/danh-sach-phan-quyen$/.test(reqPath) ||
      /\/vai-tro\/options$/.test(reqPath) ||
      /^\/nhan-su(\/|$)/.test(reqPath);

    // ✅ EARLY-RETURN: nuốt 403 vô hại (không log/không toast)
    if (suppressedFlag || (status === 403 && isPreloadRead)) {
      return { success: false, suppressed: true, data: null };
    }

    // Giữ nguyên hành vi cho lỗi thật
    // eslint-disable-next-line no-console
    console.error("Login error:", data);
    if (data?.message) toast.error(data.message || "Something went wrong");
    if (data?.error)   toast.error(data.error   || "Something went wrong");
    return data;
  }

  // Không phải Axios error
  // eslint-disable-next-line no-console
  console.error("Unexpected error:", error);
  toast.error("An unexpected error occurred");
  return { success: false };
};
