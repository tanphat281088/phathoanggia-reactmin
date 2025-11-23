/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData } from "../../services/getData.api";
import { createFilterQueryFromArray, formatVietnameseCurrency } from "../../utils/utils";
import { Col, Row, Space, Tag, Flex } from "antd";
import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../components/CustomTable";
import type { RootState } from "../../redux/store";
import { usePagination } from "../../hooks/usePagination";
import type { Actions } from "../../types/main.type";
import ExportTableToExcel from "../../components/ExportTableToExcel";
import { OPTIONS_STATUS } from "../../utils/constant";
import Delete from "../../components/Delete";
import SuaGoiDichVuPackage from "./SuaGoiDichVuPackage";

const DanhSachGoiDichVuPackage = ({
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
        { data: any[]; total: number } | undefined
    >({ data: [], total: 0 });

    const { filter, handlePageChange, handleLimitChange } = usePagination({
        page: 1,
        limit: 20,
    });

    const {
        inputSearch,
        query,
        dateSearch,
        selectSearchWithOutApi,
    } = useColumnSearch();

    const [isLoading, setIsLoading] = useState(false);

    const getDanhSach = async () => {
        setIsLoading(true);
        const params = {
            ...filter,
            ...createFilterQueryFromArray(query),
        };
        const res = await getListData(path, params);
        if (res) {
            setDanhSach(res);
        }
        setIsLoading(false);
    };

    const defaultColumns: any = [
        {
            title: "STT",
            dataIndex: "index",
            width: 80,
            render: (_text: any, _record: any, index: number) => {
                return (
                    filter.limit && (filter.page - 1) * filter.limit + index + 1
                );
            },
        },
        {
            title: "Thao tác",
            dataIndex: "id",
            align: "center",
            width: 160,
            render: (id: number) => {
                return (
                    <Space size={0}>
                        {permission.edit && (
                            <SuaGoiDichVuPackage
                                path={path}
                                id={id}
                                title={title}
                            />
                        )}
                        {permission.delete && (
                            <Delete
                                path={path}
                                id={id}
                                onShow={getDanhSach}
                            />
                        )}
                    </Space>
                );
            },
        },
        {
            title: "Nhóm danh mục gói",
            dataIndex: "ten_nhom_group",
            render: (val: string | null | undefined) => val || "-",
            ...inputSearch({
                dataIndex: "ten_nhom_group",
                operator: "contain",
                nameColumn: "Nhóm danh mục gói",
            }),
        },
        {
            title: "Nhóm gói dịch vụ",
            dataIndex: "ten_nhom_goi",
            render: (val: string | null | undefined) => val || "-",
            ...inputSearch({
                dataIndex: "ten_nhom_goi",
                operator: "contain",
                nameColumn: "Nhóm gói dịch vụ",
            }),
        },
        {
            title: "Mã gói",
            dataIndex: "ma_goi",
            ...inputSearch({
                dataIndex: "ma_goi",
                operator: "contain",
                nameColumn: "Mã gói",
            }),
        },
        {
            title: "Tên gói dịch vụ",
            dataIndex: "ten_goi",
            ...inputSearch({
                dataIndex: "ten_goi",
                operator: "contain",
                nameColumn: "Tên gói dịch vụ",
            }),
        },



        {
            title: "Giá niêm yết",
            dataIndex: "gia_niem_yet",
            render: (val: number) => formatVietnameseCurrency(val),
        },
        {
            title: "Giá khuyến mãi",
            dataIndex: "gia_khuyen_mai",
            render: (val: number | null | undefined) =>
                val != null ? formatVietnameseCurrency(val) : "-",
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
            ...dateSearch({
                dataIndex: "created_at",
                nameColumn: "Ngày tạo",
            }),
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

export default DanhSachGoiDichVuPackage;
