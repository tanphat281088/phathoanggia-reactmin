/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Popconfirm,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import baseAxios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import usePermission from "../../hooks/usePermission";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ZnsStatus = "pending" | "sent" | "failed" | "cancelled";

type InviteRow = {
  id: number;
  khach_hang_id: number;
  don_hang_id: number;

  ten_khach_hang: string | null; // join khach_hangs
  ma_kh: string | null;
  so_dien_thoai: string | null;

  customer_name: string | null;  // snapshot
  customer_code: string | null;
  order_code: string;
  order_date: string;            // ISO

  zns_status: ZnsStatus;
  zns_sent_at: string | null;
  zns_template_id: string | null;
  zns_error_code: string | null;
  zns_error_message: string | null;

  created_at: string;
  dh_status?: number | null;
pay_status?: number | null;
pay_type?: number | null;
order_total?: number | null;
paid_amount?: number | null;
product_names?: string | null;

};

type Paged<T> = {
  current_page: number;
  data: T[];
  per_page: number;
  total: number;
};



const fmtVND = (v?: number | string | null) =>
  new Intl.NumberFormat("vi-VN").format(Number(v ?? 0)) + " ₫";

const OrderStatusTag = ({ s }: { s?: number | null }) => {
  const map: Record<number, { text: string; color: any }> = {
    0: { text: "Chưa giao",  color: "default" },
    1: { text: "Đang giao",  color: "processing" },
    2: { text: "Đã giao",    color: "success" },
    3: { text: "Đã hủy",     color: "error" },
  };
  const m = s != null ? map[s] : undefined;
  return <Tag color={m?.color || "default"}>{m?.text || "—"}</Tag>;
};

const PayStatusTag = ({ ps, pt }: { ps?: number | null; pt?: number | null }) => {
  const isPaid = ps === 1 || pt === 2;
  const text = isPaid ? "Hoàn thành" : pt === 1 ? "Đặt cọc" : "Chưa thanh toán";
  const color = isPaid ? "success" : pt === 1 ? "warning" : "default";
  return <Tag color={color}>{text}</Tag>;
};

const ZnsStatusTag = ({ status }: { status: ZnsStatus }) => {
  if (status === "pending") return <Tag color="gold">Chờ gửi</Tag>;
  if (status === "sent") return <Tag color="green">Đã gửi</Tag>;
  if (status === "failed") return <Tag color="red">Thất bại</Tag>;
  return <Tag color="default">Đã huỷ</Tag>;
};

