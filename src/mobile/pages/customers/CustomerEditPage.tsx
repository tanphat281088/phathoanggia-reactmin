import { useEffect, useState } from "react";
import { Button, Dialog, Input, List, Segmented, Toast } from "antd-mobile";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";

const phonePattern = /^(0|\+84)\d{8,12}$/;

// Đồng bộ đúng danh sách cố định như desktop/BE (config('kenh_lien_he.options'))
const KENH_OPTIONS = [
  "Zalo Nana","Facebook","Zalo","Hotline","Website","Tiktok","Khách vãng lai",
  "Khác","Fanpage PHG","CTV Ái Tân","Sự kiện Phát Hoàng Gia","Zalo Hoatyuet",
  "Fanpage Hoatyuet","Facebook Tuyết Võ",
];

export default function CustomerEditPage() {
  const nav = useNavigate();
  const { id } = useParams(); // /admin/m/customers/:id/edit

  // form state
  const [ten, setTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [email, setEmail] = useState("");
  const [kenh, setKenh] = useState<string>(KENH_OPTIONS[0]);
  const [diaChi, setDiaChi] = useState("");
  const [ghiChu, setGhiChu] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // nạp dữ liệu
  const load = async () => {
    setLoading(true);
    try {
      const resp: any = await axios.get(`${API_ROUTE_CONFIG.KHACH_HANG}/${id}`);
      const d = resp?.data ?? resp ?? {};
      setTen(d.ten_khach_hang || "");
      setSdt(d.so_dien_thoai || "");
      setEmail(d.email || "");
      setDiaChi(d.dia_chi || "");
      setGhiChu(d.ghi_chu || "");
      setKenh(d.kenh_lien_he && KENH_OPTIONS.includes(d.kenh_lien_he) ? d.kenh_lien_he : KENH_OPTIONS[0]);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Không tải được khách hàng.";
      Dialog.alert({ content: msg });
      // trở lại danh sách
      nav("/admin/m/customers", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = async () => {
    // validate theo UpdateKhachHangRequest (sometimes|required)
    if (!ten.trim()) { Toast.show("Tên khách hàng là bắt buộc"); return; }
    if (!sdt.trim() || !phonePattern.test(sdt.trim())) { Toast.show("SĐT không hợp lệ"); return; }
    if (!diaChi.trim()) { Toast.show("Địa chỉ là bắt buộc"); return; }
    if (!kenh || !KENH_OPTIONS.includes(kenh)) { Toast.show("Kênh liên hệ không hợp lệ"); return; }

    const ok = await Dialog.confirm({ content: "Lưu thay đổi khách hàng?", confirmText: "Lưu", cancelText: "Hủy" });
    if (!ok) return;

    const payload: any = {
      id, // để rule unique bỏ qua id hiện tại nếu BE dùng $this->id
      ten_khach_hang: ten.trim(),
      so_dien_thoai: sdt.trim(),
      dia_chi: diaChi.trim(),
      kenh_lien_he: kenh,
      ...(email ? { email: email.trim() } : { email: null }),
      ...(ghiChu ? { ghi_chu: ghiChu.trim() } : { ghi_chu: null }),
    };

    setSaving(true);
    try {
      await axios.put(`${API_ROUTE_CONFIG.KHACH_HANG}/${id}`, payload);
      Toast.show({ content: "Cập nhật thành công", icon: "success" });
      nav("/admin/m/customers", { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Cập nhật thất bại.";
      Dialog.alert({ content: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 12, opacity: 0.7 }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Sửa khách hàng</div>
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
        <List.Item description="Kênh liên hệ *">
          <Segmented
            block
            options={KENH_OPTIONS.map((v) => ({ label: v, value: v }))}
            value={kenh}
            onChange={(v) => setKenh(String(v))}
          />
        </List.Item>
        <List.Item>
          <Input value={diaChi} onChange={setDiaChi} placeholder="Địa chỉ *" clearable />
        </List.Item>
        <List.Item>
          <Input value={ghiChu} onChange={setGhiChu} placeholder="Ghi chú (không bắt buộc)" clearable />
        </List.Item>
      </List>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Button block color="primary" loading={saving} onClick={submit}>
          Lưu thay đổi
        </Button>
        <Button block onClick={() => nav(-1)}>Huỷ</Button>
      </div>
    </div>
  );
}
