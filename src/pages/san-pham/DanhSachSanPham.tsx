/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import type { User } from "../../types/user.type";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData } from "../../services/getData.api";
import {
    createFilterQueryFromArray,
    formatVietnameseCurrency,
} from "../../utils/utils";
import { Col, Row, Space, Tag, Flex, Image } from "antd";
import SuaSanPham from "./SuaSanPham";
import Delete from "../../components/Delete";
import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../components/CustomTable";
import type { RootState } from "../../redux/store";
import { usePagination } from "../../hooks/usePagination";
import type { Actions } from "../../types/main.type";
import ExportTableToExcel from "../../components/ExportTableToExcel";
import { OPTIONS_STATUS } from "../../utils/constant";
import dayjs from "dayjs";
import ImportExcel from "../../components/ImportExcel";
import ChiTietSanPham from "./ChiTietSanPham";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

const DanhSachSanPham = ({
    path,
    permission,
    title,
}: {
    path: string;
    permission: Actions;
    title: string;
}) => {
    const dispatch = useDispatch();

    const isReload = useSelector((state: RootState) => state.main.isReload);

    const [danhSach, setDanhSach] = useState<
        { data: User[]; total: number } | undefined
    >({ data: [], total: 0 });

    const { filter, handlePageChange, handleLimitChange } = usePagination({
        page: 1,
        limit: 20,
    });

    const {
        inputSearch,
        query,
        dateSearch,
        selectSearch,
        selectSearchWithOutApi,
    } = useColumnSearch();

    const [isLoading, setIsLoading] = useState(false);

    const getDanhSach = async () => {
        setIsLoading(true);
        const filters = Object.values(query);
        const params = {
            ...filter,
            ...createFilterQueryFromArray([
                ...filters,
                {
                    field: "loai_san_pham",
                    operator: "not_equal",
                    value: "NGUYEN_LIEU", // tab này chỉ hiển thị DỊCH VỤ (bao gồm GOI_DICH_VU)
                },
            ]),
        };
        const danhSach = await getListData(path, params);
        if (danhSach) {
            setIsLoading(false);
        }
        setDanhSach(danhSach);
    };

    const defaultColumns: any = [
        {
            title: "STT",
            dataIndex: "index",
            width: 80,
            render: (_text: any, _record: any, index: any) => {
                return (
                    filter.limit && (filter.page - 1) * filter.limit + index + 1
                );
            },
        },
        {
            title: "Thao tác",
            dataIndex: "id",
            align: "center",
            render: (id: number) => {
                return (
                    <Space size={0}>
                        {permission.show && (
                            <ChiTietSanPham path={path} id={id} title={title} />
                        )}
                        {permission.edit && (
                            <SuaSanPham path={path} id={id} title={title} />
                        )}
                        {permission.delete && (
                            <Delete path={path} id={id} onShow={getDanhSach} />
                        )}
                    </Space>
                );
            },
        },
        {
            title: "Ảnh dịch vụ",
            dataIndex: "images",
            align: "center",
            maxWidth: 120,
            render: (images: any[]) => {
                const image = images && images.length > 0 ? images[0].path : "";
                return (
                    <Image
                        src={image || "https://via.placeholder.com/80"}
                        alt="Ảnh dịch vụ"
                        width={50}
                        height={50}
                    />
                );
            },
            exportData: (record: any) => {
                return record.images && record.images.length > 0
                    ? record.images[0].path
                    : "";
            },
        },
        {
            title: "Mã dịch vụ",
            dataIndex: "ma_san_pham",
            ...inputSearch({
                dataIndex: "ma_san_pham",
                operator: "contain",
                nameColumn: "Mã dịch vụ",
            }),
        },
        {
            title: "Tên dịch vụ",
            dataIndex: "ten_san_pham",
            ...inputSearch({
                dataIndex: "ten_san_pham",
                operator: "contain",
                nameColumn: "Tên dịch vụ",
            }),
        },
        {
            title: "Danh mục dịch vụ",
            dataIndex: "danh_muc",
            render: (record: { ten_danh_muc: string }) => {
                return record?.ten_danh_muc;
            },
            ...selectSearch({
                dataIndex: "danh_muc_id",
                path: API_ROUTE_CONFIG.DANH_MUC_SAN_PHAM + "/options",
                operator: "equal",
                nameColumn: "Danh mục dịch vụ",
            }),
        },
        {
            // 🔹 Loại dịch vụ
            title: "Loại dịch vụ",
            dataIndex: "ten_loai",
            render: (_: any, record: any) => {
                const code: string | undefined = record?.loai_san_pham;

                let color = "default";
                let text = "";

                if (code === "GOI_DICH_VU") {
                    color = "purple";
                    text = "Gói dịch vụ";
                } else if (code === "SP_NHA_CUNG_CAP") {
                    color = "blue";
                    text = "Thuê ngoài";
                } else if (code === "SP_SAN_XUAT") {
                    color = "green";
                    text = "Tự cung cấp";
                } else if (code === "NGUYEN_LIEU") {
                    color = "gold";
                    text = "Nguyên liệu";
                } else if (code) {
                    text = code;
                }

                if (!text) return "-";

                return <Tag color={color}>{text}</Tag>;
            },
            ...selectSearch({
                dataIndex: "loai_san_pham",
                path: "/loai-san-pham/options",
                operator: "equal",
                nameColumn: "Loại dịch vụ",
            }),
        },

        {
            title: "Giá dịch vụ / Giá gói",
            dataIndex: "gia_nhap_mac_dinh",
            render: (record: number) => {
                return formatVietnameseCurrency(record);
            },
        },
        {
            title: "Trạng thái",
            dataIndex: "trang_thai",
            render: (trang_thai: number) => {
                return (
                    <Tag color={trang_thai === 1 ? "green" : "red"}>
                        {trang_thai === 1 ? "Hoạt động" : "Không hoạt động"}
                    </Tag>
                );
            },
            ...selectSearchWithOutApi({
                dataIndex: "trang_thai",
                operator: "equal",
                nameColumn: "Trạng thái",
                options: OPTIONS_STATUS,
            }),
        },
        {
            title: "Người tạo",
            dataIndex: "ten_nguoi_tao",
            ...inputSearch({
                dataIndex: "ten_nguoi_tao",
                operator: "contain",
                nameColumn: "Người tạo",
            }),
        },
        {
            title: "Ngày tạo",
            dataIndex: "created_at",
            ...dateSearch({ dataIndex: "created_at", nameColumn: "Ngày tạo" }),
        },
        {
            title: "Người cập nhật",
            dataIndex: "ten_nguoi_cap_nhat",
            ...inputSearch({
                dataIndex: "ten_nguoi_cap_nhat",
                operator: "contain",
                nameColumn: "Người cập nhật",
            }),
        },
        {
            title: "Ngày cập nhật",
            dataIndex: "updated_at",
            ...dateSearch({
                dataIndex: "updated_at",
                nameColumn: "Ngày cập nhật",
            }),
        },
    ];

    useEffect(() => {
        getDanhSach();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReload, filter, query]);

    return (
        <Row>
            <Col span={24}>
                <Flex vertical gap={10}>
                    <Row
                        justify="end"
                        align="middle"
                        style={{ marginBottom: 5, gap: 10 }}
                    >
                        {permission.export && (
                            <ExportTableToExcel
                                columns={defaultColumns}
                                path={path}
                                params={{}}
                            />
                        )}
                        {permission.create && <ImportExcel path={path} />}
                    </Row>
                    <CustomTable
                        rowKey="id"
                        dataTable={danhSach?.data}
                        defaultColumns={defaultColumns}
                        filter={filter}
                        scroll={{ x: 1600 }}
                        handlePageChange={handlePageChange}
                        handleLimitChange={handleLimitChange}
                        total={danhSach?.total}
                        loading={isLoading}
                    />
                </Flex>
            </Col>
        </Row>
    );
};

export default DanhSachSanPham;
