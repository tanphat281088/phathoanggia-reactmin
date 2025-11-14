/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import type { User } from "../../types/user.type";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData } from "../../services/getData.api";
import {
  createFilterQueryFromArray,
  formatVietnameseCurrency,
} from "../../utils/utils";
import { Col, Flex, Row, Space, Tag, Button, message } from "antd";
import Delete from "../../components/Delete";
import { useSelector } from "react-redux";
import CustomTable from "../../components/CustomTable";
import type { RootState } from "../../redux/store";
import { usePagination } from "../../hooks/usePagination";
import type { Actions } from "../../types/main.type";
import ExportTableToExcel from "../../components/ExportTableToExcel";
import dayjs from "dayjs";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import axios from "../../configs/axios";

const DanhSachKhachHangPassCtv = ({
  path,
  permission,
  title,
}: {
  path: string;
  permission: Actions;
  title: string;
}) => {
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

  const handleConvertToNormal = async (id: number) => {
    try {
      const url = API_ROUTE_CONFIG.KHACH_HANG_PASS_CTV_CONVERT_TO_NORMAL(id);
      const resp: any = await axios.post(url);

      const data = resp?.data ?? resp;
      const ok = data?.success === true;
      const msg =
        data?.message ||
        data?.msg ||
        (ok
          ? "Đã chuyển sang Khách hàng hệ thống"
          : "Chuyển sang Khách hàng hệ thống thất bại");

      if (ok) {
        message.success(msg);
        getDanhSach();
      } else {
        message.error(msg);
      }
    } catch (e: any) {
      console.error(e);
      message.error("Lỗi kết nối khi chuyển sang Khách hàng hệ thống");
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
      render: (id: number) => {
        return (
          <Space size={4}>
            {permission.edit && (
              <Button
                size="small"
                onClick={() => handleConvertToNormal(id)}
              >
                Về Hệ thống
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
      width: 260,
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
    {
      title: "Địa chỉ",
      dataIndex: "dia_chi",
      ...inputSearch({
        dataIndex: "dia_chi",
        operator: "contain",
        nameColumn: "Địa chỉ",
      }),
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
      title: "Ngày tạo",
      dataIndex: "created_at",
      ...dateSearch({ dataIndex: "created_at", nameColumn: "Ngày tạo" }),
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—"),
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "updated_at",
      ...dateSearch({
        dataIndex: "updated_at",
        nameColumn: "Ngày cập nhật",
      }),
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—"),
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
          <Row justify="end" align="middle" style={{ marginBottom: 5, gap: 10 }}>
            {permission.export && (
              <ExportTableToExcel columns={defaultColumns} path={path} params={{}} />
            )}
          </Row>
          <CustomTable
            rowKey="id"
            dataTable={danhSach?.data}
            defaultColumns={defaultColumns}
            filter={filter}
            scroll={{ x: 2000 }}
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

export default DanhSachKhachHangPassCtv;
