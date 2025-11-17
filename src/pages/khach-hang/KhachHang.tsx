import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import DanhSachKhachHang from "./DanhSachKhachHang";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import ThemKhachHang from "./ThemKhachHang";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";

const path = API_ROUTE_CONFIG.KHACH_HANG;
// 🔹 Đổi title cho đúng ERP sự kiện
const title = "Khách hàng (Event / Wedding / Agency)";

const KhachHang = () => {
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
                    {/* 🔹 Heading rõ ràng: CRM Khách hàng sự kiện */}
                    <Heading title="Quản lý khách hàng sự kiện" />
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
                            <ThemKhachHang path={path} title={title} />
                        )}
                    </Col>
                </Flex>
                <Row>
                    <Col span={24}>
                        {permission.index && (
                            <DanhSachKhachHang
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

export default KhachHang;
