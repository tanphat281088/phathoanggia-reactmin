// src/mobile/pages/sales/OrdersPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, DatePicker, List, InfiniteScroll, SearchBar, Space, Tag, Toast } from "antd-mobile";
import dayjs from "dayjs";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";
import { createFilterQueryFromArray } from "../../../utils/utils";

import type { JSX } from "react/jsx-runtime";

type Order = {
  id: number | string;
  ma_don_hang?: string;
  ten_khach_hang?: string;
  so_dien_thoai?: string;
  ngay_tao_don_hang?: string;
  tong_tien_can_thanh_toan?: number;
  so_tien_da_thanh_toan?: number;
  trang_thai_don_hang?: 0 | 1 | 2 | 3;
    member_discount_percent?: number;
  member_discount_amount?: number;

};

const fmt = (n: number = 0) => Number(n || 0).toLocaleString("vi-VN");
const statusLabel: Record<number, string> = { 0: "Chưa giao", 1: "Đang giao", 2: "Đã giao", 3: "Đã hủy" };
const statusColor: Record<number, string> = { 0: "default", 1: "primary", 2: "success", 3: "danger" };

export default function OrdersPage(): JSX.Element {
  // ====== Bộ lọc ngày nhanh ======
  const [mode, setMode] = useState<"today" | "week">("today");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const today = dayjs().format("YYYY-MM-DD");
    return { from: today, to: today };
  });

  // Khi đổi mode -> set range
  useEffect(() => {
    if (mode === "today") {
      const d = dayjs().format("YYYY-MM-DD");
      setDateRange({ from: d, to: d });
    } else {
      const to = dayjs().format("YYYY-MM-DD");
      const from = dayjs().subtract(6, "day").format("YYYY-MM-DD");
      setDateRange({ from, to });
    }
  }, [mode]);

  // ====== Tìm nhanh theo mã đơn / tên KH / SĐT ======
  const [q, setQ] = useState("");

  // ====== Paging / data ======
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [rows, setRows] = useState<Order[]>([]);
  const pageSize = 20;
  const loadingRef = useRef(false);
  const [fromVisible, setFromVisible] = useState(false);
const [toVisible,   setToVisible]   = useState(false);

const blurActive = () => (document.activeElement as (HTMLElement|null))?.blur?.();


  const resetAndLoad = () => {
    setRows([]);
    setPage(1);
    setHasMore(true);
  };

  // Tạo params từ filter hiện tại
