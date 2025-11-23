import { Col, Flex, Row } from "antd";
import Heading from "../../components/heading";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";
import ThemGoiDichVuCategory from "./ThemGoiDichVuCategory";
import DanhSachGoiDichVuCategory from "./DanhSachGoiDichVuCategory";

const path = API_ROUTE_CONFIG.GOI_DICH_VU_CATEGORY;
const title = "Nhóm gói dịch vụ";

const GoiDichVuCategoryPage = () => {
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
                            <ThemGoiDichVuCategory path={path} title={title} />
                        )}
                    </Col>
                </Flex>

                <Row>
                    <Col span={24}>
                        {permission.index && (
                            <DanhSachGoiDichVuCategory
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

export default GoiDichVuCategoryPage;
