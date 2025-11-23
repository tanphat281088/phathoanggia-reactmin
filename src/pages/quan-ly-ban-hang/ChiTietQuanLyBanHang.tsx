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

        // 🔹 Chuẩn hoá field ngày/datetime để bind vào DatePicker mà KHÔNG mất giờ
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
                data[key] = dayjs(val); // giữ nguyên giờ
            } else if (looksLikeDateOnly) {
                data[key] = dayjs(val, "YYYY-MM-DD");
            }
        });

        // 🔹 Transform chi_tiet_don_hangs thành format cho Form.List
        let danhSachSanPham: any[] = [];
        if (data.chi_tiet_don_hangs && Array.isArray(data.chi_tiet_don_hangs)) {
            danhSachSanPham = data.chi_tiet_don_hangs.map((item: any) => {
                const sp = item.san_pham || item.sanPham || {};
                const code =
                    sp.ma_san_pham || sp.ma_vt || sp.ma_sp || sp.code || "";
                const name =
                    sp.ten_san_pham ||
                    sp.ten_vat_tu ||
                    sp.ten ||
                    sp.name ||
                    "";

                const isPackage = !!item.is_package;

                let packageItems: any[] = [];
                if (Array.isArray(item.package_items)) {
                    packageItems = item.package_items;
                } else if (typeof item.package_items === "string") {
                    try {
                        const parsed = JSON.parse(item.package_items);
                        if (Array.isArray(parsed)) packageItems = parsed;
                    } catch {
                        // ignore
                    }
                }

                const fallbackLabel =
                    [code, name].filter(Boolean).join(" - ") ||
                    String(item.san_pham_id);

                const label =
                    item.ten_hien_thi && String(item.ten_hien_thi).trim() !== ""
                        ? item.ten_hien_thi
                        : fallbackLabel;

                return {
                    san_pham_id: +item.san_pham_id,
                    don_vi_tinh_id: +item.don_vi_tinh_id,
                    so_luong: item.so_luong,
                    don_gia: item.don_gia,
                    tong_tien:
                        item.tong_tien !== undefined
                            ? item.tong_tien
                            : item.thanh_tien,
                    san_pham_label: label,
                    is_package: isPackage,
                    package_items: packageItems,
                };
            });
        }


        // 🔹 Map loại khách hàng DB → form
        // ERP sự kiện: loai_khach_hang = 0 (Hệ thống), 1 (Vãng lai)
        let formLoaiKhachHang = 0;
        if (data?.loai_khach_hang === 1) {
            formLoaiKhachHang = 1;
        } else {
            formLoaiKhachHang = 0;
        }

        // 🔹 Chuẩn bị text hiển thị "Mã KH - Tên KH - SĐT" + kênh liên hệ
        let khachHangDisplay: string | undefined =
            (data as any)?.khach_hang_display ?? undefined;
        let kenhLienHeDisplay: string | undefined = undefined;

        const kh = (data as any)?.khach_hang;
        if (kh) {
            const code = kh.ma_kh ?? "";
            const name = kh.ten_khach_hang ?? "";
            const phone = kh.so_dien_thoai ?? "";
            khachHangDisplay = [code, name, phone]
                .filter((x) => x && String(x).trim() !== "")
                .join(" - ");

            kenhLienHeDisplay =
                (kh.kenh_lien_he && String(kh.kenh_lien_he).trim()) || undefined;
        }

        form.setFieldsValue({
            ...data,
            loai_khach_hang: formLoaiKhachHang,
            khach_hang_display: khachHangDisplay,
            kenh_lien_he_display: kenhLienHeDisplay,
            danh_sach_san_pham: danhSachSanPham,
        });

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
