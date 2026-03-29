// react-admin/src/services/vt.api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

// ===== API base URL (runtime-safe) =====
// 1) Ưu tiên meta <meta name="phg-api-url" content="https://api.phgfloral.com/api">
// ===== FORCE API (test) =====
/* eslint-disable @typescript-eslint/no-explicit-any */

// ===== API base (FORCED) =====
const API: string = 'https://api.phgfloral.com/api';

// Ghim để kiểm tra runtime
;(window as any).__API = API;
console.log('[FE] API base (FORCED):', API);



function authHeaders() {
  const token = localStorage.getItem("token"); // chỉnh lại nếu bạn lưu tên khác
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function http<T>(url: string, options: RequestInit = {}): Promise<T> {
  console.log('[HTTP]', options?.method || 'GET', url);

  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });

  // Đọc thô 1 lần (dùng cho cả nhánh ok & error)
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const raw = await res.text().catch(() => '');

  // ===== NHÁNH LỖI: gắn status/statusText/body vào Error =====
  if (!res.ok) {
    const err: any = new Error(`[${res.status}] ${res.statusText}`);
    err.status = res.status;
    err.statusText = res.statusText;
    err.body = raw;
    err.url = url;

    // Nếu trả JSON lỗi, cố parse để FE có message dễ đọc hơn
    if (raw && contentType.includes('application/json')) {
      try {
        const j = JSON.parse(raw);
        err.json = j;
        // nếu BE có {message}, dùng nó làm message chính
        if (j?.message && typeof j.message === 'string') {
          err.message = `[${res.status}] ${j.message}`;
        }
      } catch { /* ignore */ }
    }
    throw err; // <-- QUAN TRỌNG: Error có .status để FE bắt 404
  }

  // ===== NHÁNH THÀNH CÔNG =====
  // DELETE/204/205: thường không có body
  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  if (!raw) {
    return undefined as T;
  }

  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw) as T; } catch { return undefined as T; }
  }

  // Trả thử JSON nếu server set content-type khác
  try { return JSON.parse(raw) as T; } catch { /* fall-through */ }

  // Không phải JSON → trả undefined cho nhất quán
  return undefined as T;
}


/** ================== Utils ================== */
function omitKeys<T extends Record<string, any>>(obj: T, keys: string[]): Partial<T> {
  const clone: any = { ...obj };
  for (const k of keys) delete clone[k];
  return clone;
}

/** ================== Danh mục VT ================== */
export type VtItem = {
  id: number;
  ma_vt: string;
  ten_vt: string;
  danh_muc_vt?: string | null;
  nhom_vt?: string | null;
  don_vi_tinh?: string | null;
  loai: "ASSET" | "CONSUMABLE";
  trang_thai: 0 | 1;
  ghi_chu?: string | null;
};

export async function vtItemsList(params: {
  q?: string;
  loai?: "ASSET" | "CONSUMABLE";
  danh_muc_vt?: string;
  nhom_vt?: string;
  active_only?: boolean;
  page?: number;
  per_page?: number;
}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
  });
  return http<{ success: boolean; data: any }>(`${API}/vt/items?${query.toString()}`);
}

