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
import { Col, Row, Space, Tag } from "antd";
import SuaLoaiKhachHang from "./SuaLoaiKhachHang";
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

const DanhSachLoaiKhachHang = ({
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

        // 🔹 ÉP sort mặc định theo nguong_doanh_thu DESC
        const params = {
            ...filter,
            sort_column: "nguong_doanh_thu",
            sort_direction: "desc",
            ...createFilterQueryFromArray(query),
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
            width: 70,
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
            width: 100,
            render: (id: number) => {
                return (
                    <Space size={0}>
                        {permission.edit && (
                            <SuaLoaiKhachHang
                                path={path}
                                id={id}
                                title={title}
                            />
                        )}
                        {permission.delete && (
                            <Delete path={path} id={id} onShow={getDanhSach} />
                        )}
                    </Space>
                );
            },
        },
        {
            title: "Tên loại khách hàng",
            dataIndex: "ten_loai_khach_hang",
            ...inputSearch({
                dataIndex: "ten_loai_khach_hang",
                operator: "contain",
                nameColumn: "Tên loại khách hàng",
            }),
        },
        {
            title: "Ngưỡng doanh thu",
            dataIndex: "nguong_doanh_thu",
            ...inputSearch({
                dataIndex: "nguong_doanh_thu",
                operator: "equal",
                nameColumn: "Ngưỡng doanh thu",
            }),
            render: (record: number) => {
                return formatVietnameseCurrency(record);
            },
        },
        // 🔹 Cột mới: Giá trị ưu đãi (%)
        {
            title: "Giá trị ưu đãi (%)",
            dataIndex: "gia_tri_uu_dai",
            ...inputSearch({
                dataIndex: "gia_tri_uu_dai",
                operator: "equal",
                nameColumn: "Giá trị ưu đãi",
            }),
            render: (record: number) => {
                const value = record ?? 0;
                return `${value} %`;
            },
        },
        // 🔹 Cột mới: Ngưỡng điểm
        {
            title: "Ngưỡng điểm",
            dataIndex: "nguong_diem",
            ...inputSearch({
                dataIndex: "nguong_diem",
                operator: "equal",
                nameColumn: "Ngưỡng điểm",
            }),
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
            exportTitle: "Trạng thái (1: Hoạt động, 0: Không hoạt động)",
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
                    scroll={{ x: 1200 }}
                    handlePageChange={handlePageChange}
                    handleLimitChange={handleLimitChange}
                    total={danhSach?.total}
                    loading={isLoading}
                    hidePagination={true}
                />
            </Col>
        </Row>
    );
};

export default DanhSachLoaiKhachHang;
