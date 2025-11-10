import { useState } from "react";
import { Button, Input, List, Picker, Toast } from "antd-mobile";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";

// Phone pattern (đồng bộ với desktop: 0… hoặc +84…)
const phonePattern = /^(0|\+84)\d{8,12}$/;

// Danh sách cố định kênh liên hệ (đồng bộ desktop)
const KENH_OPTIONS = [
  "Zalo Nana", "Facebook", "Zalo", "Hotline", "Website", "Tiktok", "Khách vãng lai",
  "Khác", "Fanpage PHG", "CTV Ái Tân", "Sự kiện Phát Hoàng Gia", "Zalo Hoatyuet",
  "Fanpage Hoatyuet", "Facebook Tuyết Võ",
];

export default function CustomerCreatePage() {
  const [ten, setTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [email, setEmail] = useState("");
  const [kenh, setKenh] = useState<string>(KENH_OPTIONS[0]);
  const [diaChi, setDiaChi] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [saving, setSaving] = useState(false);

  // Picker “Kênh liên hệ”
  const [kenhVisible, setKenhVisible] = useState(false);
  const KENH_COLUMNS = [KENH_OPTIONS.map(v => ({ label: v, value: v }))];

  const submit = async (): Promise<void> => {
    if (saving) return;                         // chặn double tap
    // Log + toast ngay khi bấm để biết có nhận sự kiện
    try { console.log("[CREATE KH TAP]"); } catch {}
    Toast.show({ content: "Đang tạo...", icon: "loading", duration: 0 });

    // Validate nhẹ
    if (!ten.trim()) { Toast.clear(); Toast.show("Nhập tên khách hàng"); return; }
    if (!sdt.trim() || !phonePattern.test(sdt.trim())) { Toast.clear(); Toast.show("SĐT không hợp lệ"); return; }
    if (!kenh) { Toast.clear(); Toast.show("Chọn kênh liên hệ"); return; }

    const payload: any = {
      ten_khach_hang: ten.trim(),
      so_dien_thoai: sdt.trim(),
      kenh_lien_he: kenh,
      // Địa chỉ KHÔNG bắt buộc – chỉ gửi khi có
      ...(diaChi ? { dia_chi: diaChi.trim() } : {}),
      ...(email ? { email: email.trim() } : {}),
      ...(ghiChu ? { ghi_chu: ghiChu.trim() } : {}),
    };

    setSaving(true);
    try {
      await axios.post(API_ROUTE_CONFIG.KHACH_HANG, payload);
      Toast.clear();
      Toast.show({ content: "Tạo khách hàng thành công", icon: "success" });
      history.back();
    } catch (e: any) {
      Toast.clear();
      const status = e?.response?.status;
      const data   = e?.response?.data;
      try { console.log("[CREATE KH ERROR]", status, data); } catch {}

      const firstValidationError =
        (data?.errors && Array.isArray(Object.values(data.errors)) && (Object.values(data.errors).flat() as any[])?.[0]) || null;

      let msg =
        firstValidationError ||
        data?.message ||
        e?.message ||
        "Không tạo được khách hàng.";

      if (status === 401) msg = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      if (status === 403) msg = "Bạn không có quyền tạo khách hàng.";

      Toast.show({ content: String(msg), icon: "fail" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 12, paddingBottom: 100 }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Thêm khách hàng</div>

      <List>
        <List.Item>
          <Input value={ten} onChange={setTen} placeholder="Tên khách hàng *" clearable />
        </List.Item>

        <List.Item>
          <Input
            value={sdt}
            onChange={setSdt}
            placeholder="Số điện thoại (0… hoặc +84…) *"
            inputMode="tel"
            type="tel"
            clearable
          />
        </List.Item>

        <List.Item>
          <Input value={email} onChange={setEmail} placeholder="Email (không bắt buộc)" type="email" clearable />
        </List.Item>

        <List.Item description="Nguồn khách liên hệ (bắt buộc)">
          <Button block onClick={() => setKenhVisible(true)} style={{ justifyContent: "flex-start" }}>
            {kenh ? `Kênh: ${kenh}` : "Chọn kênh liên hệ"}
          </Button>
          <Picker
            columns={KENH_COLUMNS}
            visible={kenhVisible}
            onClose={() => setKenhVisible(false)}
            onConfirm={(vals) => { setKenh(String(vals?.[0] || "")); setKenhVisible(false); }}
            confirmText="Chọn"
            cancelText="Huỷ"
          />
        </List.Item>

        <List.Item>
          <Input value={diaChi} onChange={setDiaChi} placeholder="Địa chỉ (không bắt buộc)" clearable />
        </List.Item>

        <List.Item>
          <Input value={ghiChu} onChange={setGhiChu} placeholder="Ghi chú (không bắt buộc)" clearable />
        </List.Item>
      </List>

      {/* Sticky footer – dùng Button của antd-mobile để đảm bảo bắt click */}
      <div className="sticky-actions" style={{ pointerEvents: "auto" }}>
        <Button
          block
          color="primary"
          loading={saving}
          onClick={() => { void submit(); }}
          aria-label="Tạo khách hàng"
        >
          Tạo khách hàng
        </Button>
      </div>
    </div>
  );
}
