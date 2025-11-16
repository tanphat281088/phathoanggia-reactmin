import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { TabBar, ConfigProvider } from "antd-mobile";
import "./theme.css";               // 🌸 Pastel Pink tokens chỉ áp dụng cho mobile
import viLocale from "./viLocale";  // JSON locale vi-VN (đã tạo ở src/mobile/viLocale.ts)

/**
 * PHG Event — Mobile Shell (tone pastel hồng)
 * - Dùng cho /admin/m/*
 * - Không ảnh hưởng UI desktop
 */
export default function MobileShell() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  // Active tab dựa vào URL hiện tại
  // /admin/m          -> "/"
  // /admin/m/sales    -> "/sales"
  // /admin/m/delivery -> "/delivery"
  // /admin/m/customers-> "/customers"
  // /admin/m/utilities-> "/utilities"
  const activeKey = (() => {
    const p = pathname.replace(/^\/admin\/m\/?/, ""); // "" | "sales" | ...
    return p ? `/${p.split("/")[0]}` : "/";
  })();

  const go = (key: string) => nav(`/admin/m${key === "/" ? "" : key}`);

  return (
    <ConfigProvider locale={viLocale as any}>
      <div className="min-h-screen bg-white flex flex-col" style={{ minHeight: "100dvh" }}>
        {/* Header pastel */}
        <div className="phg-header" style={{ padding: "12px 16px" }}>
          <div className="phg-title">PHG ERP phiên bản Mobile</div>
          <div className="phg-subtitle">Developed by Phat13</div>
        </div>

        {/* Nội dung trang con */}
        <div className="phg-scroll" style={{ flex: 1 }}>
          <Outlet />
        </div>

        {/* TabBar */}
        <div className="phg-tabbar">
          <TabBar safeArea activeKey={activeKey} onChange={go}>
            <TabBar.Item key="/" title="Hôm nay" icon="🏠" />
            <TabBar.Item key="/sales" title="Bán hàng" icon="🛒" />
            <TabBar.Item key="/delivery" title="Giao hàng" icon="🚚" />
            <TabBar.Item key="/customers" title="Khách hàng" icon="👤" />
            <TabBar.Item key="/utilities" title="Tiện ích" icon="🧰" />
          </TabBar>
        </div>
      </div>
    </ConfigProvider>
  );
}
