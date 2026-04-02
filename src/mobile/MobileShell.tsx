import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { TabBar, ConfigProvider } from "antd-mobile";
import "./theme.css";
import viLocale from "./viLocale";

export default function MobileShell() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  const activeKey = (() => {
    const p = pathname.replace(/^\/admin\/m\/?/, "");
    return p ? `/${p.split("/")[0]}` : "/attendance";
  })();

  const go = (key: string) => nav(`/admin/m${key}`);

  return (
    <ConfigProvider locale={viLocale as any}>
      <div className="min-h-screen bg-white flex flex-col" style={{ minHeight: "100dvh" }}>
        <div className="phg-header" style={{ padding: "12px 16px" }}>
          <div className="phg-title">PHG ERP — Mobile</div>
          <div className="phg-subtitle">Attendance • Đơn từ • Thông báo</div>
        </div>

        <div className="phg-scroll" style={{ flex: 1 }}>
          <Outlet />
        </div>

        <div className="phg-tabbar">
          <TabBar safeArea activeKey={activeKey} onChange={go}>
            <TabBar.Item key="/attendance" title="Chấm công" icon="📍" />
            <TabBar.Item key="/don-tu" title="Đơn từ" icon="📝" />
            <TabBar.Item key="/thong-bao" title="Thông báo" icon="📢" />
          </TabBar>
        </div>
      </div>
    </ConfigProvider>
  );
}
