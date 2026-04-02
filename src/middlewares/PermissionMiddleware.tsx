/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { Navigate, useLocation } from "react-router-dom";
import { KEY_URL_VALID } from "../utils/constant";
import { toast } from "../utils/toast";
import { URL_CONSTANTS } from "../configs/api-route-config";

/** Giữ whitelist cũ, + các route cho phép thêm */
const EXTRA_WHITELIST = [
  "/admin/cong-cu/sign-maker", // ✅ Cho phép route Sign Maker mới
  // ✅✅ MỚI: mở tạm 2 trang HR để truy cập được ngay
  "/admin/quan-ly-nhan-su/cham-cong",
  "/admin/quan-ly-nhan-su/duyet-cham-cong",
  // ✅ NEW: mở báo cáo quản trị
  "/admin/bao-cao-quan-tri",
  "/admin/bao-cao-quan-tri/kqkd",
  "/admin/cham-soc-khach-hang/diem-thanh-vien",
    // ✅ MỚI: Quản lý vật tư (VT)
  "/admin/quan-ly-vat-tu/items",
  "/admin/quan-ly-vat-tu/receipts",
  "/admin/quan-ly-vat-tu/issues",
  "/admin/quan-ly-vat-tu/stocks",

    // ✅ NEW: Quản lý dòng tiền (Cashflow)
  "/admin/quan-ly-thu-chi/cashflow",

    "/admin/utilities/fb-inbox",
      "/admin/utilities/zl-inbox",

        "/admin/quan-ly-thu-chi/cong-no-khach-hang",      // 👈 THÊM

 // ✅ MỚI: cho phép tất cả user truy cập trang Thông tin cá nhân
  "/admin/profile",



];

/**
 * ✅ Alias module FE -> module quyền
 * - quan-ly-giao-hang -> quan-ly-ban-hang
 * - quan-ly-nhan-su    -> nhan-su
 * - cham-soc-khach-hang (parent) -> cskh
 * - diem-thanh-vien     (child)  -> cskh-points
 */
const MODULE_ALIAS: Record<string, string> = {
  "quan-ly-giao-hang": "quan-ly-ban-hang",
  "quan-ly-nhan-su": "nhan-su",


  
  // Quản lý chi phí
  "quan-ly-chi-phi": "quan-ly-chi-phi",
  "de-xuat": "quan-ly-chi-phi-de-xuat",
  "thuc-te": "quan-ly-chi-phi-thuc-te",

    // Quản lý HĐ + TL
  "quan-ly-hop-dong": "quan-ly-hop-dong",

  // CSKH (mới)
  "cham-soc-khach-hang": "cskh",
  "diem-thanh-vien": "cskh-points",
  "danh-gia-dich-vu": "cskh-review",


    // Utilities → Tư vấn Facebook
  "utilities": "utilities",
  "fb-inbox": "utilities-fb",
    "zl-inbox": "utilities-zl",

      "cong-no-khach-hang": "quan-ly-cong-no",  // 👈 THÊM
      "kiem-toan": "kiem-toan",
        "cashflow": "cashflow",      
        
        "tai-chinh": "bao-cao-tai-chinh",

        // HR → Bảng lương
  "bang-luong-cua-toi": "payrollMe", // ✅ trang /admin/quan-ly-nhan-su/bang-luong-cua-toi
  "bang-luong": "payroll",           // ✅ trang /admin/quan-ly-nhan-su/bang-luong

  // ✅ HR → Thiết lập lương (UI)
  "thiet-lap-luong": "payroll-profile",

  // ✅ Thông báo công ty
  "thong-bao": "thong-bao-cong-ty",
  "quan-tri-thong-bao": "thong-bao-cong-ty-admin",


 // Gói dịch vụ (3 tầng)
  "nhom-danh-muc-goi-dich-vu": "goi-dich-vu-groups",
  "nhom-goi-dich-vu": "goi-dich-vu-categories",
  "goi-dich-vu": "goi-dich-vu-packages",

};

const PermissionMiddleware = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  // ❷ OWNER-ONLY: chặn truy cập 2 module qua URL đối với non-owner
const isOwner = String(user?.email || "").toLowerCase() === "admin@gmail.com";
// ✅ BYPASS tuyệt đối cho chủ hệ thống
if (isOwner) {
  return <>{children}</>;
}

const OWNER_ONLY_PREFIXES = [
  "/admin/quan-ly-nguoi-dung",  // gồm cả /nguoi-dung, /vai-tro
  "/admin/thiet-lap-he-thong", 
   "/admin/lich-su-import",  // gồm cả /cau-hinh-chung, /thoi-gian-lam-viec
];

