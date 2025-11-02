/* eslint-disable @typescript-eslint/no-explicit-any */

// ==============================
//  Utilities → Tư vấn Zalo
//  Service gọi API (song song FB)
//  - Độc lập: dùng fetch + JWT từ localStorage
//  - Base URL: VITE_API_URL hoặc "/api"
// ==============================

const API_BASE = (() => {
  // Ưu tiên .env
  const envBase =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env?.VITE_API_URL?.replace(/\/+$/, "")) ||
    "";

  if (envBase) return envBase;

  // Hot-fix: nếu đang chạy trên admin.phgfloral.com thì trỏ thẳng API domain
  const host =
    typeof window !== "undefined" ? window.location.host : "";
  if (host === "admin.phgfloral.com") return "https://api.phgfloral.com/api";

  // Fallback dev
  return "/api";
})();

/** Headers kèm JWT */
function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Helper fetch JSON (throw khi !ok) */
async function http<T = any>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      ...authHeaders(),
      ...(opts.headers || {}),
    },
    ...opts,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg =
      (isJson && (body?.message || body?.error)) ||
      body ||
      `HTTP ${res.status}`;
    throw new Error(String(msg));
  }

  return body as T;
}

// ========== Types (FE) ==========
export type ZlHealth = {
  enabled: boolean;
  provider: "google" | "openai" | "hybrid" | string;
  ai_polish: boolean;
  ai_tone?: "neutral" | "friendly" | "formal" | string;

  // bổ sung (có thể null khi BE chưa tính)
  access_token_ttl_sec?: number | null;
  refresh_token_ttl_sec?: number | null;
  need_reauth?: boolean;
};

export type ZlConversation = {
  id: number;
  assigned_user_id?: number | null;
  status?: 0 | 1 | "open" | "closed";
  lang_primary?: string | null;
  can_send_until_at?: string | null;
  tags?: any;
  last_message_at?: string | null;

  // tiện cho FE hiển thị list
  latest_message_vi?: string | null;
  latest_message_at?: string | null;
  customer_name?: string | null;

  // giữ prop cũ để UI dùng chung (FbInboxPage logic)
  within24h?: boolean; // BE map từ can_send_until_at
};

export type ZlMessage = {
  id?: number;
  conversation_id: number;
  direction: "in" | "out";
  mid?: string | null; // map từ provider_message_id để tương thích UI cũ
  text_raw?: string | null;
  text_translated?: string | null;
  text_polished?: string | null;
  src_lang?: string | null;
  dst_lang?: string | null;
  attachments?: any;
  delivered_at?: string | null;
  read_at?: string | null;
  created_at?: string | null;
};

export type Pagination = {
  page: number;
  per_page: number;
  total: number;
};

export type ListResponse<T> = {
  success?: boolean;
  data: T[];
  pagination?: Pagination;
};

// ========== API Paths ==========
const PATHS = {
  health: "/utilities/zl/health",
  conversations: "/utilities/zl/conversations",
  conversation: (id: number | string) => `/utilities/zl/conversations/${id}`,
  reply: (id: number | string) => `/utilities/zl/conversations/${id}/reply`,
  assign: (id: number | string) => `/utilities/zl/conversations/${id}/assign`,
  status: (id: number | string) => `/utilities/zl/conversations/${id}/status`,
};

// ========== Service Methods ==========

/** Đọc trạng thái module & flags (.env) */
export async function zlHealth(): Promise<ZlHealth> {
  return http<ZlHealth>(PATHS.health, { method: "GET" });
}

/** Danh sách hội thoại */
export async function zlConversations(params?: {
  page?: number;
  per_page?: number;
  q?: string;
  status?: "open" | "closed";
  assigned?: "mine" | "unassigned";
}): Promise<ListResponse<ZlConversation>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.assigned) qs.set("assigned", params.assigned);

  const url = PATHS.conversations + (qs.toString() ? `?${qs.toString()}` : "");
  return http<ListResponse<ZlConversation>>(url, { method: "GET" });
}

/** Lấy chi tiết 1 hội thoại + messages */
export async function zlConversationShow(
  id: number | string
): Promise<{
  success?: boolean;
  conversation_id: number;
  messages: ZlMessage[];
}> {
  return http(PATHS.conversation(id), { method: "GET" });
}

/** Gửi trả lời (nhập VI → BE sẽ xử lý dịch/gửi sau này) */
export async function zlReply(
  id: number | string,
  payload: { text_vi: string; polish?: boolean; tone?: string }
): Promise<{
  success: boolean;
  conversation_id: number;
  sent: boolean;
  text_vi: string;
  note?: string;
}> {
  return http(PATHS.reply(id), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Gán/đổi người phụ trách */
export async function zlAssign(
  id: number | string,
  payload: { assigned_user_id: number }
): Promise<{
  success: boolean;
  conversation_id: number;
  assigned_user_id: number;
  note?: string;
}> {
  return http(PATHS.assign(id), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Đổi trạng thái hội thoại (open|closed) */
export async function zlSetStatus(
  id: number | string,
  payload: { status: "open" | "closed" }
): Promise<{
  success: boolean;
  conversation_id: number;
  status: "open" | "closed";
  note?: string;
}> {
  return http(PATHS.status(id), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