const queryParams = useMemo(() => {
  const filters: any[] = [];
  const kwRaw = q || "";
  const kw = kwRaw.trim();
  const KW = kw.toUpperCase();

  if (kw) {
    // 1) Mã đơn kiểu DH..., #DH..., có/không khoảng trắng
    if (/^#?\s*D\s*H\s*\d+$/i.test(kw)) {
      const code = KW.replace(/^#?/, "").replace(/\s+/g, ""); // "# DH 00314" -> "DH00314"
      filters.push({ field: "ma_don_hang", operator: "contain", value: code });
    }
    // 2) Chỉ số dài (≥9): coi như SĐT
    else if (/^\d{9,}$/.test(kw)) {
      filters.push({ field: "so_dien_thoai", operator: "contain", value: kw });
    }
    // 3) Chỉ số ngắn (3–8): coi như đuôi mã đơn (VD "00314")
    else if (/^\d{3,8}$/.test(kw)) {
      filters.push({ field: "ma_don_hang", operator: "contain", value: kw });
    }
    // 4) Mặc định: tên KH
    else {
      filters.push({ field: "ten_khach_hang", operator: "contain", value: kw });
    }
  }

  // Lọc theo ngày tạo (YYYY-MM-DD|YYYY-MM-DD)
  filters.push({
    field: "ngay_tao_don_hang",
    operator: "between_date",
    value: `${dateRange.from}|${dateRange.to}`,
  });

  return {
    page,
    limit: pageSize,
    sort_column: "id",
    sort_direction: "desc",
    ...createFilterQueryFromArray(filters), // ⬅️ flatten giống desktop
  };
}, [page, q, dateRange.from, dateRange.to]);



  const loadPage = async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    try {
      const resp: any = await axios.get(API_ROUTE_CONFIG.QUAN_LY_BAN_HANG, { params: queryParams });
      const payload = resp?.data ?? resp;
      const list: Order[] = payload?.collection ?? payload ?? [];
      const total: number = payload?.total ?? list.length;

      setRows(prev => [...prev, ...list]);
      // nếu tổng trang hiện tại < total -> còn nữa
      const loaded = (page * pageSize);
      setHasMore(loaded < total);
      setPage(p => p + 1);
    } catch (e) {
      console.error("orders load", e);
      Toast.show({ content: "Không tải được danh sách", icon: "fail" });
      setHasMore(false);
    } finally {
      loadingRef.current = false;
    }
  };

  // Mở hóa đơn HTML
  const openInvoice = (id: number | string) => {
    const apiBase = import.meta.env.VITE_API_URL?.replace(/\/+$/,"") || "";
    window.open(`${apiBase}/quan-ly-ban-hang/xem-truoc-hoa-don/${id}`, "_blank");
  };

  // Mở chi tiết (desktop)
  const openDesktopDetail = (id: number | string) => {
    const base = window.location.origin;
    window.open(`${base}/admin/quan-ly-ban-hang`, "_blank");
    // (nếu cần mở thẳng modal detail bên desktop, có thể thêm query param và FE desktop đọc)
  };

  // Khi đổi filter -> reset & tải lại
  useEffect(() => {
    resetAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dateRange.from, dateRange.to, q]);

  useEffect(() => {
    // load trang đầu khi render lần đầu / khi reset
    if (page === 1 && hasMore && !loadingRef.current) {
      loadPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore]);

  return (
    <div style={{ padding: 12, paddingBottom: 80 }}>
      {/* Header filter */}
      <div className="phg-card" style={{ padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            size="small"
            color={mode === "today" ? "primary" : "default"}
            onClick={() => setMode("today")}
          >
            Hôm nay
          </Button>
          <Button
            size="small"
            color={mode === "week" ? "primary" : "default"}
            onClick={() => setMode("week")}
          >
            7 ngày
          </Button>

          <div style={{ marginLeft: "auto" }} />
          <Button size="small" onClick={() => window.history.back()}>⬅️ Quay lại tạo đơn</Button>
        </div>

        <div style={{ marginTop: 10 }}>
          <SearchBar
            value={q}
            placeholder="Tìm mã đơn / tên KH / SĐT"
            onChange={setQ}
            onClear={() => setQ("")}
          />
        </div>

        {/* Tùy chọn đổi ngày tay (giữ đơn giản 2 nút) */}
<div style={{ display: "flex", gap: 8, marginTop: 10 }}>
  <Button
    size="small"
    fill="outline"
    onClick={() => { blurActive(); setFromVisible(true); }}
  >
    Từ: {dayjs(dateRange.from).format("DD/MM/YYYY")}
  </Button>

  <Button
    size="small"
    fill="outline"
    onClick={() => { blurActive(); setToVisible(true); }}
  >
    Đến: {dayjs(dateRange.to).format("DD/MM/YYYY")}
  </Button>
</div>

{/* DatePickers điều khiển bằng visible */}
<DatePicker
  precision="day"
  destroyOnClose
  visible={fromVisible}
  value={dayjs(dateRange.from).toDate()}
  onClose={() => setFromVisible(false)}
  onConfirm={(d) => {
    setDateRange(r => ({ ...r, from: dayjs(d).format("YYYY-MM-DD") }));
    setFromVisible(false);
  }}
/>

<DatePicker
  precision="day"
  destroyOnClose
  visible={toVisible}
  value={dayjs(dateRange.to).toDate()}
  onClose={() => setToVisible(false)}
  onConfirm={(d) => {
    setDateRange(r => ({ ...r, to: dayjs(d).format("YYYY-MM-DD") }));
    setToVisible(false);
  }}
/>

      </div>

      {/* Card list */}
      <List>
        {rows.map((r) => {
          const remain = Math.max(0, Number(r.tong_tien_can_thanh_toan || 0) - Number(r.so_tien_da_thanh_toan || 0));
          const st = Number(r.trang_thai_don_hang ?? 0) as 0 | 1 | 2 | 3;
                    const memberAmount = Number(r.member_discount_amount ?? 0);
          const memberPercent = Number(r.member_discount_percent ?? 0);

          return (
            <List.Item
              key={String(r.id)}
              className="phg-card"
              style={{ marginBottom: 10, padding: 12 }}
              description={
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div>
                    KH: <b>{r.ten_khach_hang || "Vãng lai"}</b> {r.so_dien_thoai ? `• ${r.so_dien_thoai}` : ""}
                  </div>
                  <div>Ngày tạo: {r.ngay_tao_don_hang ? dayjs(r.ngay_tao_don_hang).format("DD/MM/YYYY") : "--"}</div>
                  <div>Tổng cần TT: <b>{fmt(Number(r.tong_tien_can_thanh_toan || 0))}đ</b> • Đã thu: {fmt(Number(r.so_tien_da_thanh_toan || 0))}đ</div>

                  {memberAmount > 0 && (
                    <div>
                      Giảm thành viên: <b>-{fmt(memberAmount)}đ</b>
                      {memberPercent ? ` (${memberPercent}%)` : ""}
                    </div>
                  )}

                  <div>Còn lại: <b className="amount">{fmt(remain)}đ</b></div>
                  <div>
                    <Space wrap>
                      <Button size="small" color="primary" onClick={() => openInvoice(r.id)}>Xem hóa đơn</Button>
                      <Button size="small" onClick={() => openDesktopDetail(r.id)}>Mở chi tiết (desktop)</Button>
                    </Space>
                  </div>
                </div>
              }
              extra={<Tag color={statusColor[st]}>{statusLabel[st]}</Tag>}
            >
              <div style={{ fontWeight: 800 }}>
                {r.ma_don_hang ? `#${r.ma_don_hang}` : `Đơn #${r.id}`}
              </div>
            </List.Item>
          );
        })}
      </List>

      <InfiniteScroll loadMore={loadPage} hasMore={hasMore} />
    </div>
  );
}
