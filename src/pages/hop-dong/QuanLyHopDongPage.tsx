// /src/pages/hop-dong/QuanLyHopDongPage.tsx

import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";
import DanhSachHopDong from "./DanhSachHopDong";

const path = API_ROUTE_CONFIG.HOP_DONG;
const title = "Quản lý hợp đồng";

const QuanLyHopDongPage = () => {
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
          {/* Giai đoạn 1: KHÔNG cho tạo HĐ trực tiếp ở đây.
              Hợp đồng được khởi tạo từ màn Quản lý báo giá (Chuyển HĐ).
              Sau này nếu anh muốn thêm nút "Tạo HĐ từ báo giá" tại đây thì mình bổ sung. */}
        </Col>
      </Flex>

      <Row>
        <Col span={24}>
          {permission.index && (
            <DanhSachHopDong path={path} permission={permission} title={title} />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default QuanLyHopDongPage;
