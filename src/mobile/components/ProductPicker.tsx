// src/mobile/components/ProductPicker.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  List,
  SearchBar,
  type SearchBarRef,
  Space,
  Stepper,
  Toast,
  Picker,
} from "antd-mobile";

import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

type ProductOption = { value: number | string; label: string };
type DvtOption = { value: number | string; label: string };

export type DraftItem = {
  san_pham_id: number | string;
  ten_sp: string;
  so_luong: number;
  don_vi_tinh_id?: number | string;
  don_vi_tinh_label?: string;
  loai_gia?: 1 | 2;       // 1=Đặt ngay, 2=Đặt trước 3N
  don_gia?: number;       // hiển thị; BE vẫn tính lại khi POST
};

type Props = { onAdd: (item: DraftItem) => void };

const DEBOUNCE_MS = 300;
const LOAI_GIA_OPTIONS = [
  { label: "Đặt ngay", value: 1 },
  { label: "Đặt trước 3 ngày", value: 2 },
];

const ProductPicker: React.FC<Props> = ({ onAdd }) => {
  // ===== Tìm sản phẩm =====
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [choosingId, setChoosingId] = useState<string | number | null>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sbRef = useRef<SearchBarRef>(null);
  const blurActive = () => (document.activeElement as (HTMLElement | null))?.blur?.();

  const search = async (kw: string) => {
    setLoading(true);
    try {
      const resp: any = await axios.get(`${API_ROUTE_CONFIG.SAN_PHAM}/options`, {
        params: { q: kw || undefined, limit: 50 },
      });
      const list: ProductOption[] = (resp?.data ?? resp ?? []).map((r: any) => ({
        value: r.value ?? r.id ?? r.san_pham_id,
        label: r.label ?? r.ten ?? r.ten_san_pham ?? "",
      }));
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const onQChange = (kw: string) => {
    setQ(kw);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => search(kw), DEBOUNCE_MS);
  };

  useEffect(() => () => { if (tRef.current) clearTimeout(tRef.current); }, []);

  // ===== Cache ĐVT per SP =====
  const [dvtMap, setDvtMap] = useState<Record<string, DvtOption[]>>({});
  const ensureDvt = async (san_pham_id: number | string) => {
    const key = String(san_pham_id);
    if (dvtMap[key]) return dvtMap[key];
    try {
      const resp: any = await axios.get(
        `${API_ROUTE_CONFIG.DON_VI_TINH}/options-by-san-pham/${san_pham_id}`
      );
      const opts: DvtOption[] = (resp?.data ?? resp ?? []).map((r: any) => ({
        value: r.value ?? r.id,
        label: r.label ?? r.ten ?? r.ten_don_vi,
      }));
      setDvtMap((m) => ({ ...m, [key]: opts }));
      return opts;
    } catch {
      setDvtMap((m) => ({ ...m, [key]: [] }));
      return [];
    }
  };

  // ===== Panel thuộc tính SP =====
  const [pending, setPending] = useState<DraftItem | null>(null);
  const [dvtPickerVisible, setDvtPickerVisible] = useState(false);
  const [giaPickerVisible, setGiaPickerVisible] = useState(false);

  const pickProduct = async (opt: ProductOption) => {
    try {
      setChoosingId(opt.value);
      await ensureDvt(opt.value);
      setPending({
        san_pham_id: opt.value,
        ten_sp: opt.label,
        so_luong: 1,
      });
      // Dọn list + ẩn bàn phím để không xổ lại
      setRows([]);
      setQ("");
      sbRef.current?.clear();
      sbRef.current?.blur();
      blurActive();
    } finally {
      setChoosingId(null);
    }
  };

  const openDvtPicker = () => {
    if (!pending) return;
    const options = dvtMap[String(pending.san_pham_id)] || [];
    if (!options.length) { Toast.show("Sản phẩm chưa có đơn vị tính"); return; }
    setDvtPickerVisible(true);
  };
  const openGiaPicker = () => setGiaPickerVisible(true);

  // ===== Handlers đúng chữ ký Picker onConfirm =====
  // PickerValue có thể là string | number | null → chấp nhận null rồi lọc ra.
  type PVal = string | number | null;

  const onDvtConfirm = (value: PVal[], _ext: any) => {
    const raw = value?.[0];
    if (raw == null) { setDvtPickerVisible(false); return; }
    const dvtId = raw as (string | number);
    const opts = dvtMap[String(pending?.san_pham_id)] || [];
    const label = opts.find(o => String(o.value) === String(dvtId))?.label;
    setPending(p => p ? { ...p, don_vi_tinh_id: dvtId, don_vi_tinh_label: label } : p);
    setDvtPickerVisible(false);
  };

  const onGiaConfirm = (value: PVal[], _ext: any) => {
    const raw = value?.[0];
    if (raw == null) { setGiaPickerVisible(false); return; }
    const v = Number(raw) as 1 | 2;
    setPending(p => p ? { ...p, loai_gia: v } : p);
    setGiaPickerVisible(false);
  };

  const setQty = (v: number) =>
    setPending(p => p ? { ...p, so_luong: Math.max(1, Number(v) || 1) } : p);

  const fetchGia = async () => {
    if (!pending?.don_vi_tinh_id || !pending?.loai_gia) {
      Toast.show({ content: "Chọn ĐVT và Loại giá trước khi lấy giá", icon: "fail" });
      return;
    }
    try {
      const resp: any = await axios.get(
        `${API_ROUTE_CONFIG.QUAN_LY_BAN_HANG}/get-gia-ban-san-pham`,
        { params: {
            san_pham_id: pending.san_pham_id,
            don_vi_tinh_id: pending.don_vi_tinh_id,
            loai_gia: pending.loai_gia,
        } }
      );
      const price = Number(resp?.data ?? resp ?? 0) || 0;
      setPending(p => p ? { ...p, don_gia: price || undefined } : p);
      Toast.show("Đã lấy giá");
    } catch {
      Toast.show({ content: "Không lấy được giá", icon: "fail" });
    }
  };

  const add = () => {
    if (!pending) return;
    if (!pending.don_vi_tinh_id) { Toast.show({ content: "Chọn ĐVT", icon: "fail" }); return; }
    if (!pending.loai_gia)       { Toast.show({ content: "Chọn loại giá", icon: "fail" }); return; }
    onAdd(pending);
    setPending(null);
    Toast.show({ content: "Đã thêm vào giỏ", icon: "success" });
  };

  const dvtOptions = useMemo(
    () => (pending ? (dvtMap[String(pending.san_pham_id)] || []) : []),
    [pending, dvtMap]
  );

  return (
    <div className="phg-card" style={{ padding: 12, margin: "12px 0" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Thêm sản phẩm</div>

      <SearchBar
        ref={sbRef}
        value={q}
        placeholder="Gõ tên/mã sản phẩm"
        onChange={onQChange}
        onSearch={() => search(q)}
        onClear={() => { setQ(""); setRows([]); }}
      />

      <List style={{ marginTop: 6 }}>
        {rows.map((o) => (
          <List.Item
            key={String(o.value)}
            description={<span className="phg-muted">{String(o.value)}</span>}
            onClick={(e) => { e.stopPropagation(); pickProduct(o); }}
            extra={
              <Button
                size="mini"
                color="primary"
                fill="outline"
                loading={choosingId === o.value}
                onClick={(e) => { e.stopPropagation(); pickProduct(o); }}
              >
                Chọn
              </Button>
            }
          >
            {o.label}
          </List.Item>
        ))}
        {loading && <div style={{ padding: 8, opacity: 0.7 }}>Đang tải…</div>}
      </List>

      {/* Panel thuộc tính (KHÔNG default DVT/Loại giá) */}
      {pending && (
        <div className="phg-card" style={{ padding: 12, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{pending.ten_sp}</div>

          {/* Đơn vị tính */}
          <div className="phg-col" style={{ marginBottom: 8 }}>
            <div className="phg-muted" style={{ fontSize: 12, fontWeight: 700 }}>Đơn vị tính</div>
            <Button size="small" onClick={(e) => { e.stopPropagation(); openDvtPicker(); }}>
              {pending.don_vi_tinh_label || "Chọn đơn vị tính"}
            </Button>
            <Picker
              columns={[ (dvtOptions || []).map(o => ({ label: o.label, value: o.value })) ]}
              visible={dvtPickerVisible}
              onCancel={() => setDvtPickerVisible(false)}
              onConfirm={onDvtConfirm}
              closeOnMaskClick
            />
          </div>

          {/* Loại giá */}
          <div className="phg-col" style={{ marginBottom: 8 }}>
            <div className="phg-muted" style={{ fontSize: 12, fontWeight: 700 }}>Loại giá</div>
            <Button size="small" onClick={(e) => { e.stopPropagation(); openGiaPicker(); }}>
              {pending.loai_gia
                ? (pending.loai_gia === 1 ? "Đặt ngay" : "Đặt trước 3 ngày")
                : "Chọn loại giá"}
            </Button>
            <Picker
              columns={[ LOAI_GIA_OPTIONS.map(o => ({ label: o.label, value: o.value })) ]}
              visible={giaPickerVisible}
              onCancel={() => setGiaPickerVisible(false)}
              onConfirm={onGiaConfirm}
              closeOnMaskClick
            />
          </div>

          {/* SL + Giá */}
          <div className="phg-row" style={{ marginBottom: 8 }}>
            <div>SL:</div>
            <Stepper min={1} value={pending.so_luong} onChange={(v) => setQty(Number(v))} />
            <Button size="small" onClick={(e) => { e.stopPropagation(); fetchGia(); }} style={{ marginLeft: 8 }}>
              Lấy giá
            </Button>
            {Number(pending.don_gia) > 0 && (
              <div style={{ marginLeft: 8, opacity: 0.85 }}>
                Giá: {Number(pending.don_gia).toLocaleString("vi-VN")}đ
              </div>
            )}
          </div>

          <Space block>
            <Button size="small" color="danger" onClick={(e) => { e.stopPropagation(); setPending(null); }}>
              Huỷ
            </Button>
            <Button
              size="small"
              color="primary"
              onClick={(e) => { e.stopPropagation(); add(); }}
              disabled={!pending.don_vi_tinh_id || !pending.loai_gia}
            >
              Thêm vào giỏ
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default ProductPicker;
