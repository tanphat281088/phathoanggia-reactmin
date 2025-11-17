import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import DanhSachLoaiKhachHang from "./DanhSachLoaiKhachHang";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import ThemLoaiKhachHang from "./ThemLoaiKhachHang";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";

const path = API_ROUTE_CONFIG.LOAI_KHACH_HANG;
// 🔹 Đổi title: Hạng khách hàng (theo doanh thu / điểm)
const title = "Hạng khách hàng (tier)";

const LoaiKhachHang = () => {
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
                    {/* 🔹 Heading rõ nghĩa hơn cho CRM sự kiện */}
                    <Heading title="Quản lý hạng khách hàng" />
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
                            <ThemLoaiKhachHang path={path} title={title} />
                        )}
                    </Col>
                </Flex>
                <Row>
                    <Col span={24}>
                        {permission.index && (
                            <DanhSachLoaiKhachHang
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

export default LoaiKhachHang;
