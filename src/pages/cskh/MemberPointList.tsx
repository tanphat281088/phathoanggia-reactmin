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
  Checkbox,
  message as antdMessage,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import baseAxios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

import usePermission from "../../hooks/usePermission";


const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ZnsStatus = "pending" | "sent" | "failed";

type PointEventRow = {
  id: number;
  khach_hang_id: number;
  don_hang_id: number;
  ten_khach_hang: string | null;
  ma_kh: string | null;
  so_dien_thoai: string | null;
  loai_khach_hang_id: number | null;

  order_code: string;
  order_date: string; // ISO
  price: number;

  old_revenue: number;
  new_revenue: number;
  delta_revenue: number;

  old_points: number;
  new_points: number;
  delta_points: number;

  zns_status: ZnsStatus;
  zns_sent_at: string | null;
  zns_error_code: string | null;
  zns_error_message: string | null;

  created_at: string; // ISO
};

type Paged<T> = {
  current_page: number;
  data: T[];
  per_page: number;
  total: number;
};

/** Định dạng tiền VND ngắn gọn */
const fmtVND = (v?: number | string | null) =>
  (new Intl.NumberFormat("vi-VN").format(Number(v ?? 0)) + " ₫");

/** Định dạng điểm */
const fmtPoint = (v?: number | string | null) =>
  new Intl.NumberFormat("vi-VN").format(Number(v ?? 0));

/** Nhãn trạng thái gửi ZNS */
/** Nhãn trạng thái gửi ZNS */
const ZnsStatusTag = ({ status }: { status: ZnsStatus }) => {
  if (status === "pending") return <Tag color="gold">Chờ gửi</Tag>;
  if (status === "sent") return <Tag color="green">Đã gửi</Tag>;
  return <Tag color="red">Thất bại</Tag>;
};

// 👉 Preview nội dung ZNS đúng theo template đã được duyệt
const buildZnsPointPreview = (row: PointEventRow) => {
  const name = row.ten_khach_hang || "";
  const customerCode = row.ma_kh || String(row.khach_hang_id || "");
  const orderCode = row.order_code || "";
  const date = row.order_date
    ? dayjs(row.order_date).format("DD/MM/YYYY")
    : "";
  const priceText = String(row.price ?? 0);           // <price> gửi số
  const pointText = String(row.delta_points ?? 0);    // <point>
  const totalPointText = String(row.new_points ?? 0); // <total_point>

  return (
`Thông báo điểm tích luỹ hạng thành viên PHG Floral & Decor

Cảm ơn quý khách ${name} đã sử dụng sản phẩm hoa tươi của chúng tôi. Quý khách được ghi nhận tích lũy điểm thành viên thành công với các thông tin sau:

Mã khách hàng
${customerCode}

Đơn hàng
${orderCode}

Ngày mua hàng
${date}

Giá trị đơn hàng
${priceText}

Điểm thưởng gia tăng
${pointText}

Tổng điểm hiện tại
${totalPointText}`
  );
};