export async function vtItemCreate(payload: Partial<VtItem>) {
  // Không gửi ma_vt nếu rỗng → BE tự sinh
  const body = { ...payload };
  if (!body.ma_vt || String(body.ma_vt).trim() === "") {
    delete (body as any).ma_vt;
  }
  return http<{ success: boolean; data: VtItem }>(`${API}/vt/items`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function vtItemUpdate(id: number, payload: Partial<VtItem>) {
  // Không cho đổi mã ở FE: nếu user cố sửa UI thì vẫn bỏ qua gửi ma_vt
  const body = omitKeys(payload, ["ma_vt"]);
  return http<{ success: boolean; data: VtItem }>(`${API}/vt/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function vtItemDelete(id: number) {
  return http<{ success: boolean; data: unknown }>(`${API}/vt/items/${id}`, {
    method: "DELETE",
  });
}

export async function vtItemOptions(params?: { q?: string; loai?: VtItem["loai"] }) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.loai) query.set("loai", params.loai);
  return http<{
    success: boolean;
    data: Array<{ value: number; label: string; ma_vt: string; don_vi_tinh?: string; loai: VtItem["loai"] }>;
  }>(`${API}/vt/items/options?${query.toString()}`);
}

/** ================== Tham chiếu (dropdown) ================== */
export async function vtRefOptions(params?: {
  ly_do?: "BAN" | "HUY" | "CHUYEN" | "KHAC";
  q?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.ly_do) qs.set("ly_do", params.ly_do);
  if (params?.q) qs.set("q", params.q);
  if (params?.limit) qs.set("limit", String(params.limit));
  return http<{ success: boolean; data: Array<{ value: string; label: string; type: "PNVT" | "PXVT" | "DON_HANG" }> }>(
    `${API}/vt/references?${qs.toString()}`
  );
}

/** ================== Phiếu nhập VT ================== */
export async function vtReceiptList(params?: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => v && qs.set(k, String(v)));
  return http<{ success: boolean; data: any }>(`${API}/vt/receipts?${qs.toString()}`);
}

export async function vtReceiptCreate(payload: {
  so_ct?: string;
  ngay_ct?: string; // YYYY-MM-DD
  nha_cung_cap_id?: number | null;
  tham_chieu?: string | null;
  ghi_chu?: string | null;
  items: Array<{ vt_item_id: number; so_luong: number; don_gia?: number | null; ghi_chu?: string | null }>;
}) {
  // Không gửi so_ct để BE tự sinh PNVT-...
  const body = omitKeys(payload, ["so_ct"]);
  return http<{ success: boolean; data: any }>(`${API}/vt/receipts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function vtReceiptUpdate(id: number, payload: Parameters<typeof vtReceiptCreate>[0]) {
  // Không cho đổi số CT khi update
  const body = omitKeys(payload, ["so_ct"]);
  return http<{ success: boolean; data: any }>(`${API}/vt/receipts/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function vtReceiptDelete(id: number) {
  return http<{ success: boolean; data: unknown }>(`${API}/vt/receipts/${id}`, {
    method: "DELETE",
  });
}

/** ================== Phiếu xuất VT ================== */
export async function vtIssueList(params?: {
  q?: string;
  from?: string;
  to?: string;
  ly_do?: "BAN" | "HUY" | "CHUYEN" | "KHAC";
  page?: number;
  per_page?: number;
}) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => v && qs.set(k, String(v)));
  return http<{ success: boolean; data: any }>(`${API}/vt/issues?${qs.toString()}`);
}

export async function vtIssueCreate(payload: {
  so_ct?: string;
  ngay_ct?: string;
  ly_do?: "BAN" | "HUY" | "CHUYEN" | "KHAC";
  tham_chieu?: string | null;
  ghi_chu?: string | null;
  items: Array<{ vt_item_id: number; so_luong: number; ghi_chu?: string | null }>;
}) {
  // Không gửi so_ct để BE tự sinh PXVT-...
  const body = omitKeys(payload, ["so_ct"]);
  return http<{ success: boolean; data: any }>(`${API}/vt/issues`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function vtIssueUpdate(id: number, payload: Parameters<typeof vtIssueCreate>[0]) {
  // Không cho đổi số CT khi update
  const body = omitKeys(payload, ["so_ct"]);
  return http<{ success: boolean; data: any }>(`${API}/vt/issues/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function vtIssueDelete(id: number) {
  return http<{ success: boolean; data: unknown }>(`${API}/vt/issues/${id}`, {
    method: "DELETE",
  });
}

/** ================== Tồn & Sổ kho ================== */
export async function vtStocks(params?: {
  q?: string;
  loai?: VtItem["loai"];
  page?: number;
  per_page?: number;
}) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => v && qs.set(k, String(v)));
  return http<{ success: boolean; data: any }>(`${API}/vt/stocks?${qs.toString()}`);
}

export async function vtLedger(params?: {
  vt_item_id?: number;
  from?: string;
  to?: string;
  loai_ct?: "OPENING" | "RECEIPT" | "ISSUE" | "ADJUST";
  q?: string;
  page?: number;
  per_page?: number;
}) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => v && qs.set(k, String(v)));
  return http<{ success: boolean; data: any }>(`${API}/vt/ledger?${qs.toString()}`);
}

export async function vtCategoryOptions(params?: { q?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  return http<{ success: boolean; data: Array<{ value: string; label: string }> }>(
    `${API}/vt/categories/options?${qs.toString()}`
  );
}

export async function vtGroupOptions(params?: { q?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  return http<{ success: boolean; data: Array<{ value: string; label: string }> }>(
    `${API}/vt/groups/options?${qs.toString()}`
  );
}

export async function vtUnitOptions(params?: { q?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  return http<{ success: boolean; data: Array<{ value: string; label: string }> }>(
    `${API}/vt/units/options?${qs.toString()}`
  );
}
