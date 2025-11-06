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
  Input,
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
  loai_gia?: 1 | 2;            // 1=Đặt ngay, 2 = Đặt trước 3N
  don_gia?: number;            // hiển thị; BE vẫn tính lại khi POST nếu bạn không gửi
  allow_manual_price?: boolean; // +++ CHO PHÉP nhập tay giá (whitelist)
  code?: string | null;         // +++ lưu mã KGxxxx/MOxxxx nếu bắt được
};


type Props = { onAdd: (item: DraftItem) => void };

// Cho phép nhập giá tay cho các mã sau
const EDITABLE_PRICE_CODES = new Set(["KG00001", "KG00002", "MO00001"]);

// Helper: rút code từ nhãn "Tên – KG00001"
// Helper: rút code từ nhãn, chấp nhận khoảng trắng / dấu gạch, tự pad 5 chữ số
const extractCodeFromLabel = (label?: string | null) => {
  const L = String(label || "").toUpperCase();
  const m = L.match(/(K\s*G|M\s*O)\s*0*(\d{1,6})/); // cho phép KG 0001, KG-1, mo001, v.v.
  if (!m) return null;
  const prefix = m[1].replace(/\s+/g, "");       // "K G" -> "KG"
  const num    = (m[2] || "").padStart(5, "0");  // chuẩn về 5 chữ số
  return `${prefix}${num}`;                       // ví dụ: "KG00001"
};


// Helper: ép chuỗi số về number an toàn
const toNumber = (v: any, d = 0) => {
  const s = String(v ?? "").replace(/[^\d]/g, "");
  const n = s ? Number(s) : 0;
  return Number.isFinite(n) ? n : d;
};


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
  const searchTokenRef = useRef(0); // token để vô hiệu hóa kết quả search cũ

  const sbRef = useRef<SearchBarRef>(null);
  const blurActive = () => (document.activeElement as (HTMLElement | null))?.blur?.();
  // Focus lại ô tìm kiếm (đợi 1 tick để đảm bảo panel đã đóng)
const focusSearch = () => setTimeout(() => sbRef.current?.focus?.(), 0);


const search = async (kw: string) => {
  // cấp token mới cho request này
  const myToken = ++searchTokenRef.current;

  setLoading(true);
  try {
    const resp: any = await axios.get(`${API_ROUTE_CONFIG.SAN_PHAM}/options`, {
      params: { q: kw || undefined, limit: 50 },
    });
    const list: ProductOption[] = (resp?.data ?? resp ?? []).map((r: any) => ({
      value: r.value ?? r.id ?? r.san_pham_id,
      label: r.label ?? r.ten ?? r.ten_san_pham ?? "",
    }));

    // chỉ setRows nếu request này còn hợp lệ
    if (myToken === searchTokenRef.current) {
      setRows(list);
    }
  } catch (e) {
    if (myToken === searchTokenRef.current) setRows([]);
  } finally {
    if (myToken === searchTokenRef.current) setLoading(false);
  }
};

const onQChange = (kw: string) => {
  setQ(kw);
  if (tRef.current) clearTimeout(tRef.current);

  // Không search khi rỗng: dọn list ngay
  if (!kw || kw.trim() === "") {
    setRows([]);
    setLoading(false);
    return;
  }

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

    // Hủy timer/request cũ để tránh response trễ ghi đè list
    if (tRef.current) clearTimeout(tRef.current);
    searchTokenRef.current++;

    // KHÔNG xóa list, KHÔNG clear q, KHÔNG blur — để còn chọn tiếp
    await ensureDvt(opt.value);

    



    

const code = extractCodeFromLabel(opt.label);
const allowManual = !!code && EDITABLE_PRICE_CODES.has(code);
setPending({
  san_pham_id: opt.value,
  ten_sp: opt.label,
  so_luong: 1,
  allow_manual_price: allowManual,   // <— cho phép nhập tay giá
  code,                               // lưu lại mã (tuỳ chọn)
});

  } finally {
    setChoosingId(null);
  }
};


