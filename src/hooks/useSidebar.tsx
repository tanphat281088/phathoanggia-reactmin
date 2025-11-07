/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sidebarConfig } from "../configs/sidebar-config";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";

const useSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- helper: admin/super_admin mới là "quản lý" ---
const isAdminRole = (roleCode?: string) => {
  const c = (roleCode || "").toLowerCase();
  return c === "super_admin" || c === "admin";
};


  // Mặc định mở group theo segment đầu tiên của URL
  const [openKeys, setOpenKeys] = useState<string[]>([
    location.pathname.replace("/admin/", "").split("/")[0],
  ]);



  // ===== Quyền hiện tại
  const { user } = useSelector((state: RootState) => state.auth);

// Mã vai trò: ưu tiên ma/code/ten, tuỳ DB của bạn
// Mã vai trò (không đụng kiểu TS): rút từ ma/code/ten/slug/name nếu có
const vt: any = (user as any)?.vai_tro || {};
const roleCode: string = String(
  vt.ma_vai_tro ?? vt.ma ?? vt.code ?? vt.ten ?? vt.slug ?? vt.name ?? ""
).toLowerCase();


// Truyền thêm roleCode vào sidebarConfig
const items = sidebarConfig(
  navigate,
  user?.vai_tro?.phan_quyen,
  roleCode
);


  let roles: any[] = [];
  try {
    const parsed = JSON.parse(user?.vai_tro?.phan_quyen || "[]");
    roles = Array.isArray(parsed) ? parsed : [];
  } catch {
    roles = [];
  }

  // === Owner (chỉ chủ hệ thống) ===
  const isOwner = String(user?.email || "").toLowerCase() === "admin@gmail.com";

  // Hai parent phải ẩn với mọi user không phải owner
  const OWNER_ONLY_PARENTS = new Set<string>([
    "quan-ly-nguoi-dung",
    "thiet-lap-he-thong",
    "lich-su-import",
  ]);

  // ======= BYPASS TOÀN BỘ MENU CHO CHỦ HỆ THỐNG =======
  if (isOwner) {
    // Giữ nguyên logic đánh dấu selected
    const getSelectedKey = (sourceItems: any[]) => {
      const path = location.pathname;
      const currentPath = path.replace("/admin/", "");
      return sourceItems.map((item) => {
        if (!item.children) {
          return {
            ...item,
            className: currentPath === item.key ? "ant-menu-item-selected" : "",
          };
        }
        return {
          ...item,
          children: item.children.map((child: any) => {
            const pathChild = `${item.key}/${child.key}`;
            if (currentPath === pathChild) {
              return { ...child, className: "ant-menu-item-selected" };
            }
            return child;
          }),
        };
      });
    };
    const updatedItems = getSelectedKey(items);
    return { items: updatedItems, openKeys };
  }
  // ================================================

  // ===== Danh sách module có trong vai trò (để map nhanh)
  const grantedNames = new Set<string>();
  roles.forEach((r: any) => {
    if (r && typeof r.name === "string") grantedNames.add(r.name);
  });

  // ===== Hàm check quyền show menu (bypass thêm một lớp dự phòng)
  const hasMenu = (moduleName: string): boolean => {
    if (isOwner) return true; // dự phòng
    if (!moduleName) return false;
    const p = roles.find((r: any) => r?.name === moduleName);
    if (!p || !p.actions) return false;
     const a = p.actions;

  // ✅ Riêng module 'payroll-profile': cho phép hiển thị chỉ cần quyền index (không bắt buộc showMenu)
  if (moduleName === "payroll-profile") {
    return !!a.index;
  }

  return !!a.showMenu && !!a.index;

  };

  /**
   * Ánh xạ key menu -> module canonical
   * - Ưu tiên child, nếu không ánh xạ được thì fallback về parent (nếu parent là module)
   * - Một số key đặc biệt ánh xạ về NHIỀU module: dùng ANY-OF check (vd: cashflow)
   */
  const CHILD_TO_MODULE: Record<string, string | string[]> = {
    // CSKH
    "diem-thanh-vien": "cskh-points",

    // Utilities
    "fb-inbox": "utilities-fb",
    "zl-inbox": "utilities-zl",

    // Thu chi
    "bao-cao": "bao-cao-thu-chi",
    // Cashflow: chỉ cần có bất kỳ module cash-* là hiển thị
    "cashflow": ["cash-ledger", "cash-accounts", "cash-aliases", "cash-internal-transfers"],
      "cong-no-khach-hang": "quan-ly-cong-no",   // 👈 THÊM DÒNG NÀY
        "kiem-toan": "kiem-toan",   // RBAC module “Kiểm toán”


    // Nhân sự: mọi child đều map về 1 module 'nhan-su'
    "nhan-su-cham-cong": "nhan-su",
    "nhan-su-duyet-cham-cong": "nhan-su",
    "nhan-su-don-tu-cua-toi": "nhan-su",
    "nhan-su-don-tu": "nhan-su",
    "nhan-su-bang-cong-cua-toi": "nhan-su",
    "nhan-su-bang-cong": "nhan-su",
   
      "nhan-su-bang-luong-cua-toi": "payrollMe", // ✅ My Payroll
  "nhan-su-bang-luong": "payroll",           // ✅ Payroll (Quản lý)
    // ✅ Thiết lập lương (Hồ sơ)
  "nhan-su-thiet-lap-luong": "payroll-profile",


  };


  // 3 tab HR chỉ dành cho quản lý
