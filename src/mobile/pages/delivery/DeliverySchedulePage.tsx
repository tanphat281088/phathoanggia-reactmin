import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Dialog,
  List,
  Segmented,
  Space,
  SpinLoading,
  Tag,
} from "antd-mobile";
import dayjs from "dayjs";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";
import { useNavigate } from "react-router-dom";

/** ===== Helpers: normalize & constants ===== **/

/** Chuẩn hóa mọi shape array trả về từ API */
function normalizeArr(resp: any): any[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  if (Array.isArray(resp?.collection)) return resp.collection;
  if (Array.isArray(resp?.data?.collection)) return resp.data.collection;
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
  if (Array.isArray(resp?.rows)) return resp.rows;
  return [];
}

type StatusKey = 0 | 1 | 2 | 3 | -1; // -1 = tất cả

const STATUS_LABEL: Record<0 | 1 | 2 | 3, { text: string; color: any }> = {
  0: { text: "Chưa giao", color: "default" },
  1: { text: "Đang giao", color: "warning" },
  2: { text: "Đã giao",   color: "success" },
  3: { text: "Đã hủy",    color: "danger"  },
};

const REMIND_MINUTES = 60;
const isValidISO = (s?: string) => !!s && dayjs(s).isValid();
const fmtDate = (d: Date) => dayjs(d).format("YYYY-MM-DD");
const fmtDateTime = (iso?: string) => (iso && dayjs(iso).isValid() ? dayjs(iso).format("DD/MM/YYYY HH:mm") : "");
const fmtTime = (iso?: string) => (iso && dayjs(iso).isValid() ? dayjs(iso).format("HH:mm") : "");

const isSapGiao = (iso?: string, status?: number) => {
  if (!iso || !isValidISO(iso)) return false;
  if (status !== 0 && status !== 1) return false;
  const now = dayjs();
  const dt = dayjs(iso);
  const diff = dt.diff(now, "minute");
  return diff >= 0 && diff <= REMIND_MINUTES;
};

/** Dùng chung cho list item */
type DeliveryItem = {
  id: number | string;
  code: string;                       // mã đơn hiển thị
  customer_name?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  address?: string | null;
  receive_iso?: string | null;        // ngày–giờ nhận ISO
  status?: 0 | 1 | 2 | 3;
  raw?: any;                          // dữ liệu thô giữ lại
};

/** Map mọi field từ API → DeliveryItem (chịu được nhiều schema) */
function mapToItem(it: any): DeliveryItem {
  const code =
    it?.so_dh ??
    it?.ma_don_hang ??
    it?.code ??
    (it?.id ? `#${it.id}` : "");

  const customer_name =
    it?.ten_kh ??
    it?.ten_khach_hang ??
    it?.customer_name ??
    null;

  const recipient_name =
    it?.nguoi_nhan_ten ??
    it?.nguoi_nhan ??
    it?.receiver_name ??
    null;

  const recipient_phone =
    it?.sdt ??
    it?.nguoi_nhan_sdt ??
    it?.receiver_phone ??
    null;

  const address =
    it?.dia_chi ??
    it?.dia_chi_giao_hang ??
    it?.address ??
    null;

  // Ưu tiên iso có ngày–giờ; fallback qua gio_giao (cũng có thể là ISO)
  const receive_iso =
    (isValidISO(it?.thoi_gian_giao) && it?.thoi_gian_giao) ||
    (isValidISO(it?.gio_giao) && it?.gio_giao) ||
    it?.thoi_gian_giao ||
    it?.gio_giao ||
    null;

  const status =
    (typeof it?.trang_thai === "number" ? it?.trang_thai :
     typeof it?.trang_thai_don_hang === "number" ? it?.trang_thai_don_hang :
     typeof it?.status === "number" ? it?.status :
     0) as 0 | 1 | 2 | 3;

  return {
    id: it?.id ?? code ?? "",
    code: String(code || ""),
    customer_name,
    recipient_name,
    recipient_phone,
    address,
    receive_iso,
    status,
    raw: it,
  };
}

