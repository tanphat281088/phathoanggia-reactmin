import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";
import DanhSachQuanLyChiPhiDeXuat from "./DanhSachQuanLyChiPhiDeXuat";

const path = "/quan-ly-chi-phi/de-xuat"; // sẽ đồng bộ với API_ROUTE_CONFIG sau
const title = "QLCP Đề xuất";

const QuanLyChiPhiDeXuatPage = () => {
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
            {/* Hiện tại QLCP Đề xuất KHÔNG có nút Thêm trực tiếp.
                Bảng chi phí được khởi tạo từ màn Quản lý báo giá (from-quote).
                Nếu sau này anh muốn “Thêm từ báo giá” ngay tại đây, mình sẽ bổ sung. */}
          </Col>
        </Flex>

        <Row>
          <Col span={24}>
            {permission.index && (
              <DanhSachQuanLyChiPhiDeXuat
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

export default QuanLyChiPhiDeXuatPage;