export default function ReviewInviteList() {
  const { message, modal } = App.useApp?.() ?? { message: { success: () => {}, error: () => {}, warning: () => {} }, modal: Modal };

    // ===== Preview nội dung ZNS đã duyệt (thay biến) =====
  const buildZnsPreview = (row: InviteRow) => {
    const name =
      row.customer_name ||
      row.ten_khach_hang ||
      "";
    const code = row.order_code || "";
    const date = row.order_date ? dayjs(row.order_date).format("DD/MM/YYYY") : "";
    const customerCode = row.customer_code || row.ma_kh || String(row.khach_hang_id || "");

    return (
`Đánh giá dịch vụ PHG Floral & Decor

Cảm ơn quý khách ${name} đã tin tưởng và lựa chọn sản phẩm hoa tươi của chúng tôi với đơn hàng ${code} vào ngày ${date}. Quý khách vui lòng đánh giá mức độ hài lòng để chúng tôi cải thiện chất lượng dịch vụ. Mã khách hàng: ${customerCode}`
    );
  };

  const [form] = Form.useForm();

  // RBAC
  const perm = usePermission("/cskh/reviews"); // cần map trong hệ quyền của anh
  const canCreate = (perm as any)?.create === true;
  const canSend   = (perm as any)?.send   === true;
  const canBulk   = (perm as any)?.bulk   === true;

  // State
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  // Modal gửi ZNS
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedRow, setSelectedRow] = useState<InviteRow | null>(null);

  // Bulk
  const [bulkLoading, setBulkLoading] = useState(false);

  // Form init
  const initFrom = dayjs().startOf("month");
  const initTo   = dayjs().endOf("day");
  useEffect(() => {
    form.setFieldsValue({
      status: undefined,
      q: "",
      dateRange: [initFrom, initTo],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchList = useCallback(async (_page = 1, _perPage = perPage) => {
    try {
      setLoading(true);
      const { status, q, dateRange } = form.getFieldsValue();
      const from = (dateRange?.[0] as Dayjs | undefined)?.format("YYYY-MM-DD");
      const to   = (dateRange?.[1] as Dayjs | undefined)?.format("YYYY-MM-DD");

      const params: any = { per_page: _perPage, page: _page };
      if (status) params.status = status;
      if (q && String(q).trim() !== "") params.q = String(q).trim();
      if (from) params.from = from;
      if (to)   params.to   = to;

      const url = API_ROUTE_CONFIG.CSKH_REVIEW_INVITES_LIST;
      const res = await baseAxios.get<Paged<InviteRow>>(url, { params });

      const payload: any = res?.data ?? res;
      const p = payload?.data && Array.isArray(payload.data)
        ? payload
        : payload?.data ?? payload;

      const rowsData = p?.data ?? p?.collection ?? [];
      setRows(rowsData);
      setTotal(p?.total ?? rowsData.length ?? 0);
      setPage(p?.current_page ?? _page);
      setPerPage(p?.per_page ?? _perPage);
    } catch (e: any) {
      console.error("[ReviewInviteList] fetchList error =", e);
      message?.error?.(e?.response?.data?.message || "Không tải được danh sách lời mời.");
    } finally {
      setLoading(false);
    }
  }, [form, message, perPage]);

  useEffect(() => { fetchList(1, perPage); }, [fetchList, perPage]);

  const onSearch = () => fetchList(1, perPage);
  const onReset = () => {
    form.resetFields();
    form.setFieldsValue({ dateRange: [initFrom, initTo] });
    fetchList(1, perPage);
  };

  const openSendModal = (row: InviteRow) => {
    setSelectedRow(row);
    setSendModalOpen(true);
  };

  const handleSend = async () => {
    if (!selectedRow) return;
    try {
      setSending(true);
      const url = API_ROUTE_CONFIG.CSKH_REVIEW_INVITES_SEND(selectedRow.id);
      const res = await baseAxios.post(url, {}); // template_id lấy từ ENV BE
      const ok = res?.data?.success !== false;
      if (ok) {
        message?.success?.("Gửi ZNS thành công.");
        setSendModalOpen(false);
        fetchList(page, perPage);
      } else {
        message?.error?.(res?.data?.message || "Gửi ZNS thất bại.");
      }
    } catch (e: any) {
      message?.error?.(e?.response?.data?.message || "Không gửi được ZNS.");
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvite = async (row: InviteRow) => {
    try {
      const url = API_ROUTE_CONFIG.CSKH_REVIEW_INVITES_CANCEL(row.id);
      const res = await baseAxios.patch(url, {});
      const ok = res?.data?.success !== false;
      ok ? message?.success?.("Đã huỷ lời mời.") : message?.error?.(res?.data?.message || "Không huỷ được.");
      fetchList(page, perPage);
    } catch (e: any) {
      message?.error?.(e?.response?.data?.message || "Không huỷ được lời mời.");
    }
  };

  const handleBulkSend = async () => {
    try {
      setBulkLoading(true);
      const { dateRange } = form.getFieldsValue();
      const from = (dateRange?.[0] as Dayjs | undefined)?.format("YYYY-MM-DD");
      const to   = (dateRange?.[1] as Dayjs | undefined)?.format("YYYY-MM-DD");

      const body: any = { from, to, limit: 200 };
      const res = await baseAxios.post(API_ROUTE_CONFIG.CSKH_REVIEW_INVITES_BULK_SEND, body);
      const stat = res?.data?.data || {};
      modal.success({
        title: "Kết quả gửi hàng loạt",
        content: (
          <div>
            <div><b>Thành công:</b> {stat.ok ?? 0}</div>
            <div><b>Thất bại:</b> {stat.fail ?? 0}</div>
          </div>
        ),
      });
      fetchList(page, perPage);
    } catch (e: any) {
      message?.error?.(e?.response?.data?.message || "Bulk gửi thất bại.");
    } finally {
      setBulkLoading(false);
    }
  };

const handleManualRefresh = async () => {
  try {
    setBulkLoading(true);
    const { dateRange } = form.getFieldsValue();
    const from = (dateRange?.[0] as Dayjs | undefined)?.format?.("YYYY-MM-DD");
    const to   = (dateRange?.[1] as Dayjs | undefined)?.format?.("YYYY-MM-DD");
    const body: any = { from, to, limit: 1000 };
    const res = await baseAxios.post(API_ROUTE_CONFIG.CSKH_REVIEW_INVITES_BACKFILL, body);
    const stat = res?.data?.data || {};
    message?.success?.(`Đã quét: ${stat.scanned ?? 0}, tạo mới: ${stat.created ?? 0}, bỏ qua: ${stat.skipped ?? 0}`);
    fetchList(page, perPage);
  } catch (e: any) {
    message?.error?.(e?.response?.data?.message || "Làm mới dữ liệu thất bại.");
  } finally {
    setBulkLoading(false);
  }
};


  const columns = useMemo(() => {
    return [
      {
        title: "Khách hàng",
        key: "kh",
          width: 260,        
        render: (_: any, r: InviteRow) => (
          <div>
            <div><Text strong>{r.ten_khach_hang || r.customer_name || "—"}</Text></div>
            <div><Text type="secondary">Mã KH:</Text> <Text code>{r.ma_kh || r.customer_code || r.khach_hang_id}</Text></div>
            <div><Text type="secondary">SĐT:</Text> <Text>{r.so_dien_thoai || "—"}</Text></div>
          </div>
        ),
      },
      {
        title: "Đơn hàng",
        key: "order",
          width: 140, // ⬅️ làm nhỏ lại ~40%
        render: (_: any, r: InviteRow) => (
          <div>
            <Text strong>#{r.order_code}</Text><br/>
            <Text type="secondary">{dayjs(r.order_date).format("DD/MM/YYYY")}</Text>
          </div>
        ),
      },

      {
  title: "Trạng thái đơn",
  key: "dh_status",
  width: 110,
  render: (_: any, r: InviteRow) => <OrderStatusTag s={r.dh_status ?? null} />,
},
{
  title: "Thanh toán",
  key: "pay_status",
  width: 100,
  render: (_: any, r: InviteRow) => <PayStatusTag ps={r.pay_status ?? null} pt={r.pay_type ?? null} />,
},
{
  title: "Giá trị đơn",
  key: "order_total",
  width: 160,
  render: (_: any, r: InviteRow) => (
    <div>
      <div><Text strong>{fmtVND(r.order_total)}</Text></div>
      <div><Text type="secondary">Đã thu: {fmtVND(r.paid_amount)}</Text></div>
    </div>
  ),
},
{
  title: "Sản phẩm",
  key: "product_names",
  width: 542, // ⬅️ rộng gấp 1.7
  render: (_: any, r: InviteRow) => (
    <Text
      style={{ maxWidth: "100%", display: "inline-block" }} // ⬅️ khớp width cột khi tableLayout=fixed
      ellipsis={{ tooltip: r.product_names || undefined }}
    >
      {r.product_names || "—"}
    </Text>
  ),
},



      {
        title: "Trạng thái ZNS",
        dataIndex: "zns_status",
        key: "zns_status",
          fixed: "right" as const,   // ⬅️ cố định cạnh phải

        width: 100,
        render: (val: ZnsStatus, r: InviteRow) => (
          <Space direction="vertical" size={2}>
            <ZnsStatusTag status={val} />
            {r.zns_sent_at && <Text type="secondary" style={{fontSize:12}}>{dayjs(r.zns_sent_at).format("DD/MM/YYYY HH:mm")}</Text>}
            {val === "failed" && r.zns_error_message && (
              <Tooltip title={r.zns_error_message}>
                <Text type="danger" style={{ fontSize: 12 }}>{r.zns_error_code || "Lỗi"}</Text>
              </Tooltip>
            )}
          </Space>
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        fixed: "right" as const,
        width: 160,
        render: (_: any, r: InviteRow) => (
          <Space>
            <Button
              type="primary"
           disabled={!canSend || !["pending","failed"].includes(r.zns_status)}

              onClick={() => openSendModal(r)}
            >
              Gửi ZNS
            </Button>
            <Popconfirm
              title="Huỷ lời mời này?"
       disabled={!canSend || !["pending","failed"].includes(r.zns_status)}

              onConfirm={() => handleCancelInvite(r)}
              okText="Huỷ"
              cancelText="Không"
            >
              <Button disabled={!canSend || !["pending","failed"].includes(r.zns_status)}
>Huỷ</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }, [canSend]);

  return (
    <div style={{ padding: 12 }}>
      <Row gutter={[12, 12]}>
        <Col span={24}>
          <Title level={3} style={{ margin: 0 }}>
            Chương trình Chăm sóc khách hàng và Đánh giá dịch vụ thông qua Zalo ZNS của PHG Floral & Decor
          </Title>
          <Text type="secondary">
            Đây là chương trình quản lý gửi đánh giá khách hàng. Khi đơn hàng chuyển trạng thái đã giao và thanh toán thì gửi tin nhắn Zalo để chăm sóc khách hàng và nhận lời đánh giá từ khách. Lưu ý mỗi đơn hàng chỉ được gửi 1 lần!
          </Text>
        </Col>

        <Col span={24}>
          <Card size="small">
            <Form form={form} layout="vertical" onFinish={onSearch} initialValues={{
              status: undefined,
              q: "",
              dateRange: [initFrom, initTo],
            }}>
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="Khoảng ngày" name="dateRange">
                    <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" allowClear={false} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6} lg={5}>
                  <Form.Item label="Trạng thái ZNS" name="status">
                    <Select
                      allowClear
                      options={[
                        { value: "pending", label: "Chờ gửi" },
                        { value: "sent", label: "Đã gửi" },
                        { value: "failed", label: "Thất bại" },
                        { value: "cancelled", label: "Đã huỷ" },
                      ]}
                      placeholder="Chọn trạng thái"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={10} lg={7}>
                  <Form.Item label="Tìm kiếm" name="q">
                    <Input allowClear placeholder="Mã KH / Tên KH / SĐT / Mã đơn" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={8} lg={6}>
                  <Form.Item label=" ">
                    <Space wrap>
                      <Button type="primary" onClick={onSearch}>Lọc</Button>
                      <Button onClick={onReset}>Xóa lọc</Button>
                      <Button type="default" loading={bulkLoading} disabled={!canBulk} onClick={handleBulkSend}>
                        Gửi hàng loạt
                      </Button>
                      <Button type="default" onClick={handleManualRefresh} loading={bulkLoading} disabled={!canBulk}>
  Làm mới dữ liệu
</Button>

                    </Space>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        <Col span={24}>
          <Card size="small">
            <Table<InviteRow>
              bordered
              size="middle"
              rowKey={(r) => String(r.id)}
              loading={loading}
              columns={columns}
              dataSource={rows}
              pagination={{
                current: page,
                total,
                pageSize: perPage,
                showSizeChanger: true,
                showTotal: (t) => `${t} lời mời`,
                onChange: (p, ps) => {
                  setPage(p);
                  setPerPage(ps);
                  fetchList(p, ps);
                },
              }}
               tableLayout="fixed"   
              scroll={{ x: 1800 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Modal xác nhận gửi */}
      <Modal
        open={sendModalOpen}
        title="Xác nhận gửi ZNS (Đánh giá dịch vụ)"
        onCancel={() => setSendModalOpen(false)}
        onOk={handleSend}
        confirmLoading={sending}
  okButtonProps={{ disabled: !["pending","failed"].includes(selectedRow?.zns_status || "") }}

        okText="Gửi ngay"
        cancelText="Hủy"
      >
        {selectedRow ? (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <div>
              <Text type="secondary">Khách hàng:</Text>{" "}
              <Text strong>
                {selectedRow.ten_khach_hang || selectedRow.customer_name || "—"} (Mã KH:{" "}
                {selectedRow.ma_kh || selectedRow.customer_code || selectedRow.khach_hang_id})
              </Text>
            </div>
            <div>
              <Text type="secondary">Đơn hàng:</Text>{" "}
              <Text strong>#{selectedRow.order_code}</Text>{" "}
              <Text type="secondary">({dayjs(selectedRow.order_date).format("DD/MM/YYYY")})</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Anh em kiểm tra Nội dung và gửi (Đây là nội dung Zalo đã duyệt). Mỗi tin nhắn chỉ được gửi 1 lần.
            </Text>

                {/* ===== PREVIEW NỘI DUNG ZNS (đã thay biến) ===== */}
    <Card size="small" style={{ background: "#fafafa" }} title="Nội dung ZNS sẽ gửi">
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.6 }}>
        {buildZnsPreview(selectedRow)}
      </pre>
    </Card>

          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
