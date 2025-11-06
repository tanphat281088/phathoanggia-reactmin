import { useEffect, useState } from "react";
import { Card, Descriptions, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useParams } from "react-router-dom";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

type Row = {
  don_hang_id: number;
  ma_don_hang: string;
  khach_hang_id: number | null;
  ten_khach_hang: string | null;
  so_dien_thoai: string | null;
  tong_phai_thu: number;
  da_thu: number;
  du_no: number;
  trang_thai_thanh_toan: number;
  trang_thai_don_hang: number | null;
  ngay_tao_don_hang: string;
};

export default function ReceivablesDetail() {
  const { id } = useParams();
  const khId = Number(id);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [header, setHeader] = useState<{ ten?: string; sdt?: string }>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await axios.get(API_ROUTE_CONFIG.CONG_NO_BY_CUSTOMER(khId));
      const list = resp?.data?.data?.collection ?? resp?.data?.collection ?? [];
      setRows(list);
      if (list?.length) {
        setHeader({
          ten: list[0].ten_khach_hang || undefined,
          sdt: list[0].so_dien_thoai || undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(khId)) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khId]);

  const columns: ColumnsType<Row> = [
    { title: "Mã đơn", dataIndex: "ma_don_hang", width: 120, fixed: "left" },
    {
      title: "Ngày tạo",
      dataIndex: "ngay_tao_don_hang",
      width: 120,
      render: (v) => new Date(v).toLocaleDateString("vi-VN"),
    },
    {
      title: "Tổng phải thu",
      dataIndex: "tong_phai_thu",
      align: "right",
      render: (v) => v?.toLocaleString("vi-VN"),
      width: 130,
    },
    {
      title: "Đã thu",
      dataIndex: "da_thu",
      align: "right",
      render: (v) => v?.toLocaleString("vi-VN"),
      width: 120,
    },
    {
      title: "Còn lại",
      dataIndex: "du_no",
      align: "right",
      render: (v) => <b>{v?.toLocaleString("vi-VN")}</b>,
      width: 120,
    },
    {
      title: "TT thanh toán",
      dataIndex: "trang_thai_thanh_toan",
      width: 130,
      render: (v) => (v === 0 ? "Chưa TT" : v === 1 ? "TT một phần" : "Đã TT"),
    },
  ];

  return (
    <Card
      loading={loading}
      title="Công nợ khách hàng — Chi tiết đơn còn nợ"
      extra={header.ten ? `KH: ${header.ten} ${header.sdt ? " • " + header.sdt : ""}` : undefined}
    >
      <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
        <Descriptions.Item label="Khách hàng">
          {header.ten || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">
          {header.sdt || "—"}
        </Descriptions.Item>
      </Descriptions>
      <Table<Row>
        rowKey={(r) => String(r.don_hang_id)}
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 900 }}
      />
    </Card>
  );
}
