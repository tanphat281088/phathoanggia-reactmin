import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import NguoiDung from "../pages/nguoi-dung/NguoiDung";
import LoginMiddleware from "../middlewares/LoginMiddleware";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import MainLayout from "../components/layouts/main-layout";
import AuthLayout from "../components/layouts/auth-layout";
import ThoiGianLamViec from "../pages/thoi-gian-lam-viec/ThoiGianLamViec";
import CauHinhChung from "../pages/cau-hinh-chung/CauHinhChung";
import VerifyOTP from "../pages/VerifyOTP";
import VaiTro from "../pages/vai-tro/VaiTro";
import Profile from "../pages/Profile";
import LoaiKhachHang from "../pages/loai-khach-hang/LoaiKhachHang";
import LichSuImport from "../pages/lich-su-import/LichSuImport";
import KhachHang from "../pages/khach-hang/KhachHang";
import NhaCungCap from "../pages/nha-cung-cap/NhaCungCap";
import DanhMucSanPham from "../pages/danh-muc-san-pham/DanhMucSanPham";
import DonViTinh from "../pages/don-vi-tinh/DonViTinh";
import SanPham from "../pages/san-pham/SanPham";
import PhieuNhapKho from "../pages/phieu-nhap-kho/PhieuNhapKho";
import QuanLyTonKho from "../pages/quan-ly-ton-kho/QuanLyTonKho";
import PhieuChi from "../pages/phieu-chi/PhieuChi";
import QuanLyBanHang from "../pages/quan-ly-ban-hang/QuanLyBanHang";
import QuanLyGiaoHang from "../pages/giao-hang/QuanLyGiaoHang"; // MỚI
import PhieuXuatKho from "../pages/phieu-xuat-kho/PhieuXuatKho";
import PhieuThu from "../pages/phieu-thu/PhieuThu";
import CongThucSanXuat from "../pages/cong-thuc-san-xuat/CongThucSanXuat";
import SanXuat from "../pages/san-xuat/SanXuat";
import SignMakerPage from "../pages/sign-maker/SignMakerPage";

/** ✅ Import mới cho trang Báo cáo thu chi */
import BaoCaoThuChi from "../pages/thu-chi/BaoCaoThuChi";

/** ✅ Import mới: Khách hàng vãng lai */
import KHVangLai from "../pages/khach-hang/KHVangLai";

/** ✅✅ Import mới: Nhân sự (HR) */
import ChamCongNhanVien from "../pages/NhanSu/ChamCongNhanVien";
import ChamCongQuanLy from "../pages/NhanSu/ChamCongQuanLy";

// === HR: Đơn từ / Bảng công / Holiday (đồng bộ chữ hoa-thường với thư mục NhanSu) ===
import DonTuCuaToi from "../pages/NhanSu/DonTuCuaToi";
import DonTuQuanLy from "../pages/NhanSu/DonTuQuanLy";
import BangCongCuaToi from "../pages/NhanSu/BangCongCuaToi";
import BangCongQuanLy from "../pages/NhanSu/BangCongQuanLy";
import HolidayAdmin from "../pages/NhanSu/HolidayAdmin";
import BaoCaoQuanTri from "../pages/bao-cao-quan-tri";

/** ✅✅✅ Import mới: CSKH → Điểm thành viên */
import MemberPointList from "../pages/cskh/MemberPointList";

import { URL_CONSTANTS } from "./api-route-config";

import VtItemsPage from "../pages/vt/VtItemsPage";
import VtReceiptsPage from "../pages/vt/VtReceiptsPage";
import VtIssuesPage from "../pages/vt/VtIssuesPage";
import VtStocksLedgerPage from "../pages/vt/VtStocksLedgerPage";
import CashflowPage from "../pages/thu-chi/CashflowPage";

import FbInboxPage from "../pages/utilities/FbInboxPage";

import ZaloInboxPage from "../pages/utilities/ZaloInboxPage";



