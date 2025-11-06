import type { NavigateFunction } from "react-router-dom";
import React from "react";
import { URL_CONSTANTS } from "./api-route-config";
import {
  Clock,
  Cog,
  LayoutDashboard,
  Settings,
  ShieldUser,
  User,
  UsersRound,
  FileUp,
  Warehouse,
  Boxes,
  Layers2,
  Container,
  SquareMenu,
  NotepadText,
  Package2,
  Wallet,
  PanelBottomOpen,
  HandCoins,
  PanelTopOpen,
  Factory,
  Waypoints,
  PackagePlus,
  BarChart3,     // Báo cáo thu chi
  Truck,         // Quản lý giao hàng
  CalendarDays,  // Ngày lễ (Holiday)
  CalendarCheck2,// Bảng công
  HeartHandshake // ✅ Icon cho Chăm sóc khách hàng
} from "lucide-react";

import { MessageCircle } from "lucide-react";


const iconStyle = { fontSize: "18px" };

export const sidebarConfig = (navigate: NavigateFunction) => {
  return [
    {
      key: "dashboard",
      label: "Thống kê",
      icon: React.createElement(LayoutDashboard, { style: iconStyle }),
      onClick: () => navigate(URL_CONSTANTS.DASHBOARD),
    },

    // ===== Quản lý người dùng =====
    {
      key: "quan-ly-nguoi-dung",
      label: "Quản lý người dùng",
      icon: React.createElement(UsersRound, { style: iconStyle }),
      children: [
        {
          key: "nguoi-dung",
          label: "Danh sách người dùng",
          icon: React.createElement(User, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.NGUOI_DUNG),
        },
        {
          key: "vai-tro",
          label: "Danh sách vai trò",
          icon: React.createElement(ShieldUser, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.VAI_TRO),
        },
      ],
    },

    // ===== Thiết lập hệ thống =====
    {
      key: "thiet-lap-he-thong",
      label: "Thiết lập hệ thống",
      icon: React.createElement(Settings, { style: iconStyle }),
      children: [
        {
          key: "cau-hinh-chung",
          label: "Cấu hình chung",
          icon: React.createElement(Cog, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.CAU_HINH_CHUNG),
        },
        {
          key: "thoi-gian-lam-viec",
          label: "Thời gian làm việc",
          icon: React.createElement(Clock, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.THOI_GIAN_LAM_VIEC),
        },
      ],
    },

    // ===== Lịch sử import =====
    {
      key: "lich-su-import",
      label: "Lịch sử import",
      icon: React.createElement(FileUp, { style: iconStyle }),
      onClick: () => navigate(URL_CONSTANTS.LICH_SU_IMPORT),
    },

    // ===== Quản lý khách hàng =====
    {
      key: "quan-ly-khach-hang",
      label: "Quản lý khách hàng",
      icon: React.createElement(UsersRound, { style: iconStyle }),
      children: [
        {
          key: "loai-khach-hang",
          label: "Loại khách hàng",
          icon: React.createElement(User, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.LOAI_KHACH_HANG),
        },
        {
          key: "khach-hang",
          label: "Danh sách khách hàng",
          icon: React.createElement(User, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.KHACH_HANG),
        },
        {
          key: "khach-hang-vang-lai",
          label: "Khách hàng vãng lai",
          icon: React.createElement(User, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.KHACH_HANG_VANG_LAI),
        },
      ],
    },

    // ===== ✅✅ Chăm sóc khách hàng =====
    {
      key: "cham-soc-khach-hang",
      label: "Chăm sóc khách hàng",
      icon: React.createElement(HeartHandshake, { style: iconStyle }),
      children: [
        {
          key: "diem-thanh-vien",
          label: "Điểm thành viên",
          icon: React.createElement(HeartHandshake, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.CSKH_POINTS), // "/admin/cham-soc-khach-hang/diem-thanh-vien"
        },
      ],
    },

    // ===== Quản lý sản phẩm =====
    {
      key: "quan-ly-san-pham",
      label: "Quản lý sản phẩm",
      icon: React.createElement(Boxes, { style: iconStyle }),
      children: [
        {
          key: "nha-cung-cap",
          label: "Nhà cung cấp",
          icon: React.createElement(Warehouse, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.NHA_CUNG_CAP),
        },
        {
          key: "danh-muc-san-pham",
          label: "Danh mục sản phẩm",
          icon: React.createElement(Layers2, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.DANH_MUC_SAN_PHAM),
        },
        {
          key: "don-vi-tinh",
          label: "Đơn vị tính",
          icon: React.createElement(Container, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.DON_VI_TINH),
        },
        {
          key: "san-pham",
          label: "Sản phẩm/Nguyên liệu",
          icon: React.createElement(SquareMenu, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.SAN_PHAM),
        },
      ],
    },




    // ===== Quản lý vật tư =====
    {
      key: "quan-ly-vat-tu",
      label: "Quản lý vật tư",
      icon: React.createElement(Package2, { style: iconStyle }),
      children: [
        {
          key: "vt-items",
          label: "Danh mục VT",
          icon: React.createElement(SquareMenu, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.VT_ITEMS),       // /admin/vt/items
        },
        {
          key: "vt-receipts",
          label: "Phiếu nhập VT",
          icon: React.createElement(NotepadText, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.VT_RECEIPTS),    // /admin/vt/receipts
        },
        {
          key: "vt-issues",
          label: "Phiếu xuất VT",
          icon: React.createElement(NotepadText, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.VT_ISSUES),      // /admin/vt/issues
        },
        {
          key: "vt-stocks",
          label: "Tồn & Sổ kho",
          icon: React.createElement(BarChart3, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.VT_STOCKS),      // /admin/vt/stocks
        },
      ],
    },


{
  key: "quan-ly-tien-ich",
  label: "Quản lý tiện ích",
  icon: React.createElement(Settings, { style: iconStyle }),
  children: [
    {
      key: "fb-inbox",
      label: "Tư vấn Facebook",
      icon: React.createElement(MessageCircle, { style: iconStyle }),
      onClick: () => navigate(URL_CONSTANTS.UTILITIES_FB_INBOX),
    },

        {
      key: "zl-inbox",
      label: "Tư vấn Zalo",
      icon: React.createElement(MessageCircle, { style: iconStyle }),
      onClick: () => navigate(URL_CONSTANTS.UTILITIES_ZL_INBOX),
    },

  ],
},



    // ===== Quản lý thu chi =====
    {
      key: "quan-ly-thu-chi",
      label: "Quản lý thu chi",
      icon: React.createElement(Wallet, { style: iconStyle }),
      children: [
        {
          key: "phieu-thu",
          label: "Phiếu thu",
          icon: React.createElement(PanelTopOpen, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.PHIEU_THU),
        },
        {
          key: "phieu-chi",
          label: "Phiếu chi",
          icon: React.createElement(PanelBottomOpen, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.PHIEU_CHI),
        },
        {
          key: "bao-cao",
          label: "Báo cáo thu chi",
          icon: React.createElement(BarChart3, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.BAO_CAO_THU_CHI),

        },

// ⬇️ DÁN KHỐI NÀY NGAY SAU “Báo cáo thu chi”
    {
      key: "cashflow",
      label: "Quản lý dòng tiền",
      icon: React.createElement(HandCoins, { style: iconStyle }),
      onClick: () => navigate(URL_CONSTANTS.CASHFLOW), // "/admin/quan-ly-thu-chi/cashflow"
    },

{
  key: "cong-no-khach-hang",
  label: "Công nợ khách hàng",
  icon: React.createElement(Wallet, { style: iconStyle }),
  onClick: () => navigate(URL_CONSTANTS.CONG_NO_KH),
},


      ],
    },

    // ===== Quản lý bán hàng =====
    {
      key: "quan-ly-ban-hang",
      label: "Quản lý bán hàng",
      icon: React.createElement(HandCoins, { style: iconStyle }),
      onClick: () => navigate(URL_CONSTANTS.QUAN_LY_BAN_HANG),
    },

    // ===== Quản lý giao hàng =====
    {
      key: "quan-ly-giao-hang",
      label: "Quản lý giao hàng",
      icon: React.createElement(Truck, { style: iconStyle }),
      onClick: () => navigate(URL_CONSTANTS.QUAN_LY_GIAO_HANG),
    },

    // =========================================
    // ✅✅ Quản lý nhân sự (HR)
    // =========================================
    {
      key: "quan-ly-nhan-su",
      label: "Quản lý nhân sự",
      icon: React.createElement(UsersRound, { style: iconStyle }),
      children: [
        {
          key: "nhan-su-cham-cong",
          label: "Chấm công",
          icon: React.createElement(Clock, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.NHAN_SU_CHAM_CONG),
        },
        {
          key: "nhan-su-duyet-cham-cong",
          label: "Duyệt chấm công",
          icon: React.createElement(ShieldUser, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.NHAN_SU_CHAM_CONG_ADMIN),
        },
        // ---- Đơn từ
        {
          key: "nhan-su-don-tu-cua-toi",
          label: "Đơn từ của tôi",
          icon: React.createElement(NotepadText, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.NHAN_SU_DON_TU_MY),
        },
        {
          key: "nhan-su-don-tu",
          label: "Đơn từ (Quản lý)",
          icon: React.createElement(NotepadText, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.NHAN_SU_DON_TU_QUAN_LY),
        },
        // ---- Bảng công
        {
          key: "nhan-su-bang-cong-cua-toi",
          label: "Bảng công của tôi",
          icon: React.createElement(CalendarCheck2, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.NHAN_SU_BANG_CONG_MY),
        },
        {
          key: "nhan-su-bang-cong",
          label: "Bảng công (Quản lý)",
          icon: React.createElement(CalendarCheck2, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.NHAN_SU_BANG_CONG_QUAN_LY),
        },
        // ---- Ngày lễ
        {
          key: "nhan-su-holiday",
          label: "Ngày lễ",
          icon: React.createElement(CalendarDays, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.NHAN_SU_HOLIDAY),
        },
      ],
    },

    // ===== Báo cáo quản trị =====
    {
      key: "bao-cao-quan-tri",
      label: "Báo cáo quản trị",
      icon: React.createElement(BarChart3, { style: iconStyle }),
      children: [
        {
          key: "bao-cao-kqkd",
          label: "Báo cáo KQKD",
          icon: React.createElement(BarChart3, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.BAO_CAO_KQKD), // "/admin/bao-cao-quan-tri/kqkd"
        },
      ],
    },

    // ===== Quản lý sản xuất =====
    {
      key: "quan-ly-san-xuat",
      label: "Quản lý sản xuất",
      icon: React.createElement(Factory, { style: iconStyle }),
      children: [
        {
          key: "cong-thuc-san-xuat",
          label: "Công thức sản xuất",
          icon: React.createElement(Waypoints, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.CONG_THUC_SAN_XUAT),
        },
        {
          key: "san-xuat",
          label: "Sản xuất",
          icon: React.createElement(PackagePlus, { style: iconStyle }),
          onClick: () => navigate(URL_CONSTANTS.SAN_XUAT),
        },
      ],
    },
  ];
};
