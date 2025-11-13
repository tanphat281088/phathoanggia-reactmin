// src/mobile/components/CustomerPicker.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Radio,
  SearchBar,
  type SearchBarRef,
  List,
  Input,
  Space,
  Toast,
  Button,
} from "antd-mobile";

import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { createFilterQueryFromArray } from "../../utils/utils";


type Customer = {
  id: number | string;
  ten_khach_hang?: string;
  ten?: string;
  sdt?: string;
  so_dien_thoai?: string;
};

type CustomerValue = {
  loai_khach_hang: 0 | 1; // 0 = hệ thống, 1 = vãng lai
  khach_hang_id?: number | string;
  ten_khach_hang?: string;
  so_dien_thoai?: string;
};

type Props = {
  value: CustomerValue;
  onChange: (v: CustomerValue) => void;
};

const PHONE_VN_REGEX = /^(0|\+84)\d{8,12}$/;

const viewName = (c: Customer) => c.ten_khach_hang || c.ten || `#${c.id}`;
const viewPhone = (c: Customer) => c.so_dien_thoai || c.sdt || "";

const DEBOUNCE_MS = 350;

const CustomerPicker: React.FC<Props> = ({ value, onChange }) => {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 👉 ref đúng chuẩn cho SearchBar (để clear/blur sau khi chọn)
  const sbRef = useRef<SearchBarRef>(null);
  const blurActive = () => (document.activeElement as (HTMLElement | null))?.blur?.();

  // ========== search ==========
  const search = async (keyword: string) => {
    setLoading(true);
    try {
// ===== params mới: dùng limit + filter flatten (giống OrdersPage) =====
// ===== params mới: dùng helper flatten giống desktop/OrdersPage =====
const kw = (keyword || "").trim();
const filters: any[] = [];

if (kw) {
  if (/^\d{9,}$/.test(kw)) {
    filters.push({ field: "so_dien_thoai", operator: "contain", value: kw });
  } else {
    filters.push({ field: "ten_khach_hang", operator: "contain", value: kw });
  }
}

const params = {
  page: 1,
  limit: 20,                  // ⬅️ đúng khoá BE (không dùng per_page)
  sort_column: "id",
  sort_direction: "desc",
  ...createFilterQueryFromArray(filters),  // ⬅️ auto flatten filters[i][*]
};

const resp: any = await axios.get(API_ROUTE_CONFIG.KHACH_HANG, { params });


      const list: Customer[] =
        resp?.data?.collection ??
        resp?.data ??
        resp?.items ??
        (Array.isArray(resp) ? resp : []);
      setRows(list);
    } catch (e) {
      console.error("search customers", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const onSearchChange = (kw: string) => {
    setQ(kw);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => search(kw), DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, []);

  // Khi chuyển sang "Vãng lai" → xoá list và ô tìm
  useEffect(() => {
    if (value.loai_khach_hang === 1) {
      setQ("");
      setRows([]);
      sbRef.current?.clear();
      sbRef.current?.blur();
      blurActive();
    }
  }, [value.loai_khach_hang]);

  // ========== actions ==========
  const applyPick = (c: Customer) => {
    onChange({
      loai_khach_hang: 0,
      khach_hang_id: c.id,
      ten_khach_hang: viewName(c),
      so_dien_thoai: viewPhone(c),
    });

    // Dọn UI sau khi chọn để không “xổ lại list”
    setRows([]);
    setQ("");
    sbRef.current?.clear();
    sbRef.current?.blur();
    blurActive();

    Toast.show("Đã chọn khách hàng");
  };

  const setLoai = (v: 0 | 1) => {
    if (v === value.loai_khach_hang) return;
    if (v === 0) {
      onChange({
        loai_khach_hang: 0,
        khach_hang_id: undefined,
        ten_khach_hang: undefined,
        so_dien_thoai: undefined,
      });
    } else {
      onChange({ loai_khach_hang: 1, ten_khach_hang: "", so_dien_thoai: "" });
    }
  };

  const setTenVL = (s: string) =>
    onChange({ ...value, ten_khach_hang: s, loai_khach_hang: 1 });
  const setPhoneVL = (s: string) =>
    onChange({ ...value, so_dien_thoai: s, loai_khach_hang: 1 });

  const phoneHint = useMemo(() => {
    const p = value.so_dien_thoai ?? "";
    if (!p) return undefined;
    return PHONE_VN_REGEX.test(p) ? undefined : "SĐT không hợp lệ (0… hoặc +84…)";
  }, [value.so_dien_thoai]);

  return (
    <div className="phg-card" style={{ padding: 12, margin: "12px 0" }}>
      {/* LOẠI KH */}
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Loại khách hàng</div>
      <Radio.Group value={value.loai_khach_hang} onChange={(v) => setLoai(v as 0 | 1)}>
        <Space>
          <Radio value={0}>Hệ thống</Radio>
          <Radio value={1}>Vãng lai</Radio>
        </Space>
      </Radio.Group>

      {/* KH HỆ THỐNG */}
      {value.loai_khach_hang === 0 && (
        <>
          <div style={{ fontWeight: 800, margin: "12px 0 6px" }}>Chọn khách hàng</div>
<SearchBar
  ref={sbRef}
  value={q}
  placeholder="Tìm theo tên / SĐT"
  onChange={onSearchChange}
  onSearch={() => search(q)}
  onClear={() => {
    setQ("");
    setRows([]);
  }}
    onCompositionEnd={() => search(q)}   // ⬅️ NEW: chốt chuỗi khi gõ tiếng Việt
  // ⬇️ NGĂN BUBBLE khiến input bị blur ngay khi bấm (mất bàn phím)
  onFocus={(e) => e.stopPropagation()}

  style={{ "--background": "#fff" }}
/>

          <List style={{ marginTop: 6 }}>
            {rows.map((c) => (
              <List.Item
                key={String(c.id)}
                description={viewPhone(c)}
                // bấm cả dòng cũng chọn; chặn nổi bọt
                onClick={(e) => {
                  e.stopPropagation();
                  applyPick(c);
                }}
                extra={
                  <Button
                    size="mini"
                    color="primary"
                    fill="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyPick(c);
                    }}
                  >
                    Chọn
                  </Button>
                }
              >
                {viewName(c)}
              </List.Item>
            ))}
            {loading && <div style={{ padding: 8, opacity: 0.7 }}>Đang tìm…</div>}
          </List>

          {value.khach_hang_id && (
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              KH đã chọn: <b>{value.ten_khach_hang}</b>
              {value.so_dien_thoai ? ` • ${value.so_dien_thoai}` : ""}
            </div>
          )}
        </>
      )}

      {/* KH VÃNG LAI */}
      {value.loai_khach_hang === 1 && (
        <>
          <div style={{ fontWeight: 800, margin: "12px 0 6px" }}>Khách hàng vãng lai</div>
          <Space block direction="vertical">
            <Input
              placeholder="Tên khách hàng"
              value={value.ten_khach_hang}
              onChange={setTenVL}
              clearable
            />
            <Input
              placeholder="SĐT (0… hoặc +84…)"
              value={value.so_dien_thoai}
              onChange={setPhoneVL}
              clearable
            />
            {phoneHint && (
              <div style={{ color: "#ef476f", fontSize: 12 }}>{phoneHint}</div>
            )}
          </Space>
        </>
      )}
    </div>
  );
};

export default CustomerPicker;
