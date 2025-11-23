// /* eslint-disable @typescript-eslint/no-explicit-any */
// export const getSidebar = (items: any, phan_quyen: any) => {

//     const phanQuyen = JSON.parse(phan_quyen);

//     const isKeyValid = (key: string): boolean => {
//         return ["dashboard", "lich-su-import"].includes(key);
//     };

//     const checkRole = items.map((item: any) => {
//         if (item.children) {
//             const checkChildren = item.children.filter((child: any) => {
//                 return phanQuyen.some(
//                     (role: any) =>
//                         role.actions.showMenu && role.name === child.key
//                 );
//             });
//             return { ...item, children: checkChildren };
//         } else {
//             if (!isKeyValid(item.key)) {
//                 const data = phanQuyen.filter(
//                     (role: any) =>
//                         role.actions.showMenu && role.name === item.key
//                 );
//                 return data.length > 0 ? item : null;
//             } else {
//                 return item;
//             }
//         }
//     });

//     return checkRole.filter((item: any) =>
//         item?.children ? item.children.length > 0 : item !== null
//     );
// };

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const getSidebar = (items: any, phan_quyen: any) => {

    // ===== BYPASS CHO CHỦ HỆ THỐNG (luôn hiện full menu, không lọc theo phan_quyen) =====
  try {
    const raw =
      localStorage.getItem("me") ||
      localStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      "";
    const obj = raw ? JSON.parse(raw) : {};
    const email = String(obj?.email || obj?.data?.email || "").toLowerCase();
    if (email === "admin@gmail.com") {
      return items; // owner nhìn thấy toàn bộ menu
    }
  } catch {}

  if (!phan_quyen) return [];

  let phanQuyen: any[] = [];
  try {
    phanQuyen = JSON.parse(phan_quyen);
  } catch (error) {
    console.error("phan_quyen không hợp lệ:", error, phan_quyen);
    return [];
  }

  // Top-level luôn hiển thị (giữ logic gốc)
  const isKeyValid = (key: string): boolean =>
    ["dashboard", "lich-su-import"].includes(key);

  // ✅ LUÔN HIỂN THỊ các nhóm sau (bất kể quyền FE)
  const ALWAYS_SHOW_TOP = new Set<string>([

    "quan-ly-tien-ich", // <— nhóm “Quản lý tiện ích”
  ]);

  // Ẩn hẳn nhóm này (giữ logic cũ của bạn)
  const ALWAYS_HIDE_TOP = ["quan-ly-san-xuat"];

  // ✅ Child luôn hiển thị (giữ & bổ sung key nếu cần)
  const ALWAYS_SHOW_CHILDREN = [
    "bao-cao",
    "bao-cao-kqkd",
    "khach-hang-vang-lai",
    "nhan-su-cham-cong",
    "nhan-su-duyet-cham-cong",
    "diem-thanh-vien",
    // Gợi ý: nếu child FB Inbox có key riêng, thêm luôn vào đây:
    "utilities-fb",   // hoặc "fb-inbox" tuỳ bạn đặt key

      "zl-inbox",
   
      

  ];

  // Alias quyền → key menu
const PERMISSION_ALIAS: Record<string, string | string[]> = {

    "quan-ly-giao-hang": "quan-ly-ban-hang",
 // Quản lý chi phí
    "quan-ly-chi-phi": "quan-ly-chi-phi",
    "qlcp-de-xuat": "quan-ly-chi-phi-de-xuat",
    "qlcp-thuc-te": "quan-ly-chi-phi-thuc-te",
    // HR
    "quan-ly-nhan-su": "nhan-su",
    "nhan-su-cham-cong": "nhan-su",
    "nhan-su-duyet-cham-cong": "nhan-su",
    "nhan-su-don-tu-cua-toi": "nhan-su",
    "nhan-su-don-tu": "nhan-su",
    "nhan-su-bang-cong-cua-toi": "nhan-su",
    "nhan-su-bang-cong": "nhan-su",
    
        // ✅ HR → Bảng lương
    "nhan-su-bang-luong-cua-toi": "payrollMe",
    "nhan-su-bang-luong": "payroll",
        // ✅ HR → Thiết lập lương (Hồ sơ)
    "nhan-su-thiet-lap-luong": "payroll-profile",



    // CSKH
    "cham-soc-khach-hang": "cskh",
    "diem-thanh-vien": "cskh-points",
    "danh-gia-dich-vu": "cskh-review",


    // Utilities (không đổi tên quyền)
    "utilities-fb": "utilities-fb",

      "zl-inbox": "utilities-zl",
  
          // Công nợ KH (map key menu -> module permission)
    "cong-no-khach-hang": "quan-ly-cong-no",

      "kiem-toan": "kiem-toan",   // ⬅️ Module RBAC “Kiểm toán”
"cashflow": ["cashflow", "cash-accounts", "cash-aliases", "cash-ledger", "cash-internal-transfers"],

"tai-chinh": "bao-cao-tai-chinh",


  // Gói dịch vụ
    "nhom-danh-muc-goi-dich-vu": "goi-dich-vu-groups",
    "nhom-goi-dich-vu": "goi-dich-vu-categories",
    "goi-dich-vu": "goi-dich-vu-packages",


  };

  const checkRole = items.map((item: any) => {
    const key = String(item?.key ?? "");

    // Ẩn hẳn
    if (ALWAYS_HIDE_TOP.includes(key)) return null;

    // ✅ NHÁNH MỚI: luôn giữ nguyên nhóm top-level cần hiển thị
    if (ALWAYS_SHOW_TOP.has(key)) {
      return item; // giữ nguyên cả children để luôn thấy module
    }

    // Lọc như cũ
    if (item.children) {
const checkChildren = item.children.filter((child: any) => {
  const cKey = String(child?.key ?? "");
  if (ALWAYS_SHOW_CHILDREN.includes(cKey)) return true;

  const alias = PERMISSION_ALIAS[cKey];
  if (Array.isArray(alias)) {
    // any-of: chỉ cần 1 module cash-* có showMenu + index
    return phanQuyen.some(
      (r: any) => alias.includes(String(r?.name)) && r?.actions?.showMenu && r?.actions?.index
    );
  }

  const compareKey = alias ?? cKey;
  return phanQuyen.some(
    (role: any) => role?.actions?.showMenu && role?.name === compareKey
  );
});

      return { ...item, children: checkChildren };
    } else {
if (!isKeyValid(key)) {
  const alias = PERMISSION_ALIAS[key];
  if (Array.isArray(alias)) {
    const okAny = phanQuyen.some(
      (r: any) => alias.includes(String(r?.name)) && r?.actions?.showMenu && r?.actions?.index
    );
    return okAny ? item : null;
  }
  const compareKey = alias ?? key;
  const ok = phanQuyen.some(
    (role: any) => role?.actions?.showMenu && role?.name === compareKey
  );
  return ok ? item : null;
}
return item;

    }
  });

  return checkRole.filter((it: any) =>
    it?.children ? it.children.length > 0 || ALWAYS_SHOW_TOP.has(String(it.key)) : it !== null
  );
};
