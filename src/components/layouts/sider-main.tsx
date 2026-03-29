import { Menu, Tag, Flex, Layout, Typography } from "antd";
import { DATA_CONSTANTS } from "../../utils/constant";
import useSidebar from "../../hooks/useSidebar";
import { useLocation } from "react-router-dom";

const SiderMain = ({
  sidebarWidth,
  collapsed,
  setCollapsed,
}: {
  sidebarWidth: number;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}) => {
  const location = useLocation();

  // Lấy menu đã lọc theo quyền từ hook useSidebar
  const { items, openKeys } = useSidebar();

  // ===== Tính defaultOpenKeys (nhóm nào mở sẵn) =====
  const defaultOpenKeys = openKeys.filter((key) => !["profile"].includes(key));

  const pathAfterAdmin = location.pathname.replace(/^\/admin\/?/, "");

  const ensureOpen = (parentKey: string) => {
    if (
      pathAfterAdmin.startsWith(parentKey + "/") &&
      !defaultOpenKeys.includes(parentKey)
    ) {
      defaultOpenKeys.push(parentKey);
    }
  };

  // Mở các group phổ biến nếu đang đứng trong đó
  ensureOpen("quan-ly-khach-hang");
  ensureOpen("cham-soc-khach-hang");
  ensureOpen("quan-ly-san-pham");
  ensureOpen("quan-ly-thu-chi");
  ensureOpen("quan-ly-ban-hang");
  ensureOpen("quan-ly-nhan-su");

  return (
    <Layout.Sider
      breakpoint="lg"
      collapsedWidth="0"
      collapsed={collapsed}
      width={sidebarWidth}
      onBreakpoint={(broken) => {
        console.log(broken);
      }}
      className="custom-sidebar-scrollbar"
      onCollapse={(c) => {
        setCollapsed(c);
      }}
      style={{
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
        zIndex: 1001,
        background: "#001529",
      }}
    >
      <Flex
        className="logo"
        vertical
        justify="center"
        align="center"
        style={{
          height: "110px",
          color: "#fff",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          margin: "0 16px 16px 16px",
          padding: "0 8px",
          overflow: "hidden",
        }}
      >
        <Typography.Title
          level={2}
          style={{
            color: "#fff",
            fontWeight: "bold",
            margin: "8px 0",
            transition: "all 0.3s ease",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {DATA_CONSTANTS.WEBSITE_NAME}
        </Typography.Title>
        <Tag
          style={{
            fontSize: 14,
            fontWeight: "bold",
            padding: "4px 12px",
            transition: "all 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          {import.meta.env.VITE_PANEL_NAME}
        </Tag>
      </Flex>

      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={["dashboard"]}
        defaultOpenKeys={defaultOpenKeys}
        items={items} // 👈 dùng thẳng items từ useSidebar (đã lọc quyền)
        style={{
          fontSize: "15px",
          borderRight: "none",
          overflowY: "auto",
          maxHeight: "calc(100vh - 140px)",
        }}
      />
    </Layout.Sider>
  );
};

export default SiderMain;
