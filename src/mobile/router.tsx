// src/mobile/router.tsx
import type { RouteObject } from "react-router-dom";
import { Outlet } from "react-router-dom";
import MobileShell from "./MobileShell";

/** Trang mobile hiện có */
import CustomersPage from "./pages/customers/CustomersPage";
import UtilitiesPage from "./pages/utilities/UtilitiesPage";
import HomeTodayPage from "./pages/home/HomeTodayPage";
import DeliverySchedulePage from "./pages/delivery/DeliverySchedulePage";
import SalesQuickPage from "./pages/sales/SalesQuickPage";
import CustomerEditPage from "./pages/customers/CustomerEditPage";
import CustomerCreatePage from "./pages/customers/CustomerCreatePage";
import OrdersPage from "./pages/sales/OrdersPage";

/**
 * NEW:
 * Tạm thời dùng luôn page desktop Chấm công nhân viên cho nhánh mobile
 * để có thể chạy ngay luồng GPS + face + workpoint.
 *
 * Sau này nếu anh muốn tôi sẽ tách riêng 1 page mobile-native.
 */
import ChamCongNhanVien from "../pages/NhanSu/ChamCongNhanVien";

/** ====== ROUTE OBJECT CHO MINI-APP ====== */
export const mobileRoute: RouteObject = {
  path: "/admin/m",
  element: <MobileShell />,
  children: [
    { index: true, element: <HomeTodayPage /> },             // /admin/m
    { path: "sales", element: <SalesQuickPage /> },          // /admin/m/sales
    { path: "sales/orders", element: <OrdersPage /> },       // /admin/m/sales/orders
    { path: "delivery", element: <DeliverySchedulePage /> }, // /admin/m/delivery

    /** CRM mobile */
    { path: "customers", element: <CustomersPage /> },       // /admin/m/customers
    { path: "customers/new", element: <CustomerCreatePage /> },
    { path: "customers/:id/edit", element: <CustomerEditPage /> },

    /** Utilities mobile */
    { path: "utilities", element: <UtilitiesPage /> },       // /admin/m/utilities

    /** NEW: Chấm công mobile */
    { path: "attendance", element: <ChamCongNhanVien /> },   // /admin/m/attendance
  ],
};

export const mobileRoutes: RouteObject[] = [mobileRoute];

export default function MobileRoutesElement() {
  return <Outlet />;
}