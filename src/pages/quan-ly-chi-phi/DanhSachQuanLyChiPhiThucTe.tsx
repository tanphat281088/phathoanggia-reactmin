/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData } from "../../services/getData.api";
import {
  createFilterQueryFromArray,
  formatVietnameseCurrency,
} from "../../utils/utils";
import { Col, Row, Space, Tag, Flex, Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../components/CustomTable";
import type { RootState } from "../../redux/store";
import { usePagination } from "../../hooks/usePagination";
import type { Actions } from "../../types/main.type";
import ExportTableToExcel from "../../components/ExportTableToExcel";
import Delete from "../../components/Delete";
import SuaQuanLyChiPhiThucTe from "./SuaQuanLyChiPhiThucTe";


const { Text } = Typography;

const DanhSachQuanLyChiPhiThucTe = ({
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

  const { inputSearch, query, dateSearch, selectSearchWithOutApi } =
    useColumnSearch();

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
      width: 70,
      render: (_text: any, _record: any, index: number) => {
        return filter.limit && (filter.page - 1) * filter.limit + index + 1;
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
              <SuaQuanLyChiPhiThucTe
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
      title: "Mã báo giá",
      dataIndex: "ma_don_hang",
      render: (_val: any, record: any) => {
        const dh = record?.don_hang || record?.donHang || {};
        return dh?.ma_don_hang || "-";
      },
      ...inputSearch({
        dataIndex: "ma_don_hang",
        operator: "contain",
        nameColumn: "Mã báo giá",
      }),
    },
    {
      title: "Khách hàng",
      dataIndex: "ten_khach_hang",
      render: (_val: any, record: any) => {
        const dh = record?.don_hang || record?.donHang || {};
        return dh?.ten_khach_hang || "-";
      },
      ...inputSearch({
        dataIndex: "ten_khach_hang",
        operator: "contain",
        nameColumn: "Khách hàng",
      }),
    },
    {
      title: "Mã chi phí",
      dataIndex: "code",
      render: (val: string | null | undefined, record: any) =>
        val || `CPTT-${record?.id ?? ""}`,
      ...inputSearch({
        dataIndex: "code",
        operator: "contain",
        nameColumn: "Mã chi phí",
      }),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (_status: number, record: any) => {
        const text = record?.status_text || record?.statusText || "Không rõ";
        let color: "default" | "processing" | "success" | "warning" | "error" =
          "default";

        switch (_status) {
          case 0:
            color = "default";
            break;
          case 1:
            color = "processing";
            break;
          case 2:
            color = "success";
            break;
          default:
            color = "default";
        }

        return <Tag color={color}>{text}</Tag>;
      },
      ...selectSearchWithOutApi({
        dataIndex: "status",
        operator: "equal",
        nameColumn: "Trạng thái",
        options: [
          { label: "Nháp", value: 0 },
          { label: "Đang chỉnh", value: 1 },
          { label: "Đã khoá", value: 2 },
        ],
      }),
    },
    {
      title: "Tổng doanh thu",
      dataIndex: "total_revenue",
      align: "right",
      render: (val: number) => formatVietnameseCurrency(val),
    },
    {
      title: "Tổng chi phí thực tế",
      dataIndex: "total_cost",
      align: "right",
      render: (val: number) => formatVietnameseCurrency(val),
    },
    {
      title: "Lợi nhuận thực tế",
      dataIndex: "total_margin",
      align: "right",
      render: (val: number) => formatVietnameseCurrency(val),
    },
    {
      title: "% Lợi nhuận",
      dataIndex: "margin_percent",
      align: "right",
      render: (val: number | null | undefined, record: any) => {
        const v =
          val != null
            ? Number(val)
            : record?.margin_percent_computed != null
            ? Number(record.margin_percent_computed)
            : null;
        return v != null ? `${v.toFixed(2)} %` : "-";
      },
    },
    {
      title: "Người tạo",
      dataIndex: "ten_nguoi_tao",
      render: (val: string | null | undefined) => val || "-",
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
      render: (val: string | null | undefined) => val || "-",
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
            scroll={{ x: 1400 }}
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

export default DanhSachQuanLyChiPhiThucTe;
