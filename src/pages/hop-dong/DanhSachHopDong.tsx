/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData } from "../../services/getData.api";
import {
  createFilterQueryFromArray,
  formatVietnameseCurrency,
} from "../../utils/utils";
import { Col, Row, Space, Tag, Flex, Button } from "antd";

import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../components/CustomTable";
import type { RootState } from "../../redux/store";
import { usePagination } from "../../hooks/usePagination";
import type { Actions } from "../../types/main.type";
import ExportTableToExcel from "../../components/ExportTableToExcel";
import Delete from "../../components/Delete";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

import SuaHopDong from "./SuaHopDong";

const CONTRACT_STATUS: Record<number, string> = {
  0: "Nháp",
  1: "Hoàn thành",
  2: "Thanh lý",
  3: "Đã hủy",
};

const CONTRACT_COLOR: Record<number, string> = {
  0: "default",
  1: "green",
  2: "blue",
  3: "red",
};

const DanhSachHopDong = ({
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
  >({
    data: [],
    total: 0,
  });

  const { filter, handlePageChange, handleLimitChange } = usePagination({
    page: 1,
    limit: 20,
  });

  const { inputSearch, query, dateSearch, selectSearchWithOutApi } =
    useColumnSearch();

  const [isLoading, setIsLoading] = useState(false);

  const getDanhSach = async () => {
    setIsLoading(true);
    const params = { ...filter, ...createFilterQueryFromArray(query) };
    const res = await getListData(path, params);
    if (res) setDanhSach(res);
    setIsLoading(false);
  };

  const defaultColumns: any = [
    {
      title: "STT",
      dataIndex: "index",
      width: 70,
      render: (_text: any, _record: any, index: number) =>
        filter.limit && (filter.page - 1) * filter.limit + index + 1,
    },
    {
      title: "Thao tác",
      dataIndex: "id",
      width: 260,
      align: "center",
      render: (id: number, record: any) => {
        const apiBase =
          (import.meta as any).env?.VITE_API_URL || "/api";

        return (
          <Space size={4}>
            {permission.edit && (
              <SuaHopDong path={path} id={id} title={title} />
            )}

            {/* Preview HTML (xem toàn bộ Hợp đồng dạng trang web) */}
            <Button
              size="small"
              type="link"
              onClick={() => {
                window.open(
                  `${apiBase}${API_ROUTE_CONFIG.HOP_DONG_PREVIEW(id)}`,
                  "_blank"
                );
              }}
            >
              Preview
            </Button>

            {/* Xuất PDF hợp đồng (dùng template DOCX + LibreOffice) */}
            <Button
              size="small"
              type="link"
              onClick={() => {
                window.open(
                  `${apiBase}${API_ROUTE_CONFIG.HOP_DONG_EXPORT_PDF(id)}`,
                  "_blank"
                );
              }}
            >
              PDF
            </Button>

            {/* Xuất Word hợp đồng (DOCX) */}
            <Button
              size="small"
              type="link"
              onClick={() => {
                window.open(
                  `${apiBase}${API_ROUTE_CONFIG.HOP_DONG_EXPORT_DOCX(id)}`,
                  "_blank"
                );
              }}
            >
              Word
            </Button>
      {/* Xuất Word SONG NGỮ (Việt – Anh) */}
      <Button
        size="small"
        type="link"
        onClick={() => {
          window.open(
            `${apiBase}${API_ROUTE_CONFIG.HOP_DONG_EXPORT_DOCX_BILINGUAL(id)}`,
            "_blank"
          );
        }}
      >
        Word VI–EN
      </Button>

            {permission.delete && (
              <Delete path={path} id={id} onShow={getDanhSach} />
            )}
          </Space>
        );
      },
    },

    {
      title: "Số HĐ",
      dataIndex: "so_hop_dong",
      ...inputSearch({
        dataIndex: "so_hop_dong",
        operator: "contain",
        nameColumn: "Số HĐ",
      }),
    },
    {
      title: "Mã báo giá",
      dataIndex: "ma_don_hang",
      render: (_: any, r: any) => r?.don_hang?.ma_don_hang ?? "-",
      ...inputSearch({
        dataIndex: "ma_don_hang",
        operator: "contain",
        nameColumn: "Mã báo giá",
      }),
    },
    {
      title: "Khách hàng",
      dataIndex: "ten_khach_hang",
      render: (_: any, r: any) => r?.don_hang?.ten_khach_hang ?? "-",
      ...inputSearch({
        dataIndex: "ten_khach_hang",
        operator: "contain",
        nameColumn: "Khách hàng",
      }),
    },
    {
      title: "Giá trị HĐ",
      dataIndex: "gia_tri_hop_dong",
      align: "right",
      render: (v: number) => formatVietnameseCurrency(v),
      ...inputSearch({
        dataIndex: "gia_tri_hop_dong",
        operator: "contain",
        nameColumn: "Giá trị HĐ",
      }),
    },
    {
      title: "Ngày hợp đồng",
      dataIndex: "ngay_hop_dong",
      ...dateSearch({
        dataIndex: "ngay_hop_dong",
        nameColumn: "Ngày HĐ",
      }),
    },
    {
      title: "Trạng thái",
      dataIndex: "trang_thai",
      render: (v: number) => (
        <Tag color={CONTRACT_COLOR[v] ?? "default"}>
          {CONTRACT_STATUS[v] ?? "Không rõ"}
        </Tag>
      ),
      ...selectSearchWithOutApi({
        dataIndex: "trang_thai",
        operator: "equal",
        nameColumn: "Trạng thái",
        options: [
          { label: "Nháp", value: 0 },
          { label: "Hoàn thành", value: 1 },
          { label: "Thanh lý", value: 2 },
          { label: "Đã hủy", value: 3 },
        ],
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
          <Row justify="end" align="middle" style={{ marginBottom: 5 }}>
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

export default DanhSachHopDong;
