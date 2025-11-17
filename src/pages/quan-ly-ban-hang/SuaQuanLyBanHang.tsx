import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import FormQuanLyBanHang from "./FormQuanLyBanHang";
import { Button, Form, Modal } from "antd";
import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { setReload } from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import dayjs from "dayjs";

const SuaQuanLyBanHang = ({
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

  // policy cho phép sửa field nào (FE)
  const [allowedFields, setAllowedFields] = useState<string[] | undefined>(
    undefined
  );
  const [lockAll, setLockAll] = useState(false);

  const showModal = async () => {
    setIsModalOpen(true);
    setIsLoading(true);

    const data = await getDataById(id, path);

    // Chuẩn hoá các field ngày để bind vào DatePicker
    Object.keys(data || {}).forEach((key) => {
      const val = data[key];
      if (!val) return;

      const looksLikeDateTime =
        /(thoi_gian|_thoi|_at|datetime)/i.test(key) ||
        key === "nguoi_nhan_thoi_gian";

      const looksLikeDateOnly =
        /(ngay_|_ngay|^ngay$|birthday)/i.test(key) &&
        key !== "nguoi_nhan_thoi_gian";

      if (looksLikeDateTime) {
        data[key] = dayjs(val); // giữ nguyên giờ
      } else if (looksLikeDateOnly) {
        data[key] = dayjs(val, "YYYY-MM-DD");
      }
    });

    // Transform chi_tiet_don_hangs thành format cho Form.List
    let danhSachSanPham: any[] = [];
    if (data?.chi_tiet_don_hangs && Array.isArray(data.chi_tiet_don_hangs)) {
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
        return {
          san_pham_id: +item.san_pham_id,
          don_vi_tinh_id: +item.don_vi_tinh_id,
          so_luong: item.so_luong,
          don_gia: item.don_gia,
          // BE dùng thanh_tien, FE dùng tong_tien → ưu tiên field nào có
          tong_tien:
            item.tong_tien !== undefined
              ? item.tong_tien
              : item.thanh_tien,
          // ❌ EVENT: không còn loai_gia
          // loai_gia: item?.loai_gia ?? 1,
          san_pham_label:
            [code, name].filter(Boolean).join(" - ") ||
            String(item.san_pham_id),
        };
      });
    }

    // Thuế (tương thích ngược)
    const tax_mode =
      data?.tax_mode === 0 || data?.tax_mode === 1
        ? Number(data.tax_mode)
        : 0;
    const vat_rate =
      tax_mode === 1
        ? data?.vat_rate !== undefined && data?.vat_rate !== null
          ? Number(data.vat_rate)
          : 8
        : undefined;

    // % giảm giá thành viên lấy từ DB (nếu có)
    const memberPercent = Number(data?.member_discount_percent ?? 0);

    // Map loại khách hàng DB → form (0: Hệ thống, 1: Vãng lai, 2: Agency)
    let formLoaiKhachHang = 0;

    if (data?.loai_khach_hang === 1) {
      // Đơn vãng lai
      formLoaiKhachHang = 1;
    } else {
      // Đơn gắn KH hệ thống → xem customer_type để biết có phải Agency không
      const customerType = Number(data?.khach_hang?.customer_type ?? 0);
      if (customerType === 2) {
        // 2 = Agency (theo BE)
        formLoaiKhachHang = 2;
      } else {
        formLoaiKhachHang = 0; // KH hệ thống thường
      }
    }

    // Chuẩn bị text "Mã KH - Tên KH - SĐT"
    let khachHangDisplay: string | undefined =
      (data as any)?.khach_hang_display ?? undefined;

    const kh = (data as any)?.khach_hang;
    if (!khachHangDisplay && kh) {
      const code = kh.ma_kh ?? "";
      const name = kh.ten_khach_hang ?? "";
      const phone = kh.so_dien_thoai ?? "";
      khachHangDisplay = [code, name, phone]
        .filter((x) => x && String(x).trim() !== "")
        .join(" - ");
    }

    form.setFieldsValue({
      ...data,
      loai_khach_hang: formLoaiKhachHang,
      khach_hang_display: khachHangDisplay,
      tax_mode,
      vat_rate,
      giam_gia_thanh_vien: memberPercent,
      danh_sach_san_pham: danhSachSanPham,
    });

    // BUILD POLICY (allowedFields)
    const isDelivered =
      Number(data?.trang_thai_don_hang ?? 0) === 2;
    const totalGrand = Number(data?.tong_tien_can_thanh_toan ?? 0);
    const paidGrand = Number(data?.so_tien_da_thanh_toan ?? 0);
    const stPaid = Number(data?.trang_thai_thanh_toan ?? 0);
    const isPaidFull =
      stPaid === 2 || (totalGrand > 0 && paidGrand >= totalGrand);
    const isOlderThan10Days =
      dayjs().diff(dayjs(data?.ngay_tao_don_hang), "day") > 10;

    let _allowed: string[] | undefined = undefined;
    let _lockAll = false;

    if (isDelivered && isPaidFull) {
      _allowed = [];
      _lockAll = true;
    } else if (isDelivered) {
      _allowed = ["loai_thanh_toan", "so_tien_da_thanh_toan", "ghi_chu"];
    } else if (isOlderThan10Days) {
      _allowed = [
        "trang_thai_don_hang",
        "nguoi_nhan_thoi_gian",
        "loai_thanh_toan",
        "so_tien_da_thanh_toan",
        "ghi_chu",
        "dia_chi_giao_hang",
      ];
    } else {
      _allowed = undefined; // không giới hạn
    }

    setAllowedFields(_allowed);
    setLockAll(_lockAll);

    // Sync loại thanh toán + số tiền đã thanh toán
    const total = Number(data?.tong_tien_can_thanh_toan ?? 0);
    const paid = Number(data?.so_tien_da_thanh_toan ?? 0);

    const loaiTT =
      total <= 0 || paid <= 0 ? 0 : paid >= total ? 2 : 1;

    form.setFieldsValue({
      loai_thanh_toan: loaiTT,
      so_tien_da_thanh_toan: paid,
    });

    setIsLoading(false);
  };

  const handleCancel = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  const onUpdate = async (values: any) => {
    setIsSubmitting(true);
    try {
      const closeModel = () => {
        handleCancel();
        dispatch(setReload());
      };

      // Không gửi mã báo giá
      const { ma_don_hang, ...rest } = values || {};

      // Chuẩn hoá loai_khach_hang cho BE
      // FE: 0 = Hệ thống, 1 = Vãng lai, 2 = Agency
      // BE (don_hangs.loai_khach_hang): 0 = hệ thống (có khach_hang_id), 1 = vãng lai
      let loaiKhRaw = rest?.loai_khach_hang;
      let loaiKhForPayload: number | undefined;

      if (loaiKhRaw === 1) {
        loaiKhForPayload = 1; // vãng lai
      } else {
        // 0 hoặc 2 (Agency) đều là "hệ thống" ở cấp DonHang
        loaiKhForPayload = 0;
      }

      // Chuẩn hoá ngày
      const ngayTao: string | null = values?.ngay_tao_don_hang
        ? dayjs(values.ngay_tao_don_hang).format("YYYY-MM-DD")
        : null;

      const tgNhanRaw: any = values?.nguoi_nhan_thoi_gian ?? null;
      const tgNhan: string | null =
        tgNhanRaw && dayjs(tgNhanRaw).isValid()
          ? dayjs(tgNhanRaw).format("YYYY-MM-DD HH:mm:ss")
          : null;

      const taxModeNum = Number(values?.tax_mode ?? 0);
      const taxPatch =
        taxModeNum === 1
          ? {
              tax_mode: 1,
              vat_rate:
                values?.vat_rate !== undefined && values?.vat_rate !== null
                  ? Number(values.vat_rate)
                  : 8,
            }
          : {};

      const payload: any = {
        ...rest,
        loai_khach_hang: loaiKhForPayload,
        ...taxPatch,
        ngay_tao_don_hang: ngayTao,
        nguoi_nhan_thoi_gian: tgNhan,
        so_tien_da_thanh_toan: values?.so_tien_da_thanh_toan
          ? values.so_tien_da_thanh_toan
          : 0,
      };

      await putData(path, id, payload, closeModel);
    } catch (error) {
      console.error("Error in onUpdate:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={showModal}
        type="primary"
        size="small"
        title={`Sửa ${title}`}
        icon={<EditOutlined />}
      />
      <Modal
        title={`Sửa ${title}`}
        open={isModalOpen}
        onCancel={handleCancel}
        maskClosable={false}
        centered
        width={1200}
        footer={[
          <Button
            key="submit"
            form={`formSuaQuanLyBanHang-${id}`}
            type="primary"
            htmlType="submit"
            size="large"
            loading={isSubmitting}
            disabled={lockAll}
          >
            Lưu
          </Button>,
        ]}
      >
        <Form
          id={`formSuaQuanLyBanHang-${id}`}
          form={form}
          layout="vertical"
          onFinish={onUpdate}
          onFinishFailed={(errorInfo) => {
            console.error("Form validation failed:", errorInfo);
          }}
        >
          <FormQuanLyBanHang form={form} allowedFields={allowedFields} />
        </Form>
      </Modal>
    </>
  );
};

export default SuaQuanLyBanHang;
