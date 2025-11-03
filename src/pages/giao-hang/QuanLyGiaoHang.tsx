/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Tabs,
  Table,
  Tag,
  Space,
  Typography,
  Button,
  message,
  Select,
  DatePicker,
  Card,
  List,
  Divider,
  Badge,
  Flex,
  Tooltip,
  Switch, // ✅ THÊM DÒNG NÀY
  Modal,    // ⬅️ thêm
  Input,    // ⬅️ thêm
  Checkbox,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { canSpeak, speakVi, buildDeliverySpeech } from "../../utils/tts"; // ✅ THÊM
import LichGiaoTong from "./components/LichGiaoTong";

import usePermission from "../../hooks/usePermission";




const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ====== Types ======
type DonHangRow = {
  id: number;
  ma_don_hang: string;
  ten_khach_hang?: string | null;
  dia_chi_giao_hang?: string | null;
  nguoi_nhan_ten?: string | null;
  nguoi_nhan_sdt?: string | null;
  nguoi_nhan_thoi_gian: string; // ISO
  // ✅ 4 trạng thái: 0 Chưa giao | 1 Đang giao | 2 Đã giao | 3 Đã hủy
  trang_thai_don_hang: 0 | 1 | 2 | 3;
};

type Paginated<T> = {
  current_page: number;
  data: T[];
  per_page: number;
  total: number;
};

type LichHomNayGroup = {
  slot: string; // "HH:mm–HH:mm"
  start: string; // ISO
  end: string; // ISO
  items: DonHangRow[];
};

type LichHomNayResp = {
  date: string; // YYYY-MM-DD
  bucket_minutes: number;
  groups: LichHomNayGroup[];
};

// ====== Constants ======
// ✅ Bổ sung "Đang giao" (1) & "Đã hủy" (3)
const STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: -1 }, // ⬅️ thay undefined → -1
  { label: "Chưa giao", value: 0 },
  { label: "Đang giao", value: 1 },
  { label: "Đã giao", value: 2 },
  { label: "Đã hủy", value: 3 },
];

// ✅ Map màu/nhãn cho 4 trạng thái
const STATUS_TAG: Record<number, { color: string; label: string }> = {
  0: { color: "processing", label: "Chưa giao" },
  1: { color: "blue", label: "Đang giao" },
  2: { color: "success", label: "Đã giao" },
  3: { color: "error", label: "Đã hủy" },
};

const REMIND_MINUTES = 60;

// ====== Helpers ======
// ✅ Sắp giao: áp dụng cho 0 (Chưa giao) hoặc 1 (Đang giao)
const isSapGiao = (iso: string, status: number) => {
  if (status !== 0 && status !== 1) return false;
  const now = dayjs();
  const dt = dayjs(iso);
  const diff = dt.diff(now, "minute");
  return diff >= 0 && diff <= REMIND_MINUTES;
};

const formatDateTime = (iso?: string | null) =>
  iso ? dayjs(iso).format("DD/MM/YYYY HH:mm") : "";