export default function MemberPointList() {

  // Dùng trực tiếp instance global của AntD, không xài App.useApp nữa
  const message = antdMessage;
  const modal = Modal;
  const [form] = Form.useForm();



  // ------- State -------
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PointEventRow[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  // Confirm modal
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PointEventRow | null>(null);
  const [note, setNote] = useState<string>("");
    // Resync button state
  const [resyncLoading, setResyncLoading] = useState(false);

  // 👉 NEW: state cho Modal lịch sử điểm
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<PointEventRow[]>([]);
  const [historyCustomer, setHistoryCustomer] = useState<{
    id: number | string;
    name?: string | null;
    code?: string | null;
  } | null>(null);

    // ===== permissions (RBAC) cho CSKH → Điểm thành viên =====
  const permPts = usePermission("/cskh/points");
  const canSendZns = (permPts as any).sendZns === true;  // quyền Gửi ZNS



  // ------- Filters (form-controlled) -------
  const initDateFrom = dayjs().startOf("month");
  const initDateTo = dayjs().endOf("day");
  useEffect(() => {
    form.setFieldsValue({
      status: undefined,
      q: "",
      dateRange: [initDateFrom, initDateTo],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchList = useCallback(async (_page = 1, _perPage = perPage) => {
    try {
      setLoading(true);
      const { status, q, dateRange } = form.getFieldsValue();
      const date_from = (dateRange?.[0] as Dayjs | undefined)?.format("YYYY-MM-DD");
      const date_to = (dateRange?.[1] as Dayjs | undefined)?.format("YYYY-MM-DD");

      const params: any = {
        per_page: _perPage,
        page: _page,
      };
      if (status) params.status = status;
      if (q && String(q).trim() !== "") params.q = String(q).trim();
      if (date_from) params.date_from = date_from;
      if (date_to) params.date_to = date_to;
      const includeZero = form.getFieldValue("includeZero");
if (includeZero) params.include_zero = 1;   // gửi cờ hiển thị cả +0


      const url = API_ROUTE_CONFIG.CSKH_POINTS_EVENTS;
const res = await baseAxios.get<Paged<PointEventRow>>(url, { params });
// res CHÍNH LÀ body { success, message, data: { current_page, data, ... } } hoặc paginator trực tiếp
const payload: any = res?.data ? res.data : res; // hỗ trợ cả 2 kiểu trả về

const p = payload?.data && Array.isArray(payload.data)
  ? payload                                     // paginator trực tiếp có keys data,total
  : payload?.data                               // {success, data: { paginator }}
    ?? payload;                                 // fallback

const rowsData = p?.data ?? p?.collection ?? [];
setRows(rowsData);
setTotal(p?.total ?? rowsData.length ?? 0);
setPage(p?.current_page ?? _page);
setPerPage(p?.per_page ?? _perPage);

    } catch (e: any) {
      console.error("[MemberPointList] fetchList error =", e);
      message?.error?.(e?.response?.data?.message || "Không tải được danh sách biến động.");
    } finally {
      setLoading(false);
    }
  }, [form, message, perPage]);

  useEffect(() => {
    fetchList(1, perPage);
  }, [fetchList, perPage]);

  const onSearch = () => fetchList(1, perPage);
  const onReset = () => {
    form.resetFields();
    form.setFieldsValue({ dateRange: [initDateFrom, initDateTo] });
    fetchList(1, perPage);
  };

  /** Rà soát & đồng bộ điểm theo khoảng ngày đang lọc, chỉ các đơn đang lệch */
  const handleResync = async () => {
    try {
      setResyncLoading(true);
      const { dateRange } = form.getFieldsValue();
      const from = (dateRange?.[0] as Dayjs | undefined)?.format("YYYY-MM-DD");
      const to   = (dateRange?.[1] as Dayjs | undefined)?.format("YYYY-MM-DD");

      const body: any = {
        from_date: from,
        to_date: to,
        only_missing: true,   // chỉ xử lý các đơn đang lệch
        limit: 5000,          // bạn có thể chỉnh
      };

      const res = await baseAxios.post(API_ROUTE_CONFIG.CSKH_POINTS_RESYNC, body);
      console.log("[MemberPointList] resync response =", res?.data);
      const ok  = res?.data?.success !== false;

      if (ok) {
        const s = res?.data?.data || {};

        // ⚠️ DÙNG ALERT THẲNG CHO CHẮC ĂN
        window.alert(
          `Cập nhật điểm thành viên:\n` +
          `- Đã rà ${s.scanned ?? 0} đơn\n` +
          `- Cập nhật ${s.synced ?? 0} đơn\n` +
          `- Tạo ${s.created_events ?? 0} biến động`
        );

        // reload danh sách để thấy biến động pending mới
        await fetchList(page, perPage);
      } else {
        window.alert(res?.data?.message || "Rà soát thất bại.");
      }
    } catch (e: any) {
      console.error("[MemberPointList] handleResync error =", e);
      window.alert(e?.response?.data?.message || "Không chạy được cập nhật điểm.");
    } finally {
      setResyncLoading(false);
    }
  };

  /** Mở Modal lịch sử điểm của 1 khách hàng */
  const openHistory = async (row: PointEventRow) => {
    try {
      if (!row.khach_hang_id) {
        window.alert("Bản ghi này không có khách hàng hệ thống.");
        return;
      }

      setHistoryOpen(true);
      setHistoryLoading(true);
      setHistoryCustomer({
        id: row.khach_hang_id,
        name: row.ten_khach_hang,
        code: row.ma_kh,
      });

      const url = API_ROUTE_CONFIG.CSKH_POINTS_EVENTS_BY_CUSTOMER(
        row.khach_hang_id
      );

      const res = await baseAxios.get<Paged<PointEventRow>>(url, {
     params: { per_page: 200, page: 1 },
      });

      const payload: any = res?.data ?? res;
      const p =
        payload?.data && Array.isArray(payload.data)
          ? payload
          : payload?.data ?? payload;

      const rowsData = p?.data ?? p?.collection ?? [];
      setHistoryRows(rowsData);
    } catch (e: any) {
      console.error("[MemberPointList] openHistory error =", e);
      window.alert(
        e?.response?.data?.message ||
          "Không tải được lịch sử điểm của khách hàng."
      );
    } finally {
      setHistoryLoading(false);
    }
  };



  const columns = useMemo(() => {
    return [
      {
        title: "Khách hàng",
        dataIndex: "ten_khach_hang",
        key: "ten_khach_hang",
        render: (_: any, r: PointEventRow) => (
          <div>
            <div><Text strong>{r.ten_khach_hang || "—"}</Text></div>
            <div>
              <Text type="secondary">Mã KH:</Text>{" "}
              <Text code>{r.ma_kh || r.khach_hang_id}</Text>
            </div>
            <div>
              <Text type="secondary">SĐT:</Text>{" "}
              <Text>{r.so_dien_thoai || "—"}</Text>
            </div>
          </div>
        ),
      },
      {
        title: "Đơn hàng",
        dataIndex: "order_code",
        key: "order_code",
        render: (_: any, r: PointEventRow) => (
          <div>
            <Text strong>#{r.order_code}</Text>
            <br />
            <Text type="secondary">{dayjs(r.order_date).format("DD/MM/YYYY HH:mm")}</Text>
          </div>
        ),
      },
{
  title: "Giá trị / Điểm",
  key: "price_points",
  render: (_: any, r: PointEventRow) => {
    const signed = Number(r.delta_points || 0);
    const sign = signed >= 0 ? "+ " : "− ";
    const colorStyle = signed >= 0 ? {} : { color: "#cf1322" }; // red-6

    return (
      <div>
        <div>
          <Text type="secondary">Giá trị:</Text>{" "}
          <Text>{fmtVND(r.price)}</Text>
        </div>
        <div>
          <Text type="secondary">Điểm:</Text>{" "}
          <Text strong style={colorStyle}>
            {sign}{fmtPoint(Math.abs(signed))}
          </Text>
        </div>
        <div>
          <Text type="secondary">Tổng điểm:</Text>{" "}
          <Text>{fmtPoint(r.new_points)}</Text>
        </div>
      </div>
    );
  },
},

       {
        title: "Trạng thái ZNS",
        dataIndex: "zns_status",
        key: "zns_status",
        width: 150,
        render: (val: ZnsStatus, r: PointEventRow) => (
          <Space direction="vertical" size={2}>
            <ZnsStatusTag status={val} />
            {val !== "pending" && r.zns_sent_at && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(r.zns_sent_at).format("DD/MM/YYYY HH:mm")}
              </Text>
            )}
            {val === "failed" && r.zns_error_message && (
              <Tooltip title={r.zns_error_message}>
                <Text type="danger" style={{ fontSize: 12 }}>
                  {r.zns_error_code || "Lỗi"}
                </Text>
              </Tooltip>
            )}
          </Space>
        ),
      },
      // 👉 NEW: cột Lịch sử điểm
      {
        title: "Lịch sử điểm",
        key: "history",
        width: 130,
        render: (_: any, r: PointEventRow) => (
          <Button size="small" onClick={() => openHistory(r)}>
            Lịch sử điểm
          </Button>
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        fixed: "right" as const,
        width: 140,
        render: (_: any, r: PointEventRow) => {
          const canSend =
            (["pending", "failed"].includes(r.zns_status)) &&
            Number(r.delta_points || 0) !== 0;

          return (
            <Space>
              <Button
                type="primary"
                disabled={!canSendZns || !canSend}
                onClick={() => openSendModal(r)}
              >
                Gửi ZNS
              </Button>
            </Space>
          );
        },
      },
    ];
  }, [canSendZns]);


  const openSendModal = (row: PointEventRow) => {
    setSelectedRow(row);
    setNote("");
    setSendModalOpen(true);
  };

  const handleSend = async () => {
    if (!selectedRow) return;
    try {
      setSending(true);
      const url = API_ROUTE_CONFIG.CSKH_POINTS_SEND_ZNS(selectedRow.id);
      const res = await baseAxios.post(url, { note: note?.trim() || undefined });
      const ok = res?.data?.success !== false; // BE trả CustomResponse::success
      if (ok) {
        message?.success?.("Gửi ZNS thành công.");
        setSendModalOpen(false);
        // refresh current page
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

  return (
    <div style={{ padding: 12 }}>
      <Row gutter={[12, 12]}>
        <Col span={24}>
          <Title level={3} style={{ margin: 0 }}>
            Chăm sóc khách hàng · Điểm thành viên
          </Title>
          <Text type="secondary">
            Quản lý biến động điểm tích lũy khi đơn chuyển “đã thanh toán”. Mỗi biến động chỉ gửi ZNS 1 lần.
          </Text>
        </Col>

        <Col span={24}>
          <Card size="small">
            <Form
              form={form}
              layout="vertical"
              onFinish={onSearch}
              initialValues={{
                status: undefined,
                q: "",
                dateRange: [initDateFrom, initDateTo],
              }}
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="Khoảng ngày" name="dateRange">
                    <RangePicker
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY"
                      allowClear={false}
                      placeholder={["Từ ngày", "Đến ngày"]}
                    />
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
  {/* Checkbox Hiển thị cả +0 — CHÈN TRƯỚC block Space wrap */}
  <Form.Item name="includeZero" valuePropName="checked" style={{ marginBottom: 8 }}>
    <Checkbox>Hiển thị cả +0</Checkbox>
  </Form.Item>

  <Form.Item label=" ">
    <Space wrap>
      <Button type="primary" onClick={onSearch}>
        Lọc
      </Button>
      <Button onClick={onReset}>Xóa lọc</Button>
      <Button
        type="default"
        loading={resyncLoading}
        onClick={handleResync}
      >
        Cập nhật điểm
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
            <Table<PointEventRow>
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
                showTotal: (t) => `${t} biến động`,
                onChange: (p, ps) => {
                  setPage(p);
                  setPerPage(ps);
                  fetchList(p, ps);
                },
              }}
              scroll={{ x: 980 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Modal xác nhận gửi */}
      <Modal
        open={sendModalOpen}
        title="Xác nhận gửi ZNS"
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
                {selectedRow.ten_khach_hang || "—"} (Mã KH:{" "}
                {selectedRow.ma_kh || selectedRow.khach_hang_id})
              </Text>
            </div>
            <div>
              <Text type="secondary">Đơn hàng:</Text>{" "}
              <Text strong>#{selectedRow.order_code}</Text>{" "}
              <Text type="secondary">
                ({dayjs(selectedRow.order_date).format("DD/MM/YYYY HH:mm")})
              </Text>
            </div>
            <div>
              <Text type="secondary">Giá trị:</Text>{" "}
              <Text>{fmtVND(selectedRow.price)}</Text>
            </div>
            <div>
              <Text type="secondary">Điểm +:</Text>{" "}
              <Text strong>{fmtPoint(selectedRow.delta_points)}</Text>{" "}
              <Text type="secondary">· Tổng điểm mới:</Text>{" "}
              <Text>{fmtPoint(selectedRow.new_points)}</Text>
            </div>

            <Input.TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (hiển thị trong ZNS nếu template có field <note>)"
              rows={3}
              maxLength={200}
              showCount
            />

    

            {/* 👉 Preview: Nội dung ZNS sẽ gửi (theo template Zalo) */}
            <Card
              size="small"
              style={{ background: "#fafafa" }}
              title="Nội dung ZNS sẽ gửi"
            >
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                }}
              >
                {buildZnsPointPreview(selectedRow)}
              </pre>
            </Card>

            <Text type="secondary" style={{ fontSize: 12 }}>
              * Chỉ gửi 1 lần/biến động. Sau khi gửi thành công, trạng thái sẽ chuyển sang “Đã gửi”.
            </Text>


          
          </Space>
        ) : null}
      </Modal>

            {/* Modal Lịch sử điểm của 1 khách hàng */}
      <Modal
        open={historyOpen}
        title={
          historyCustomer
            ? `Lịch sử điểm - KH: ${historyCustomer.name || "—"} (Mã KH: ${
                historyCustomer.code || historyCustomer.id
              })`
            : "Lịch sử điểm"
        }
        onCancel={() => {
          setHistoryOpen(false);
          setHistoryRows([]);
        }}
        footer={null}
        width={800}
      >
        <Table<PointEventRow>
          size="small"
          loading={historyLoading}
          rowKey={(r) => String(r.id)}
          dataSource={historyRows}
          pagination={false}
          columns={[
            {
              title: "Thời gian",
              dataIndex: "order_date",
              key: "order_date",
              render: (v: string) =>
                v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—",
            },
            {
              title: "Đơn hàng",
              dataIndex: "order_code",
              key: "order_code",
              render: (v: string) => <Text strong>#{v}</Text>,
            },
            {
              title: "Giá trị",
              key: "price",
              render: (_: any, r: PointEventRow) => fmtVND(r.price),
            },
            {
              title: "Điểm ±",
              key: "delta_points",
              render: (_: any, r: PointEventRow) => {
                const signed = Number(r.delta_points || 0);
                const sign = signed >= 0 ? "+ " : "− ";
                return (
                  <Text>
                    {sign}
                    {fmtPoint(Math.abs(signed))}
                  </Text>
                );
              },
            },
            {
              title: "Tổng điểm sau",
              key: "new_points",
              render: (_: any, r: PointEventRow) => fmtPoint(r.new_points),
            },
          ]}
        />
      </Modal>
    </div>
  );
}

