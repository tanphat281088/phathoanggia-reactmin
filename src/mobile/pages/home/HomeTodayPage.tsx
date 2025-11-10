import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Grid, List, PullToRefresh, Space, SpinLoading, Tag, Toast } from "antd-mobile";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG, URL_CONSTANTS } from "../../../configs/api-route-config";


/* ========== Helpers chung ========== */
const fmtVND = (v: any) =>
  Number(v || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const todayISO = () => dayjs().format("YYYY-MM-DD");
// ===== DEBUG helper =====
const dbg = (label: string, obj: any) => {
  try {
    console.log(`[HomeToday] ${label}`, JSON.parse(JSON.stringify(obj)));
  } catch {
    console.log(`[HomeToday] ${label}`, obj);
  }
};


// ===== Robust check "is today" cho nhiều kiểu ngày (UTC Z / local / 'YYYY-MM-DD...')
const isToday = (val: any) => {
  if (!val) return false;
  const today = todayISO(); // 'YYYY-MM-DD'

  // 1) Thử parse bằng dayjs (local)
  const d = dayjs(val);
  if (d.isValid() && d.format("YYYY-MM-DD") === today) return true;

  // 2) So sánh raw 10 ký tự đầu (an toàn với 'YYYY-MM-DD...' có Z/microseconds)
  const raw = String(val);
  if (raw.slice(0, 10) === today) return true;

    // 2.1) Hỗ trợ chuỗi Việt 'DD/MM/YYYY' hoặc 'DD/MM/YYYY HH:mm(:ss)?'
  const m = raw.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const dd = m[1], mm = m[2], yyyy = m[3];
    const ymd = `${yyyy}-${mm}-${dd}`; // chuyển về YYYY-MM-DD
    if (ymd === today) return true;
  }


  // 3) Nếu đúng format 'YYYY-MM-DD' thì so thẳng
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw === today;

  return false;
};


function normalizeArr(resp: any): any[] {
  const r = resp?.data ?? resp;                 // interceptor có/không bọc .data
  if (!r) return [];
  if (Array.isArray(r)) return r;               // [ ... ]
  if (Array.isArray(r.data)) return r.data;     // { data: [...] }
  if (Array.isArray(r.items)) return r.items;
  if (Array.isArray(r.rows)) return r.rows;
  if (Array.isArray(r.collection)) return r.collection;
  if (Array.isArray(r?.data?.collection)) return r.data.collection; // { success, data:{ collection } }
  if (Array.isArray(r?.data?.data)) return r.data.data;             // { data:{ data:[...] } }
  if (Array.isArray(r?.data?.rows)) return r.data.rows;             // { data:{ rows:[...] } }
  return [];
}


const STATUS_META: Record<0 | 1 | 2 | 3, { text: string; color: "default" | "warning" | "success" | "danger" }> = {
  0: { text: "Chưa giao", color: "default" },
  1: { text: "Đang giao", color: "warning" },
  2: { text: "Đã giao", color: "success" },
  3: { text: "Đã hủy", color: "danger" },
};

const REMIND_MINUTES = 60;
const isDueSoon = (iso?: string | null, st?: number) => {
  if (!iso) return false;
  if (st !== 0 && st !== 1) return false;
  const now = dayjs();
  const dt = dayjs(iso);
  const diff = dt.diff(now, "minute");
  return diff >= 0 && diff <= REMIND_MINUTES;
};

/* ========== Types ========== */
type Kpi = {
  thuc_thu_hom_nay: number; // GIỮ NGUYÊN: đang dùng cho ô "Doanh thu hôm nay" (theo logic hiện tại của bạn)
  tong_thu_hom_nay: number; // MỚI: tổng các phiếu thu hôm nay
  tong_chi_hom_nay: number; // MỚI: tổng các phiếu chi hôm nay
  don_giao_hom_nay: number;
  cho_giao: number;
  da_giao: number;
    tong_dt_don_moi_hom_nay: number; // MỚI
  tong_kh_moi_hom_nay: number;     // MỚI

};


type DonHomNay = {
  id: number | string;
  ma_don_hang?: string;
  ten_khach_hang?: string | null;
  nguoi_nhan_ten?: string | null;
  nguoi_nhan_sdt?: string | null;
  dia_chi_giao_hang?: string | null;
  nguoi_nhan_thoi_gian?: string; // ISO
  trang_thai_don_hang?: 0 | 1 | 2 | 3;
};

type SlotGroup = { slot: string; start: string; end: string; items: DonHomNay[] };

