import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";
import DanhSachQuanLyChiPhiThucTe from "./DanhSachQuanLyChiPhiThucTe";

const path = "/quan-ly-chi-phi/thuc-te"; // sẽ đồng bộ với API_ROUTE_CONFIG sau
const title = "QLCP Thực tế";

const QuanLyChiPhiThucTePage = () => {
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
            {/* Tương tự Đề xuất: sheet chi phí THỰC TẾ được khởi tạo từ màn Quản lý báo giá
                hoặc từ nút "Chuyển sang chi phí thực tế" ở QLCP Đề xuất. */}
          </Col>
        </Flex>

        <Row>
          <Col span={24}>
            {permission.index && (
              <DanhSachQuanLyChiPhiThucTe
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

export default QuanLyChiPhiThucTePage;
