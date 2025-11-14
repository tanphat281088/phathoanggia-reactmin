import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import DanhSachKhachHangPassCtv from "./DanhSachKhachHangPassCtv";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";

const path = API_ROUTE_CONFIG.KHACH_HANG_PASS_CTV;
const title = "Khách hàng Pass đơn & CTV";

const KhachHangPassCtv = () => {
  const { isMobile } = useResponsive();

  const permission = usePermission(path);

  return (
    <div>
      <Flex
        vertical={isMobile}
        justify={isMobile ? "center" : "space-between"}
        align={isMobile ? "" : "center"}
        style={{ marginBottom: isMobile ? 20 : 0 }}
      >
        <Heading title={title} />
        <Col
          span={isMobile ? 24 : 12}
          style={{
            display: "flex",
            justifyContent: isMobile ? "" : "flex-end",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* Module này chỉ theo dõi & chuyển đổi, KHÔNG tạo mới trực tiếp */}
        </Col>
      </Flex>
      <Row>
        <Col span={24}>
          {permission.index && (
            <DanhSachKhachHangPassCtv
              path={path}
              permission={permission}
              title={title}
            />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default KhachHangPassCtv;
