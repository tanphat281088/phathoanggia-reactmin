import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { TabBar, ConfigProvider } from "antd-mobile";
import "./theme.css";
import viLocale from "./viLocale";

/**
 * PHG ERP — Mobile Shell
 * - Dùng cho /admin/m/*
 * - Thêm tab Chấm công
 */
export default function MobileShell() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  // /admin/m              -> "/"
  // /admin/m/sales        -> "/sales"
  // /admin/m/attendance   -> "/attendance"
  const activeKey = (() => {
    const p = pathname.replace(/^\/admin\/m\/?/, "");
    return p ? `/${p.split("/")[0]}` : "/";
  })();

  const go = (key: string) => nav(`/admin/m${key === "/" ? "" : key}`);

  return (
    <ConfigProvider locale={viLocale as any}>
      <div className="min-h-screen bg-white flex flex-col" style={{ minHeight: "100dvh" }}>
        {/* Header */}
        <div className="phg-header" style={{ padding: "12px 16px" }}>
          <div className="phg-title">PHG ERP — Mobile</div>
          <div className="phg-subtitle">Sales • Delivery • CRM • Attendance</div>
        </div>

        {/* Nội dung */}
        <div className="phg-scroll" style={{ flex: 1 }}>
          <Outlet />
        </div>

        {/* TabBar */}
        <div className="phg-tabbar">
          <TabBar safeArea activeKey={activeKey} onChange={go}>
            <TabBar.Item key="/" title="Hôm nay" icon="🏠" />
            <TabBar.Item key="/attendance" title="Chấm công" icon="📍" />
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