// ====== Component: Tab "Đơn hôm nay" ======
function DonHomNayTab() {
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [rows, setRows] = useState<DonHangRow[]>([]);
  const [total, setTotal] = useState(0);

  // ✅ NEW: loading theo từng đơn khi đổi trạng thái
  const [rowLoadingId, setRowLoadingId] = useState<number | null>(null);

  // ====== Modal SMS state (intercept 0 -> 1|2) ======
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsRecord, setSmsRecord] = useState<DonHangRow | null>(null);
  const [smsTargetStatus, setSmsTargetStatus] = useState<1 | 2 | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [smsConfirm, setSmsConfirm] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);

    // ===== permissions (RBAC) cho Giao hàng =====
  const permGh = usePermission("/giao-hang");
  const canNotifyAndSet = (permGh as any).notifyAndSetStatus === true; // quyền "Gửi SMS + đặt trạng thái"


  const defaultSmsFor = (st: 1 | 2) =>
    st === 1
      ? "PHG Floral: Don hang cua Quy khach da hoan thien va dang duoc giao. Vui long giu lien lac de nhan hoa. LH 0949404344."
      : "PHG Floral: Don hang cua Quy khach da duoc giao thanh cong. Cam on Quy khach da tin tuong PHG Floral! LH 0949404344.";

  useEffect(() => {
    setPage(1);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: perPage, page: Math.max(1, page) };
      if (status !== undefined && status !== null) params.status = status;

      const resp = await axios.get(API_ROUTE_CONFIG.GIAO_HANG_HOM_NAY, { params });

      const payload = resp?.data;
      let pag: Paginated<DonHangRow> | undefined;

      if (payload?.success && payload?.data) pag = payload.data;
      else if (payload?.current_page !== undefined && Array.isArray(payload?.data)) pag = payload;

      if (pag) {
        const data = (Array.isArray(pag.data) ? pag.data : []).map((r: any) => ({
          ...r,
          // ép kiểu về number để so sánh === chính xác
          trang_thai_don_hang: Number(r.trang_thai_don_hang),
          // ép boolean các cờ SMS để hiển thị ổn định
          sms_dang_giao_sent: !!r.sms_dang_giao_sent,
          sms_da_giao_sent: !!r.sms_da_giao_sent,
          sms_dang_giao_failed: !!r.sms_dang_giao_failed,
          sms_da_giao_failed: !!r.sms_da_giao_failed,
          sms_dang_giao_error_code: r.sms_dang_giao_error_code ?? null,
  sms_dang_giao_error_msg:  r.sms_dang_giao_error_msg  ?? null,
  sms_da_giao_error_code:   r.sms_da_giao_error_code   ?? null,
  sms_da_giao_error_msg:    r.sms_da_giao_error_msg    ?? null,
        }));
        const totalCount = Number(pag.total ?? 0);
        setRows(data);
        setTotal(totalCount);
        const lastPage = Math.max(1, Math.ceil(totalCount / perPage));
        if (page > lastPage) setPage(1);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch {
      message.error("Không tải được danh sách Đơn hôm nay");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [status, page, perPage]);

  // ✅ đổi trạng thái có loading theo hàng + intercept modal
// ✅ đổi trạng thái có loading theo hàng + intercept modal
const onChangeTrangThai = async (record: DonHangRow, newStatus: 0 | 1 | 2 | 3) => {
  const curr = Number(record.trang_thai_don_hang);

  // Tránh mở modal nếu mốc này đã từng thử/gửi (BE vẫn chặn trùng, nhưng UI đỡ phiền)
  const alreadyAttemptedFor = (status: number) => {
    if (status === 1) return (record as any).sms_dang_giao_sent || (record as any).sms_dang_giao_failed;
    if (status === 2) return (record as any).sms_da_giao_sent   || (record as any).sms_da_giao_failed;
    return false;
  };

  // ✅ Intercept mở modal cho 3 trường hợp:
  //   - 0 -> 1  (Chưa giao -> Đang giao)
  //   - 0 -> 2  (Chưa giao -> Đã giao)
  //   - 1 -> 2  (Đang giao -> Đã giao)  ⬅️ BỔ SUNG
  const needModal =
    canNotifyAndSet &&
    ((curr === 0 && (newStatus === 1 || newStatus === 2)) || (curr === 1 && newStatus === 2)) &&
    !alreadyAttemptedFor(newStatus);


  if (needModal) {
    setSmsRecord(record);
    setSmsTargetStatus(newStatus as 1 | 2);
    setSmsMessage(
      (newStatus as number) === 1
        ? "PHG Floral: Don hang cua Quy khach da hoan thien va dang duoc giao. Vui long giu lien lac de nhan hoa. LH 0949404344."
        : "PHG Floral: Don hang cua Quy khach da giao thanh cong. Cam on Quy khach da tin tuong PHG Floral! LH 0949404344."
    );
    setSmsConfirm(false);
    setSmsModalOpen(true);
    return;
  }

  // Các case khác: giữ flow PATCH cũ
  const key = `upd-${record.id}`;
  try {
    setRowLoadingId(record.id);
    message.loading({ content: "Đang cập nhật trạng thái...", key, duration: 0 });
    await axios.patch(`${API_ROUTE_CONFIG.GIAO_HANG}/${record.id}/trang-thai`, {
      trang_thai_don_hang: newStatus,
    });
    message.success({ content: "Cập nhật trạng thái thành công", key, duration: 1.2 });
    fetchData();
  } catch {
    message.error({ content: "Cập nhật trạng thái thất bại", key });
  } finally {
    setRowLoadingId(null);
  }
};


  // ✅ gửi SMS + cập nhật trạng thái qua API mới
  const submitSmsAndStatus = async () => {
    if (!smsRecord || !smsTargetStatus) return;
    const key = `sms-${smsRecord.id}`;
    try {
      setSendingSms(true);
      message.loading({ key, content: "Đang gửi SMS & cập nhật trạng thái...", duration: 0 });

      const resp = await axios.post(
        API_ROUTE_CONFIG.GIAO_HANG_NOTIFY_AND_STATUS(smsRecord.id),
        { target_status: smsTargetStatus, message: smsMessage }
      );

      const ok = resp?.data?.success ?? true;
      const smsSuccess = resp?.data?.data?.sms_success ?? resp?.data?.sms_success ?? false;

      if (ok && smsSuccess) {
        message.success({ key, content: "Đã gửi SMS và cập nhật trạng thái thành công.", duration: 1.6 });
      } else {
        message.warning({
          key,
          content:
            "Đã cập nhật trạng thái, nhưng SMS chưa gửi được (có thể do blacklist hoặc lỗi nhà cung cấp).",
          duration: 2.4,
        });
      }
      setSmsModalOpen(false);
      setSmsRecord(null);
      setSmsTargetStatus(null);
      setSmsMessage("");
      setSmsConfirm(false);
      fetchData();
    } catch {
      message.warning("Đã cập nhật trạng thái, nhưng SMS có thể chưa gửi được.");
      setSmsModalOpen(false);
      setSmsRecord(null);
      setSmsTargetStatus(null);
      setSmsMessage("");
      setSmsConfirm(false);
      fetchData();
    } finally {
      setSendingSms(false);
    }
  };

  // ====== Hiển thị tag trạng thái SMS dưới nhóm nút ======
const renderSmsTags = (r: DonHangRow) => {
  const tags: any[] = [];

  if ((r as any).sms_dang_giao_sent) {
    tags.push(<Tag key="dg-sent" color="blue">SMS “Đang giao” đã gửi</Tag>);
  } else if ((r as any).sms_dang_giao_failed) {
    const tip = (r as any).sms_dang_giao_error_msg || (r as any).sms_dang_giao_error_code || "Không rõ lý do";
    tags.push(
      <Tooltip key="dg-failed-tip" title={tip}>
        <Tag color="warning">SMS “Đang giao” lỗi</Tag>
      </Tooltip>
    );
  }

  if ((r as any).sms_da_giao_sent) {
    tags.push(<Tag key="dgia-sent" color="success">SMS “Đã giao” đã gửi</Tag>);
  } else if ((r as any).sms_da_giao_failed) {
    const tip = (r as any).sms_da_giao_error_msg || (r as any).sms_da_giao_error_code || "Không rõ lý do";
    tags.push(
      <Tooltip key="dgia-failed-tip" title={tip}>
        <Tag color="warning">SMS “Đã giao” lỗi</Tag>
      </Tooltip>
    );
  }

  return tags.length ? <Space size={4} wrap style={{ marginTop: 6 }}>{tags}</Space> : null;
};

  const columns: ColumnsType<DonHangRow> = useMemo(
    () => [
      {
        title: "Mã đơn",
        dataIndex: "ma_don_hang",
        key: "ma_don_hang",
        width: 120,
        render: (val: string, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{val}</Text>
            {isSapGiao(record.nguoi_nhan_thoi_gian, record.trang_thai_don_hang) && (
              <Tag color="gold">Sắp giao ≤ 60’</Tag>
            )}
          </Space>
        ),
      },
      { title: "Khách hàng", dataIndex: "ten_khach_hang", key: "ten_khach_hang", ellipsis: true, render: v => v || "-" },
      { title: "Người nhận", dataIndex: "nguoi_nhan_ten", key: "nguoi_nhan_ten", width: 180, render: v => v || "-" },
      { title: "SĐT nhận", dataIndex: "nguoi_nhan_sdt", key: "nguoi_nhan_sdt", width: 140, render: v => v || "-" },
      { title: "Địa chỉ giao", dataIndex: "dia_chi_giao_hang", key: "dia_chi_giao_hang", ellipsis: true, render: v => v || "-" },
      { title: "Ngày–giờ nhận", dataIndex: "nguoi_nhan_thoi_gian", key: "nguoi_nhan_thoi_gian", width: 170, render: (iso: string) => formatDateTime(iso) },
      {
        title: "Trạng thái",
        dataIndex: "trang_thai_don_hang",
        key: "trang_thai_don_hang",
        width: 140,
        render: (st: number) => {
          const map = { 0: "Chưa giao", 1: "Đang giao", 2: "Đã giao", 3: "Đã hủy" } as const;
          const color = st === 2 ? "success" : st === 1 ? "blue" : st === 3 ? "error" : "processing";
          return <Tag color={color}>{(map as any)[st] ?? "—"}</Tag>;
        },
      },
      {
        title: "Thao tác",
        key: "action",
        width: 360,
        render: (_, record) => {
          const busy = rowLoadingId === record.id; // ✅ đang loading cho hàng này
          return (
            <div>
              <Space wrap>
                <Tooltip title="Đặt trạng thái: Chưa giao">
                  <Button
                    size="small"
                    loading={busy}
                    onClick={() => onChangeTrangThai(record, 0)}
                    disabled={busy || record.trang_thai_don_hang === 0}
                  >
                    Chưa giao
                  </Button>
                </Tooltip>
                <Tooltip title="Đặt trạng thái: Đang giao">
                  <Button
                    size="small"
                    loading={busy}
                    onClick={() => onChangeTrangThai(record, 1)}
                    disabled={busy || record.trang_thai_don_hang === 1}
                  >
                    Đang giao
                  </Button>
                </Tooltip>
                <Tooltip title="Đặt trạng thái: Đã giao">
                  <Button
                    size="small"
                    type="primary"
                    loading={busy}
                    onClick={() => onChangeTrangThai(record, 2)}
                    disabled={busy || record.trang_thai_don_hang === 2}
                  >
                    Đã giao
                  </Button>
                </Tooltip>
                <Tooltip title="Đặt trạng thái: Đã hủy">
                  <Button
                    size="small"
                    danger
                    loading={busy}
                    onClick={() => onChangeTrangThai(record, 3)}
                    disabled={busy || record.trang_thai_don_hang === 3}
                  >
                    Đã hủy
                  </Button>
                </Tooltip>
              </Space>

              {/* Tag trạng thái SMS ngay dưới nhóm nút */}
              {renderSmsTags(record)}
            </div>
          );
        },
      },
    ],
    [rowLoadingId]
  );

  // ====== RETURN (Card + Modal) ======
  return (
    <>
      <Card bodyStyle={{ padding: 16 }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
          <Title level={4} style={{ margin: 0 }}>Đơn hôm nay</Title>
          <Space>
            <Select<number>
              style={{ width: 200 }}
              placeholder="Trạng thái"
              value={status ?? -1}                     // map undefined → -1 để hiển thị
              onChange={(v) => {
                setStatus(v === -1 ? undefined : v);   // map -1 → undefined khi user chọn
                setPage?.(1);                          // reset trang
              }}
              options={STATUS_OPTIONS}
              allowClear
              onClear={() => { setStatus(undefined); setPage?.(1); }}
            />
          </Space>
        </Flex>

        <Table<DonHangRow>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize: perPage,
            total,
            onChange: (p, ps) => { setPage(p); setPerPage(ps); },
            showSizeChanger: true,
            showTotal: (t) => `${t} đơn`,
          }}
        />
      </Card>

      {/* Modal gửi SMS */}
      <Modal
        title="Gửi SMS thông báo đến khách hàng"
        open={smsModalOpen}
        onOk={submitSmsAndStatus}
        okText="Gửi & cập nhật trạng thái"
        confirmLoading={sendingSms}
        okButtonProps={{ disabled: !smsConfirm || smsMessage.trim() === "" }}
        onCancel={() => {
          setSmsModalOpen(false);
          setSmsRecord(null);
          setSmsTargetStatus(null);
          setSmsMessage("");
          setSmsConfirm(false);
        }}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Text strong>Khách nhận:</Text> <Text>{smsRecord?.nguoi_nhan_ten || "-"}</Text>
          </div>
          <div>
            <Text strong>SĐT nhận:</Text> <Text>{smsRecord?.nguoi_nhan_sdt || "-"}</Text>
          </div>
          <div>
            <Text strong>Chuyển trạng thái:</Text>{" "}
            <Tag color={smsTargetStatus === 1 ? "blue" : "success"}>
              {smsTargetStatus === 1 ? "Đang giao" : "Đã giao"}
            </Tag>
          </div>
          <div>
            <Text strong>Nội dung SMS:</Text>
            <Input.TextArea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              autoSize={{ minRows: 3, maxRows: 6 }}
              maxLength={480}
              placeholder="Nhập nội dung SMS…"
            />
          </div>
          <Checkbox checked={smsConfirm} onChange={(e) => setSmsConfirm(e.target.checked)}>
            Tôi xác nhận gửi SMS đến khách hàng
          </Checkbox>
        </Space>
      </Modal>
    </>
  );
}


