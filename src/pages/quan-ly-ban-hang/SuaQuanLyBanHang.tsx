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
  // ===== policy cho phép sửa field nào (FE) =====
const [allowedFields, setAllowedFields] = useState<string[] | undefined>(undefined);
const [lockAll, setLockAll] = useState(false);


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
danhSachSanPham = data?.chi_tiet_don_hangs.map((item: any) => {
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
console.log("[SUA] danhSachSanPham:", danhSachSanPham);
console.log("[SUA] label mẫu:", danhSachSanPham?.[0]?.san_pham_label);
console.log("[SUA] item[0]:", danhSachSanPham?.[0]);

    // ===== BUILD POLICY (allowedFields) =====
const isDelivered = Number(data?.trang_thai_don_hang ?? 0) === 2;
const totalGrand  = Number(data?.tong_tien_can_thanh_toan ?? 0);
const paidGrand   = Number(data?.so_tien_da_thanh_toan ?? 0);
const stPaid      = Number(data?.trang_thai_thanh_toan ?? 0);
const isPaidFull  = stPaid === 2 || (totalGrand > 0 && paidGrand >= totalGrand);
const isOlderThan10Days = dayjs().diff(dayjs(data?.ngay_tao_don_hang), "day") > 10;

let _allowed: string[] | undefined = undefined;
let _lockAll = false;

// Ưu tiên: (1) đã giao + đã thanh toán đủ → khoá toàn bộ
//          (2) đã giao → chỉ thanh toán + ghi chú
//          (3) >10 ngày → trạng thái/giờ nhận/thanh toán/ghi chú + ĐỊA CHỈ (chỉ khi CHƯA giao)
//          (4) còn lại → không giới hạn (undefined)
if (isDelivered && isPaidFull) {
  _allowed = [];
  _lockAll = true;
} else if (isDelivered) {
  _allowed = ["loai_thanh_toan","so_tien_da_thanh_toan","ghi_chu"];
} else if (isOlderThan10Days) {
  _allowed = [
    "trang_thai_don_hang",
    "nguoi_nhan_thoi_gian",
    "loai_thanh_toan",
    "so_tien_da_thanh_toan",
    "ghi_chu",
    "dia_chi_giao_hang",   // chỉ hợp lệ vì CHƯA giao; nếu đã giao thì đã vào nhánh trên rồi
  ];
} else {
  _allowed = undefined; // không giới hạn
}

setAllowedFields(_allowed);
setLockAll(_lockAll);

// ===== Sync thanh toán từ DB (đúng quy ước) =====
// total = tổng cần thanh toán (grand total)
// paid  = đã thanh toán (thực tế)
// remain = còn lại
const total  = Number(data?.tong_tien_can_thanh_toan ?? 0);
const paid   = Number(data?.so_tien_da_thanh_toan ?? 0);
const remain = Math.max(0, total - paid);

// 0 = chưa thanh toán; 1 = một phần; 2 = toàn bộ
const loaiTT = (total <= 0 || paid <= 0) ? 0 : (paid >= total ? 2 : 1);

form.setFieldsValue({
  loai_thanh_toan: loaiTT,
  so_tien_da_thanh_toan: paid, // giữ đúng số đã thu trong DB
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
             disabled={lockAll}   // ⬅️ thêm
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
