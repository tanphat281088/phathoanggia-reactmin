import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";
import ThemGoiDichVuPackage from "./ThemGoiDichVuPackage";
import DanhSachGoiDichVuPackage from "./DanhSachGoiDichVuPackage";

const path = API_ROUTE_CONFIG.GOI_DICH_VU_PACKAGE;
const title = "Gói dịch vụ";

const GoiDichVuPackagePage = () => {
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
                        {permission.create && (
                            <ThemGoiDichVuPackage path={path} title={title} />
                        )}
                    </Col>
                </Flex>

                <Row>
                    <Col span={24}>
                        {permission.index && (
                            <DanhSachGoiDichVuPackage
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

export default GoiDichVuPackagePage;
