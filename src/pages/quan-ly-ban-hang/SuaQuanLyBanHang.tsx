import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import FormQuanLyBanHang from "./FormQuanLyBanHang";
import { Button, Form, Modal } from "antd";
import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { setReload } from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import dayjs, { Dayjs } from "dayjs";

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

  const showModal = async () => {
    setIsModalOpen(true);
    setIsLoading(true);

    const data = await getDataById(id, path);

    // Chuẩn hoá các field ngày để bind vào DatePicker
    Object.keys(data || {}).forEach((key) => {
      const val = data[key];
      if (!val) return;

      // giữ đủ giờ cho các field có thể là datetime
      const looksLikeDateTime =
        /(thoi_gian|_thoi|_at|datetime)/i.test(key) ||
        key === "nguoi_nhan_thoi_gian";

      const looksLikeDateOnly =
        /(ngay_|_ngay|^ngay$|birthday)/i.test(key) &&
        key !== "nguoi_nhan_thoi_gian";

      if (looksLikeDateTime) {
        data[key] = dayjs(val); // để nguyên giờ
      } else if (looksLikeDateOnly) {
        data[key] = dayjs(val, "YYYY-MM-DD");
      }
    });

    // Transform chi_tiet_don_hangs thành format cho FormList
    let danhSachSanPham: any[] = [];
    if (data?.chi_tiet_don_hangs && Array.isArray(data.chi_tiet_don_hangs)) {
      danhSachSanPham = data.chi_tiet_don_hangs.map((item: any) => ({
        san_pham_id: +item.san_pham_id,
        don_vi_tinh_id: +item.don_vi_tinh_id,
        so_luong: item.so_luong,
        don_gia: item.don_gia,
        tong_tien: item.tong_tien,
        loai_gia: item?.loai_gia ?? 1,
      }));
    }

    // ===== NEW: Thuế (tương thích ngược) =====
    // Đơn cũ chưa có trường thuế -> mặc định Không thuế.
    const tax_mode =
      data?.tax_mode === 0 || data?.tax_mode === 1
        ? Number(data.tax_mode)
        : 0;
    const vat_rate =
      tax_mode === 1
        ? (data?.vat_rate !== undefined && data?.vat_rate !== null
            ? Number(data.vat_rate)
            : 8)
        : undefined;

    form.setFieldsValue({
      ...data,
      tax_mode,
      vat_rate,
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
    try {
      const closeModel = () => {
        handleCancel();
        dispatch(setReload());
      };

      // Không gửi mã đơn
      const { ma_don_hang, ...rest } = values || {};

      // Format ngày: ngày tạo chỉ cần date; ngày nhận cần cả giờ
      const ngayTao: string | null = values?.ngay_tao_don_hang
        ? dayjs(values.ngay_tao_don_hang).format("YYYY-MM-DD")
        : null;

      const tgNhanRaw: string | Dayjs | null = values?.nguoi_nhan_thoi_gian ?? null;
      const tgNhan: string | null =
        tgNhanRaw
          ? dayjs(tgNhanRaw as any).isValid()
            ? dayjs(tgNhanRaw as any).format("YYYY-MM-DD HH:mm:ss")
            : null
          : null;

      // ===== NEW: chỉ gửi thuế khi Có thuế =====
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

      // Không bắt buộc phải đính kèm danh_sach_san_pham khi chỉ sửa thông tin người nhận
      const payload: any = {
        ...rest,
        ...taxPatch, // ⬅️ chỉ có khi tax_mode=1
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
          <FormQuanLyBanHang form={form} />
        </Form>
      </Modal>
    </>
  );
};

export default SuaQuanLyBanHang;
