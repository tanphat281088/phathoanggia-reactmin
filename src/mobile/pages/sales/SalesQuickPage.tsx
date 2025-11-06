// src/mobile/pages/sales/SalesQuickPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, Space, Toast } from "antd-mobile";

import dayjs from "dayjs";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";

/* 🌸 Component mobile */
import CustomerPicker from "../../../mobile/components/CustomerPicker";
import ProductPicker, { type DraftItem as PPItem } from "../../../mobile/components/ProductPicker";
import CartList,     { type DraftItem as CartItem } from "../../../mobile/components/CartList";
import OrderSummaryBar from "../../../mobile/components/OrderSummaryBar";

/* ===== Types ===== */
type DraftItem = CartItem; // thống nhất 1 kiểu item cho toàn trang
type DraftOrder = {
  loai_khach_hang?: 0 | 1; // 0=KH hệ thống, 1=Vãng lai
  khach_hang_id?: number | string;
  ten_khach_hang?: string;
  so_dien_thoai?: string;

  dia_chi_giao_hang?: string;
  nguoi_nhan_ten?: string;
  nguoi_nhan_sdt?: string;
  nguoi_nhan_thoi_gian?: string | null; // 'YYYY-MM-DD HH:mm:ss'

  loai_thanh_toan?: 0 | 1 | 2; // 0 Chưa TT | 1 Một phần | 2 Toàn bộ
  so_tien_da_thanh_toan?: number | null;
  giam_gia?: number;
  chi_phi?: number;

  tax_mode?: 0 | 1;
  vat_rate?: number | null;

  trang_thai_don_hang?: 0 | 1 | 2 | 3; // 0 Chưa giao | 1 Đang giao | 2 Đã giao | 3 Đã hủy
  ghi_chu?: string;

  items: DraftItem[];
};

const DRAFT_KEY = "phg_mobile_sales_draft_v3";

/* ===== Helpers ===== */
/* ===== Helpers ===== */
const toNumber = (v: any, d = 0) => {
  // Loại bỏ TẤT CẢ ký tự không phải số (và có thể giữ '-' nếu muốn số âm)
  const cleaned = String(v).replace(/[^\d-]/g, "");   // ⬅️ bỏ dấu '.'
  const n = cleaned ? parseInt(cleaned, 10) : 0;
  return Number.isFinite(n) ? n : d;
};

// Hiển thị tiền kiểu Việt Nam
const formatVND = (n: number = 0) => Number(n || 0).toLocaleString("vi-VN");


