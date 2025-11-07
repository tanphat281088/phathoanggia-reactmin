/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import type { User } from "../../types/user.type";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData } from "../../services/getData.api";
import { createFilterQueryFromArray } from "../../utils/utils";
import { Col, Row, Space, Tag } from "antd";
import SuaVaiTro from "./SuaVaiTro";
import Delete from "../../components/Delete";
import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../components/CustomTable";
import type { RootState } from "../../redux/store";
import { usePagination } from "../../hooks/usePagination";
import { OPTIONS_STATUS } from "../../utils/constant";
import type { Actions } from "../../types/main.type";
import ExportTableToExcel from "../../components/ExportTableToExcel";



const DanhSachNguoiDung = ({
    path,
    permission,
}: {
    path: string;
    permission: Actions;
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
        const params = { ...filter, ...createFilterQueryFromArray(query) };
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
            align: "left",
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
            width: 80,
            render: (id: number) => {
                return (
                    <Space size={0}>
                        {permission.show && <SuaVaiTro path={path} id={id} />}
                        {permission.delete && (
                            <Delete path={path} id={id} onShow={getDanhSach} />
                        )}
                    </Space>
                );
            },
        },
        {
            title: "Mã vai trò",
            dataIndex: "ma_vai_tro",
            ...inputSearch({
                dataIndex: "ma_vai_tro",
                operator: "contain",
                nameColumn: "Mã vai trò",
            }),
        },
        {
            title: "Tên vai trò",
            dataIndex: "ten_vai_tro",
            ...inputSearch({
                dataIndex: "ten_vai_tro",
                operator: "contain",
                nameColumn: "Tên vai trò",
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
        },
        {
            title: "Ngày tạo",
            dataIndex: "created_at",
            render: (record: string): string => {
                return record;
            },
            ...dateSearch({ dataIndex: "created_at", nameColumn: "Ngày tạo" }),
        },
    ];

    useEffect(() => {
        getDanhSach();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, query, isReload]);

    return (
        <Row>
            <Col span={24}>
                <Row justify="end">
                    {permission.export && (
                        <ExportTableToExcel
                            columns={defaultColumns}
                            path={path}
                            params={{}}
                        />
                    )}
                    {/* <ImportFile path={path} /> */}
                </Row>
                <CustomTable
                    rowKey="id"
                    dataTable={danhSach?.data}
                    defaultColumns={defaultColumns}
                    filter={filter}
                    scroll={{ x: 1000 }}
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

export default DanhSachNguoiDung;