/* ========== Tag trạng thái ========== */
const StatusTag = ({ v }: { v?: number }) => {
  const meta = STATUS_META[(v ?? 0) as 0 | 1 | 2 | 3] || STATUS_META[0];
  return <Tag color={meta.color}>{meta.text}</Tag>;
};

/* ========== Trang chủ ========== */
export default function HomeTodayPage() {
  const nav = useNavigate();

  const [loadingKpi, setLoadingKpi] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingTime, setLoadingTime] = useState(false);

  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [orders, setOrders] = useState<DonHomNay[]>([]);
  const [timeline, setTimeline] = useState<SlotGroup[]>([]);

  const abortKpiRef = useRef<AbortController | null>(null);
  const abortOrdersRef = useRef<AbortController | null>(null);
  const abortTimeRef = useRef<AbortController | null>(null);

  /* ----- KPI: đồng bộ desktop ----- */
  const loadKpi = async () => {
    abortKpiRef.current?.abort();
    const ac = new AbortController();
    abortKpiRef.current = ac;
    setLoadingKpi(true);
    try {
      // Thực thu hôm nay (sổ quỹ)
      const params = { from: todayISO(), to: todayISO() };
      const rThuChi: any = await axios.get("/thu-chi/bao-cao/tong-hop", { params, signal: ac.signal as any });
      const dataTC = (rThuChi?.data && rThuChi.data.data) || rThuChi?.data || rThuChi || {};
     // Doanh thu hôm nay = 01_doanh_thu_ban_hang (KQKD) trong ngày
const rKQKD: any = await axios.get(API_ROUTE_CONFIG.BAO_CAO_KQKD, {
  params: { from: todayISO(), to: todayISO() },
  signal: ac.signal as any,
});
const sumKQ = (rKQKD?.data && rKQKD.data.summary) || rKQKD?.data?.summary || {};
const thuc_thu_hom_nay = Number(sumKQ?.["01_doanh_thu_ban_hang"] || 0);

      // MỚI: tách riêng tổng THU và tổng CHI hôm nay
const tong_thu_hom_nay = Number(dataTC?.tong_thu || 0);
const tong_chi_hom_nay = Number(dataTC?.tong_chi || 0);


      // Giao hàng hôm nay
      const rGH: any = await axios.get(API_ROUTE_CONFIG.GIAO_HANG_HOM_NAY, {
        params: { per_page: 200, page: 1 },
        signal: ac.signal as any,
      });
      const items = normalizeArr(rGH);
      let don_giao_hom_nay = 0,
        cho_giao = 0,
        da_giao = 0;
      if (Array.isArray(items)) {
        don_giao_hom_nay = items.length;
        for (const it of items) {
          const st = Number(it?.trang_thai_don_hang ?? it?.trang_thai ?? -1);
          if (st === 0 || st === 1) cho_giao++;
          if (st === 2) da_giao++;
        }
      }

      // ===== MỚI: TỔNG DT đơn mới hôm nay (đơn tạo trong hôm nay) =====
      // Lấy list đơn hàng (per_page lớn) rồi lọc theo created_at trong FE (an toàn với nhiều schema)
      const rOrdersNew: any = await axios.get(API_ROUTE_CONFIG.QUAN_LY_BAN_HANG || "/quan-ly-ban-hang", {
  params: { limit: 1000, page: 1 },

        signal: ac.signal as any,
      });
const arrOrders = normalizeArr(rOrdersNew);
const tong_dt_don_moi_hom_nay = (arrOrders || [])
  .filter((it: any) => {
    // ƯU TIÊN ngày nghiệp vụ của đơn
    const c = it?.ngay_tao_don_hang || it?.created_at || it?.createdAt || it?.created;
    return isToday(c);
  })
  .reduce((s: number, it: any) => {
    const v = Number(it?.tong_tien_can_thanh_toan ?? it?.grand_total ?? it?.tong_tien ?? 0);
    return s + (isFinite(v) ? v : 0);
  }, 0);


      // ===== MỚI: TỔNG KHÁCH MỚI hôm nay (hệ thống + vãng lai có created_at) =====
      // 1) KH hệ thống
// 1) KH hệ thống — đếm FE theo created_at (kéo nhiều, tương thích limit/per_page) + DEBUG
dbg("KH.start", { today: todayISO() });

const rKH: any = await axios.get(API_ROUTE_CONFIG.KHACH_HANG || "/khach-hang", {
  params: {
    page: 1,
    limit: 1000,            // vài API dùng 'limit'
    per_page: 1000,         // vài API lại dùng 'per_page'
    sort_column: "created_at",
    sort_direction: "desc",
  },
  signal: ac.signal as any,
});

// log shape gốc từ BE
dbg("KH.raw.data", rKH?.data);

// chuẩn hoá mảng
const arrKH = normalizeArr(rKH);
dbg("KH.norm.len", Array.isArray(arrKH) ? arrKH.length : -1);
dbg("KH.sample0", Array.isArray(arrKH) && arrKH.length ? arrKH[0] : null);

// đếm theo created_at
const kh_he_thong_moi = (arrKH || []).filter((it: any) => {
  const c = it?.created_at || it?.createdAt || it?.created;
  return isToday(c);
}).length;

dbg("KH.today.count", kh_he_thong_moi);




      // 2) KH vãng lai (nếu API có created_at thì lọc, không có thì tính 0)
     const KH_VL = (API_ROUTE_CONFIG as any)?.KHACH_HANG_VANG_LAI || "/khach-hang-vang-lai";
let kh_vang_lai_moi = 0;
try {
  const rKVL: any = await axios.get(KH_VL, {
    params: { limit: 1000, page: 1 },           // ⬅️ Đổi per_page → limit
    signal: ac.signal as any,
  });
  const arrKVL = normalizeArr(rKVL);

  // Ưu tiên lọc theo created_at (nếu BE có)
  kh_vang_lai_moi = (arrKVL || []).filter((it: any) => {
    const c = it?.created_at || it?.createdAt || it?.created; // chịu nhiều schema
    const d = dayjs(c);
    return c && (d.isValid()
      ? d.format("YYYY-MM-DD") === todayISO()
      : String(c).slice(0, 10) === todayISO());
  }).length;

  // Fallback: nếu chưa có created_at, ước lượng "KH VL mới" = so_don = 1 & last_order_at là hôm nay
  if (kh_vang_lai_moi === 0) {
    kh_vang_lai_moi = (arrKVL || []).filter((it: any) => {
      const isFirst = Number(it?.so_don ?? 0) === 1;
      const c = it?.last_order_at;
      const d = dayjs(c);
      return isFirst && c && (d.isValid()
        ? d.format("YYYY-MM-DD") === todayISO()
        : String(c).slice(0, 10) === todayISO());
    }).length;
  }
} catch {
  /* nếu module không trả ngày tạo thì giữ 0 */
}


      const tong_kh_moi_hom_nay = kh_he_thong_moi + kh_vang_lai_moi;


      setKpi({
        thuc_thu_hom_nay,
        tong_thu_hom_nay,
        tong_chi_hom_nay,
        don_giao_hom_nay,
        cho_giao,
        da_giao,
        tong_dt_don_moi_hom_nay, // MỚI
        tong_kh_moi_hom_nay,     // MỚI
      });


    } catch (e: any) {
      if (e?.name !== "CanceledError") Toast.show({ content: "Không tải được KPI", icon: "fail" });
      setKpi(null);
    } finally {
      setLoadingKpi(false);
    }
  };

  /* ----- Đơn sắp giao ≤60’ (Top 5) ----- */
  const loadOrders = async () => {
    abortOrdersRef.current?.abort();
    const ac = new AbortController();
    abortOrdersRef.current = ac;
    setLoadingOrders(true);
    try {
      const r: any = await axios.get(API_ROUTE_CONFIG.GIAO_HANG_HOM_NAY, {
        params: { per_page: 200, page: 1 },
        signal: ac.signal as any,
      });
      const rows = normalizeArr(r) as any[];
      const soon: DonHomNay[] = rows
        .map((x) => ({
          id: x.id,
          ma_don_hang: x.ma_don_hang || x.so_dh || `#${x.id}`,
          ten_khach_hang: x.ten_khach_hang,
          nguoi_nhan_ten: x.nguoi_nhan_ten,
          nguoi_nhan_sdt: x.nguoi_nhan_sdt,
          dia_chi_giao_hang: x.dia_chi_giao_hang,
          nguoi_nhan_thoi_gian: x.nguoi_nhan_thoi_gian,
          trang_thai_don_hang: Number(x.trang_thai_don_hang ?? x.trang_thai ?? 0) as 0 | 1 | 2 | 3,
        }))
        .filter((x) => isDueSoon(x.nguoi_nhan_thoi_gian, x.trang_thai_don_hang))
        .sort(
          (a, b) =>
            dayjs(a.nguoi_nhan_thoi_gian).valueOf() - dayjs(b.nguoi_nhan_thoi_gian).valueOf()
        )
        .slice(0, 5);
      setOrders(soon);
    } catch (e: any) {
      if (e?.name !== "CanceledError") Toast.show({ content: "Không tải được danh sách sắp giao", icon: "fail" });
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  /* ----- Lịch giao hôm nay (mini timeline 3 slot) ----- */
  const loadTimeline = async () => {
    abortTimeRef.current?.abort();
    const ac = new AbortController();
    abortTimeRef.current = ac;
    setLoadingTime(true);
    try {
      const r: any = await axios.get(API_ROUTE_CONFIG.GIAO_HANG_LICH_HOM_NAY, {
        params: { bucket_minutes: 60 },
        signal: ac.signal as any,
      });
      const block = (r?.data && r.data.data) || r?.data || r || { groups: [] as any[] };
      const groups: SlotGroup[] = Array.isArray(block.groups) ? block.groups : [];
      setTimeline(groups.slice(0, 3));
    } catch (e: any) {
      if (e?.name !== "CanceledError") Toast.show({ content: "Không tải được lịch giao hôm nay", icon: "fail" });
      setTimeline([]);
    } finally {
      setLoadingTime(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadKpi(), loadOrders(), loadTimeline()]);
  };

  useEffect(() => {
    loadAll();
    return () => {
      abortKpiRef.current?.abort();
      abortOrdersRef.current?.abort();
      abortTimeRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerDate = useMemo(() => `Hôm nay ${dayjs().format("DD/MM/YYYY")}`, []);

  /* ----- Điều hướng ----- */
  const goDeliveryList = () => nav("/admin/m/delivery");
const goBaoCaoKQKDToday = () =>
  nav(`/admin/bao-cao-quan-tri/kqkd?from=${todayISO()}&to=${todayISO()}&line=1`);

  const goCreateOrder = () => nav("/admin/m/sales");
  const goCreateCustomer = () => nav("/admin/m/customers/new");
  // MỚI: mở danh sách Phiếu thu / Phiếu chi (lọc hôm nay sẽ thực hiện trên trang)
const goPhieuThuToday = () =>
  nav(`/admin/quan-ly-thu-chi/phieu-thu?from=${todayISO()}&to=${todayISO()}`);

const goPhieuChiToday = () =>
  nav(`/admin/quan-ly-thu-chi/phieu-chi?from=${todayISO()}&to=${todayISO()}`);


  /* ========== RENDER ========== */
  return (
    <PullToRefresh onRefresh={loadAll}>
      <div style={{ padding: 12, paddingBottom: 90 }}>
        {/* Header ngày + Refresh */}
        <div className="phg-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{headerDate}</div>
          <Button size="small" onClick={loadAll}>Làm mới</Button>
        </div>

        {/* KPI 2×2 */}
<Grid columns={2} gap={8}>
  {/* Doanh thu hôm nay (KQKD 01) */}
  <Grid.Item>
    <Card className="phg-card" onClick={goBaoCaoKQKDToday}>
      <div className="phg-muted">Doanh thu hôm nay</div>
      <div className="amount-strong" aria-live="polite">
        {loadingKpi ? "…" : fmtVND(kpi?.thuc_thu_hom_nay || 0)}
      </div>
    </Card>
  </Grid.Item>

  {/* Đơn giao hôm nay */}
  <Grid.Item>
    <Card className="phg-card" onClick={goDeliveryList}>
      <div className="phg-muted">Đơn giao hôm nay</div>
      <div className="amount-strong" aria-live="polite">
        {loadingKpi ? "…" : Number(kpi?.don_giao_hom_nay || 0)}
      </div>
    </Card>
  </Grid.Item>

  {/* Chờ giao */}
  <Grid.Item>
    <Card className="phg-card" onClick={goDeliveryList}>
      <div className="phg-muted">Chờ giao</div>
      <div className="amount-strong" aria-live="polite">
        {loadingKpi ? "…" : Number(kpi?.cho_giao || 0)}
      </div>
    </Card>
  </Grid.Item>

  {/* Đã giao */}
  <Grid.Item>
    <Card className="phg-card" onClick={goDeliveryList}>
      <div className="phg-muted">Đã giao</div>
      <div className="amount-strong" aria-live="polite">
        {loadingKpi ? "…" : Number(kpi?.da_giao || 0)}
      </div>
    </Card>
  </Grid.Item>

  {/* Tổng thu hôm nay (phiếu thu) */}
  <Grid.Item>
    <Card className="phg-card" onClick={goPhieuThuToday}>
      <div className="phg-muted">Tổng thu hôm nay</div>
      <div className="amount-strong" aria-live="polite">
        {loadingKpi ? "…" : fmtVND(kpi?.tong_thu_hom_nay || 0)}
      </div>
    </Card>
  </Grid.Item>

  {/* Tổng chi hôm nay (phiếu chi) */}
  <Grid.Item>
    <Card className="phg-card" onClick={goPhieuChiToday}>
      <div className="phg-muted">Tổng chi hôm nay</div>
      <div className="amount-strong" aria-live="polite">
        {loadingKpi ? "…" : fmtVND(kpi?.tong_chi_hom_nay || 0)}
      </div>
    </Card>
  </Grid.Item>

  {/* MỚI: Tổng DT đơn mới hôm nay */}
  <Grid.Item>
    <Card className="phg-card" onClick={() => nav(`/admin/m/sales/orders?from=${todayISO()}&to=${todayISO()}`)}>
      <div className="phg-muted">Tổng DT đơn mới hôm nay</div>
      <div className="amount-strong" aria-live="polite">
        {loadingKpi ? "…" : fmtVND(kpi?.tong_dt_don_moi_hom_nay || 0)}
      </div>
    </Card>
  </Grid.Item>

  {/* MỚI: Tổng khách mới hôm nay */}
  <Grid.Item>
<Card className="phg-card" onClick={() => nav(`${URL_CONSTANTS.KHACH_HANG}?from=${todayISO()}&to=${todayISO()}`)}>

      <div className="phg-muted">Tổng khách mới hôm nay</div>
      <div className="amount-strong" aria-live="polite">
        {loadingKpi ? "…" : Number(kpi?.tong_kh_moi_hom_nay || 0)}
      </div>
    </Card>
  </Grid.Item>
</Grid>



        {/* Quick actions */}
        <div className="phg-section" style={{ marginTop: 10 }}>
          <Space wrap style={{ width: "100%" }}>
            <Button size="small" color="primary" onClick={goCreateOrder}>+ Tạo đơn</Button>
            <Button size="small" onClick={goDeliveryList}>🚚 Lịch giao</Button>
            <Button size="small" onClick={goCreateCustomer}>👤 Khách mới</Button>
          </Space>
        </div>

        {/* Đơn sắp giao ≤ 60’ */}
        <div className="phg-row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700 }}>Đơn sắp giao (≤ 60’)</div>
          <Button size="mini" onClick={goDeliveryList}>Xem tất cả</Button>
        </div>
        <List>
          {loadingOrders && (
            <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
              <SpinLoading />
            </div>
          )}
          {!loadingOrders && orders.length === 0 && (
            <div style={{ opacity: 0.6, padding: 12 }}>Chưa có đơn sắp giao.</div>
          )}
          {orders.map((o) => (
            <List.Item
              key={String(o.id)}
              description={
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {o.nguoi_nhan_thoi_gian && (
                    <span style={{ opacity: 0.8 }}>🕒 {dayjs(o.nguoi_nhan_thoi_gian).format("HH:mm")}</span>
                  )}
                  <StatusTag v={o.trang_thai_don_hang as number} />
                  {o.nguoi_nhan_sdt && <span style={{ opacity: 0.8 }}>SĐT: {o.nguoi_nhan_sdt}</span>}
                </div>
              }
            >
              {(o.ma_don_hang || `#${o.id}`) + (o.nguoi_nhan_ten ? ` — ${o.nguoi_nhan_ten}` : "")}
            </List.Item>
          ))}
        </List>

        {/* Lịch giao hôm nay (mini timeline) */}
        <div className="phg-row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700 }}>Lịch giao hôm nay</div>
          <Button size="mini" onClick={goDeliveryList}>Xem lịch</Button>
        </div>
        <List>
          {loadingTime && (
            <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
              <SpinLoading />
            </div>
          )}
          {!loadingTime && timeline.length === 0 && (
            <div style={{ opacity: 0.6, padding: 12 }}>Chưa có lịch giao.</div>
          )}
          {timeline.map((g, idx) => (
            <List.Item key={`${g.start}-${idx}`}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700 }}>{g.slot}</span>
                <span className="phg-muted">
                  ({dayjs(g.start).format("HH:mm")} – {dayjs(g.end).format("HH:mm")})
                </span>
                <Tag color="primary">{g.items?.length || 0} đơn</Tag>
              </div>
            </List.Item>
          ))}
        </List>

        {/* (Đất mở rộng Insights – để sau) */}
      </div>
    </PullToRefresh>
  );
}
