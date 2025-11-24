import { PlusOutlined } from "@ant-design/icons";
import { postData } from "../../services/postData.api";
import { useState } from "react";
import { Button, Form, Modal, Row, message } from "antd";
import FormQuanLyBanHang from "./FormQuanLyBanHang";
import { useDispatch } from "react-redux";
import { clearImageSingle, setReload } from "../../redux/slices/main.slice";
import dayjs from "dayjs";

/* Responsive hook để biết khi nào là mobile */
import { useResponsive } from "../../hooks/useReponsive";
/* Form modal 2: Hạng mục báo giá */
import FormHangMucBaoGia from "./FormHangMucBaoGia";

const DEFAULT_QUOTE_FOOTER_NOTE =
  "- Giá trên đã bao gồm toàn bộ chi phí nhân sự và trang thiết bị theo mô tả trong bảng báo giá.\n" +
  "- Giá chưa bao gồm thuế VAT (nếu có thỏa thuận khác sẽ ghi rõ trong hợp đồng).\n" +
  "- Báo giá có hiệu lực đến ngày ...";

const ThemQuanLyBanHang = ({
  path,
  title,
}: {
  path: string;
  title: string;
}) => {
  const dispatch = useDispatch();
  const { isMobile } = useResponsive();

  // ===== FORM MODAL 1 (THÔNG TIN) =====
  const [infoForm] = Form.useForm();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // ===== FORM MODAL 2 (HẠNG MỤC BÁO GIÁ) =====
  const [detailForm] = Form.useForm();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Lưu tạm toàn bộ dữ liệu modal 1 để truyền sang modal 2 + build payload
  const [draftInfo, setDraftInfo] = useState<any | null>(null);

  // ========== MỞ MODAL 1: THÊM BÁO GIÁ ==========
  const showModal = async () => {
    // Reset 2 form, clear ảnh
    infoForm.resetFields();
    detailForm.resetFields();
    dispatch(clearImageSingle());
    setDraftInfo(null);

    // Giá trị mặc định cho modal 1 giống behaviour cũ
    infoForm.setFieldsValue({
      ngay_tao_don_hang: dayjs(),
      loai_khach_hang: 0,
      trang_thai_don_hang: 0,
    });

    setIsInfoModalOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleCancelAll = () => {
    setIsInfoModalOpen(false);
    setIsDetailModalOpen(false);
    infoForm.resetFields();
    detailForm.resetFields();
    setDraftInfo(null);
    dispatch(clearImageSingle());
  };

  // ========== BƯỚC 1 → BƯỚC 2: TỪ MODAL 1 SANG MODAL 2 ==========
  const handleNextFromInfo = async () => {
    try {
      const values = infoForm.getFieldsValue();

      // Validate giống logic step 1 cũ
      const fieldsToValidate: (string | (string | number)[])[] = [
        "ngay_tao_don_hang",
        "loai_khach_hang",
        "dia_chi_giao_hang",
        "nguoi_nhan_thoi_gian",
      ];

      if (values.loai_khach_hang === 0) {
        // KH hệ thống
        fieldsToValidate.push("khach_hang_id");
      } else if (values.loai_khach_hang === 1) {
        // KH vãng lai
        fieldsToValidate.push("ten_khach_hang", "so_dien_thoai");
      } else if (values.loai_khach_hang === 2) {
        // Agency
        fieldsToValidate.push("khach_hang_id");
      }

      await infoForm.validateFields(fieldsToValidate);

      const fullInfo = infoForm.getFieldsValue(true);
      setDraftInfo(fullInfo);

      // Chuẩn bị form modal 2: tiền / thuế / thanh toán / ghi chú
      detailForm.resetFields();
      detailForm.setFieldsValue({
        giam_gia: 0,
        chi_phi: 0,
        tax_mode: 0,
        vat_rate: undefined,
        loai_thanh_toan: 0,
        so_tien_da_thanh_toan: 0,
        giam_gia_thanh_vien: fullInfo.giam_gia_thanh_vien ?? 0,
        quote_footer_note:
          fullInfo.quote_footer_note || DEFAULT_QUOTE_FOOTER_NOTE,
      });

      // Đóng modal 1, mở modal 2
      setIsInfoModalOpen(false);
      setIsDetailModalOpen(true);
    } catch (_e) {
      // AntD tự highlight lỗi
    }
  };

  // Quay lại modal 1 từ modal 2
  const handleBackToInfo = () => {
    if (!draftInfo) {
      setIsDetailModalOpen(false);
      setIsInfoModalOpen(true);
      return;
    }
    setIsDetailModalOpen(false);
    setIsInfoModalOpen(true);
    infoForm.setFieldsValue(draftInfo);
  };

  // ========== LƯU BÁO GIÁ (SUBMIT MODAL 2) ==========
  const onCreate = async (detailValues: any) => {
    setIsSaving(true);
    try {
      const info = draftInfo || infoForm.getFieldsValue(true) || {};


      // Map items → danh_sach_san_pham cho BE
      const items: any[] = detailValues?.items || [];

      // Map items → danh_sach_san_pham cho BE
      // - Giữ san_pham_id để BE tạo đúng chi_tiet_don_hangs
      // - Lưu hang_muc_goc từ HẠNG MỤC nếu chưa có
      // - Lưu CHI TIẾT (row.chi_tiet) vào san_pham_label để lần sau sửa lại không bị mất
      const danh_sach_san_pham = (items || [])
  .filter((row) => row && row.san_pham_id)
  .map((row) => {
    const soLuong = Number(row.so_luong ?? 0);
    const donGia = Number(row.don_gia ?? 0);
    const thanhTien =
      row.thanh_tien !== undefined && row.thanh_tien !== null
        ? Number(row.thanh_tien)
        : soLuong * donGia;

    // Hạng mục gốc: ưu tiên HẠNG MỤC anh gõ, fallback hạng_mục_gốc cũ
    const hangMucGoc =
      row.hang_muc && String(row.hang_muc).trim() !== ""
        ? String(row.hang_muc).trim()
        : row.hang_muc_goc && String(row.hang_muc_goc).trim() !== ""
        ? String(row.hang_muc_goc).trim()
        : null;

    // Chi tiết dòng anh gõ trên form
    const chiTiet =
      row.chi_tiet && String(row.chi_tiet).trim() !== ""
        ? String(row.chi_tiet).trim()
        : null;

    // Label dùng cho ten_hien_thi:
    //  - ưu tiên chiTiet anh gõ
    //  - fallback label cũ (san_pham_label)
    const sanPhamLabel =
      chiTiet ??
      (row.san_pham_label && String(row.san_pham_label).trim() !== ""
        ? String(row.san_pham_label).trim()
        : null);

    return {
      san_pham_id: row.san_pham_id,
      don_vi_tinh_id: row.don_vi_tinh_id ?? null,
      so_luong: soLuong,
      don_gia: donGia,
      thanh_tien: thanhTien,

      // Hiển thị & grouping
      is_package: !!row.is_package,
      package_items: row.package_items ?? null,
      section_code: row.section_code ?? null,
      hang_muc_goc: hangMucGoc,

      // dùng cho BE set ten_hien_thi
      san_pham_label: sanPhamLabel,
      ten_hien_thi: sanPhamLabel,

      // Title / description cho báo giá sự kiện
      title: chiTiet,
    };
  });

      if (!danh_sach_san_pham.length) {
        message.warning("Báo giá phải có ít nhất 1 hạng mục dịch vụ / gói.");
        return;
      }

      // Gộp info + detailValues thành 1 object như allValues cũ
      const allValues = {
        ...info,
        ...detailValues,
        danh_sach_san_pham,
      };

      // Không gửi mã báo giá (BE tự sinh)
      const {
        ma_don_hang, // eslint-disable-line @typescript-eslint/no-unused-vars
        items: _items, // bỏ field items nội bộ
        ...rest
      } = allValues || {};

      // ===== Chuẩn hoá loai_khach_hang cho BE =====
      const loaiKhRaw = rest?.loai_khach_hang;
      let loaiKhForPayload: number | undefined;

      if (loaiKhRaw === 1) {
        loaiKhForPayload = 1; // Khách vãng lai
      } else {
        loaiKhForPayload = 0; // Hệ thống + Agency
      }

      const taxModeNum = Number(allValues?.tax_mode ?? 0);
      const taxPatch =
        taxModeNum === 1
          ? {
              tax_mode: 1,
              vat_rate:
                allValues?.vat_rate !== undefined &&
                allValues?.vat_rate !== null
                  ? Number(allValues.vat_rate)
                  : 8,
            }
          : {};

      let khachHangIdForPayload = rest.khach_hang_id ?? null;
      if (loaiKhForPayload === 1) {
        // KH vãng lai không gắn khach_hang_id
        khachHangIdForPayload = null;
      }

      const payload = {
        ...rest,
        loai_khach_hang: loaiKhForPayload,
        khach_hang_id: khachHangIdForPayload,
        ...taxPatch,
        ngay_tao_don_hang: allValues?.ngay_tao_don_hang
          ? dayjs(allValues.ngay_tao_don_hang).format("YYYY-MM-DD")
          : null,
        nguoi_nhan_thoi_gian: allValues?.nguoi_nhan_thoi_gian
          ? dayjs(allValues.nguoi_nhan_thoi_gian).format(
              "YYYY-MM-DD HH:mm:ss"
            )
          : null,
        so_tien_da_thanh_toan: allValues?.so_tien_da_thanh_toan
          ? allValues.so_tien_da_thanh_toan
          : 0,
      };

      const closeModel = () => {
        handleCancelAll();
        dispatch(setReload());
      };

      const resp: any = await postData(path, payload, closeModel);

      const code = resp?.data?.ma_don_hang ?? resp?.ma_don_hang;
      if (code) {
        message.success(`Tạo báo giá thành công: ${code}`);
      } else {
        message.success(`Tạo báo giá thành công`);
      }
    } catch (_e) {
      // postData đã xử lý lỗi; ở đây chỉ đảm bảo tắt loading
    } finally {
      setIsSaving(false);
    }
  };

  // ===== FOOTER CHO MODAL 1 (THÔNG TIN) =====
  const infoFooter = [
    <Row justify="end" key="footer-info">
      <Button onClick={handleCancelAll} style={{ marginRight: 8 }}>
        Hủy
      </Button>
      <Button type="primary" onClick={handleNextFromInfo}>
        Tiếp tục
      </Button>
    </Row>,
  ];

  // ===== FOOTER CHO MODAL 2 (HẠNG MỤC BÁO GIÁ) =====
  const detailFooter = [
    <Row justify="end" key="footer-detail" style={{ gap: 8 }}>
      <Button onClick={handleCancelAll}>Hủy</Button>
      <Button onClick={handleBackToInfo}>Quay lại</Button>
      <Button
        key="submit"
        form="formHangMucBaoGia"
        type="primary"
        htmlType="submit"
        size="large"
        loading={isSaving}
      >
        Lưu
      </Button>
    </Row>,
  ];

  return (
    <>
      {/* Nút mở quy trình Thêm báo giá */}
      <Button
        onClick={showModal}
        type="primary"
        title={`Thêm ${title}`}
        icon={<PlusOutlined />}
      >
        Thêm {title}
      </Button>

      {/* MODAL 1: THÔNG TIN KH & SỰ KIỆN (giữ UI cũ) */}
      <Modal
        title={`Thêm ${title} - Thông tin khách hàng & sự kiện`}
        open={isInfoModalOpen}
        width={isMobile ? "100%" : 1300}
        style={{ top: 24 }}
        styles={{
          body: {
            maxHeight: isMobile
              ? "calc(100vh - 140px)"
              : "calc(100vh - 160px)",
            overflow: "auto",
            padding: isMobile ? 12 : 24,
          },
        }}
        onCancel={handleCancelAll}
        maskClosable={false}
        footer={infoFooter}
      >
        <Form
          id="formQuanLyBanHang-Info"
          form={infoForm}
          layout="vertical"
        >
          {/* stepMode=1, wizardMode=true => chỉ hiển thị block Step 1 */}
          <FormQuanLyBanHang
            form={infoForm}
            stepMode={1}
            wizardMode={true}
          />
        </Form>
      </Modal>

      {/* MODAL 2: HẠNG MỤC BÁO GIÁ */}
      <Modal
        title={`Thêm ${title} - Hạng mục báo giá`}
        open={isDetailModalOpen}
        width={isMobile ? "100%" : 1300}
        style={{ top: 24 }}
        styles={{
          body: {
            maxHeight: isMobile
              ? "calc(100vh - 140px)"
              : "calc(100vh - 160px)",
            overflow: "auto",
            padding: isMobile ? 12 : 24,
          },
        }}
        onCancel={handleCancelAll}
        maskClosable={false}
        footer={detailFooter}
      >
        <Form
          id="formHangMucBaoGia"
          form={detailForm}
          layout="vertical"
          onFinish={onCreate}
        >
          <FormHangMucBaoGia
            form={detailForm}
            mode="create"
            donHangInfo={draftInfo}
          />
        </Form>
      </Modal>
    </>
  );
};

export default ThemQuanLyBanHang;
