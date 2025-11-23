import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import FormQuanLyBanHang from "./FormQuanLyBanHang";
import { Button, Form, Modal, Row } from "antd";
import { useResponsive } from "../../hooks/useReponsive";

import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { setReload } from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import dayjs from "dayjs";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { isMobile } = useResponsive();

  // policy cho phép sửa field nào (FE)
  const [allowedFields, setAllowedFields] = useState<string[] | undefined>(
    undefined
  );
  const [lockAll, setLockAll] = useState(false);

  // Wizard step: 1..7
  // 1 = KH & sự kiện
  // 2 = NS, 3 = CSVC, 4 = TIEC, 5 = TD, 6 = CPK, 7 = Giảm giá/QL/Thuế/Thanh toán
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);


  const showModal = async () => {
    setStep(1); // luôn về step 1 khi mở
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

        // 🔹 LẤY DANH MỤC & GROUP_CODE (NS/CSVC/TIEC/TD/CPK) TỪ SẢN PHẨM
        const dm = sp.danh_muc || sp.danhMuc || {};
        const groupCodeRaw =
          dm.group_code ||
          dm.groupCode ||
          null;
        const groupCode = groupCodeRaw
          ? String(groupCodeRaw).toUpperCase()
          : null; // NS / CSVC / TIEC / TD / CPK / null

        // Gói hay dịch vụ lẻ?
        const isPackage = !!item.is_package;

        // Parse package_items (có thể là JSON string hoặc array)
        let packageItems: any[] = [];
        if (Array.isArray(item.package_items)) {
          packageItems = item.package_items;
        } else if (typeof item.package_items === "string") {
          try {
            const parsed = JSON.parse(item.package_items);
            if (Array.isArray(parsed)) packageItems = parsed;
          } catch {
            // ignore nếu JSON lỗi
          }
        }

        // Label fallback theo code + name
        const fallbackLabel =
          [code, name].filter(Boolean).join(" - ") ||
          String(item.san_pham_id);

        // Ưu tiên tên hiển thị (ten_hien_thi) nếu có
        const label =
          item.ten_hien_thi && String(item.ten_hien_thi).trim() !== ""
            ? item.ten_hien_thi
            : fallbackLabel;

        return {
          san_pham_id: +item.san_pham_id,
          don_vi_tinh_id: +item.don_vi_tinh_id,
          so_luong: item.so_luong,
          don_gia: item.don_gia,
          // UI dùng field "tong_tien", BE dùng "thanh_tien" → ưu tiên thanh_tien nếu có
          tong_tien:
            item.tong_tien !== undefined
              ? item.tong_tien
              : item.thanh_tien,
          san_pham_label: label,
          is_package: isPackage,
          package_items: packageItems,
                hang_muc_goc: item.hang_muc_goc ?? null,

          // 🔹 section_code: dùng để lọc từng modal NS/CSVC/TIEC/TD/CPK
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

    // Tính gợi ý management_fee_percent từ chi_phi & tong_tien_hang (nếu có)
    const tongTienHang = Number(data?.tong_tien_hang ?? 0);
    const chiPhi = Number(data?.chi_phi ?? 0);
    const managementFeePercent =
      tongTienHang > 0 ? Math.round((chiPhi * 100) / tongTienHang) : 0;


    // ======== Build list Hạng mục (Nhóm gói) mặc định cho Step 8 nếu chưa có ========
    const rawCategoryTitles = (data as any)?.quote_category_titles;
    // Luôn coi là array: nếu DB chưa có thì = []
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



    form.setFieldsValue({
      ...data,
      loai_khach_hang: formLoaiKhachHang,
      khach_hang_display: khachHangDisplay,
      tax_mode,
      vat_rate,
      giam_gia_thanh_vien: memberPercent,
      danh_sach_san_pham: danhSachSanPham,
      management_fee_percent: managementFeePercent,
       quote_category_titles: categoryTitles,
    });
    // 🔹 Nếu đơn chưa có ghi chú tuỳ biến → dùng ghi chú mặc định để anh sửa
    if (!data?.quote_footer_note) {
      form.setFieldsValue({
        quote_footer_note: DEFAULT_QUOTE_FOOTER_NOTE,
      });
    }

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

  // ===== Tiêu đề theo step =====
  const stepTitle = (() => {
    switch (step) {
      case 1:
        return `Sửa ${title} - Thông tin khách hàng & sự kiện`;
      case 2:
        return `Sửa ${title} - Báo giá Nhân sự (NS)`;
      case 3:
        return `Sửa ${title} - Báo giá Cơ sở vật chất (CSVC)`;
      case 4:
        return `Sửa ${title} - Báo giá Tiệc (TIEC)`;
      case 5:
        return `Sửa ${title} - Báo giá Địa điểm / Thuê địa điểm (TD)`;
      case 6:
        return `Sửa ${title} - Báo giá Chi phí khác (CPK)`;
      case 7:
        return `Sửa ${title} - Giảm giá, Chi phí quản lý, Thuế & Thanh toán`;
      case 8:
        return `Sửa ${title} - Tuỳ biến Hạng mục & Ghi chú báo giá`;
      default:
        return `Sửa ${title}`;
    }
  })();

  // ===== Điều khiển wizard =====
  const handleNextStep = async () => {
    try {
      if (step === 1) {
        const values = form.getFieldsValue();
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

        await form.validateFields(fieldsToValidate);
      }

      if (step < 8) {
        setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
      }

    } catch (_e) {
      // AntD tự highlight
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }
  };

  // ===== Footer =====
  const footer =
    step === 1
      ? [
          <Row justify="end" key="footer-step1">
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={handleNextStep}
              disabled={lockAll}
            >
              Tiếp tục
            </Button>
          </Row>,
        ]
      : step > 1 && step < 8
      ? [
          <Row justify="end" key="footer-step-mid" style={{ gap: 8 }}>
            <Button onClick={handleCancel}>Hủy</Button>
            <Button onClick={handlePrevStep} disabled={lockAll}>
              Quay lại
            </Button>
            <Button
              type="primary"
              onClick={handleNextStep}
              disabled={lockAll}
            >
              Tiếp tục
            </Button>
          </Row>,
        ]
      : [
          <Row justify="end" key="footer-step8" style={{ gap: 8 }}>
            <Button onClick={handlePrevStep} disabled={lockAll}>
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
      <Modal
        title={stepTitle}
        open={isModalOpen}
        onCancel={handleCancel}
        maskClosable={false}
        // 🔹 Đẩy modal lên trên (cao hơn, ít bị chật)
        style={{ top: 24 }}
        // 🔹 Đồng bộ với Modal Thêm: desktop 1300px, mobile full width
        width={isMobile ? "100%" : 1300}
        styles={{
          body: {
            maxHeight: isMobile
              ? "calc(100vh - 140px)"
              : "calc(100vh - 160px)",   // trước là 200px
            overflow: "auto",
            padding: isMobile ? 12 : 24,
          },
        }}
        loading={isLoading}
        footer={footer}
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
          <FormQuanLyBanHang
            form={form}
            allowedFields={allowedFields}
            stepMode={step}
            wizardMode={true}
          />
        </Form>
      </Modal>
    </>
  );
};

export default SuaQuanLyBanHang;