// ==== Helpers preview nháp ====
// Render HTML nháp giống template, không cần id; dùng dữ liệu draft hiện tại
function buildDraftInvoiceHtml(d: DraftOrder) {
  const fmt = (n: number = 0) => Number(n || 0).toLocaleString("vi-VN");
  const tongHang = (d.items || []).reduce((s, it) => s + (Number(it.so_luong||0)*Number(it.don_gia||0)), 0);
  const giamGia  = Number(d.giam_gia||0);
  const chiPhi   = Number(d.chi_phi||0);
  const subtotal = Math.max(0, tongHang - giamGia + chiPhi);
  const taxMode  = Number(d.tax_mode||0);
  const vatRate  = taxMode===1 ? Number(d.vat_rate ?? 8) : 0;
  const vatAmt   = taxMode===1 ? Math.round(subtotal * vatRate / 100) : 0;
  const grand    = taxMode===1 ? subtotal + vatAmt : subtotal;

  const rowsHtml = (d.items||[]).map((it, idx) => `
    <tr>
      <td style="text-align:center">${idx+1}</td>
      <td>${it.ten_sp || ""}</td>
      <td>${it.don_vi_tinh_label || ""}</td>
      <td style="text-align:center">${Number(it.so_luong||0)}</td>
      <td style="text-align:right">${fmt(Number(it.don_gia||0))}đ</td>
      <td style="text-align:right">${fmt(Number(it.so_luong||0)*Number(it.don_gia||0))}đ</td>
    </tr>
  `).join("");

  const infoNgayNhan = d.nguoi_nhan_thoi_gian ? dayjs(d.nguoi_nhan_thoi_gian).format("DD/MM/YYYY HH:mm") : "—";

  return `
<!DOCTYPE html>
<html lang="vi"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Hóa đơn (nháp)</title>
<style>
  :root{ --primary:#f8a8c8; }
  body{font-family:Arial, sans-serif;font-size:14px;line-height:1.45;color:#333;margin:0;background:#fff}
  .container{max-width:820px;margin:0 auto;padding:16px}
  .header{border-bottom:3px solid var(--primary);padding-bottom:8px;margin-bottom:12px}
  .title{font-weight:800;font-size:22px;color:#333;margin:3px 0}
  .badge{display:inline-block;background:#ffe1eb;color:#c2185b;padding:2px 8px;border-radius:999px;font-weight:700;margin-left:8px}
  .grid{display:flex;gap:12px;flex-wrap:wrap}
  .col{flex:1 1 0;min-width:0;border:1px solid #eee;border-radius:8px;padding:8px}
  .col h3{margin:-8px -8px 8px;padding:6px 8px;background:rgba(248,168,200,.25);border-radius:8px 8px 0 0}
  table{width:100%;border-collapse:collapse;margin:8px 0;table-layout:fixed}
  th,td{border-bottom:1px solid #ddd;padding:8px 6px;word-break:break-word}
  th{background:var(--primary);color:#fff;text-align:left}
  .right{text-align:right}
  .sum{margin-top:10px;border-top:2px solid var(--primary);padding-top:8px}
  .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f1f1}
  .final{font-size:16px;font-weight:800;color:#c2185b;border-bottom:2px solid var(--primary)}
  .print-ctrl{position:fixed;top:10px;right:10px;background:#fff;border:1px solid #eee;border-radius:8px;padding:8px;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  .print-ctrl button{margin-left:6px}
</style></head>
<body>
<div class="print-ctrl">
  <button onclick="window.print()">🖨️ In</button>
  <button onclick="window.close()">Đóng</button>
</div>
<div class="container">
  <div class="header">
    <div class="title">THÔNG TIN ĐƠN HÀNG <span class="badge">NHÁP</span></div>
  </div>

  <div class="grid">
    <div class="col">
      <h3>Đơn hàng</h3>
      <div>Ngày tạo: ${dayjs().format("DD/MM/YYYY")}</div>
      <div>Người bán: —</div>
    </div>
    <div class="col">
      <h3>Khách hàng</h3>
      <div>Tên: ${d.ten_khach_hang || "Vãng lai"}</div>
      <div>SĐT: ${d.so_dien_thoai || "—"}</div>
      <div>Địa chỉ giao: ${d.dia_chi_giao_hang || "—"}</div>
    </div>
    <div class="col">
      <h3>Người nhận</h3>
      <div>Tên: ${d.nguoi_nhan_ten || "—"}</div>
      <div>SĐT: ${d.nguoi_nhan_sdt || "—"}</div>
      <div>Ngày giờ nhận: ${infoNgayNhan}</div>
    </div>
  </div>

  <table>
    <colgroup><col style="width:6%"/><col style="width:44%"/><col style="width:15%"/>
              <col style="width:10%"/><col style="width:12%"/><col style="width:13%"/></colgroup>
    <thead><tr>
      <th class="right">#</th><th>Tên SP</th><th>ĐVT</th><th class="right">SL</th>
      <th class="right">Đơn giá</th><th class="right">Thành tiền</th>
    </tr></thead>
    <tbody>${rowsHtml || `<tr><td colspan="6" class="right">Chưa có sản phẩm</td></tr>`}</tbody>
  </table>

  <div class="sum">
    <div class="row"><span>Tổng tiền hàng:</span><b>${fmt(tongHang)}đ</b></div>
    <div class="row"><span>Giảm giá:</span><b>-${fmt(giamGia)}đ</b></div>
    <div class="row"><span>Chi phí khác:</span><b>${fmt(chiPhi)}đ</b></div>
    ${taxMode===1 ? `
      <div class="row"><span>Tạm tính:</span><b>${fmt(subtotal)}đ</b></div>
      <div class="row"><span>VAT ${vatRate}%:</span><b>${fmt(vatAmt)}đ</b></div>
      <div class="row final"><span>Tổng cần thanh toán:</span><b>${fmt(grand)}đ</b></div>
    ` : `
      <div class="row final"><span>Tổng cần thanh toán:</span><b>${fmt(grand)}đ</b></div>
    `}
  </div>
</div>
</body></html>`;
}

