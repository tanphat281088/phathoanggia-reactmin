import { Menu } from "antd";
import { Tag } from "antd";
import { Flex, Layout, Typography } from "antd";
import { DATA_CONSTANTS } from "../../utils/constant";
import useSidebar from "../../hooks/useSidebar";
import { getSidebar } from "../../helpers/sidebarHelper";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";

const SiderMain = ({
  sidebarWidth,
  collapsed,
  setCollapsed,
}: {
  sidebarWidth: number;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}) => {
  const { items, openKeys } = useSidebar();

  /** ================== QUY TẮC HIỂN THỊ/ẨN MENU (BỔ SUNG) ================== */
  // ✅ Luôn hiển thị nhóm "Quản lý vật tư"
 const ALWAYS_SHOW_KEYS = new Set<string>(["quan-ly-vat-tu", "quan-ly-thu-chi", "quan-ly-tien-ich",]);

  // ✅ Ẩn hoàn toàn nhóm "Quản lý kho"
  const BLACKLIST_KEYS = new Set<string>(["quan-ly-kho"]);

  // Lấy item gốc (đầy đủ children) từ danh sách raw (chưa lọc quyền)
  const rawAlways = items.filter((it: any) =>
    ALWAYS_SHOW_KEYS.has(String(it?.key))
  );

  // Lấy user (chỉ 1 lần, dùng cho getSidebar)
  const { user } = useSelector((state: RootState) => state.auth);

  // Giữ nguyên hành vi cũ: menu đã lọc theo quyền từ helper
  const filtered = getSidebar(items, user?.vai_tro?.phan_quyen) as any[];

  // Hợp nhất:
  //  - Nếu filtered đã có key "quan-ly-vat-tu" thì giữ nguyên
  //  - Nếu thiếu, bơm item raw vào (đảm bảo luôn hiển thị VT)
  const keyOf = (x: any) => String(x?.key ?? "");
  const existKeys = new Set(filtered.map(keyOf));
  const mergedSidebar = [
    ...filtered,
    ...rawAlways.filter((it) => !existKeys.has(keyOf(it))),
  ];


// Bảo đảm child "cashflow" luôn có trong nhóm "quan-ly-thu-chi"
const rawThuChi = items.find((it: any) => String(it?.key) === "quan-ly-thu-chi");
const idxThuChi = mergedSidebar.findIndex((it: any) => String(it?.key) === "quan-ly-thu-chi");

if (rawThuChi && idxThuChi >= 0) {
  const curChildren = mergedSidebar[idxThuChi]?.children || [];
  const curChildKeys = new Set<string>(curChildren.map((c: any) => String(c?.key ?? "")));

  // lấy đúng child 'cashflow' từ raw (không filter quyền)
  const cashflowChild = (rawThuChi.children || []).find(
    (c: any) => String(c?.key) === "cashflow"
  );

  if (cashflowChild && !curChildKeys.has("cashflow")) {
    mergedSidebar[idxThuChi] = {
      ...mergedSidebar[idxThuChi],
      children: [...curChildren, cashflowChild],
    };
  }

// ⬇️ Bơm child 'kiem-toan' nếu role có quyền showMenu+index mà bị filter mất
// (không bắt buộc vì getSidebar đã lọc theo quyền, nhưng thêm cho chắc kèo khi có custom merge)
let canShowKiemToan = false;
try {
  const pq = JSON.parse(user?.vai_tro?.phan_quyen || "[]");
  const mod = pq.find((r: any) => r?.name === "kiem-toan");
  canShowKiemToan = !!(mod?.actions?.showMenu && mod?.actions?.index);
} catch { /* ignore */ }

const kiemToanChild = (rawThuChi.children || []).find(
  (c: any) => String(c?.key) === "kiem-toan"
);

if (kiemToanChild && canShowKiemToan && !curChildKeys.has("kiem-toan")) {
  mergedSidebar[idxThuChi] = {
    ...mergedSidebar[idxThuChi],
    children: [...(mergedSidebar[idxThuChi]?.children || []), kiemToanChild],
  };
}


}

  // Áp dụng blacklist để ẩn hẳn "Quản lý kho"
  const finalSidebar = mergedSidebar.filter(
    (it: any) => !BLACKLIST_KEYS.has(keyOf(it))
  );
  /** ======================================================================== */

  // Giữ nguyên logic cũ: openKeys mặc định (mở thêm nhóm VT cho tiện)
  const defaultOpenKeys = openKeys.filter((key) => !["profile"].includes(key));
  if (!defaultOpenKeys.includes("quan-ly-vat-tu")) {
    defaultOpenKeys.push("quan-ly-vat-tu");
  }

  // (Giữ lại biến sidebar cũ để không phá cấu trúc; không còn dùng ở Menu)
  const sidebar = getSidebar(items, user?.vai_tro?.phan_quyen);

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
      onCollapse={(collapsed) => {
        setCollapsed(collapsed);
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
        defaultSelectedKeys={["1"]}
        defaultOpenKeys={defaultOpenKeys}
        // ⬇️ Dùng danh sách đã hợp nhất/ẩn kho cũ
        items={finalSidebar}
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