const MANAGER_HR_KEYS = new Set<string>([
  "nhan-su-duyet-cham-cong",
  "nhan-su-don-tu",
  "nhan-su-bang-cong",
    "nhan-su-bang-luong",
     "nhan-su-thiet-lap-luong",   // ✅ chỉ admin/super_admin thấy

]);

  const PARENT_TO_MODULE: Record<string, string | null> = {
    // Parent là module thực tế
    "bao-cao-quan-tri": "bao-cao-quan-tri",
    "quan-ly-ban-hang": "quan-ly-ban-hang",

    // Parent KHÔNG phải module → null (chỉ hiển thị nếu có child)
    "quan-ly-nguoi-dung": null,
    "thiet-lap-he-thong": null,
    "quan-ly-khach-hang": null,
    "cham-soc-khach-hang": "cskh",
    "quan-ly-san-pham": null,
    "quan-ly-vat-tu": null,
    "quan-ly-tien-ich": "utilities",
    "quan-ly-thu-chi": null,
    "quan-ly-nhan-su": null,

    // Parent 1 cấp map về module khác
    "quan-ly-giao-hang": "giao-hang",
  };

  const resolveModuleForMenu = (parentKey: string, childKey?: string): string | null => {
    if (childKey) {
      const mapped = CHILD_TO_MODULE[childKey];
      if (Array.isArray(mapped)) {
        const ok = mapped.some((m) => hasMenu(m));
        return ok ? mapped[0] : null;
      }
      if (typeof mapped === "string") return mapped;
      if (grantedNames.has(childKey)) return childKey;
    }
    const parentMapped = PARENT_TO_MODULE[parentKey];
    if (typeof parentMapped === "string") return parentMapped;
    if (grantedNames.has(parentKey)) return parentKey;
    return null;
  };

  const filterByPermission = (src: any[]): any[] => {
    return src
      .map((item: any) => {
        // ❶ OWNER-ONLY: ẩn menu này nếu KHÔNG phải owner
        if (OWNER_ONLY_PARENTS.has(item.key) && !isOwner) {
          return null;
        }

        // ❷ Không có children → kiểm tra theo module được resolve từ parent key
        if (!item.children || item.children.length === 0) {
          const mod = resolveModuleForMenu(item.key) ?? "";
          return hasMenu(mod) ? item : null;
        }

        // ❸ Có children → kiểm theo child trước, nếu child không map được module thì fallback về parent
const filteredChildren = item.children.filter((child: any) => {
  // ✅ Ẩn 3 tab quản lý HR nếu KHÔNG phải admin/super_admin
  if (item.key === "quan-ly-nhan-su" && MANAGER_HR_KEYS.has(child.key) && !isAdminRole(roleCode)) {
    return false;
  }
  const mod = resolveModuleForMenu(item.key, child.key) ?? "";
  return hasMenu(mod);
});


        // ❹ Nếu không còn child nào, vẫn hiển thị parent nếu parent map về 1 module có quyền menu
        if (filteredChildren.length === 0) {
          const parentMod = resolveModuleForMenu(item.key) ?? "";
          return hasMenu(parentMod) ? { ...item, children: [] } : null;
        }

        return { ...item, children: filteredChildren };
      })
      .filter(Boolean);
  };

  const getSelectedKey = (sourceItems: any[]) => {
    const path = location.pathname;
    const currentPath = path.replace("/admin/", "");
    return sourceItems.map((item) => {
      if (!item.children) {
        return {
          ...item,
          className: currentPath === item.key ? "ant-menu-item-selected" : "",
        };
      }
      return {
        ...item,
        children: item.children.map((child: any) => {
          const pathChild = `${item.key}/${child.key}`;
          if (currentPath === pathChild) {
            return { ...child, className: "ant-menu-item-selected" };
          }
          return child;
        }),
      };
    });
  };

  const visibleItems = filterByPermission(items);
  const updatedItems = getSelectedKey(visibleItems);

  return {
    items: updatedItems,
    openKeys,
  };
};

export default useSidebar;