if (!isOwner && OWNER_ONLY_PREFIXES.some((pre) => pathname === pre || pathname.startsWith(pre + "/"))) {
  toast.error("Bạn không có quyền truy cập vào trang này");
  return <Navigate to={URL_CONSTANTS.DASHBOARD} />;
}


  const allow = () => {
    // 1) Whitelist theo path đầy đủ (giữ nguyên hành vi cũ)
    if (EXTRA_WHITELIST.some((w) => pathname.startsWith(w))) {
      return true;
    }

    // 2) Whitelist theo KEY_URL_VALID (giữ hành vi cũ)
    for (const key of KEY_URL_VALID) {
      if (pathname.includes(key)) {
        return true;
      }
    }

    // 3) Kiểm tra role hợp lệ
    if (user?.vai_tro?.trang_thai != 1) {
      toast.error("Không xác định được vai trò");
      return false;
    }

    // 4) Parse phan_quyen từ DB
    //    Cấu trúc: [{ name: string, actions: { showMenu?: bool, index?: bool, ... } }, ...]
    let phanQuyen: any[] = [];
    try {
      const parsed = JSON.parse(user?.vai_tro?.phan_quyen || "[]");
      phanQuyen = Array.isArray(parsed) ? parsed : [];
    } catch {
      phanQuyen = [];
    }

    // 5) Xác định module key của route hiện tại
    //    /admin/cham-soc-khach-hang/diem-thanh-vien
    //      -> parentKeyOriginal = "cham-soc-khach-hang"
    //      -> childKeyOriginal  = "diem-thanh-vien"
    const pathAfterAdmin = pathname.replace(/^\/admin\/?/, ""); // "module/sub/..." hoặc "dashboard"
    const segs = pathAfterAdmin.split("/").filter(Boolean);
    const parentKeyOriginal = (segs[0] || "").trim();
    const childKeyOriginal = (segs[1] || "").trim();

    const thirdKeyOriginal = (segs[2] || "").trim();

// ⭐ đặc thù: /admin/quan-ly-thu-chi/cashflow/audit → module "kiem-toan"
if (
  parentKeyOriginal === "quan-ly-thu-chi" &&
  childKeyOriginal === "cashflow" &&
  thirdKeyOriginal === "audit"
) {
  // kiểm quyền xem của module "Kiểm toán"
  const hasKiemToan = (name: string) => {
    const p = phanQuyen.find((r: any) => r?.name === name);
    return !!p?.actions?.showMenu && !!p?.actions?.index;
  };
  if (hasKiemToan("kiem-toan")) return <>{children}</>;
  toast.error("Bạn không có quyền truy cập vào trang này");
  return <Navigate to={URL_CONSTANTS.DASHBOARD} />;
}


    const parentKey = MODULE_ALIAS[parentKeyOriginal] ?? parentKeyOriginal;
    const childKey = childKeyOriginal
      ? (MODULE_ALIAS[childKeyOriginal] ?? childKeyOriginal)
      : "";

    // 6) Helper kiểm tra quyền 1 module theo name
    const hasModuleIndex = (name: string) => {
      const perm = phanQuyen.find((p: any) => p?.name === name);
      return !!perm?.actions?.showMenu && !!perm?.actions?.index;
    };

    // 7) ƯU TIÊN kiểm tra quyền module CON trước (nếu có),
    //    ví dụ: "diem-thanh-vien" -> "cskh-points"
    if (childKey) {
      if (hasModuleIndex(childKey)) {
        return true;
      }
      // Nếu không có quyền con, mới xét quyền CHA (ví dụ "cskh")
      if (hasModuleIndex(parentKey)) {
        return true;
      }
    } else {
      // Route không có child: chỉ xét module CHA như cũ
      if (hasModuleIndex(parentKey)) {
        return true;
      }
    }

    // 8) Fallback giữ hành vi cũ (so khớp theo last segment nếu hệ thống dùng tên lẻ)
    const last = segs[segs.length - 1] || "";
    const matchedLegacy = phanQuyen.find(
      (item: any) =>
        item &&
        typeof item === "object" &&
        last.includes(String(item.name || "")) &&
        item?.actions?.index
    );
    if (matchedLegacy) {
      return true;
    }

    toast.error("Bạn không có quyền truy cập vào trang này");
    return false;
  };

  return <>{allow() ? children : <Navigate to={URL_CONSTANTS.DASHBOARD} />}</>;
};

export default PermissionMiddleware;
