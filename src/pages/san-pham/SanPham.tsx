import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import DanhSachSanPham from "./DanhSachSanPham";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import ThemSanPham from "./ThemSanPham";
import ThemGoiDichVu from "./ThemGoiDichVu";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";

const path = API_ROUTE_CONFIG.SAN_PHAM;
// 🔹 Giờ chỉ còn DỊCH VỤ
const title = "Dịch vụ";

const SanPham = () => {
  const { isMobile } = useResponsive();

  const permission = usePermission(path);

  return (
    <>
      <div>
        <Flex
          vertical={isMobile}
          justify={isMobile ? "center" : "space-between"}
          align={isMobile ? "" : "center"}
          style={{ marginBottom: isMobile ? 20 : 0 }}
        >
          {/* Heading: Dịch vụ */}
          <Heading title="Dịch vụ" />
          <Col
            span={isMobile ? 24 : 12}
            style={{
              display: "flex",
              justifyContent: isMobile ? "" : "flex-end",
              alignItems: "center",
              gap: 10,
            }}
          >
            {permission.create && (
              <>
                {/* Tạo chi tiết dịch vụ / thiết bị */}
                <ThemSanPham path={path} title={title} />
                {/* Tạo gói dịch vụ */}
                <ThemGoiDichVu path={path} title={title} />
              </>
            )}
          </Col>
        </Flex>
        <Row>
          <Col span={24}>
            {permission.index && (
              // 🔹 Không còn Tabs, chỉ còn 1 list dịch vụ
              <DanhSachSanPham
                path={path}
                permission={permission}
                title={title}
              />
            )}
          </Col>
        </Row>
      </div>
    </>
  );
};

export default SanPham;
