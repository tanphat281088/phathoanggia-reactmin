import { useEffect, useState } from "react";
import { Button, Card, Input, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG, URL_CONSTANTS } from "../../configs/api-route-config";
import { useNavigate } from "react-router-dom";

type Row = {
  khach_hang_id: number | null;
  ten_khach_hang: string | null;
  so_dien_thoai: string | null;
  tong_phai_thu: number;
  da_thu: number;
  con_lai: number;
  so_don_con_no: number;
  age_0_30: number;
  age_31_60: number;
  age_61_90: number;
  age_91_plus: number;
};

export default function ReceivablesList() {
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const navigate = useNavigate();

  const fetchData = async (pageNo = 1, per = perPage, keyword = q) => {
    setLoading(true);
    try {
      const resp = await axios.get(API_ROUTE_CONFIG.CONG_NO_SUMMARY, {
        params: { page: pageNo, per_page: per, q: keyword },
      });
      const rows = resp?.data?.data?.collection ?? resp?.data?.collection ?? [];
      const t = resp?.data?.data?.total ?? resp?.data?.total ?? 0;
      setData(rows);
      setTotal(Number(t));
      setPage(pageNo);
      setPerPage(per);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, perPage, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<Row> = [
    { title: "KH ID", dataIndex: "khach_hang_id", width: 90 },
    { title: "Khách hàng", dataIndex: "ten_khach_hang" },
    { title: "SĐT", dataIndex: "so_dien_thoai", width: 140 },
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
      dataIndex: "con_lai",
      align: "right",
      render: (v) => <b>{v?.toLocaleString("vi-VN")}</b>,
      width: 120,
    },
    {
      title: "Số đơn còn nợ",
      dataIndex: "so_don_con_no",
      align: "center",
      width: 140,
    },
    {
      title: "Tuổi nợ (0–30/31–60/61–90/>90 ngày)",
      key: "aging",
      render: (_, r) =>
        `${(r.age_0_30||0).toLocaleString("vi-VN")} / ${(r.age_31_60||0).toLocaleString("vi-VN")} / ${(r.age_61_90||0).toLocaleString("vi-VN")} / ${(r.age_91_plus||0).toLocaleString("vi-VN")}`,
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      width: 130,
      render: (_, r) => (
        <Space>
          <Button size="small" type="primary"
            onClick={() =>
              navigate(
                typeof URL_CONSTANTS.CONG_NO_KH_DETAIL === "function"
                  ? URL_CONSTANTS.CONG_NO_KH_DETAIL(r.khach_hang_id ?? 0)
                  : `/admin/quan-ly-thu-chi/cong-no-khach-hang/${r.khach_hang_id}`
              )
            }
            disabled={!r.khach_hang_id}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Công nợ khách hàng (tổng hợp)">
      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="Tìm tên KH / SĐT"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onPressEnter={() => fetchData(1, perPage, q.trim())}
          style={{ width: 280 }}
        />
        <Button onClick={() => fetchData(1, perPage, q.trim())}>Tìm</Button>
        <Button
          onClick={() =>
            window.open(API_ROUTE_CONFIG.CONG_NO_EXPORT, "_blank")
          }
        >
          Xuất CSV
        </Button>
      </Space>

      <Table<Row>
        rowKey={(r) => String(r.khach_hang_id ?? Math.random())}
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{
          current: page,
          pageSize: perPage,
          total,
          onChange: (p, ps) => fetchData(p, ps, q.trim()),
          showSizeChanger: true,
        }}
        scroll={{ x: 1000 }}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        * Số liệu đọc từ view chỉ-đọc; chỉ hiện các khách còn dư nợ & loại trừ đơn đã hủy.
      </Typography.Paragraph>
    </Card>
  );
}