/** Lấy id để điều hướng chi tiết đơn (ưu tiên don_hang_id nếu BE gửi kèm) */
function getDetailId(item: DeliveryItem): string | number {
  const rawId =
    item?.raw?.don_hang_id ??
    item?.raw?.order_id ??
    item?.id;
  return rawId;
}

/** ===== Component chính ===== **/
export default function DeliverySchedulePage() {
  const navigate = useNavigate();

  const [from, setFrom] = useState<Date>(new Date());
  const [to, setTo] = useState<Date>(new Date());
  const [status, setStatus] = useState<StatusKey>(-1);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DeliveryItem[]>([]);

  const rangeParams = useMemo(() => {
    const f = fmtDate(from);
    const t = fmtDate(to);
    return { from: f, to: t };
  }, [from, to]);

  const load = async () => {
    setLoading(true);
    try {
      const resp: any = await axios.get(API_ROUTE_CONFIG.GIAO_HANG_LICH_TONG, {
        params: { ...rangeParams, status: status === -1 ? undefined : status, page: 1, per_page: 500 },
      });
      const arr = normalizeArr(resp).map(mapToItem);
      // Sắp xếp toàn cục theo thời gian giao
      arr.sort((a, b) => String(a.receive_iso || "").localeCompare(String(b.receive_iso || "")));
      setRows(arr);
    } catch (e) {
      console.error("lich tong error", e);
      Dialog.alert({ content: "Không tải được lịch giao." });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, rangeParams.from, rangeParams.to]);

  // Nhóm theo ngày (YYYY-MM-DD)
  const grouped = useMemo(() => {
    const map = new Map<string, DeliveryItem[]>();
    for (const it of rows) {
      const dateKey =
        it.receive_iso && dayjs(it.receive_iso).isValid()
          ? dayjs(it.receive_iso).format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(it);
    }
    // sort trong nhóm theo giờ
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => String(a.receive_iso || "").localeCompare(String(b.receive_iso || "")));
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const StatusTag = ({ v }: { v?: number }) => {
    const s = STATUS_LABEL[(v ?? 0) as 0 | 1 | 2 | 3] || STATUS_LABEL[0];
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  /** ⚠️ Chặn click lan truyền khi bấm nút trạng thái */
  const stop = (e: any) => e?.stopPropagation?.();

  const updateStatus = async (id: number | string, newStatus: 0 | 1 | 2 | 3) => {
    const ok = await Dialog.confirm({
      content:
        newStatus === 2
          ? "Xác nhận cập nhật 'Đã giao'?"
          : newStatus === 3
          ? "Xác nhận cập nhật 'Đã hủy'?"
          : "Xác nhận cập nhật trạng thái?",
      cancelText: "Hủy",
      confirmText: "Đồng ý",
    });
    if (!ok) return;

    try {
      await axios.patch(API_ROUTE_CONFIG.GIAO_HANG_TRANG_THAI(Number(id)), {
        trang_thai: newStatus,
      });
      await load();
    } catch (e) {
      console.error("update status error", e);
      Dialog.alert({ content: "Không cập nhật được trạng thái." });
    }
  };

  /** ===== RENDER ===== */
  return (
    <div style={{ padding: 12 }} className="pb-safe">
      {/* Bộ lọc nhanh */}
      <Space block wrap style={{ marginBottom: 8 }}>
        <DatePicker value={from} onConfirm={(v) => setFrom(v)} precision="day">
          {(_, a) => <Button size="small" onClick={a.open}>Từ: {fmtDate(from)}</Button>}
        </DatePicker>

        <DatePicker value={to} onConfirm={(v) => setTo(v)} precision="day">
          {(_, a) => <Button size="small" onClick={a.open}>Đến: {fmtDate(to)}</Button>}
        </DatePicker>

        <Segmented
          value={String(status)}
          onChange={(v) => setStatus(Number(v) as StatusKey)}
          options={[
            { label: "Tất cả", value: "-1" },
            { label: "Chưa giao", value: "0" },
            { label: "Đang giao", value: "1" },
            { label: "Đã giao", value: "2" },
            { label: "Đã hủy", value: "3" },
          ]}
        />

        <Button size="small" onClick={load}>Lọc</Button>
      </Space>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
          <SpinLoading />
        </div>
      )}

      {!loading && grouped.length === 0 && (
        <div style={{ opacity: 0.6, padding: 12 }}>Không có lịch giao trong khoảng thời gian này.</div>
      )}

      {/* ===== List nhóm theo ngày — tap mở chi tiết đơn ===== */}
      {grouped.map(([dateKey, items]) => (
        <List
          key={dateKey}
          header={
            <div className="phg-list-head">
              <div><b>{dayjs(dateKey).format("DD/MM/YYYY")}</b></div>
              <div className="right phg-muted">{items.length} đơn</div>
            </div>
          }
        >
          {items.map((o) => {
            const showSapGiao = isSapGiao(o.receive_iso || undefined, o.status);
            const detailId = getDetailId(o);

            return (
              <List.Item
                key={String(o.id)}
           onClick={() => navigate(`/admin/m/orders/${detailId}`)}

                clickable
                arrow={false}
                style={{ cursor: "pointer" }}
                description={
                  <div className="phg-col" style={{ gap: 4 }}>
                    {/* Hàng chip trạng thái + Sắp giao + Ngày–giờ nhận */}
                    <div className="phg-row" style={{ flexWrap: "wrap" }}>
                      <StatusTag v={o.status} />
                      {showSapGiao && <Tag color="warning">Sắp giao ≤ 60’</Tag>}
                      <Tag color="default">{fmtDateTime(o.receive_iso || undefined) || "—"}</Tag>
                    </div>

                    {/* Hàng người nhận + sđt */}
                    <div className="phg-row" style={{ flexWrap: "wrap" }}>
                      <span className="phg-muted">Người nhận:</span>
                      <b>{o.recipient_name || "-"}</b>
                      {o.recipient_phone ? <span>• {o.recipient_phone}</span> : null}
                    </div>

                    {/* Hàng địa chỉ */}
                    <div className="phg-row" style={{ flexWrap: "wrap" }}>
                      <span className="phg-muted">Địa chỉ:</span>
                      <span>{o.address || "-"}</span>
                    </div>
                  </div>
                }
                /** Nút trạng thái — chặn nổi bọt để không điều hướng khi bấm */
                extra={
                  <Space>
                    <Button
  size="small"
  color="primary"
  onClick={(e) => { stop(e); navigate(`/admin/m/orders/${detailId}`); }}
>
  Chi tiết
</Button>

                    <Button size="small" onClick={(e) => { stop(e); updateStatus(o.id, 1); }}>
                      Đang giao
                    </Button>
                    <Button size="small" color="success" onClick={(e) => { stop(e); updateStatus(o.id, 2); }}>
                      Đã giao
                    </Button>
                    <Button size="small" color="danger" onClick={(e) => { stop(e); updateStatus(o.id, 3); }}>
                      Hủy
                    </Button>
                  </Space>
                }
              >
                {/* Dòng chính: [#Mã] — Tên KH  */}
                <div className="phg-row" style={{ gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span className="chip">#{o.code?.replace(/^#/, "")}</span>
                  <b>{o.customer_name || ""}</b>
                  {/* Giờ nhanh (bên phải tiêu đề) */}
                  {fmtTime(o.receive_iso || undefined) ? (
                    <span className="phg-muted">· 🕒 {fmtTime(o.receive_iso || undefined)}</span>
                  ) : null}
                </div>
              </List.Item>
            );
          })}
        </List>
      ))}
    </div>
  );
}
