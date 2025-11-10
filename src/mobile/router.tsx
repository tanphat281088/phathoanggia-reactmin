// src/mobile/router.tsx
import type { RouteObject } from "react-router-dom";
import { Outlet } from "react-router-dom";
import MobileShell from "./MobileShell";

/** ✅ NEW: import trang Customers (mobile) */
import CustomersPage from "./pages/customers/CustomersPage";

import UtilitiesPage from "./pages/utilities/UtilitiesPage";
import HomeTodayPage from "./pages/home/HomeTodayPage";
import DeliverySchedulePage from "./pages/delivery/DeliverySchedulePage";
import SalesQuickPage from "./pages/sales/SalesQuickPage";
import CustomerEditPage from "./pages/customers/CustomerEditPage";
import CustomerCreatePage from "./pages/customers/CustomerCreatePage";
import OrdersPage from "./pages/sales/OrdersPage"; // ← thêm import
import OrderDetailPage from "./pages/sales/OrderDetailPage";




/** ====== STUB PAGES (giữ tạm các trang khác để build ổn định) ====== */
function HomeTodayStub() {
  return (
    <div style={{ padding: 12 }}>
      <h3>Hôm nay</h3>
      <p>Tổng quan nhanh + Đơn hôm nay + Lịch giao hôm nay.</p>
    </div>
  );
}
function SalesQuickStub() {
  return (
    <div style={{ padding: 12 }}>
      <h3>Bán hàng</h3>
      <p>Tạo đơn nhanh, xem đơn của tôi.</p>
    </div>
  );
}
function DeliveryScheduleStub() {
  return (
    <div style={{ padding: 12 }}>
      <h3>Giao hàng</h3>
      <p>Lịch tổng, cập nhật trạng thái, gửi thông báo.</p>
    </div>
  );
}
function UtilitiesStub() {
  return (
    <div style={{ padding: 12 }}>
      <h3>Tiện ích</h3>
      <p>Inbox Facebook/Zalo (bản rút gọn), công cụ nhanh.</p>
    </div>
  );
}

/** ====== ROUTE OBJECT CHO MINI-APP ====== */
export const mobileRoute: RouteObject = {
  path: "/admin/m",
  element: <MobileShell />,
  children: [
  { index: true, element: <HomeTodayPage /> },      // /admin/m
  { path: "sales", element: <SalesQuickPage /> },    
   { path: "sales/orders", element: <OrdersPage /> },   // /admin/m/sales
      { path: "orders/:id", element: <OrderDetailPage /> }, // /admin/m/orders/:id
   { path: "delivery", element: <DeliverySchedulePage /> }, // /admin/m/delivery


    /** ✅ Dùng CustomersPage thật thay cho stub */
    { path: "customers", element: <CustomersPage /> },  
     { path: "customers/new", element: <CustomerCreatePage /> },
    { path: "customers/:id/edit", element: <CustomerEditPage /> },     // /admin/m/customers
    { path: "utilities", element: <UtilitiesPage /> },  // /admin/m/utilities
  ],
};

export const mobileRoutes: RouteObject[] = [mobileRoute];

export default function MobileRoutesElement() {
  return <Outlet />;
}
