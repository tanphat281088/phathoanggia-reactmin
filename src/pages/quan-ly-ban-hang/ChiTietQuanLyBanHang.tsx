import { EyeOutlined } from "@ant-design/icons";
import { useState } from "react";
import FormQuanLyBanHang from "./FormQuanLyBanHang";
import { Button, Form, Modal } from "antd";
import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { setReload } from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import dayjs from "dayjs";

const ChiTietQuanLyBanHang = ({
    path,
    id,
    title,
}: {
    path: string;
    id: number;
    title: string;
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form] = Form.useForm();
    const dispatch = useDispatch();

    const showModal = async () => {
        setIsModalOpen(true);
        setIsLoading(true);
        const data = await getDataById(id, path);
// Chuẩn hoá field ngày/datetime để bind vào DatePicker mà KHÔNG mất giờ
Object.keys(data || {}).forEach((key) => {
  const val = data[key];
  if (!val) return;

  // giữ đủ giờ cho các field có thể là datetime
  const looksLikeDateTime =
    /(thoi_gian|_thoi|_at|datetime)/i.test(key) ||
    key === "nguoi_nhan_thoi_gian";

  // chỉ những field là "ngày" thuần mới parse theo YYYY-MM-DD
  const looksLikeDateOnly =
    /(ngay_|_ngay|^ngay$|birthday)/i.test(key) &&
    key !== "nguoi_nhan_thoi_gian";

  if (looksLikeDateTime) {
    data[key] = dayjs(val); // ✅ giữ nguyên giờ
  } else if (looksLikeDateOnly) {
    data[key] = dayjs(val, "YYYY-MM-DD");
  }
});


        // Transform chi_tiet_don_hangs thành format cho FormList
        let danhSachSanPham: any[] = [];
        if (data.chi_tiet_don_hangs && Array.isArray(data.chi_tiet_don_hangs)) {
   danhSachSanPham = data.chi_tiet_don_hangs.map((item: any) => {
  const sp = item.san_pham || item.sanPham || {};
  const code = sp.ma_san_pham || sp.ma_vt || sp.ma_sp || sp.code || "";
  const name = sp.ten_san_pham || sp.ten_vat_tu || sp.ten || sp.name || "";
  return {
    san_pham_id: +item.san_pham_id,
    don_vi_tinh_id: +item.don_vi_tinh_id,
    so_luong: item.so_luong,
    don_gia: item.don_gia,
    tong_tien: item.tong_tien,
    loai_gia: item?.loai_gia ?? 1,
    san_pham_label: [code, name].filter(Boolean).join(" - ") || String(item.san_pham_id),
  };
});
        }


        // ===== NEW: Map loại khách hàng DB → form (0: Hệ thống, 1: Vãng lai, 2: Pass/CTV) =====
        let formLoaiKhachHang = 0; // mặc định: Hệ thống

        if (data?.loai_khach_hang === 1) {
          // Đơn vãng lai
          formLoaiKhachHang = 1;
        } else {
          // Đơn gắn KH hệ thống → xem customer_mode
          const customerMode = Number(data?.khach_hang?.customer_mode ?? 0);
          if (customerMode === 1) {
            // Khách Pass đơn & CTV
            formLoaiKhachHang = 2;
          } else {
            // Khách hệ thống thường
            formLoaiKhachHang = 0;
          }
        }
        // ===== NEW: Chuẩn bị text hiển thị "Mã KH - Tên KH - SĐT" cho chi tiết =====
        // ===== NEW: Chuẩn bị text hiển thị "Mã KH - Tên KH - SĐT" cho chi tiết =====
        let khachHangDisplay: string | undefined = undefined;
        let kenhLienHeDisplay: string | undefined = undefined;

        const kh = (data as any)?.khach_hang;
        if (kh) {
          const code  = kh.ma_kh ?? "";
          const name  = kh.ten_khach_hang ?? "";
          const phone = kh.so_dien_thoai ?? "";
          khachHangDisplay = [code, name, phone].filter(Boolean).join(" - ");

          // 🔹 Kênh liên hệ lấy trực tiếp từ khách hàng
          kenhLienHeDisplay = kh.kenh_lien_he ?? undefined;
        }

        form.setFieldsValue({
          ...data,
          loai_khach_hang: formLoaiKhachHang,
          khach_hang_display: khachHangDisplay,
          kenh_lien_he_display: kenhLienHeDisplay, // 🔹 NEW
          danh_sach_san_pham: danhSachSanPham,
        });



        console.log("[CTDH] danhSachSanPham:", danhSachSanPham);
console.log("[CTDH] label mẫu:", danhSachSanPham?.[0]?.san_pham_label);
console.log("[CTDH] item[0]:", danhSachSanPham?.[0]);

        setIsLoading(false);
    };

    const handleCancel = () => {
        form.resetFields();
        setIsModalOpen(false);
    };

    const onUpdate = async (values: any) => {
        setIsSubmitting(true);
        const closeModel = () => {
            handleCancel();
            dispatch(setReload());
        };
        await putData(path, id, values, closeModel);
        setIsSubmitting(false);
    };

    return (
        <>
            <Button
                onClick={showModal}
                type="primary"
                size="small"
                title={`Chi tiết ${title}`}
                icon={<EyeOutlined />}
                style={{
                    marginRight: 5,
                }}
            />
            <Modal
                title={`Chi tiết ${title}`}
                open={isModalOpen}
                onCancel={handleCancel}
                maskClosable={false}
                loading={isLoading}
                centered
                width={1200}
                footer={null}
            >
                <Form
                    id={`formSuaQuanLyBanHang-${id}`}
                    form={form}
                    layout="vertical"
                    onFinish={onUpdate}
                >
                    <FormQuanLyBanHang form={form} isDetail={true} />
                </Form>
            </Modal>
        </>
    );
};

export default ChiTietQuanLyBanHang;