// Một nút "Thêm sản phẩm": có ĐVT thì thêm ngay; không có ĐVT thì mở panel để chọn
const smartAddProduct = async (opt: ProductOption) => {
  try {
    setChoosingId(opt.value);

    const dvt = await ensureDvt(opt.value);
    
    const code = extractCodeFromLabel(opt.label);
    const allowManual = !!code && EDITABLE_PRICE_CODES.has(code);

    // Nếu là mã được nhập tay giá -> LUÔN mở panel để nhập giá, không auto-add
    if (allowManual) {
      setPending({
        san_pham_id: opt.value,
        ten_sp: opt.label,
        so_luong: 1,
        allow_manual_price: true,
        code,
        // Không set don_gia ở đây, để người dùng nhập tay trong panel
      });
      return;
    }

    // Không phải whitelist: nếu có ĐVT thì thêm ngay, ngược lại mở panel
    if (dvt && dvt.length > 0) {
      const item: DraftItem = {
        san_pham_id: opt.value,
        ten_sp: opt.label,
        so_luong: 1,
        don_vi_tinh_id: dvt[0].value,
        don_vi_tinh_label: dvt[0].label,
        loai_gia: 1,
      };
      onAdd(item);
      Toast.show({ content: "Đã thêm vào giỏ", icon: "success" });
      return;
    }

    setPending({
      san_pham_id: opt.value,
      ten_sp: opt.label,
      so_luong: 1,
      allow_manual_price: false,
      code,
    });
  } catch {
    Toast.show({ content: "Không thêm được sản phẩm", icon: "fail" });
  } finally {
    setChoosingId(null);
  }
};


// Thêm nhanh 1 sản phẩm vào giỏ (không mở panel), giống nút "+" desktop
// Thêm nhanh 1 sp vào giỏ (giống nút "+" desktop), không mở panel
const quickAddProduct = async (opt: ProductOption) => {
  try {
    setChoosingId(opt.value);

    const code = extractCodeFromLabel(opt.label);
    const allowManual = !!code && EDITABLE_PRICE_CODES.has(code);
    if (allowManual) {
      await pickProduct(opt);   // mở panel cho nhập giá tay
      return;
    }

    const dvt = await ensureDvt(opt.value);
    if (!dvt || dvt.length === 0) {
      await pickProduct(opt);
      return;
    }
    const item: DraftItem = {
      san_pham_id: opt.value,
      ten_sp: opt.label,
      so_luong: 1,
      don_vi_tinh_id: dvt[0].value,
      don_vi_tinh_label: dvt[0].label,
      loai_gia: 1,
    };
    onAdd(item);
    Toast.show({ content: "Đã thêm vào giỏ", icon: "success" });
  } catch (e) {
    Toast.show({ content: "Không thêm được sản phẩm", icon: "fail" });
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
  if (!pending.don_vi_tinh_id) { Toast.show({ content: "Chọn ĐVT trước khi thêm", icon: "fail" }); return; }
  if (!pending.loai_gia)       { Toast.show({ content: "Chọn loại giá", icon: "fail" }); return; }
    if (pending.allow_manual_price && !(Number(pending.don_gia) > 0)) {
    Toast.show({ content: "Nhập giá bán trước khi thêm", icon: "fail" });
    return;
  }


  onAdd(pending);
  Toast.show({ content: "Đã thêm vào giỏ", icon: "success" });

  // Đóng panel & mọi picker (tránh mask che)
  setPending(null);
  setDvtPickerVisible(false);
  setGiaPickerVisible(false);

  // Tuỳ chọn: focus về ô tìm để gõ tiếp
  // focusSearch();
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
    onSearch={() => { if (q.trim()) search(q); }} 

      onClear={() => { setQ(""); setRows([]); focusSearch(); }}

      />
<List style={{ marginTop: 6 }}>
  {rows.map((o) => (
    <List.Item
      key={String(o.value)}
      description={<span className="phg-muted">{String(o.value)}</span>}
      // ❌ Không gán onClick cho cả dòng để tránh chồng sự kiện
      extra={
        <Button
          type="button"
          size="mini"
          color="primary"
          fill="outline"
          loading={choosingId === o.value}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); smartAddProduct(o); }}
        >
          ＋ Thêm sản phẩm
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
<div className="phg-row" style={{ marginBottom: 8, alignItems: "center", gap: 8 }}>
  <div>SL:</div>
  <Stepper min={1} value={pending.so_luong} onChange={(v) => setQty(Number(v))} />

  {pending?.allow_manual_price ? (
    // ✅ Cho phép nhập tay giá bán
    <>
      <div>Giá:</div>
      <Input
        style={{ width: 120 }}
        value={pending.don_gia != null ? String(pending.don_gia) : ""}
        placeholder="Nhập giá"
        type="number"
        inputMode="numeric"
        onChange={(val) =>
          setPending(p => p ? { ...p, don_gia: toNumber(val) } : p)
        }
      />
    </>
  ) : (
    // ❗ Với mã thường: chỉ cho "Lấy giá"
    <>
      <Button size="small" onClick={(e) => { e.stopPropagation(); fetchGia(); }}>
        Lấy giá
      </Button>
      {Number(pending.don_gia) > 0 && (
        <div style={{ marginLeft: 8, opacity: 0.85 }}>
          Giá: {Number(pending.don_gia).toLocaleString("vi-VN")}đ
        </div>
      )}
    </>
  )}
</div>


          <Space block>
<Button
  size="small"
  color="danger"
  onClick={(e) => { e.stopPropagation(); setPending(null); focusSearch(); }}
>
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
