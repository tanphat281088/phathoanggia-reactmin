import { Col, Flex, Row, Tabs } from "antd";
import Heading from "../../components/heading";
import DanhSachDanhMucSanPham from "./DanhSachDanhMucSanPham";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import ThemDanhMucSanPham from "./ThemDanhMucSanPham";
import { useResponsive } from "../../hooks/useReponsive";
import usePermission from "../../hooks/usePermission";

const path = API_ROUTE_CONFIG.DANH_MUC_SAN_PHAM;
// 🔹 ĐỔI TIÊU ĐỀ: Danh mục dịch vụ
const title = "Danh mục dịch vụ";

const DanhMucSanPham = () => {
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
                            <ThemDanhMucSanPham path={path} title={title} />
                        )}
                    </Col>
                </Flex>

                <Row>
                    <Col span={24}>
                        {permission.index && (
                            <Tabs
                                defaultActiveKey="all"
                                items={[
                                    {
                                        key: "all",
                                        label: "Tất cả danh mục",
                                        children: (
                                            <DanhSachDanhMucSanPham
                                                path={path}
                                                permission={permission}
                                                title={title}
                                                mode="all"
                                            />
                                        ),
                                    },
                                    {
                                        key: "level1",
                                        label: "Danh mục tầng 1",
                                        children: (
                                            <DanhSachDanhMucSanPham
                                                path={path}
                                                permission={permission}
                                                title={title}
                                                mode="level1"
                                            />
                                        ),
                                    },
                                    {
                                        key: "level2",
                                        label: "Danh mục tầng 2",
                                        children: (
                                            <DanhSachDanhMucSanPham
                                                path={path}
                                                permission={permission}
                                                title={title}
                                                mode="level2"
                                            />
                                        ),
                                    },
                                ]}
                            />
                        )}
                    </Col>
                </Row>
            </div>
        </>
    );
};

export default DanhMucSanPham;
