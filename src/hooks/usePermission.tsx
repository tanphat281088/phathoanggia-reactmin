/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import type { Actions } from "../types/main.type";

/**
 * Map API path (prefix) -> module canonical (khớp registry V2 / backend)
 * Ví dụ:
 *   /vt/items           -> vt-items
 *   /utilities/fb/...   -> utilities-fb
 *   /cash/internal-transfers -> cash-internal-transfers
 */
const PATH_ALIAS: Record<string, string> = {
  // CSKH
  "cskh/points": "cskh-points",
  "cskh-points": "cskh-points",
  cskh: "cskh",

  // Utilities
  "utilities/fb": "utilities-fb",
  "utilities/zl": "utilities-zl",
  utilities: "utilities",

  // VT
  "vt/items": "vt-items",
  "vt/receipts": "vt-receipts",
  "vt/issues": "vt-issues",
  "vt/stocks": "vt-stocks",
  "vt/ledger": "vt-stocks",

  // Cashflow
  "cash/accounts": "cash-accounts",
  "cash/aliases": "cash-aliases",
  "cash/ledger": "cash-ledger",
  "cash/balances": "cash-ledger",
  "cash/balances/summary": "cash-ledger",
  "cash/internal-transfers": "cash-internal-transfers",

    // Kiểm toán (audit)
  "kiem-toan": "kiem-toan",
  "cash/audit-delta": "kiem-toan",


  // Chuẩn 1:1
  dashboard: "dashboard",
  "vai-tro": "vai-tro",
  "nguoi-dung": "nguoi-dung",
  "cau-hinh-chung": "cau-hinh-chung",
  "thoi-gian-lam-viec": "thoi-gian-lam-viec",
  "lich-su-import": "lich-su-import",

  "loai-khach-hang": "loai-khach-hang",
  "khach-hang": "khach-hang",
  "khach-hang-vang-lai": "khach-hang-vang-lai",

  "nha-cung-cap": "nha-cung-cap",
  "danh-muc-san-pham": "danh-muc-san-pham",
  "don-vi-tinh": "don-vi-tinh",
  "san-pham": "san-pham",

  "phieu-nhap-kho": "phieu-nhap-kho",
  "phieu-xuat-kho": "phieu-xuat-kho",
  "quan-ly-ton-kho": "quan-ly-ton-kho",
  "quan-ly-ban-hang": "quan-ly-ban-hang",

  // Giao hàng (tách module riêng)
  "giao-hang": "giao-hang",

  "cong-thuc-san-xuat": "cong-thuc-san-xuat",
  "san-xuat": "san-xuat",

  "phieu-thu": "phieu-thu",
  "phieu-chi": "phieu-chi",
  "thu-chi/bao-cao": "bao-cao-thu-chi",
  "bao-cao-quan-tri": "bao-cao-quan-tri",
    // HR → Bảng lương
  "nhan-su/bang-luong/my": "payrollMe", // lương của tôi
  "nhan-su/bang-luong": "payroll",      // quản lý (/, /list, /recompute, /lock, /unlock, /update-manual)

};

/** Lấy module canonical từ API path (ví dụ "/vt/items" -> "vt-items") */
function resolveModuleFromPath(path: string): string | null {
  const p = path.replace(/^\/+/, ""); // bỏ leading slash
  const seg = p.split("/").filter(Boolean);
  // thử match 3->2->1 segments
  const first = seg[0] ?? "";
  const first2 = seg[1] ? `${first}/${seg[1]}` : first;
  const first3 = seg[2] ? `${first}/${seg[1]}/${seg[2]}` : first2;
  for (const key of [first3, first2, first]) {
    if (PATH_ALIAS[key]) return PATH_ALIAS[key];
  }
  return null;
}

const usePermission = (path: string): Actions => {
  const { user } = useSelector((state: RootState) => state.auth);

  // default deny (đủ 7 cờ chuẩn + để FE không crash khi destruct)
  const deny: Actions = {
    index: false,
    create: false,
    show: false,
    edit: false,
    delete: false,
    export: false,
    showMenu: false,
  };

  // Không có role hợp lệ
  if (!user?.vai_tro?.phan_quyen || user?.vai_tro?.trang_thai != 1) {
    return deny;
  }

  let phanQuyen: any[] = [];
  try {
    const parsed = JSON.parse(user.vai_tro.phan_quyen || "[]");
    phanQuyen = Array.isArray(parsed) ? parsed : [];
  } catch {
    phanQuyen = [];
  }

  const moduleName = resolveModuleFromPath(path);
  if (!moduleName) return deny;

  const found = phanQuyen.find((p: any) => p?.name === moduleName);
  if (!found || !found.actions) return deny;

  // Ghép default 7 cờ để không vỡ UI (kể cả khi role chỉ có 1-2 cờ)
  return {
    ...deny,
    ...(found.actions as Partial<Actions>),
  } as Actions;
};

export default usePermission;