export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/admin" />,
  },
  {
    path: "/admin",
    children: [
      {
        index: true,
        element: (
          <LoginMiddleware>
            <AuthLayout title="ĐĂNG NHẬP">
              <LoginPage />
            </AuthLayout>
          </LoginMiddleware>
        ),
      },
      {
        path: "forgot-password",
        element: (
          <AuthLayout title="QUÊN MẬT KHẨU">
            <ForgotPassword />
          </AuthLayout>
        ),
      },
      {
        path: "reset-password",
        element: (
          <AuthLayout title="ĐẶT LẠI MẬT KHẨU">
            <ResetPassword />
          </AuthLayout>
        ),
      },
      {
        path: "verify-otp",
        element: (
          <AuthLayout title="XÁC THỰC OTP">
            <VerifyOTP />
          </AuthLayout>
        ),
      },
      {
        path: "profile",
        element: <MainLayout />,
        children: [{ index: true, element: <Profile /> }],
      },
      {
        path: "dashboard",
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
        ],
      },
      {
        path: "lich-su-import",
        element: <MainLayout />,
        children: [{ index: true, element: <LichSuImport /> }],
      },
      {
        path: "quan-ly-nguoi-dung",
        children: [
          {
            path: "nguoi-dung",
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <NguoiDung />,
              },
            ],
          },
          {
            path: "vai-tro",
            element: <MainLayout />,
            children: [{ index: true, element: <VaiTro /> }],
          },
        ],
      },
      {
        path: "thiet-lap-he-thong",
        children: [
          {
            path: "cau-hinh-chung",
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <CauHinhChung />,
              },
            ],
          },
          {
            path: "thoi-gian-lam-viec",
            element: <MainLayout />,
            children: [{ index: true, element: <ThoiGianLamViec /> }],
          },
        ],
      },
      {
        path: "quan-ly-khach-hang",
        children: [
          {
            path: "loai-khach-hang",
            element: <MainLayout />,
            children: [{ index: true, element: <LoaiKhachHang /> }],
          },
          {
            path: "khach-hang",
            element: <MainLayout />,
            children: [{ index: true, element: <KhachHang /> }],
          },
          /** ✅ Route mới: Khách hàng vãng lai */
          {
            path: "khach-hang-vang-lai",
            element: <MainLayout />,
            children: [{ index: true, element: <KHVangLai /> }],
          },
        ],
      },

      /** ✅✅ NHÓM MỚI: Chăm sóc khách hàng */
      {
        path: "cham-soc-khach-hang",
        children: [
          {
            path: "diem-thanh-vien",
            element: <MainLayout />,
            children: [{ index: true, element: <MemberPointList /> }],
          },
        ],
      },

      {
        path: "quan-ly-san-pham",
        children: [
          {
            path: "nha-cung-cap",
            element: <MainLayout />,
            children: [{ index: true, element: <NhaCungCap /> }],
          },
          {
            path: "danh-muc-san-pham",
            element: <MainLayout />,
            children: [{ index: true, element: <DanhMucSanPham /> }],
          },
          {
            path: "don-vi-tinh",
            element: <MainLayout />,
            children: [{ index: true, element: <DonViTinh /> }],
          },
          {
            path: "san-pham",
            element: <MainLayout />,
            children: [{ index: true, element: <SanPham /> }],
          },
        ],
      },
      {
        path: "quan-ly-kho",
        children: [
          {
            path: "phieu-nhap-kho",
            element: <MainLayout />,
            children: [{ index: true, element: <PhieuNhapKho /> }],
          },
          {
            path: "phieu-xuat-kho",
            element: <MainLayout />,
            children: [{ index: true, element: <PhieuXuatKho /> }],
          },
          {
            path: "quan-ly-ton-kho",
            element: <MainLayout />,
            children: [{ index: true, element: <QuanLyTonKho /> }],
          },
        ],
      },

{ path: URL_CONSTANTS.VT_ITEMS, element: <MainLayout />, children: [{ index: true, element: <VtItemsPage /> }] },
{ path: URL_CONSTANTS.VT_RECEIPTS, element: <MainLayout />, children: [{ index: true, element: <VtReceiptsPage /> }] },
{ path: URL_CONSTANTS.VT_ISSUES, element: <MainLayout />, children: [{ index: true, element: <VtIssuesPage /> }] },
{ path: URL_CONSTANTS.VT_STOCKS, element: <MainLayout />, children: [{ index: true, element: <VtStocksLedgerPage /> }] },

