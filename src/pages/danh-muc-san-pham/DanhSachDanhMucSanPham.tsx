/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import type { User } from "../../types/user.type";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData, getDataSelect } from "../../services/getData.api";
import { createFilterQueryFromArray } from "../../utils/utils";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

import { Col, Row, Space, Tag, Flex, Image, Select } from "antd";
import SuaDanhMucSanPham from "./SuaDanhMucSanPham";
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

// ✅ Mapping code -> label cho NHÓM DỊCH VỤ cao nhất
const SERVICE_GROUP_LABEL: Record<string, string> = {
    NHAN_SU: "Nhân sự",
    CO_SO_VAT_CHAT: "Cơ sở vật chất",
    TIEC: "Tiệc",
    THUE_DIA_DIEM: "Thuê địa điểm",
    CHI_PHI_KHAC: "Chi phí khác",
};

// ✅ Options cho filter NHÓM DỊCH VỤ
const OPTIONS_SERVICE_GROUP = [
    { label: "Nhân sự", value: "NHAN_SU" },
    { label: "Cơ sở vật chất", value: "CO_SO_VAT_CHAT" },
    { label: "Tiệc", value: "TIEC" },
    { label: "Thuê địa điểm", value: "THUE_DIA_DIEM" },
    { label: "Chi phí khác", value: "CHI_PHI_KHAC" },
];

type Mode = "all" | "level1" | "level2";

