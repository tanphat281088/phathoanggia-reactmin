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
import { Col, Flex, Row, Space, Tag, Button, message } from "antd";

import SuaKhachHang from "./SuaKhachHang";
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
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

import axios from "../../configs/axios";

/** Danh sách cố định cho dropdown Kênh liên hệ (ERP Sự kiện) */
const KENH_LIEN_HE_OPTIONS = [
  { label: "Facebook", value: "Facebook" },
  { label: "Zalo", value: "Zalo" },
  { label: "Hotline", value: "Hotline" },
  { label: "Website", value: "Website" },
  { label: "Khách cũ", value: "Khách cũ" },
  { label: "Khách quen giới thiệu", value: "Khách quen giới thiệu" },
  { label: "Khác", value: "Khác" },
];

/** Mapping nhóm khách hàng từ customer_type (BE) */
const CUSTOMER_TYPE_LABEL: Record<number, string> = {
  0: "Khách Event",
  1: "Khách Wedding",
  2: "Khách Agency",
};

const CUSTOMER_TYPE_OPTIONS = [
  { label: "Khách Event", value: 0 },
  { label: "Khách Wedding", value: 1 },
  { label: "Khách Agency", value: 2 },
];

const DanhSachKhachHang = ({
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
    const params = { ...filter, ...createFilterQueryFromArray(query) };
    const danhSach = await getListData(path, params);
    if (danhSach) {
      setIsLoading(false);
    }
    setDanhSach(danhSach);
  };

  // Convert khách thường → Agency (gọi API KhachHangPassCtvController::convertToPass)
  const handleConvertToAgency = async (id: number) => {
    try {
      const url = API_ROUTE_CONFIG.KHACH_HANG_PASS_CTV_CONVERT_TO_PASS(id);
      const resp: any = await axios.post(url);

      const data = resp?.data ?? resp ?? {};

      const msg =
        data?.message ||
        data?.msg ||
        "Đã chuyển sang Khách hàng Agency";

      message.success(msg);
      getDanhSach();
    } catch (e: any) {
      console.error("[KH] convert to Agency error", e);
      const data = e?.response?.data ?? e;
      const msg =
        data?.message ||
        data?.error ||
        e?.message ||
        "Chuyển sang Khách hàng Agency thất bại";
      message.error(String(msg));
    }
  };

  const defaultColumns: any = [
    {
      title: "STT",
      dataIndex: "index",
      align: "right",
      width: 80,
      render: (_text: any, _record: any, index: any) => {
        return filter.limit && (filter.page - 1) * filter.limit + index + 1;
      },
    },
    {
      title: "Mã KH",
      dataIndex: "ma_kh",
      width: 140,
      ...inputSearch({
        dataIndex: "ma_kh",
        operator: "contain",
        nameColumn: "Mã KH",
      }),
    },
    {
      title: "Thao tác",
      dataIndex: "id",
      align: "center",
      render: (id: number, record: any) => {
        const customerType = Number(record?.customer_type ?? 0);
        const isAgency = customerType === 2;

        return (
          <Space size={4}>
            {permission.edit && (
              <SuaKhachHang path={path} id={id} title={title} />
            )}

            {/* Nút chuyển sang KH Agency – chỉ hiện nếu chưa là Agency */}
            {permission.edit && !isAgency && (
              <Button
                size="small"
                onClick={() => handleConvertToAgency(id)}
              >
                Agency
              </Button>
            )}

            {permission.delete && (
              <Delete path={path} id={id} onShow={getDanhSach} />
            )}
          </Space>
        );
      },
    },

    {
      title: "Tên khách hàng",
      dataIndex: "ten_khach_hang",
      ...inputSearch({
        dataIndex: "ten_khach_hang",
        operator: "contain",
        nameColumn: "Tên khách hàng",
      }),
    },
    {
      title: "Email",
      dataIndex: "email",
      width: 300,
      ...inputSearch({
        dataIndex: "email",
        operator: "contain",
        nameColumn: "Email",
      }),
    },
    {
      title: "Số điện thoại",
      dataIndex: "so_dien_thoai",
      ...inputSearch({
        dataIndex: "so_dien_thoai",
        operator: "contain",
        nameColumn: "Số điện thoại",
      }),
    },

    /** Kênh liên hệ (dropdown cố định, filter = equal) */
    {
      title: "Kênh liên hệ",
      dataIndex: "kenh_lien_he",
      ...selectSearchWithOutApi({
        dataIndex: "kenh_lien_he",
        operator: "equal",
        nameColumn: "Kênh liên hệ",
        options: KENH_LIEN_HE_OPTIONS,
      }),
      render: (text: string) => text || "—",
      exportData: (text: string) => text || "",
    },

    /** Nhóm khách hàng (Event / Wedding / Agency) từ customer_type */
    {
      title: "Nhóm khách hàng",
      dataIndex: "customer_type",
      render: (val: number) => {
        const label = CUSTOMER_TYPE_LABEL[val] ?? "Không rõ";
        let color: string = "default";
        if (val === 0) color = "blue";
        else if (val === 1) color = "magenta";
        else if (val === 2) color = "purple";
        return <Tag color={color}>{label}</Tag>;
      },
      ...selectSearchWithOutApi({
        dataIndex: "customer_type",
        operator: "equal",
        nameColumn: "Nhóm khách hàng",
        options: CUSTOMER_TYPE_OPTIONS,
      }),
      exportData: (val: number) => CUSTOMER_TYPE_LABEL[val] ?? "",
    },

    {
      title: "Địa chỉ",
      dataIndex: "dia_chi",
      ...inputSearch({
        dataIndex: "dia_chi",
        operator: "contain",
        nameColumn: "Địa chỉ",
      }),
    },

    // Loại khách hàng (hạng thành viên) từ loai_khach_hang_id
    {
      title: "Loại khách hàng (hạng)",
      dataIndex: "loai_khach_hang",
      ...selectSearch({
        dataIndex: "loai_khach_hang_id",
        path: API_ROUTE_CONFIG.LOAI_KHACH_HANG + "/options",
        operator: "equal",
        nameColumn: "Loại khách hàng (hạng)",
      }),
      render: (record: any) => {
        return record?.ten_loai_khach_hang || "Chưa có";
      },
      exportData: (record: any) => {
        return record?.loai_khach_hang?.ten_loai_khach_hang || "Chưa có";
      },
    },

    {
      title: "Công nợ",
      dataIndex: "cong_no",
      ...inputSearch({
        dataIndex: "cong_no",
        operator: "contain",
        nameColumn: "Công nợ",
      }),
      render: (record: any) => {
        return formatVietnameseCurrency(record);
      },
    },
    {
      title: "Doanh thu tích lũy",
      dataIndex: "doanh_thu_tich_luy",
      ...inputSearch({
        dataIndex: "doanh_thu_tich_luy",
        operator: "contain",
        nameColumn: "Doanh thu tích lũy",
      }),
      render: (record: any) => {
        return formatVietnameseCurrency(record);
      },
    },
    {
      title: "Ghi chú / Điểm tích luỹ",
      dataIndex: "ghi_chu",
      ...inputSearch({
        dataIndex: "ghi_chu",
        operator: "contain",
        nameColumn: "Ghi chú",
      }),
      render: (_text: any, record: any) => {
        // 1 điểm = 1.000 VNĐ (giống MemberPointService)
        const rate = 1000;
        const revenue = record?.doanh_thu_tich_luy ?? 0;
        const point = Math.floor(revenue / rate);

        const note = record?.ghi_chu ?? "";

        if (note && String(note).trim() !== "") {
          return `${point} điểm - ${note}`;
        }

        return `${point} điểm`;
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
            scroll={{ x: 3200 }}
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

export default DanhSachKhachHang;
