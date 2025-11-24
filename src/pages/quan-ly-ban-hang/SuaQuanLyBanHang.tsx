/* eslint-disable @typescript-eslint/no-explicit-any */
import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Form, Modal, Row } from "antd";
import type { FormInstance } from "antd";
import { useResponsive } from "../../hooks/useReponsive";

import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { setReload } from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import dayjs from "dayjs";

import FormQuanLyBanHang from "./FormQuanLyBanHang";
import FormHangMucBaoGia from "./FormHangMucBaoGia";

const DEFAULT_QUOTE_FOOTER_NOTE =
  "- Giá trên đã bao gồm toàn bộ chi phí nhân sự và trang thiết bị theo mô tả trong bảng báo giá.\n" +
  "- Giá chưa bao gồm thuế VAT (nếu có thỏa thuận khác sẽ ghi rõ trong hợp đồng).\n" +
  "- Báo giá có hiệu lực đến ngày ...";

const SuaQuanLyBanHang = ({
  path,
  id,
  title,
}: {
  path: string;
  id: number;
  title: string;
}) => {
  const dispatch = useDispatch();
  const { isMobile } = useResponsive();

  // ===== FORM MODAL 1 (THÔNG TIN) =====
  const [infoForm] = Form.useForm() as [FormInstance];
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  // ===== FORM MODAL 2 (HẠNG MỤC BÁO GIÁ) =====
  const [detailForm] = Form.useForm() as [FormInstance];
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // policy cho phép sửa field nào (FE)
  const [allowedFields, setAllowedFields] = useState<string[] | undefined>(
    undefined
  );
  const [lockAll, setLockAll] = useState(false);

  // Lưu tạm toàn bộ dữ liệu modal 1 (sau khi user bấm Tiếp tục)
  const [draftInfo, setDraftInfo] = useState<any | null>(null);

  // DonHang đầy đủ (dùng cho header FormHangMucBaoGia)
  const [donHangState, setDonHangState] = useState<any | null>(null);

  // =================== MỞ MODAL 1: SỬA BÁO GIÁ ===================
  const showModal = async () => {
    setIsInfoModalOpen(true);
    setIsDetailModalOpen(false);
    setIsLoadingInfo(true);

    const data = await getDataById(id, path);

    // Chuẩn hoá field ngày/datetime
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
        data[key] = dayjs(val);
      } else if (looksLikeDateOnly) {
        data[key] = dayjs(val, "YYYY-MM-DD");
      }
    });

    // Transform chi_tiet_don_hangs → items cho modal 2
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

        // LẤY DANH MỤC & GROUP_CODE (NS/CSVC/TIEC/TD/CPK)
        const dm = sp.danh_muc || sp.danhMuc || {};
        const groupCodeRaw = dm.group_code || dm.groupCode || null;
        const groupCode = groupCodeRaw
          ? String(groupCodeRaw).toUpperCase()
          : null; // NS / CSVC / TIEC / TD / CPK / null

        // Gói hay dịch vụ lẻ?
        const isPackage = !!item.is_package;

        // Parse package_items (JSON string hoặc array)
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

        // Label fallback
        const fallbackLabel =
          [code, name].filter(Boolean).join(" - ") ||
          String(item.san_pham_id);

        const label =
          item.ten_hien_thi && String(item.ten_hien_thi).trim() !== ""
            ? item.ten_hien_thi
            : fallbackLabel;

        // Hạng mục gốc
        const hangMucGoc = item.hang_muc_goc ?? null;

        // Chi tiết dùng cho modal 2
        const chiTiet = label;

        return {
          // cho FormHangMucBaoGia
          san_pham_id: +item.san_pham_id,
          san_pham_label: label,
          don_vi_tinh_id: +item.don_vi_tinh_id,
          so_luong: item.so_luong,
          don_gia: item.don_gia,
          thanh_tien:
            item.tong_tien !== undefined
              ? item.tong_tien
              : item.thanh_tien,
          is_package: isPackage,
          package_items: packageItems,
          hang_muc: hangMucGoc || "Hạng mục",
          hang_muc_goc: hangMucGoc ?? null,
          chi_tiet: chiTiet,
          section_code: groupCode,
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

    // % giảm giá thành viên lấy từ DB
    const memberPercent = Number(data?.member_discount_percent ?? 0);

    // Map loại khách hàng DB → form (0: Hệ thống, 1: Vãng lai, 2: Agency)
    let formLoaiKhachHang = 0;
    if (data?.loai_khach_hang === 1) {
      formLoaiKhachHang = 1; // vãng lai
    } else {
      const customerType = Number(data?.khach_hang?.customer_type ?? 0);
      if (customerType === 2) {
        formLoaiKhachHang = 2; // Agency
      } else {
        formLoaiKhachHang = 0; // hệ thống
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

    // Tính gợi ý management_fee_percent từ chi_phi & tong_tien_hang (nếu có)
    const tongTienHang = Number(data?.tong_tien_hang ?? 0);
    const chiPhi = Number(data?.chi_phi ?? 0);
    const managementFeePercent =
      tongTienHang > 0 ? Math.round((chiPhi * 100) / tongTienHang) : 0;

    // BUILD list Hạng mục (Nhóm gói) cho Step 8 nếu chưa có
    const rawCategoryTitles = (data as any)?.quote_category_titles;
    let categoryTitles: any[] = Array.isArray(rawCategoryTitles)
      ? rawCategoryTitles
      : [];

    if (categoryTitles.length === 0) {
      const usedKeys: string[] = [];
      (data.chi_tiet_don_hangs || []).forEach((ct: any) => {
        const key = ct.hang_muc_goc || null;
        if (key && !usedKeys.includes(key)) {
          usedKeys.push(key);
        }
      });
      categoryTitles = usedKeys.map((k) => ({ key: k, label: k }));
    }

    // ======== Set form cho MODAL 1 (THÔNG TIN) ========
    infoForm.setFieldsValue({
      ...data,
      loai_khach_hang: formLoaiKhachHang,
      khach_hang_display: khachHangDisplay,
      management_fee_percent: managementFeePercent,
    });

    // ======== Set form cho MODAL 2 (HẠNG MỤC) ========
    detailForm.setFieldsValue({
      items: danhSachSanPham,
      giam_gia: data?.giam_gia ?? 0,
      chi_phi: data?.chi_phi ?? 0,
      tax_mode,
      vat_rate,
      loai_thanh_toan: 0, // sẽ tính lại bên dưới
      so_tien_da_thanh_toan: Number(data?.so_tien_da_thanh_toan ?? 0),
      giam_gia_thanh_vien: memberPercent,
      quote_category_titles: categoryTitles,
      quote_footer_note: data?.quote_footer_note || DEFAULT_QUOTE_FOOTER_NOTE,
      quote_signer_name: data?.quote_signer_name ?? null,
      quote_signer_title: data?.quote_signer_title ?? null,
      quote_signer_phone: data?.quote_signer_phone ?? null,
      quote_signer_email: data?.quote_signer_email ?? null,
      quote_approver_note: data?.quote_approver_note ?? null,
      ghi_chu: data?.ghi_chu ?? null,
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

    detailForm.setFieldsValue({
      loai_thanh_toan: loaiTT,
      so_tien_da_thanh_toan: paid,
    });

    setIsLoadingInfo(false);
    setDonHangState(data);
  };

  const handleCancelAll = () => {
    infoForm.resetFields();
    detailForm.resetFields();
    setIsInfoModalOpen(false);
    setIsDetailModalOpen(false);
    setDraftInfo(null);
  };

  // ============ TỪ MODAL 1 → MODAL 2 ============
  const handleNextFromInfo = async () => {
    try {
      const values = infoForm.getFieldsValue();
      const fieldsToValidate: (string | (string | number)[])[] = [
        "ngay_tao_don_hang",
        "loai_khach_hang",
        "dia_chi_giao_hang",
        "nguoi_nhan_thoi_gian",
      ];

      if (values.loai_khach_hang === 0) {
        fieldsToValidate.push("khach_hang_id");
      } else if (values.loai_khach_hang === 1) {
        fieldsToValidate.push("ten_khach_hang", "so_dien_thoai");
      } else if (values.loai_khach_hang === 2) {
        fieldsToValidate.push("khach_hang_id");
      }

      await infoForm.validateFields(fieldsToValidate);

      const fullInfo = infoForm.getFieldsValue(true);
      setDraftInfo(fullInfo);

      setIsInfoModalOpen(false);
      setIsDetailModalOpen(true);
    } catch (_e) {
      // AntD tự highlight
    }
  };

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

  // ============ LƯU (SUBMIT MODAL 2) ============
const onUpdate = async (detailValues: any) => {
  setIsSubmitting(true);
  try {
    const info  = draftInfo || infoForm.getFieldsValue(true) || {};
    const items: any[] = detailValues?.items || [];

    // Map items → danh_sach_san_pham cho BE
    // - Giữ san_pham_id
    // - hang_muc_goc: ưu tiên HẠNG MỤC anh gõ, fallback giá trị gốc
    // - CHI TIẾT (row.chi_tiet) → san_pham_label/ten_hien_thi để PDF dùng
    const danh_sach_san_pham = (items || [])
      .filter((row) => row && row.san_pham_id)
      .map((row) => {
        const soLuong = Number(row.so_luong ?? 0);
        const donGia  = Number(row.don_gia ?? 0);
        const thanhTien =
          row.thanh_tien !== undefined && row.thanh_tien !== null
            ? Number(row.thanh_tien)
            : soLuong * donGia;

        // Hạng mục gốc: ưu tiên Hạng mục anh nhập, fallback hạng_mục_gốc cũ
        const hangMucGoc =
          row.hang_muc && String(row.hang_muc).trim() !== ""
            ? String(row.hang_muc).trim()
            : row.hang_muc_goc && String(row.hang_muc_goc).trim() !== ""
            ? String(row.hang_muc_goc).trim()
            : null;

        // Chi tiết anh gõ trên form
        const chiTiet =
          row.chi_tiet && String(row.chi_tiet).trim() !== ""
            ? String(row.chi_tiet).trim()
            : null;

        // Label hiển thị cho khách: ưu tiên CHI TIẾT, fallback label cũ
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

          // Cho BE set ten_hien_thi
          san_pham_label: sanPhamLabel,
          ten_hien_thi: sanPhamLabel,

          // Title / description cho báo giá sự kiện
          title: chiTiet,
        };
      });

    // ... phần tiếp theo của onUpdate giữ nguyên (merge với info, build payload, putData, v.v.)



      const allValues = {
        ...info,
        ...detailValues,
        danh_sach_san_pham,
      };

      // Không gửi mã báo giá
      const {
        ma_don_hang, // eslint-disable-line @typescript-eslint/no-unused-vars
        items: _items,
        ...rest
      } = allValues || {};

      // Chuẩn hoá loai_khach_hang cho BE
      let loaiKhRaw = rest?.loai_khach_hang;
      let loaiKhForPayload: number | undefined;
      if (loaiKhRaw === 1) {
        loaiKhForPayload = 1;
      } else {
        loaiKhForPayload = 0;
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

      const totalThanhToan = Number(
        donHangState?.tong_tien_can_thanh_toan ?? 0
      );
      const paid = Number(allValues?.so_tien_da_thanh_toan ?? 0);

      const payload: any = {
        ...rest,
        loai_khach_hang: loaiKhForPayload,
        ...taxPatch,
        ngay_tao_don_hang: allValues?.ngay_tao_don_hang
          ? dayjs(allValues.ngay_tao_don_hang).format("YYYY-MM-DD")
          : null,
        nguoi_nhan_thoi_gian: allValues?.nguoi_nhan_thoi_gian
          ? dayjs(allValues.nguoi_nhan_thoi_gian).format(
              "YYYY-MM-DD HH:mm:ss"
            )
          : null,
        so_tien_da_thanh_toan: paid ?? 0,
      };

      // Đồng bộ loai_thanh_toan nếu cần
      if (totalThanhToan > 0) {
        if (paid <= 0) {
          payload.loai_thanh_toan = 0;
        } else if (paid >= totalThanhToan) {
          payload.loai_thanh_toan = 2;
        } else {
          payload.loai_thanh_toan = 1;
        }
      }

      const closeModel = () => {
        handleCancelAll();
        dispatch(setReload());
      };

      await putData(path, id, payload, closeModel);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error in onUpdate:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== Tiêu đề cho modal =====
  const infoTitle = `Sửa ${title} - Thông tin khách hàng & sự kiện`;
  const detailTitle = `Sửa ${title} - Hạng mục báo giá`;

  // ===== FOOTER MODAL 1 =====
  const infoFooter = [
    <Row justify="end" key="footer-info">
      <Button onClick={handleCancelAll} style={{ marginRight: 8 }}>
        Hủy
      </Button>
      <Button
        type="primary"
        onClick={handleNextFromInfo}
        disabled={lockAll}
      >
        Tiếp tục
      </Button>
    </Row>,
  ];

  // ===== FOOTER MODAL 2 =====
  const detailFooter = [
    <Row justify="end" key="footer-detail" style={{ gap: 8 }}>
      <Button onClick={handleCancelAll}>Hủy</Button>
      <Button onClick={handleBackToInfo} disabled={lockAll}>
        Quay lại
      </Button>
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
      </Button>
    </Row>,
  ];

  return (
    <>
      <Button
        onClick={showModal}
        type="primary"
        size="small"
        title={`Sửa ${title}`}
        icon={<EditOutlined />}
      />
      {/* MODAL 1: THÔNG TIN KH & SỰ KIỆN */}
      <Modal
        title={infoTitle}
        open={isInfoModalOpen}
        onCancel={handleCancelAll}
        maskClosable={false}
        style={{ top: 24 }}
        width={isMobile ? "100%" : 1300}
        styles={{
          body: {
            maxHeight: isMobile
              ? "calc(100vh - 140px)"
              : "calc(100vh - 160px)",
            overflow: "auto",
            padding: isMobile ? 12 : 24,
          },
        }}
        loading={isLoadingInfo}
        footer={infoFooter}
      >
        <Form
          id={`formSuaQuanLyBanHang-Info-${id}`}
          form={infoForm}
          layout="vertical"
        >
          <FormQuanLyBanHang
            form={infoForm}
            isDetail={lockAll}
            allowedFields={allowedFields}
            stepMode={1}
            wizardMode={true}
          />
        </Form>
      </Modal>

      {/* MODAL 2: HẠNG MỤC BÁO GIÁ */}
      <Modal
        title={detailTitle}
        open={isDetailModalOpen}
        onCancel={handleCancelAll}
        maskClosable={false}
        style={{ top: 24 }}
        width={isMobile ? "100%" : 1300}
        styles={{
          body: {
            maxHeight: isMobile
              ? "calc(100vh - 140px)"
              : "calc(100vh - 160px)",
            overflow: "auto",
            padding: isMobile ? 12 : 24,
          },
        }}
        footer={detailFooter}
      >
        <Form
          id={`formSuaQuanLyBanHang-${id}`}
          form={detailForm}
          layout="vertical"
          onFinish={onUpdate}
        >
          <FormHangMucBaoGia
            form={detailForm}
            mode="edit"
            donHangInfo={donHangState}
            disabled={lockAll}
          />
        </Form>
      </Modal>
    </>
  );
};

export default SuaQuanLyBanHang;
