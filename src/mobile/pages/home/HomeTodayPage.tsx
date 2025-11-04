import { useEffect, useState } from "react";
import { Card, Grid, List, PullToRefresh, SpinLoading, Tag } from "antd-mobile";
import dayjs from "dayjs";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";

function normalizeArr(resp: any): any[] {
  // Hỗ trợ nhiều dạng: [], {data: []}, {items: []}, {collection: []}, {data: {collection: []}}
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  if (Array.isArray(resp?.collection)) return resp.collection;
  if (Array.isArray(resp?.data?.collection)) return resp.data.collection;
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
  return [];
}

type Stats = {
  so_don_hom_nay?: number;
  doanh_thu_hom_nay?: number;
  don_cho_giao?: number;
  don_da_giao?: number;
  [k: string]: any;
};

type DonHomNay = {
  id: number | string;
  so_dh?: string;
  ten_kh?: string;
  gio_giao?: string;
  trang_thai?: number;
  [k: string]: any;
};

type SlotGroup = {
  slot?: string;
  count?: number;
  id?: string | number;
  [k: string]: any;
};


const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (v: any) =>
  num(v).toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default function HomeTodayPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<DonHomNay[]>([]);
  const [timeline, setTimeline] = useState<SlotGroup[]>([]);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, o, t] = await Promise.all([
        axios.get(API_ROUTE_CONFIG.BAO_CAO_QUAN_TRI ? "/dashboard/statistics" : "/dashboard/statistics"),
        axios.get(API_ROUTE_CONFIG.GIAO_HANG_HOM_NAY),
        axios.get(API_ROUTE_CONFIG.GIAO_HANG_LICH_HOM_NAY),
      ]);
      setStats(s?.data ?? s ?? {});
      setOrders(normalizeArr(o));
      setTimeline(normalizeArr(t));
    } catch (e) {
      console.error("HomeToday load error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const StatusTag = ({ v }: { v?: number }) => {
    const map: Record<number, { text: string; color: "default" | "warning" | "success" | "danger" }> = {
      0: { text: "Chưa giao", color: "default" },
      1: { text: "Đang giao", color: "warning" },
      2: { text: "Đã giao", color: "success" },
      3: { text: "Đã hủy", color: "danger" },
    };
    const it = map[(v ?? 0) as 0 | 1 | 2 | 3] || map[0];
    return <Tag color={it.color}>{it.text}</Tag>;
  };

  return (
    <PullToRefresh onRefresh={loadAll}>
      <div style={{ padding: 12 }}>
        {/* Header ngày */}
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          Hôm nay {dayjs().format("DD/MM/YYYY")}
        </div>

        {/* SỐ LIỆU NHANH */}
        <Grid columns={2} gap={8}>
          <Grid.Item>
            <Card>
              <div style={{ opacity: 0.7 }}>Số đơn hôm nay</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {loading ? "…" : num(stats?.so_don_hom_nay)}
              </div>
            </Card>
          </Grid.Item>
          <Grid.Item>
            <Card>
              <div style={{ opacity: 0.7 }}>Doanh thu hôm nay</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {loading ? "…" : money(stats?.doanh_thu_hom_nay)}
              </div>
            </Card>
          </Grid.Item>
          <Grid.Item>
            <Card>
              <div style={{ opacity: 0.7 }}>Chờ giao</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {loading ? "…" : num(stats?.don_cho_giao)}
              </div>
            </Card>
          </Grid.Item>
          <Grid.Item>
            <Card>
              <div style={{ opacity: 0.7 }}>Đã giao</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {loading ? "…" : num(stats?.don_da_giao)}
              </div>
            </Card>
          </Grid.Item>
        </Grid>

        {/* ĐƠN HÔM NAY */}
        <List header="Đơn hôm nay" style={{ marginTop: 12 }}>
          {safeOrders.map((o) => (
            <List.Item
              key={String(o.id)}
              description={
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {o.gio_giao && <span style={{ opacity: 0.8 }}>🕒 {o.gio_giao}</span>}
                  <StatusTag v={o.trang_thai as any} />
                </div>
              }
            >
              {o.so_dh || `#${o.id}`} — {o.ten_kh || ""}
            </List.Item>
          ))}

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
              <SpinLoading />
            </div>
          )}

          {!loading && safeOrders.length === 0 && (
            <div style={{ opacity: 0.6, padding: 12 }}>Không có đơn trong ngày.</div>
          )}
        </List>

        {/* LỊCH GIAO HÔM NAY */}
{/* LỊCH GIAO HÔM NAY */}
<List header="Lịch giao hôm nay" style={{ marginTop: 12 }}>
  {safeTimeline.map((g, idx) => {
    const key = String(g.id ?? g.slot ?? idx);
    const slot = g.slot ?? "";
    const count = Number.isFinite(g.count as any) ? (g.count as number) : 0;
    return (
      <List.Item key={key}>
        {slot} — {count} đơn
      </List.Item>
    );
  })}

  {!loading && safeTimeline.length === 0 && (
    <div style={{ opacity: 0.6, padding: 12 }}>Chưa có lịch giao.</div>
  )}
</List>

      </div>
    </PullToRefresh>
  );
}
