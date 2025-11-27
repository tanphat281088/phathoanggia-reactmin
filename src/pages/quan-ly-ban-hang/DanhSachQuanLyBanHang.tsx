/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import type { User } from "../../types/user.type";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData } from "../../services/getData.api";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import {
  createFilterQueryFromArray,
  formatVietnameseCurrency,
} from "../../utils/utils";
import { Col, Row, Space, Tag, Flex, Button } from "antd";
import SuaQuanLyBanHang from "./SuaQuanLyBanHang";
import Delete from "../../components/Delete";
import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../components/CustomTable";
import type { RootState } from "../../redux/store";
import { usePagination } from "../../hooks/usePagination";
import type { Actions } from "../../types/main.type";
import ExportTableToExcel from "../../components/ExportTableToExcel";
import {
  OPTIONS_TRANG_THAI_THANH_TOAN,
  OPTIONS_TRANG_THAI_XUAT_KHO,
} from "../../utils/constant";
import dayjs from "dayjs";
import ChiTietQuanLyBanHang from "./ChiTietQuanLyBanHang";
import InHoaDon from "../../components/InHoaDon";
import ChuyenHopDongButton from "../hop-dong/ChuyenHopDongButton";

/** Trạng thái GIAO HÀNG (cũ, vẫn giữ để không gãy logic) */
import { donHangTrangThaiSelect } from "../../configs/select-config";

/** Card view cho mobile */
import CardList from "../../components/responsive/CardList";

/** 🔹 NÚT QUẢN LÝ CHI PHÍ (Đề xuất / Thực tế) */

/** NÚT QUẢN LÝ CHI PHÍ (Đề xuất / Thực tế) */
import ChiPhiDeXuatButton from "../quan-ly-chi-phi/ChiPhiDeXuatButton";
import ChiPhiThucTeButton from "../quan-ly-chi-phi/ChiPhiThucTeButton";


/** Helper: map trạng thái giao hàng → màu Tag */
const DON_HANG_STATUS_COLOR: Record<number, string> = {
  0: "default", // Chưa giao
  1: "blue", // Đang giao
  2: "green", // Đã giao
  3: "red", // Đã hủy
};

/** Trạng thái BÁO GIÁ (ERP Sự kiện) */
const QUOTE_STATUS_OPTIONS = [
  { value: 0, label: "Nháp" },
  { value: 1, label: "Đã gửi" },
  { value: 2, label: "Thương lượng" },
  { value: 3, label: "Khách duyệt" },
  { value: 4, label: "Đã thực hiện" },
  { value: 5, label: "Đã tất toán" },
  { value: 6, label: "Đã hủy" },
];

const QUOTE_STATUS_COLOR: Record<number, string> = {
  0: "default",
  1: "blue",
  2: "gold",
  3: "green",
  4: "purple",
  5: "cyan",
  6: "red",
};

// ===== Helper: build URL đầy đủ tới API (dựa vào VITE_API_URL) =====
const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "/api";

const buildApiUrl = (path: string) => `${API_BASE}${path}`;