// Mở tab xem hoá đơn nháp
function openDraftPreview(d: DraftOrder) {
  const w = window.open("", "_blank");
if (!w) { Toast.show({ content: "Trình duyệt chặn popup", icon: "fail" }); return; } // ✅ không return ToastHandler
  const html = buildDraftInvoiceHtml(d);
  w.document.open();
  w.document.write(html);
  w.document.close();
}





export default function SalesQuickPage() {
  // ===== Draft =====
  const [draft, setDraft] = useState<DraftOrder>({
    loai_khach_hang: 0,
    loai_thanh_toan: 0,
    so_tien_da_thanh_toan: null,
    giam_gia: 0,
    chi_phi: 0,
    tax_mode: 0,
    vat_rate: null,
    trang_thai_don_hang: 0,
    items: [],
  });


  // Ô nhập hiển thị tiền có dấu phẩy + "đ"
const [giamGiaInput, setGiamGiaInput] = useState<string>("0đ");
const [chiPhiInput, setChiPhiInput]   = useState<string>("0đ");
// Ô nhập “Đã thanh toán” (TT một phần)
const [paidInput, setPaidInput] = useState<string>("");

  // Loading gửi đơn (chống double-click)
  const [submitting, setSubmitting] = useState(false);

  // Lưu đơn vừa tạo để hiển thị nút "Xem hóa đơn"
  const [lastOrderId, setLastOrderId]   = useState<number | string | null>(null);

// Banner thành công sau khi tạo đơn
const [lastOrderNotice, setLastOrderNotice] = useState<{ id: number | string; code?: string } | null>(null);

  const [lastOrderCode, setLastOrderCode] = useState<string | null>(null);

  // ===== DatePicker state cho người nhận =====
  const [recvAtVisible, setRecvAtVisible] = useState(false);
  const recvAtValue = useMemo(
    () => (draft.nguoi_nhan_thoi_gian ? dayjs(draft.nguoi_nhan_thoi_gian).toDate() : undefined),
    [draft.nguoi_nhan_thoi_gian]
  );




  // Đồng bộ input hiển thị khi draft thay đổi (ví dụ clear nháp)
useEffect(() => {
  setGiamGiaInput(`${formatVND(toNumber(draft.giam_gia))}đ`);
  setChiPhiInput(`${formatVND(toNumber(draft.chi_phi))}đ`);

  // TT một phần: khi chuyển loại thanh toán → điền sẵn hoặc xoá hiển thị
  if (draft.loai_thanh_toan === 1) {
    const v = toNumber(draft.so_tien_da_thanh_toan ?? 0);
    setPaidInput(v ? `${formatVND(v)}đ` : "");
  } else {
    setPaidInput("");
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [draft.giam_gia, draft.chi_phi, draft.loai_thanh_toan, draft.so_tien_da_thanh_toan]);

// Tự ẩn banner sau 5 giây
useEffect(() => {
  if (!lastOrderNotice) return;
  const t = setTimeout(() => setLastOrderNotice(null), 5000);
  return () => clearTimeout(t);
}, [lastOrderNotice]);

  // ===== Derived totals (VAT-aware, khớp BE) =====
  const tongHang = useMemo(
    () => draft.items.reduce((s, it) => s + (toNumber(it.so_luong) * toNumber(it.don_gia)), 0),
    [draft.items]
  );
  const giamGia = toNumber(draft.giam_gia);
  const chiPhi  = toNumber(draft.chi_phi);

  // Subtotal = tổng hàng - giảm giá + chi phí (kẹp >= 0)
  const subtotal = Math.max(0, tongHang - giamGia + chiPhi);

  const taxMode = Number(draft.tax_mode ?? 0) as 0 | 1;
  const vatRate = taxMode === 1 ? toNumber(draft.vat_rate ?? 8) : 0;

  const vatAmount = taxMode === 1 ? Math.round(subtotal * vatRate / 100) : 0;
  const grandTotal = taxMode === 1 ? subtotal + vatAmount : subtotal;

  // Đã thu
  const paidAmount =
    draft.loai_thanh_toan === 2 ? grandTotal :
    draft.loai_thanh_toan === 0 ? 0 :
    toNumber(draft.so_tien_da_thanh_toan ?? 0);

  // ===== Actions =====
// Gộp sản phẩm vào giỏ: không bao giờ làm mất dòng cũ, so sánh ID an toàn
const addItem = (it: PPItem) => {
  setDraft((d) => {
    const items = Array.isArray(d.items) ? d.items : [];
    const newId = String(it.san_pham_id);            // chuẩn hoá kiểu ID

    const idx = items.findIndex(x => String(x.san_pham_id) === newId);
    if (idx >= 0) {
      // Nếu đã có → tăng số lượng (KHÔNG xoá dòng cũ)
      const next = [...items];
      const old = next[idx];
      next[idx] = {
        ...old,
        so_luong: (Number(old.so_luong) || 0) + (Number(it.so_luong) || 1),
        // nếu ProductPicker đã chọn ĐVT/loại giá thì cập nhật theo cái mới
        don_vi_tinh_id: it.don_vi_tinh_id ?? old.don_vi_tinh_id,
        don_vi_tinh_label: it.don_vi_tinh_label ?? old.don_vi_tinh_label,
        loai_gia: it.loai_gia ?? old.loai_gia,
        // đơn giá để CartList "Lấy giá" lại, không ép đè tuỳ tiện
      };
      return { ...d, items: next };
    }

    // Thêm dòng mới
    return { ...d, items: [...items, it] };
  });
};


  const setItems = (next: DraftItem[]) => setDraft((d) => ({ ...d, items: next }));

  // Handler nhập "Giảm giá"
const onChangeGiamGia = (s: string) => {
  const digits = s.replace(/[^\d]/g, "");        // chỉ lấy số
  const num = toNumber(digits);
  setDraft(d => ({ ...d, giam_gia: num }));      // cập nhật giá trị thực
  setGiamGiaInput(digits);                       // HIỂN THỊ CHUỖI SỐ THUẦN khi gõ
};


// Handler nhập "Chi phí vận chuyển"
const onChangeChiPhi = (s: string) => {
  const digits = s.replace(/[^\d]/g, "");
  const num = toNumber(digits);
  setDraft(d => ({ ...d, chi_phi: num }));
  setChiPhiInput(digits);                        // HIỂN THỊ CHUỖI SỐ THUẦN khi gõ
};

// Bảo đảm khi blur nếu rỗng thì về 0đ
const onBlurMoney = (kind: "giam_gia" | "chi_phi") => {
  if (kind === "giam_gia") {
    const v = toNumber(giamGiaInput);
    setGiamGiaInput(`${formatVND(v)}đ`);
  } else {
    const v = toNumber(chiPhiInput);
    setChiPhiInput(`${formatVND(v)}đ`);
  }
};

// Handler nhập “Đã thanh toán” (khi TT một phần)
const onChangePaid = (s: string) => {
  const digits = s.replace(/[^\d]/g, "");
  const num = toNumber(digits);
  setDraft(d => ({ ...d, so_tien_da_thanh_toan: num }));
  setPaidInput(digits);                          // HIỂN THỊ CHUỖI SỐ THUẦN khi gõ
};
// Khi blur nếu rỗng thì về 0đ (chỉ áp dụng khi đang TT một phần)
const onBlurPaid = () => {
  if (draft.loai_thanh_toan !== 1) return;
  const v = toNumber(paidInput);
  setPaidInput(v ? `${formatVND(v)}đ` : "");
};


const clearDraft = async () => {
  const ok = window.confirm("Xoá toàn bộ giỏ hàng nháp?");
  if (!ok) return;

  setDraft({
    // KH
    loai_khach_hang: 0,
    khach_hang_id: undefined,
    ten_khach_hang: undefined,
    so_dien_thoai: undefined,

    // Địa chỉ & người nhận
    dia_chi_giao_hang: "",
    nguoi_nhan_ten: "",
    nguoi_nhan_sdt: "",
    nguoi_nhan_thoi_gian: null,

    // Tiền
    loai_thanh_toan: 0,
    so_tien_da_thanh_toan: null,
    giam_gia: 0,
    chi_phi: 0,

    // Thuế & trạng thái
    tax_mode: 0,
    vat_rate: null,
    trang_thai_don_hang: 0,

    // Ghi chú & giỏ
    ghi_chu: "",
    items: [],
  });

  // reset các input hiển thị tiền
  setGiamGiaInput("0đ");
  setChiPhiInput("0đ");
  setPaidInput("");

  // xóa hẳn cache localStorage (phần B bên dưới sẽ bỏ useEffect nạp/lưu)
  localStorage.removeItem(DRAFT_KEY);

  Toast.show("Đã xoá nháp");
};



  // Mở danh sách đơn hàng (desktop)
const openOrderList = () => {
  window.location.assign("/admin/m/sales/orders");
};
  // Mở hoá đơn HTML cho đơn cuối
  const openInvoice = (id?: number | string | null) => {
    const realId = id ?? lastOrderId;
    if (!realId) return;
    const apiBase = import.meta.env.VITE_API_URL?.replace(/\/+$/,"") || "";
    window.open(`${apiBase}/quan-ly-ban-hang/xem-truoc-hoa-don/${realId}`, "_blank");
  };

  // ===== Submit (TẠO ĐƠN) =====
  const submitOrder = async () => {
    if (submitting) return; // chống bấm lặp

    // Điều kiện tối thiểu để cho bấm tạo đơn — UI đã hướng dẫn chọn DVT/Loại giá ở panel/giỏ
    if (!draft.dia_chi_giao_hang) { Toast.show("Nhập địa chỉ giao hàng"); return; }
    if (!draft.items.length) { Toast.show("Chưa chọn sản phẩm"); return; }

    if (draft.loai_khach_hang === 0) {
      if (!draft.khach_hang_id) { Toast.show("Chọn khách hàng hệ thống"); return; }
    } else {
      if (!draft.ten_khach_hang || !draft.so_dien_thoai) { Toast.show("Nhập tên & SĐT khách vãng lai"); return; }
    }

    for (const it of draft.items) {
      if (!it.don_vi_tinh_id) { Toast.show(`Chọn ĐVT cho ${it.ten_sp}`); return; }
      if (!it.so_luong || it.so_luong < 1) { Toast.show(`Số lượng không hợp lệ: ${it.ten_sp}`); return; }
      if (!it.loai_gia) { Toast.show(`Chọn loại giá cho ${it.ten_sp}`); return; }
    }

    if (draft.loai_thanh_toan === 1) {
      const paid = toNumber(draft.so_tien_da_thanh_toan ?? 0);
      if (paid <= 0) { Toast.show("Nhập số tiền đã thanh toán (một phần)"); return; }
      if (paid > grandTotal) { Toast.show("Số tiền đã thanh toán không vượt tổng thanh toán"); return; }
    }

const ok = window.confirm("Xác nhận TẠO ĐƠN mới?");
if (!ok) return;

setSubmitting(true);


    const payload: any = {
   ngay_tao_don_hang: dayjs().format("YYYY-MM-DD"),

      dia_chi_giao_hang: draft.dia_chi_giao_hang,
      loai_khach_hang: draft.loai_khach_hang ?? 0,
      loai_thanh_toan: draft.loai_thanh_toan ?? 0,
      ...(draft.loai_thanh_toan === 1 ? { so_tien_da_thanh_toan: toNumber(draft.so_tien_da_thanh_toan ?? 0) } : {}),
      giam_gia: toNumber(draft.giam_gia),
      chi_phi: toNumber(draft.chi_phi),
      trang_thai_don_hang: draft.trang_thai_don_hang ?? 0,
      ghi_chu: draft.ghi_chu || undefined,
      ...(draft.tax_mode === 1 ? { tax_mode: 1, vat_rate: draft.vat_rate ?? 8 } : { tax_mode: 0 }),
      ...(draft.loai_khach_hang === 0
        ? { khach_hang_id: draft.khach_hang_id }
        : { ten_khach_hang: draft.ten_khach_hang, so_dien_thoai: draft.so_dien_thoai }),
      ...(draft.nguoi_nhan_ten ? { nguoi_nhan_ten: draft.nguoi_nhan_ten } : {}),
      ...(draft.nguoi_nhan_sdt ? { nguoi_nhan_sdt: draft.nguoi_nhan_sdt } : {}),
      ...(draft.nguoi_nhan_thoi_gian ? { nguoi_nhan_thoi_gian: draft.nguoi_nhan_thoi_gian } : {}),
      danh_sach_san_pham: draft.items.map((it) => ({
        san_pham_id: it.san_pham_id,
        don_vi_tinh_id: it.don_vi_tinh_id,
        so_luong: it.so_luong,
        loai_gia: it.loai_gia ?? 1,
        ...(Number(it.don_gia) > 0 ? { don_gia: Number(it.don_gia) } : {}),
      })),
    };

    try {
      const resp: any = await axios.post(API_ROUTE_CONFIG.QUAN_LY_BAN_HANG, payload);
      const data = resp?.data ?? resp ?? {};
      const newId  = data?.id ?? data?.data?.id ?? null;
      const newCode = data?.ma_don_hang ?? data?.data?.ma_don_hang ?? null;

if (newId) {
  setLastOrderId(newId);
  setLastOrderCode(newCode ?? null);

  // ✅ Banner + Toast rõ ràng
  setLastOrderNotice({ id: newId, code: newCode ?? undefined });
  Toast.show({ content: `Tạo đơn thành công ${newCode ? `#${newCode}` : ""}`, icon: "success" });

  // (Tuỳ chọn) hỏi mở hóa đơn
  const open = window.confirm("Mở hóa đơn HTML xem trước?");
  if (open) openInvoice(newId);

  // clear giỏ …
  setDraft((d) => ({ ...d, items: [], so_tien_da_thanh_toan: null, loai_thanh_toan: 0 }));
  localStorage.removeItem(DRAFT_KEY);
} else {
  Toast.show({ content: "Không xác định được kết quả tạo đơn", icon: "fail" });
}

} catch (e: any) {
  console.error("submit order", e);
  const res = e?.response?.data;
  // Gom lỗi dạng { errors: { field: ["msg1", ...], ... } }
  const firstErr =
    (res?.errors && Object.values(res.errors).flat()?.[0]) ||
    res?.message ||
    e?.message ||
    "Tạo đơn thất bại. Vui lòng kiểm tra lại dữ liệu.";

  Toast.show({ content: String(firstErr), icon: "fail" });

  // Log payload cuối cùng để anh soi nhanh (mở devtools console)
  try { console.log("[PAYLOAD]", JSON.parse(JSON.stringify(payload))); } catch {}
} finally {
  setSubmitting(false);
}

  };

 /* ===== UI ===== */
return (
  <div style={{ padding: 12, paddingBottom: 100 }}>
    {/* Banner thành công */}
{lastOrderNotice && (
  <div
    style={{
      marginBottom: 8,
      padding: "10px 12px",
      borderRadius: 8,
      background: "#E6FFFB",
      color: "#006D75",
      border: "1px solid #87E8DE",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <div>
      ✅ <b>Đã tạo đơn</b> {lastOrderNotice.code ? `#${lastOrderNotice.code}` : `#${String(lastOrderNotice.id)}`}
    </div>
    <div>
      <Button
        size="mini"
        color="primary"
        fill="outline"
        onClick={() => openInvoice(lastOrderNotice.id)}
      >
        Xem hóa đơn
      </Button>
    </div>
  </div>
)}

    {/* Thanh tác vụ nhanh */}
    <div className="phg-card" style={{ padding: 12, margin: "12px 0" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="small" color="primary" onClick={openOrderList}>
          Xem danh sách đơn hàng
        </Button>

        {/* ✅ Xem hóa đơn (nháp) — không mở nếu giỏ trống */}
        <Button
          size="small"
          onClick={() => { openDraftPreview(draft); }}   // luôn trả void
          disabled={(draft.items?.length || 0) === 0}
        >
          Xem hóa đơn (nháp)
        </Button>

        {/* ✅ Xem hóa đơn thật sau khi tạo đơn */}
        {lastOrderId && (
          <Button size="small" onClick={() => openInvoice()}>
            Xem hóa đơn {lastOrderCode ? `#${lastOrderCode}` : ""}
          </Button>
        )}
      </div>
    </div>

    {/* KHÁCH HÀNG */}
    <CustomerPicker
      value={{
        loai_khach_hang: draft.loai_khach_hang ?? 0,
        khach_hang_id: draft.khach_hang_id,
        ten_khach_hang: draft.ten_khach_hang,
        so_dien_thoai: draft.so_dien_thoai,
      }}
      onChange={(v) => setDraft((d) => ({ ...d, ...v }))}
    />

    {/* ĐỊA CHỈ GIAO HÀNG */}
    <div className="phg-card" style={{ padding: 12, margin: "12px 0" }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Địa chỉ giao hàng</div>
      <Input
        placeholder="Số nhà, đường, phường, quận…"
        value={draft.dia_chi_giao_hang}
        onChange={(v) => setDraft((d) => ({ ...d, dia_chi_giao_hang: v }))}
        clearable
      />
    </div>

    {/* NGƯỜI NHẬN */}
    <div className="phg-card" style={{ padding: 12, margin: "12px 0" }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Thông tin người nhận (tuỳ chọn)</div>
      <Space block direction="vertical">
        <Input
          placeholder="Tên người nhận"
          value={draft.nguoi_nhan_ten}
          onChange={(v) => setDraft((d) => ({ ...d, nguoi_nhan_ten: v }))}
          clearable
        />
        <Input
          placeholder="SĐT người nhận (0… hoặc +84…)"
          value={draft.nguoi_nhan_sdt}
          onChange={(v) => setDraft((d) => ({ ...d, nguoi_nhan_sdt: v }))}
          clearable
        />
        <DatePicker
          precision="minute"
          title="Chọn ngày giờ"
          confirmText="Xác nhận"
          cancelText="Hủy"
          value={recvAtValue}
          onConfirm={(val) => {
            setDraft((d) => ({ ...d, nguoi_nhan_thoi_gian: dayjs(val).format("YYYY-MM-DD HH:mm:ss") }));
            setRecvAtVisible(false);
          }}
          onClose={() => setRecvAtVisible(false)}
          visible={recvAtVisible}
        />
        <Button
          size="small"
          onClick={() => {
            (document.activeElement as (HTMLElement | null))?.blur?.();
            setRecvAtVisible(true);
          }}
        >
          {draft.nguoi_nhan_thoi_gian
            ? `Ngày giờ nhận: ${dayjs(draft.nguoi_nhan_thoi_gian).format("DD/MM/YYYY HH:mm")}`
            : "Chọn ngày giờ nhận"}
        </Button>
      </Space>
    </div>

    {/* THÊM SẢN PHẨM */}
    <ProductPicker onAdd={addItem} />

    {/* GIỎ HÀNG */}
    <CartList items={draft.items} onItemsChange={setItems} />

{/* CHI PHÍ & THUẾ */}
<div className="phg-card" style={{ padding: 12, margin: "12px 0" }}>
  <div style={{ fontWeight: 800, marginBottom: 8 }}>Chi phí & thuế</div>

  <Space block direction="vertical">
    {/* Giảm giá */}
    <div className="phg-col">
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Giảm giá</div>
<Input
  aria-label="Giảm giá (đồng)"
  placeholder="Nhập số tiền giảm (đ)"
  value={giamGiaInput}
  onChange={onChangeGiamGia}
  onBlur={() => onBlurMoney("giam_gia")}
  type="text"              // ⬅️ thêm
  inputMode="numeric"
  maxLength={18}           // ⬅️ thêm
  clearable
  onClear={() => { setDraft(d => ({ ...d, giam_gia: 0 })); setGiamGiaInput("0đ"); }}
/>

    </div>

    {/* Chi phí vận chuyển */}
    <div className="phg-col">
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Chi phí vận chuyển</div>
<Input
  aria-label="Chi phí vận chuyển (đồng)"
  placeholder="Nhập chi phí vận chuyển (đ)"
  value={chiPhiInput}
  onChange={onChangeChiPhi}
  onBlur={() => onBlurMoney("chi_phi")}
  type="text"              // ⬅️ thêm
  inputMode="numeric"
  maxLength={18}           // ⬅️ thêm
  clearable
  onClear={() => { setDraft(d => ({ ...d, chi_phi: 0 })); setChiPhiInput("0đ"); }}
/>

    </div>

    {/* Thuế */}
    <div className="phg-row">
      <Button
        size="small"
        onClick={() =>
          setDraft((d) => ({
            ...d,
            tax_mode: d.tax_mode === 1 ? 0 : 1,
            vat_rate: d.tax_mode === 1 ? null : (d.vat_rate ?? 8),
          }))
        }
      >
        {taxMode === 1 ? "Bỏ thuế" : "Có thuế (VAT)"}
      </Button>
      {taxMode === 1 && (
        <Input
          aria-label="VAT phần trăm"
          placeholder="VAT (%)"
          value={`${String(draft.vat_rate ?? 8)}%`}
          disabled
        />
      )}
    </div>
  </Space>
</div>


    {/* THANH TOÁN */}
    <div className="phg-card" style={{ padding: 12, margin: "12px 0" }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Thanh toán</div>
      <div className="phg-row">
        <Button
          size="small"
          onClick={() => setDraft((d) => ({ ...d, loai_thanh_toan: 0, so_tien_da_thanh_toan: null }))}
          style={{ opacity: draft.loai_thanh_toan === 0 ? 1 : 0.6 }}
        >
          Chưa TT
        </Button>
        <Button
          size="small"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              loai_thanh_toan: 1,
              so_tien_da_thanh_toan:
                d.so_tien_da_thanh_toan && d.so_tien_da_thanh_toan > 0 ? d.so_tien_da_thanh_toan : null,
            }))
          }
          style={{ opacity: draft.loai_thanh_toan === 1 ? 1 : 0.6 }}
        >
          TT một phần
        </Button>
        <Button
          size="small"
          onClick={() => setDraft((d) => ({ ...d, loai_thanh_toan: 2, so_tien_da_thanh_toan: grandTotal }))} 
          style={{ opacity: draft.loai_thanh_toan === 2 ? 1 : 0.6 }}
        >
          TT toàn bộ
        </Button>
      </div>

{draft.loai_thanh_toan === 1 && (
  <div style={{ marginTop: 8 }}>
    <div style={{ fontWeight: 700, marginBottom: 6 }}>Đã thanh toán</div>
<Input
  aria-label="Đã thanh toán (đồng)"
  placeholder={`Đã thanh toán (≤ ${grandTotal.toLocaleString("vi-VN")}đ)`}
  value={paidInput}
  onChange={onChangePaid}
  onBlur={onBlurPaid}
  type="text"              // ⬅️ thêm
  inputMode="numeric"
  maxLength={18}           // ⬅️ thêm
  clearable
  onClear={() => { setDraft(d => ({ ...d, so_tien_da_thanh_toan: 0 })); setPaidInput("0đ"); }}
/>

  </div>
)}


      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Ghi chú</div>
        <Input
          value={draft.ghi_chu}
          onChange={(v) => setDraft((d) => ({ ...d, ghi_chu: v }))}
          placeholder="VD: Giao trước 10h, chúc mừng sinh nhật…"
          clearable
        />
      </div>
    </div>

    {/* STICKY ORDER SUMMARY (Pastel) */}
    <OrderSummaryBar
      subtotal={subtotal}
      taxMode={taxMode}
      vatRate={taxMode === 1 ? vatRate : null}
      vatAmount={taxMode === 1 ? vatAmount : null}
      grandTotal={grandTotal}
      paidAmount={paidAmount}
      primaryLabel="Tạo đơn"
      onPrimary={submitOrder}
      secondaryLabel="Xoá nháp"
      onSecondary={clearDraft}
      primaryLoading={submitting}
     disabled={
  submitting ||
  !draft.dia_chi_giao_hang ||
  draft.items.length === 0 ||
  (draft.loai_khach_hang === 0 ? !draft.khach_hang_id : !(draft.ten_khach_hang && draft.so_dien_thoai)) ||
  (draft.loai_thanh_toan === 1 && !toNumber(draft.so_tien_da_thanh_toan ?? 0))
}

    />
  </div>
);

}
