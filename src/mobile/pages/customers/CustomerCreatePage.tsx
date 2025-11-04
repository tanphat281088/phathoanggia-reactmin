import { useState } from "react";
import { Button, Dialog, Input, List, Segmented, Toast } from "antd-mobile";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";

// Phone pattern (đồng bộ với desktop: 0… hoặc +84…)
const phonePattern = /^(0|\+84)\d{8,12}$/;

// Danh sách cố định kênh liên hệ (đồng bộ desktop)
const KENH_OPTIONS = [
  "Zalo Nana","Facebook","Zalo","Hotline","Website","Tiktok","Khách vãng lai",
  "Khác","Fanpage PHG","CTV Ái Tân","Sự kiện Phát Hoàng Gia","Zalo Hoatyuet","Fanpage Hoatyuet","Facebook Tuyết Võ",
];

export default function CustomerCreatePage() {
  const [ten, setTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [email, setEmail] = useState("");
  const [kenh, setKenh] = useState<string>(KENH_OPTIONS[0]);
  const [diaChi, setDiaChi] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!ten.trim()) { Toast.show("Nhập tên khách hàng"); return; }
    if (!sdt.trim() || !phonePattern.test(sdt.trim())) { Toast.show("SĐT không hợp lệ"); return; }
    if (!kenh) { Toast.show("Chọn kênh liên hệ"); return; }

    const ok = await Dialog.confirm({ content: "Xác nhận tạo khách hàng?", confirmText: "Tạo", cancelText: "Huỷ" });
    if (!ok) return;

    const payload: any = {
      ten_khach_hang: ten.trim(),
      so_dien_thoai: sdt.trim(),
      kenh_lien_he: kenh,
      ...(email ? { email: email.trim() } : {}),
      ...(diaChi ? { dia_chi: diaChi.trim() } : {}),
      ...(ghiChu ? { ghi_chu: ghiChu.trim() } : {}),
    };

    setSaving(true);
    try {
      await axios.post(API_ROUTE_CONFIG.KHACH_HANG, payload);
      Toast.show({ content: "Tạo khách hàng thành công", icon: "success" });
      history.back(); // quay lại danh sách
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Không tạo được khách hàng.";
      Dialog.alert({ content: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Thêm khách hàng</div>
      <List>
        <List.Item>
          <Input value={ten} onChange={setTen} placeholder="Tên khách hàng *" clearable />
        </List.Item>
        <List.Item>
          <Input value={sdt} onChange={setSdt} placeholder="Số điện thoại (0… hoặc +84…) *" clearable />
        </List.Item>
        <List.Item>
          <Input value={email} onChange={setEmail} placeholder="Email (không bắt buộc)" clearable type="email" />
        </List.Item>
        <List.Item description="Nguồn khách liên hệ (bắt buộc)">
          <Segmented
            block
            options={KENH_OPTIONS.map((v) => ({ label: v, value: v }))}
            value={kenh}
            onChange={(v) => setKenh(String(v))}
          />
        </List.Item>
        <List.Item>
          <Input value={diaChi} onChange={setDiaChi} placeholder="Địa chỉ (không bắt buộc)" clearable />
        </List.Item>
        <List.Item>
          <Input value={ghiChu} onChange={setGhiChu} placeholder="Ghi chú (không bắt buộc)" clearable />
        </List.Item>
      </List>

      <div style={{ marginTop: 12 }}>
        <Button block color="primary" loading={saving} onClick={submit}>
          Tạo khách hàng
        </Button>
      </div>
    </div>
  );
}