const DanhSachQuanLyBanHang = ({
  path,
  permission,
  title,
}: {
  path: string;
  permission: Actions;
  title: string;
}) => {
  const handleViewBaoGiaPdf = (id: number | string) => {
    const url = buildApiUrl(API_ROUTE_CONFIG.BAO_GIA_VIEW(id));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleExportBaoGiaExcel = (id: number | string) => {
    const url = buildApiUrl(API_ROUTE_CONFIG.BAO_GIA_EXCEL(id));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const dispatch = useDispatch();
  const isReload = useSelector((state: RootState) => state.main.isReload);

  const [danhSach, setDanhSach] = useState<
    { data: User[]; total: number } | undefined
  >({ data: [], total: 0 });

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
        return filter.limit && (filter.page - 1) * filter.limit + index + 1;
      },
    },
    {
      title: "Thao tác",
      dataIndex: "id",
      align: "center",
      width: 320,
      render: (_: any, record: any) => {
        const id = record?.id;
        const maBaoGia = record?.ma_don_hang;

        return (
          <Space size={4} wrap>
            {permission.show && (
              <ChiTietQuanLyBanHang path={path} id={id} title={title} />
            )}

            {permission.show && (
              <InHoaDon donHangId={id} disabled={!permission.show} />
            )}

            {permission.show && (
              <Button
                size="small"
                onClick={() => handleViewBaoGiaPdf(id)}
                style={{ marginLeft: 4 }}
              >
                Báo giá PDF
              </Button>
            )}

            {permission.show && (
              <Button
                size="small"
                type="primary"
                onClick={() => handleExportBaoGiaExcel(id)}
                style={{ marginLeft: 4 }}
              >
                Excel
              </Button>
            )}

            {permission.edit && (
              <SuaQuanLyBanHang path={path} id={id} title={title} />
            )}

            {permission.delete && (
              <Delete path={path} id={id} onShow={getDanhSach} />
            )}

            {/* 🔹 Nút mở Chi phí đề xuất */}
            <ChiPhiDeXuatButton
              donHangId={id}
              maBaoGia={maBaoGia}
            />
  {/* 🔹 Nút Chuyển HĐ từ báo giá */}
        <ChuyenHopDongButton
          donHangId={id}
          maBaoGia={maBaoGia}
        />

          </Space>
        );
      },
    },

    {
      // 🔹 Mã báo giá (trước đây là Mã đơn hàng)
      title: "Mã báo giá",
      dataIndex: "ma_don_hang",
      ...inputSearch({
        dataIndex: "ma_don_hang",
        operator: "contain",
        nameColumn: "Mã báo giá",
      }),
    },
    {
      title: "Ngày tạo",
      dataIndex: "ngay_tao_don_hang",
      ...dateSearch({
        dataIndex: "ngay_tao_don_hang",
        nameColumn: "Ngày tạo",
      }),
    },

    /** 🔹 Trạng thái BÁO GIÁ (quote_status) */
    {
      title: "Trạng thái báo giá",
      dataIndex: "quote_status",
      render: (val: number) => {
        const color = QUOTE_STATUS_COLOR[val] ?? "default";
        const label =
          QUOTE_STATUS_OPTIONS.find((o) => o.value === val)?.label ?? "Không rõ";
        return <Tag color={color}>{label}</Tag>;
      },
      ...selectSearchWithOutApi({
        dataIndex: "quote_status",
        operator: "equal",
        nameColumn: "Trạng thái báo giá",
        options: QUOTE_STATUS_OPTIONS,
      }),
    },

    /** 🔹 Trạng thái GIAO HÀNG (giữ lại cho tương thích) */
    {
      title: "Trạng thái giao hàng",
      dataIndex: "trang_thai_don_hang",
      render: (val: number) => {
        const color = DON_HANG_STATUS_COLOR[val as 0 | 1 | 2 | 3] ?? "default";
        const label =
          donHangTrangThaiSelect.find((o) => o.value === val)?.label ?? "Không rõ";
        return <Tag color={color}>{label}</Tag>;
      },
      ...selectSearchWithOutApi({
        dataIndex: "trang_thai_don_hang",
        operator: "equal",
        nameColumn: "Trạng thái giao hàng",
        options: donHangTrangThaiSelect,
      }),
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
      title: "Số điện thoại",
      dataIndex: "so_dien_thoai",
      ...inputSearch({
        dataIndex: "so_dien_thoai",
        operator: "contain",
        nameColumn: "Số điện thoại",
      }),
    },
    {
      title: "Tổng tiền",
      dataIndex: "tong_tien_can_thanh_toan",
      ...inputSearch({
        dataIndex: "tong_tien_can_thanh_toan",
        operator: "contain",
        nameColumn: "Tổng tiền cần thanh toán",
      }),
      render: (tong_tien_can_thanh_toan: number) => {
        return formatVietnameseCurrency(tong_tien_can_thanh_toan);
      },
    },
    {
      title: "Đã thanh toán",
      dataIndex: "so_tien_da_thanh_toan",
      ...inputSearch({
        dataIndex: "so_tien_da_thanh_toan",
        operator: "contain",
        nameColumn: "Tổng tiền đã thanh toán",
      }),
      render: (so_tien_da_thanh_toan: number) => {
        return formatVietnameseCurrency(so_tien_da_thanh_toan);
      },
    },
    {
      title: "Trạng thái thanh toán",
      dataIndex: "trang_thai_thanh_toan",
      key: "trang_thai_thanh_toan",
      render: (v: any, row: any) => {
        const st = Number(row?.trang_thai_thanh_toan ?? v ?? 0);
        if (st === 2) return <Tag color="green">Đã hoàn thành</Tag>;
        if (st === 1) return <Tag color="gold">Thanh toán một phần</Tag>;
        return <Tag color="red">Chưa hoàn thành</Tag>;
      },
      ...selectSearchWithOutApi({
        dataIndex: "trang_thai_thanh_toan",
        operator: "equal",
        nameColumn: "Trạng thái thanh toán",
        options: OPTIONS_TRANG_THAI_THANH_TOAN,
      }),
    },
    {
      title: "Trạng thái xuất kho",
      dataIndex: "trang_thai_xuat_kho",
      render: (trang_thai_xuat_kho: number) => {
        return (
          <Tag
            color={
              trang_thai_xuat_kho === 1
                ? "blue"
                : trang_thai_xuat_kho === 2
                ? "green"
                : "red"
            }
          >
            {trang_thai_xuat_kho === 1
              ? "Đã có xuất kho"
              : trang_thai_xuat_kho === 2
              ? "Đã hoàn thành"
              : "Chưa xuất kho"}
          </Tag>
        );
      },
      ...selectSearchWithOutApi({
        dataIndex: "trang_thai_xuat_kho",
        operator: "equal",
        nameColumn: "Trạng thái xuất kho",
        options: OPTIONS_TRANG_THAI_XUAT_KHO,
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

  // Bảng full cho desktop/tablet
  const table = (
    <CustomTable
      rowKey="id"
      dataTable={danhSach?.data}
      defaultColumns={defaultColumns}
      filter={filter}
      scroll={{ x: 2600 }}
      handlePageChange={handlePageChange}
      handleLimitChange={handleLimitChange}
      total={danhSach?.total}
      loading={isLoading}
    />
  );

  // Card view cho mobile
  const cardData = (danhSach?.data as any[]) || [];
  const cardActions = (r: any) => (
    <>
      {permission.show && (
        <ChiTietQuanLyBanHang path={path} id={r.id} title={title} />
      )}

      {permission.show && (
        <InHoaDon donHangId={r.id} disabled={!permission.show} />
      )}

      {permission.edit && (
        <SuaQuanLyBanHang path={path} id={r.id} title={title} />
      )}

      {permission.delete && (
        <Delete path={path} id={r.id} onShow={getDanhSach} />
      )}

      {permission.show && (
        <Button
          size="small"
          style={{ marginLeft: 4 }}
          onClick={() => handleViewBaoGiaPdf(r.id)}
        >
          PDF
        </Button>
      )}

      {permission.show && (
        <Button
          size="small"
          type="primary"
          style={{ marginLeft: 4 }}
          onClick={() => handleExportBaoGiaExcel(r.id)}
        >
          Excel
        </Button>
      )}

      {/* 🔹 Nút CP Đề xuất & CP Thực tế trên mobile */}
      <ChiPhiDeXuatButton
        donHangId={r.id}
        maBaoGia={r.ma_don_hang}
      />
      <ChiPhiThucTeButton
        donHangId={r.id}
        maBaoGia={r.ma_don_hang}
      />
     {/* 🔹 Nút Chuyển HĐ trên mobile */}
    <ChuyenHopDongButton
      donHangId={r.id}
      maBaoGia={r.ma_don_hang}
    />
    </>
  );

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

          <CardList
            data={cardData}
            loading={isLoading}
            keyField="id"
            title={(r) => r.ma_don_hang || "Báo giá"}
            subtitle={(r) =>
              `${r.ten_khach_hang || "KH vãng lai"} • ${
                r.ngay_tao_don_hang
                  ? dayjs(r.ngay_tao_don_hang).format("DD/MM/YYYY")
                  : ""
              }`
            }
            extra={(r) => (
              <span>
                {formatVietnameseCurrency(
                  r.tong_tien_can_thanh_toan || 0
                )}
              </span>
            )}
            fields={[
              { label: "Khách hàng", path: "ten_khach_hang" },
              { label: "SĐT", path: "so_dien_thoai" },
              {
                label: "Trạng thái báo giá",
                tag: (r) => {
                  const st = QUOTE_STATUS_OPTIONS.find(
                    (o) => o.value === r.quote_status
                  );
                  const color =
                    QUOTE_STATUS_COLOR[r.quote_status ?? 0] || "default";
                  return st ? { text: st.label, color } : null;
                },
              },
              {
                label: "Đã thu",
                render: (r) =>
                  formatVietnameseCurrency(
                    r.so_tien_da_thanh_toan || 0
                  ),
              },
            ]}
            actions={cardActions}
          >
            {table}
          </CardList>
        </Flex>
      </Col>
    </Row>
  );
};

export default DanhSachQuanLyBanHang;
