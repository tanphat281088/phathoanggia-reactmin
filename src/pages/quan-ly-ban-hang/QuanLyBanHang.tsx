import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import DanhSachQuanLyBanHang from "./DanhSachQuanLyBanHang";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import ThemQuanLyBanHang from "./ThemQuanLyBanHang";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";

const path = API_ROUTE_CONFIG.QUAN_LY_BAN_HANG;
// 🔹 ĐỔI: Đơn hàng -> Báo giá
const title = "Báo giá";

const QuanLyBanHang = () => {
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
                    {/* 🔹 ĐỔI HEADING: Quản lý báo giá sự kiện */}
                    <Heading title={"Quản lý báo giá sự kiện"} />
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
                            <ThemQuanLyBanHang path={path} title={title} />
                        )}
                    </Col>
                </Flex>
                <Row>
                    <Col span={24}>
                        {permission.index && (
                            <DanhSachQuanLyBanHang
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

export default QuanLyBanHang;