// ====== Component: Tab "Lịch giao hôm nay" ======
function LichGiaoHomNayTab() {
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [bucket, setBucket] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<LichHomNayGroup[]>([]);
  const [date, setDate] = useState<string>("");

  const fetchData = async () => {
    try {
      setLoading(true);

      // ✅ chỉ gắn status khi có giá trị
      const params: any = { bucket_minutes: bucket };
      if (status !== undefined && status !== null) params.status = status;

      const resp = await axios.get(API_ROUTE_CONFIG.GIAO_HANG_LICH_HOM_NAY, { params });

      // Hỗ trợ cả 2 dạng payload:
      // A) { success: true, data: { date, bucket_minutes, groups } }
      // B) { date, bucket_minutes, groups } (unwrap)
      const payload = resp?.data;
      let dataBlock: LichHomNayResp | undefined;

      if (payload && payload.success && payload.data) {
        dataBlock = payload.data as LichHomNayResp;
      } else if (payload && payload.date && Array.isArray(payload.groups)) {
        dataBlock = payload as LichHomNayResp;
      }

      if (dataBlock) {
        setGroups(dataBlock.groups || []);
        setDate(dataBlock.date || "");
      } else {
        setGroups([]);
        setDate("");
      }
    } catch {
      message.error("Không tải được Lịch giao hôm nay");
      setGroups([]);
      setDate("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, bucket]);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Flex justify="space-between" align="center">
        <Title level={4} style={{ margin: 0 }}>
          Lịch giao hôm nay {date && <Text type="secondary">({dayjs(date).format("DD/MM/YYYY")})</Text>}
        </Title>
        <Space>
          <Select<number>
            style={{ width: 180 }}
            placeholder="Trạng thái"
            value={status}
            onChange={(v: number | undefined) => setStatus(v)}
            options={STATUS_OPTIONS}
            allowClear
          />
          <Select<number>
            style={{ width: 180 }}
            value={bucket}
            onChange={(v: number) => setBucket(v)}
            options={[
              { label: "Nhóm 60 phút", value: 60 },
              { label: "Nhóm 30 phút", value: 30 },
              { label: "Nhóm 90 phút", value: 90 },
            ]}
          />
        </Space>
      </Flex>

      <Card loading={loading} bodyStyle={{ padding: 12 }}>
        <List
          dataSource={groups}
          renderItem={(g) => (
            <List.Item key={g.start}>
              <List.Item.Meta
                title={
                  <Space>
                    <Badge status="processing" />
                    <Text strong>{g.slot}</Text>
                    <Text type="secondary">
                      ({dayjs(g.start).format("HH:mm")} – {dayjs(g.end).format("HH:mm")})
                    </Text>
                    <Tag>{g.items?.length || 0} đơn</Tag>
                  </Space>
                }
                description={
                  <>
                    <Divider style={{ margin: "8px 0" }} />
                    <List
                      dataSource={g.items || []}
                      renderItem={(it) => (
                        <List.Item key={it.id} style={{ padding: "6px 0" }}>
                          <Flex wrap gap={8} align="center">
                            <Tag color="blue">{it.ma_don_hang}</Tag>
                            <Text>
                              <b>{it.nguoi_nhan_ten || "Người nhận"}</b> — {it.nguoi_nhan_sdt || "-"}
                            </Text>
                            <Text type="secondary">{it.dia_chi_giao_hang || "-"}</Text>
                            {isSapGiao(it.nguoi_nhan_thoi_gian, it.trang_thai_don_hang) && (
                              <Tag color="gold">Sắp giao ≤ 60’</Tag>
                            )}
                            <Tag color={STATUS_TAG[it.trang_thai_don_hang]?.color}>
                              {STATUS_TAG[it.trang_thai_don_hang]?.label}
                            </Tag>
                            <Text type="secondary">
                              {dayjs(it.nguoi_nhan_thoi_gian).format("HH:mm")}
                            </Text>
                          </Flex>
                        </List.Item>
                      )}
                    />
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}


// ====== Component: Tab "Lịch giao tổng" ======
function LichGiaoTongTab() {
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("week"),
    dayjs().endOf("week"),
  ]);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DonHangRow[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);

      // ✅ params sạch
      const params: any = { per_page: perPage, page: Math.max(1, page) };
      if (range?.[0]) params.from = range[0].format("YYYY-MM-DD");
      if (range?.[1]) params.to   = range[1].format("YYYY-MM-DD");
   if (status !== undefined) params.status = status;

      const resp = await axios.get(API_ROUTE_CONFIG.GIAO_HANG_LICH_TONG, { params });

      // Hỗ trợ cả 2 dạng paginator:
      // A) { success: true, data: { current_page, data, total, ... } }
      // B) { current_page, data, total, ... } (unwrap)
      const payload = resp?.data;
      let pag: Paginated<DonHangRow> | undefined = undefined;

      if (payload && payload.success && payload.data) {
        pag = payload.data as Paginated<DonHangRow>;
      } else if (
        payload &&
        typeof payload.current_page !== "undefined" &&
        Array.isArray(payload.data)
      ) {
        pag = payload as Paginated<DonHangRow>;
      }

      if (pag) {
        const data = Array.isArray(pag.data) ? pag.data : [];
        const totalCount = Number(pag.total ?? 0);

        setRows(data);
        setTotal(totalCount);

        // ✅ Kéo page về hợp lệ nếu vượt quá lastPage
        const lastPage = Math.max(1, Math.ceil(totalCount / perPage));
        if (page > lastPage) setPage(1);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch {
      message.error("Không tải được Lịch giao tổng");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, range, page, perPage]);

  // Gom theo ngày để hiển thị ở Calendar mini (đơn giản: đếm)
  const countsByDate = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const d = dayjs(r.nguoi_nhan_thoi_gian).format("YYYY-MM-DD");
      m.set(d, (m.get(d) || 0) + 1);
    });
    return m;
  }, [rows]);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Flex justify="space-between" align="center">
        <Title level={4} style={{ margin: 0 }}>
          Lịch giao tổng
        </Title>
        <Space wrap>
          <RangePicker
            value={range}
            onChange={(vals) => {
              if (vals && vals[0] && vals[1]) setRange([vals[0], vals[1]]);
              setPage(1);
            }}
            format="DD/MM/YYYY"
          />
<Select<number>
  style={{ width: 200 }}
  placeholder="Trạng thái"
  value={status ?? -1}                     // ⬅️ map undefined → -1 để hiển thị
  onChange={(v) => {
    setStatus(v === -1 ? undefined : v);  // ⬅️ map -1 → undefined khi user chọn
    setPage?.(1);                         // nếu có phân trang, nhớ reset trang
  }}
  options={STATUS_OPTIONS}
  allowClear
  onClear={() => { setStatus(undefined); setPage?.(1); }}
/>

        </Space>
      </Flex>

      {/* Calendar (đếm đơn theo ngày trong trang dữ liệu) */}
      <Card>
        <Flex wrap gap={12}>
          {[...countsByDate.entries()].map(([d, c]) => (
            <Tag key={d} color="blue">
              {dayjs(d).format("DD/MM")} : {c} đơn
            </Tag>
          ))}
          {countsByDate.size === 0 && <Text type="secondary">Không có đơn trong khoảng đã chọn.</Text>}
        </Flex>
      </Card>

      {/* Bảng chi tiết trong khoảng */}
      <Card bodyStyle={{ padding: 12 }}>
        <Table<DonHangRow>
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize: perPage,
            total,
            onChange: (p, ps) => {
              setPage(p);
              setPerPage(ps);
            },
            showSizeChanger: true,
            showTotal: (t) => `${t} đơn`,
          }}
          columns={[
            {
              title: "Ngày–giờ nhận",
              dataIndex: "nguoi_nhan_thoi_gian",
              key: "nguoi_nhan_thoi_gian",
              width: 170,
              render: (iso: string) => formatDateTime(iso),
              sorter: (a, b) =>
                dayjs(a.nguoi_nhan_thoi_gian).valueOf() - dayjs(b.nguoi_nhan_thoi_gian).valueOf(),
            },
            {
              title: "Mã đơn",
              dataIndex: "ma_don_hang",
              key: "ma_don_hang",
              width: 120,
              render: (v: string, r) => (
                <Space direction="vertical" size={0}>
                  <Text strong>{v}</Text>
                  {isSapGiao(r.nguoi_nhan_thoi_gian, r.trang_thai_don_hang) && (
                    <Tag color="gold">Sắp giao ≤ 60’</Tag>
                  )}
                </Space>
              ),
            },
            {
              title: "Người nhận",
              dataIndex: "nguoi_nhan_ten",
              key: "nguoi_nhan_ten",
              width: 180,
              render: (v?: string | null) => v || "-",
            },
            {
              title: "SĐT",
              dataIndex: "nguoi_nhan_sdt",
              key: "nguoi_nhan_sdt",
              width: 140,
              render: (v?: string | null) => v || "-",
            },
            {
              title: "Địa chỉ giao",
              dataIndex: "dia_chi_giao_hang",
              key: "dia_chi_giao_hang",
              ellipsis: true,
              render: (v?: string | null) => v || "-",
            },
            {
              title: "Trạng thái",
              dataIndex: "trang_thai_don_hang",
              key: "trang_thai_don_hang",
              width: 140,
              render: (st: number) => (
                <Tag color={STATUS_TAG[st]?.color}>{STATUS_TAG[st]?.label ?? "-"}</Tag>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}


// ====== Page wrapper (bổ sung công tắc TTS + logic đọc) ======
export default function QuanLyGiaoHang() {
  // Bật/tắt đọc giọng nói
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);
  const ttsAvailable = useMemo(() => canSpeak(), []);

  // Tránh đọc lặp (lưu trong sessionStorage)
  const REMIND_MINUTES = 60;
  const SPOKEN_KEY = "phg_delivery_spoken_ids";
  const loadSpokenSet = () => {
    try {
      const raw = sessionStorage.getItem(SPOKEN_KEY);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  };
  const saveSpokenSet = (s: Set<string>) => {
    try {
      sessionStorage.setItem(SPOKEN_KEY, JSON.stringify(Array.from(s)));
    } catch {
      /* noop */
    }
  };

  // Đọc giọng nói cho các đơn sắp giao (≤60') dựa trên dữ liệu "Đơn hôm nay"
  useEffect(() => {
    if (!ttsEnabled || !ttsAvailable) return;

    let cancelled = false;

    const checkAndSpeak = async () => {
      try {
        const resp = await axios.get(API_ROUTE_CONFIG.GIAO_HANG_HOM_NAY, {
          params: { per_page: 200 }, // đủ lớn để quét trong ngày
        });
        const payload = (resp?.data ?? {}) as { success?: boolean; data?: Paginated<DonHangRow> };
        if (!payload?.success || !payload?.data) return;

        const rows = payload.data.data || [];
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;

        const spoken = loadSpokenSet();
        const now = dayjs();

        for (const r of rows) {
          if (!r?.id || !r?.nguoi_nhan_thoi_gian) continue;
          if (r.trang_thai_don_hang !== 0) continue; // chỉ Chưa giao
          const dt = dayjs(r.nguoi_nhan_thoi_gian);
          const diff = dt.diff(now, "minute");
          if (diff < 0 || diff > REMIND_MINUTES) continue;

          const key = String(r.id) + "|" + dt.format("YYYYMMDDHHmm");
          if (spoken.has(key)) continue; // đã đọc

          const msg = buildDeliverySpeech({
            maDon: r.ma_don_hang,
            nguoiNhan: r.nguoi_nhan_ten,
            gio: dt.format("HH:mm"),
            diaChi: r.dia_chi_giao_hang,
          });
          speakVi(msg);
          spoken.add(key);
        }

        saveSpokenSet(spoken);
      } catch {
        // không alert để tránh ồn UI
      }
    };

    // chạy ngay + lặp lại mỗi 60s
    checkAndSpeak();
    const iv = setInterval(checkAndSpeak, 60_000);

    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [ttsEnabled, ttsAvailable]);

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Flex justify="space-between" align="center">
        <Title level={3} style={{ marginTop: 0 }}>
          Quản lý giao hàng
        </Title>
        <Space size={12}>
          <Tooltip
            title={
              ttsAvailable
                ? "Bật để hệ thống đọc nhắc bằng giọng nói cho các đơn sắp giao (≤ 60 phút)."
                : "Trình duyệt không hỗ trợ Web Speech API."
            }
          >
            <Flex align="center" gap={8}>
              <Text type={ttsAvailable ? "secondary" : "danger"}>
                Nhắc bằng giọng nói
              </Text>
              <Switch
                checked={ttsEnabled}
                onChange={(checked) => {
                  if (checked && !ttsAvailable) {
                    message.warning("Trình duyệt của bạn không hỗ trợ phát giọng nói.");
                    return;
                  }
                  setTtsEnabled(checked);
                }}
              />
            </Flex>
          </Tooltip>
        </Space>
      </Flex>

      <Tabs
        defaultActiveKey="hom-nay"
        items={[
          {
            key: "hom-nay",
            label: "Đơn hôm nay",
            children: <DonHomNayTab />,
          },
          {
            key: "lich-hom-nay",
            label: "Lịch giao hôm nay",
            children: <LichGiaoHomNayTab />,
          },
          {
            key: "lich-tong",
            label: "Lịch giao tổng",
            children: <LichGiaoTong/>,
          },
        ]}
      />
    </Space>
  );
}