// ✅ Quản lý tiện ích → Tư vấn Facebook
{
  path: "utilities/fb-inbox",
  element: <MainLayout />,
  children: [{ index: true, element: <FbInboxPage /> }],
},


// ✅ Quản lý tiện ích → Tư vấn Zalo
{
  path: "utilities/zl-inbox", // (tương ứng URL_CONSTANTS.UTILITIES_ZL_INBOX)
  element: <MainLayout />,
  children: [{ index: true, element: <ZaloInboxPage /> }],
},



      {
        path: "quan-ly-thu-chi",
        children: [
          {
            path: "phieu-chi",
            element: <MainLayout />,
            children: [{ index: true, element: <PhieuChi /> }],
          },
          {
            path: "phieu-thu",
            element: <MainLayout />,
            children: [{ index: true, element: <PhieuThu /> }],
          },
          /** ✅ Route mới: Báo cáo thu chi */
          {
            path: "bao-cao",
            element: <MainLayout />,
            children: [{ index: true, element: <BaoCaoThuChi /> }],
          },

        {
      path: "cashflow",
      element: <MainLayout />,
      children: [{ index: true, element: <CashflowPage /> }],
    },

        ],
      },

      // ===== Báo cáo quản trị =====
      {
        path: "bao-cao-quan-tri",
        element: <MainLayout />,
        children: [
          { index: true, element: <BaoCaoQuanTri /> },   // /admin/bao-cao-quan-tri
          { path: "kqkd", element: <BaoCaoQuanTri /> },  // /admin/bao-cao-quan-tri/kqkd
        ],
      },

      {
        path: "quan-ly-ban-hang",
        element: <MainLayout />,
        children: [{ index: true, element: <QuanLyBanHang /> }],
      },
      {
        path: "quan-ly-giao-hang", // MỚI
        element: <MainLayout />,
        children: [{ index: true, element: <QuanLyGiaoHang /> }],
      },

      {
        path: "quan-ly-san-xuat",
        children: [
          {
            path: "cong-thuc-san-xuat",
            element: <MainLayout />,
            children: [{ index: true, element: <CongThucSanXuat /> }],
          },
          {
            path: "san-xuat",
            element: <MainLayout />,
            children: [{ index: true, element: <SanXuat /> }],
          },
        ],
      },
      /** ✅ NHÓM MỚI: Công cụ → Sign Maker */
      {
        path: "cong-cu",
        children: [
          {
            path: "sign-maker",
            element: <MainLayout />,
            children: [{ index: true, element: <SignMakerPage /> }],
          },
        ],
      },

      /** ✅✅ NHÓM MỚI: Quản lý nhân sự (HR) */
      {
        path: "quan-ly-nhan-su",
        children: [
          {
            path: "cham-cong",
            element: <MainLayout />,
            children: [{ index: true, element: <ChamCongNhanVien /> }],
          },
          {
            path: "duyet-cham-cong",
            element: <MainLayout />,
            children: [{ index: true, element: <ChamCongQuanLy /> }],
          },

          // === Đơn từ
          {
            path: "don-tu-cua-toi",
            element: <MainLayout />,
            children: [{ index: true, element: <DonTuCuaToi /> }],
          },
          {
            path: "don-tu",
            element: <MainLayout />,
            children: [{ index: true, element: <DonTuQuanLy /> }],
          },

          // === Bảng công
          {
            path: "bang-cong-cua-toi",
            element: <MainLayout />,
            children: [{ index: true, element: <BangCongCuaToi /> }],
          },
          {
            path: "bang-cong",
            element: <MainLayout />,
            children: [{ index: true, element: <BangCongQuanLy /> }],
          },

          // === Ngày lễ (Holiday)
          {
            path: "holiday",
            element: <MainLayout />,
            children: [{ index: true, element: <HolidayAdmin /> }],
          },
        ],
      },
    ],
  },
]);