const DanhSachDanhMucSanPham = ({
    path,
    permission,
    title,
    mode = "all",
}: {
    path: string;
    permission: Actions;
    title: string;
    mode?: Mode;
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
        selectSearch,
        selectSearchWithOutApi,
    } = useColumnSearch();

    const [isLoading, setIsLoading] = useState(false);
        // Map ID → tên danh mục tầng 1 (load từ options level=1)
    const [parentNameMap, setParentNameMap] = useState<Record<number, string>>(
        {}
    );


    // ====== LỌC THEO DANH MỤC TẦNG 1 (chỉ dùng cho mode = "level2") ======
    const [filterParentId, setFilterParentId] = useState<number | undefined>();

    const getDanhSach = async () => {
        setIsLoading(true);

        let params: any;

        if (mode === "level1") {
            // ⭐ Tầng 1: luôn lấy HẾT danh mục từ BE (limit lớn),
            // sau đó FE tự lọc theo parent_id
            params = {
                page: 1,
                limit: 1000,          // đủ lớn cho toàn bộ danh mục dịch vụ
                sort_column: "id",
                sort_direction: "asc",
            };
        } else {
            // Các tab khác (Tất cả, Tầng 2): giữ behaviour cũ
            params = {
                ...filter,
                ...createFilterQueryFromArray(query),
            };
        }

        const danhSach = await getListData(path, params);
        if (danhSach) {
            setIsLoading(false);
        }
        setDanhSach(danhSach);
    };


    const rawData = danhSach?.data || [];

    // ✅ Map id -> record để lookup tên danh mục cha nhanh
    const parentMap = useMemo(() => {
        const map = new Map<number, any>();
        rawData.forEach((item: any) => {
            if (item && typeof item.id !== "undefined") {
                map.set(item.id, item);
            }
        });
        return map;
    }, [rawData]);

    // ✅ Options dropdown cho DANH MỤC TẦNG 1 (lấy từ chính list: parent_id null)
    const parentOptions = useMemo(
        () =>
            rawData
                .filter((r: any) => !r.parent_id)
                .map((p: any) => ({
                    value: p.id,
                    label: p.ten_danh_muc || `ID ${p.id}`,
                })),
        [rawData]
    );

    // ✅ Filter theo mode: all / level1 / level2 + filterParentId
    const dataFiltered = useMemo(() => {
        let base: any[] = rawData;

        if (mode === "level1") {
            // Tầng 1: không có parent_id (cha)
            base = rawData.filter((r: any) => !r.parent_id);
        } else if (mode === "level2") {
            // Tầng 2: có parent_id (con)
            base = rawData.filter((r: any) => !!r.parent_id);

            // Nếu chọn lọc theo Danh mục tầng 1
            if (filterParentId) {
                base = base.filter((r: any) => r.parent_id === filterParentId);
            }
        }

        return base;
    }, [rawData, mode, filterParentId]);

    const defaultColumns: any = [
        {
            title: "STT",
            dataIndex: "index",
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
                        {permission.edit && (
                            <SuaDanhMucSanPham
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
            title: "Ảnh danh mục",
            dataIndex: "images",
            align: "center",
            width: 150,
            render: (images: any[]) => {
                const image = images && images.length > 0 ? images[0].path : "";
                return (
                    <Image
                        src={image || "https://via.placeholder.com/150"}
                        alt="Ảnh đại diện"
                        width={70}
                        height={70}
                    />
                );
            },
            exportData: (record: any) => {
                const image =
                    record.images && record.images.length > 0
                        ? record.images[0].path
                        : "";
                return image;
            },
        },
        {
            title: "Mã danh mục",
            dataIndex: "ma_danh_muc",
            ...inputSearch({
                dataIndex: "ma_danh_muc",
                operator: "contain",
                nameColumn: "Mã danh mục",
            }),
        },
        {
            title: "Tên danh mục",
            dataIndex: "ten_danh_muc",
            ...inputSearch({
                dataIndex: "ten_danh_muc",
                operator: "contain",
                nameColumn: "Tên danh mục",
            }),
        },
        // ✅ Cột DANH MỤC TẦNG 1 (cha)
        {
            title: "Danh mục tầng 1",
            dataIndex: "parent_id",
            render: (_: any, record: any) => {
                const parentId = record?.parent_id;
                if (!parentId) return "-";

                const idNum = Number(parentId);

                // Ưu tiên tên từ map load từ API options level=1
                const nameFromMap =
                    !Number.isNaN(idNum) ? parentNameMap[idNum] : undefined;

                // Fallback: tìm trong dữ liệu hiện tại (rawData)
                const parent = parentMap.get(idNum);

                return nameFromMap || parent?.ten_danh_muc || `ID ${parentId}`;
            },
        },

        // ✅ Cột NHÓM DỊCH VỤ
        {
            title: "Nhóm dịch vụ",
            dataIndex: "group_code",
            render: (val: string | null | undefined) => {
                if (!val) return "-";
                return SERVICE_GROUP_LABEL[val] || val;
            },
            ...selectSearchWithOutApi({
                dataIndex: "group_code",
                operator: "equal",
                nameColumn: "Nhóm dịch vụ",
                options: OPTIONS_SERVICE_GROUP,
            }),
        },
        // ✅ Cột Cấp (Tầng 1 / Tầng 2)
        {
            title: "Cấp",
            dataIndex: "parent_id",
            render: (parent_id: number | null | undefined) => {
                if (!parent_id) return "Tầng 1";
                return "Tầng 2";
            },
        },
        {
            title: "Ghi chú",
            dataIndex: "ghi_chu",
            width: 300,
            ...inputSearch({
                dataIndex: "ghi_chu",
                operator: "contain",
                nameColumn: "Ghi chú",
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

    // Load FULL danh mục tầng 1 để map parent_id → tên (kể cả khi không có trong rawData)
    useEffect(() => {
        const fetchParents = async () => {
            try {
                const data: any = await getDataSelect(
                    API_ROUTE_CONFIG.DANH_MUC_SAN_PHAM + "/options?level=1",
                    {}
                );

                const list = Array.isArray(data) ? data : [];
                const map: Record<number, string> = {};

                list.forEach((item: any) => {
                    const id = Number(item.value ?? item.id);
                    const label =
                        item.label ??
                        item.ten_danh_muc ??
                        `ID ${item.value ?? item.id}`;
                    if (!Number.isNaN(id)) {
                        map[id] = label;
                    }
                });

                setParentNameMap(map);
            } catch {
                // ignore lỗi
            }
        };

        fetchParents();
    }, []);



    useEffect(() => {
        getDanhSach();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReload, filter, query]);

    return (
        <Row>
            <Col span={24}>
                <Flex vertical gap={10}>
                    <Row
                        justify="space-between"
                        align="middle"
                        style={{ marginBottom: 5, gap: 10 }}
                    >
                        {/* BỘ LỌC DANH MỤC TẦNG 1 – chỉ hiển thị khi đang ở tab Tầng 2 */}
                        <Col>
                            {mode === "level2" && (
                                <Select
                                    allowClear
                                    style={{ minWidth: 220 }}
                                    placeholder="Lọc theo Danh mục tầng 1"
                                    value={filterParentId}
                                    options={parentOptions}
                                    onChange={(value) => {
                                        setFilterParentId(value);
                                        handlePageChange(1);
                                    }}
                                />
                            )}
                        </Col>

                        <Col>
                            <Space style={{ gap: 10 }}>
                                {permission.export && (
                                    <ExportTableToExcel
                                        columns={defaultColumns}
                                        path={path}
                                        params={{}}
                                    />
                                )}
                                {/* {permission.create && <ImportExcel path={path} />} */}
                            </Space>
                        </Col>
                    </Row>

                    <CustomTable
                        rowKey="id"
                        dataTable={dataFiltered}
                        defaultColumns={defaultColumns}
                        filter={filter}
                        scroll={{ x: 1800 }}
                        handlePageChange={handlePageChange}
                        handleLimitChange={handleLimitChange}
                        total={dataFiltered.length}
                        loading={isLoading}
                    />
                </Flex>
            </Col>
        </Row>
    );
};

export default DanhSachDanhMucSanPham;
