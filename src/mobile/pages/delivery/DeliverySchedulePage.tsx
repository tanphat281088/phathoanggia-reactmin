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

/** normalize mọi shape array trả về */
function normalizeArr(resp: any): any[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  if (Array.isArray(resp?.collection)) return resp.collection;
  if (Array.isArray(resp?.data?.collection)) return resp.data.collection;
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
  return [];
}

type DeliveryItem = {
  id: number | string;
  so_dh?: string;
  ten_kh?: string;
  dia_chi?: string;
  sdt?: string;
  thoi_gian_giao?: string;
  gio_giao?: string;
  trang_thai?: 0 | 1 | 2 | 3;
  [k: string]: any;
};

type StatusKey = 0 | 1 | 2 | 3 | -1; // -1 = tất cả

const STATUS_LABEL: Record<0 | 1 | 2 | 3, { text: string; color: any }> = {
  0: { text: "Chưa giao", color: "default" },
  1: { text: "Đang giao", color: "warning" },
  2: { text: "Đã giao",   color: "success" },
  3: { text: "Đã hủy",    color: "danger"  },
};

const fmtDate = (d: Date) => dayjs(d).format("YYYY-MM-DD");

export default function DeliverySchedulePage() {
  const [from, setFrom] = useState<Date>(new Date());
  const [to, setTo] = useState<Date>(new Date());
  const [status, setStatus] = useState<StatusKey>(-1);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DeliveryItem[] | any>([]);

  const rangeParams = useMemo(() => {
    const f = fmtDate(from);
    const t = fmtDate(to);
    return { from: f, to: t };
  }, [from, to]);

  const load = async () => {
    setLoading(true);
    try {
      const resp: any = await axios.get(API_ROUTE_CONFIG.GIAO_HANG_LICH_TONG, {
        params: { ...rangeParams, status: status === -1 ? undefined : status, page: 1, per_page: 200 },
      });
      setRows(normalizeArr(resp));  // luôn là mảng
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

  // Nhóm theo ngày (YYYY-MM-DD) — dùng rows an toàn
  const base: DeliveryItem[] = Array.isArray(rows) ? rows : [];
  const grouped = useMemo(() => {
    const map = new Map<string, DeliveryItem[]>();
    for (const it of base) {
      const iso = it?.thoi_gian_giao || it?.gio_giao || "";
      const dateKey =
        iso && dayjs(iso).isValid()
          ? dayjs(iso).format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(it);
    }
    // sort theo thời gian giao
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) =>
        (a.thoi_gian_giao || a.gio_giao || "").localeCompare(b.thoi_gian_giao || b.gio_giao || "")
      );
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [base]);

  const StatusTag = ({ v }: { v?: number }) => {
    const s = STATUS_LABEL[(v ?? 0) as 0 | 1 | 2 | 3] || STATUS_LABEL[0];
    return <Tag color={s.color}>{s.text}</Tag>;
  };

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

  return (
    <div style={{ padding: 12 }}>
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

      {grouped.map(([dateKey, items]) => (
        <List key={dateKey} header={dayjs(dateKey).format("DD/MM/YYYY")}>
          {items.map((o) => (
            <List.Item
              key={String(o.id)}
              description={
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {(o.thoi_gian_giao || o.gio_giao) && (
                    <span style={{ opacity: 0.8 }}>
                      🕒 {dayjs(o.thoi_gian_giao || o.gio_giao).isValid()
                        ? dayjs(o.thoi_gian_giao || o.gio_giao).format("HH:mm")
                        : String(o.gio_giao || "")}
                    </span>
                  )}
                  <StatusTag v={o.trang_thai as any} />
                </div>
              }
              extra={
                <Space>
                  <Button size="small" onClick={() => updateStatus(o.id, 1)}>Đang giao</Button>
                  <Button size="small" color="success" onClick={() => updateStatus(o.id, 2)}>Đã giao</Button>
                  <Button size="small" color="danger" onClick={() => updateStatus(o.id, 3)}>Hủy</Button>
                </Space>
              }
            >
              {(o.so_dh || `#${o.id}`)} — {o.ten_kh || ""} {o.dia_chi ? `· ${o.dia_chi}` : ""}
              {o.sdt ? ` · ${o.sdt}` : ""}
            </List.Item>
          ))}
        </List>
      ))}
    </div>
  );
}
