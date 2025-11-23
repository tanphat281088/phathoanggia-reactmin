/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  type FormInstance,
  Select,
  DatePicker,
  Typography,
  Button,
  Tooltip,
  message,
} from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import { formatter, parser } from "../../utils/utils";
import SelectFormApi from "../../components/select/SelectFormApi";
import { donHangTrangThaiSelect } from "../../configs/select-config";
import dayjs from "dayjs";
import {
  OPTIONS_LOAI_KHACH_HANG,
  OPTIONS_LOAI_THANH_TOAN,
} from "../../utils/constant";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { getDataById } from "../../services/getData.api";

/* ✅ Component danh sách dịch vụ (chi tiết báo giá) */
import DanhSachSanPham from "./components/DanhSachSanPham";

import { useCallback, useEffect, useMemo, useState } from "react";
import { phoneNumberVNPattern } from "../../utils/patterns";

/** ====== Định dạng ngày–giờ ====== */
const CLIENT_DATETIME_FORMAT = "DD/MM/YYYY HH:mm";
const SERVER_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";

/** ====== THUẾ: 0=Không thuế, 1=Có VAT ====== */
const TAX_MODE_OPTIONS = [
  { label: "Không thuế", value: 0 },
  { label: "Có thuế", value: 1 },
] as const;

/** ====== TRẠNG THÁI BÁO GIÁ ====== */
const BAO_GIA_STATUS_OPTIONS = [
  { label: "Chưa chốt báo giá", value: 0 },
  { label: "Đang chốt báo giá", value: 1 },
  { label: "Đã chốt báo giá", value: 2 },
  { label: "Đã hủy", value: 3 },
];

/** ⚙️ Override label Loại khách hàng: option thứ 3 = "Khách hàng Agency" */
const LOAI_KHACH_HANG_OPTIONS = OPTIONS_LOAI_KHACH_HANG.map((opt) =>
  opt.value === OPTIONS_LOAI_KHACH_HANG[2].value
    ? { ...opt, label: "Khách hàng Agency" }
    : opt
);

const FormQuanLyBanHang = ({
  form,
  isDetail = false,
  allowedFields,
/**
   * stepMode:
   *  - undefined: hiển thị đầy đủ (legacy) – dùng cho Chi tiết / Sửa (Tab 2)
   *  - 1: Thông tin khách hàng & sự kiện
   *  - 2..7: Báo giá theo nhóm (NS/CSVC/TIEC/TD/CPK) + Tiền/Thuế
   *  - 8: Tuỳ biến Hạng mục & Ghi chú báo giá
   */
  stepMode,
  /**
   * wizardMode = true: dùng cho flow Thêm mới (7 bước)
   * wizardMode = false (mặc định): giữ nguyên behaviour cũ cho Sửa / Chi tiết
   */
  wizardMode = false,
}: {
  form: FormInstance;
  isDetail?: boolean;
  allowedFields?: string[];
   stepMode?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  wizardMode?: boolean;
}) => {
  const isWizard = !!wizardMode;

  // Helper: field nào được phép sửa
  const can = (name: string) =>
    !Array.isArray(allowedFields) || allowedFields.includes(name);
  const d = (name: string) => isDetail || !can(name); // disabled?

  const loaiKhachHang = Form.useWatch("loai_khach_hang", form);
  const loaiThanhToan = Form.useWatch("loai_thanh_toan", form);
  const khachHangId = Form.useWatch("khach_hang_id", form);

  // Chuỗi hiển thị "Mã KH - Tên KH - SĐT" (đã set ở ChiTiet/Sửa)
  const khachHangDisplay =
    (form.getFieldValue("khach_hang_display") as string | undefined) || "";

  const [tongTienHang, setTongTienHang] = useState<number>(0);

  // Theo dõi danh sách dịch vụ trong Form.List
  const danhSachSanPham = Form.useWatch("danh_sach_san_pham", form) || [];
    // Nhóm nào hiện có dịch vụ/gói trong báo giá (để step 8 chỉ show đúng nhóm)
  const sectionHasItems = useMemo(() => {
    const set = new Set<string>();
    (danhSachSanPham || []).forEach((item: any) => {
      const code = item?.section_code;
      if (code) {
        set.add(String(code));
      }
    });
    return {
      NS: set.has("NS"),
      CSVC: set.has("CSVC"),
      TIEC: set.has("TIEC"),
      TD: set.has("TD"),
      CPK: set.has("CPK"),
    };
  }, [danhSachSanPham]);

  // 🔹 Wizard Step 8: tự build Hạng mục (nhóm gói) từ các dòng đã chọn nếu chưa có
  useEffect(() => {
    if (!isWizard) return;              // chỉ chạy ở chế độ wizard (Thêm)
    if (stepMode !== 8) return;         // chỉ khi đang ở Step 8

    const current = form.getFieldValue("quote_category_titles");
    if (Array.isArray(current) && current.length > 0) {
      return; // đã có dữ liệu (vừa load từ DB khi Sửa) thì không đụng
    }

    const usedKeys: string[] = [];
    (danhSachSanPham || []).forEach((row: any) => {
      const key = row?.hang_muc_goc || null;
      if (key && !usedKeys.includes(key)) {
        usedKeys.push(key);
      }
    });

    if (usedKeys.length > 0) {
      form.setFieldsValue({
        quote_category_titles: usedKeys.map((k) => ({
          key: k,
          label: k,
        })),
      });
    }
  }, [isWizard, stepMode, danhSachSanPham, form]);

  // Nếu chưa có danh sách dịch vụ thì dùng tổng tiền từ DB để hiển thị ban đầu
  useEffect(() => {
    const dbTotal = Number(form.getFieldValue("tong_tien_hang") || 0);
    if ((!danhSachSanPham || danhSachSanPham.length === 0) && dbTotal > 0) {
      setTongTienHang(dbTotal);
    }
  }, [form, danhSachSanPham]);

  /** ---------------- GIỮ BIẾN CŨ (tương thích ngược) ---------------- */

  const chiPhi = Form.useWatch("chi_phi", form) || 0;
  const giamGia = Form.useWatch("giam_gia", form) || 0;

  // Giảm giá thành viên (%)
  const memberPercent = Form.useWatch("giam_gia_thanh_vien", form) || 0;

  // Tiền giảm giá thành viên = % × tổng tiền hàng
  const memberDiscountAmount = useMemo(() => {
    const tong = Number(tongTienHang || 0);
    const rate = Number(memberPercent || 0);
    if (tong <= 0 || rate <= 0) return 0;
    return Math.round((tong * rate) / 100);
  }, [tongTienHang, memberPercent]);

  // Subtotal theo logic cũ: Tổng hàng - Giảm giá (member+thủ công) + Chi phí
  const subtotal = useMemo(() => {
    const tong =
      (tongTienHang || 0) -
      (memberDiscountAmount || 0) -
      (giamGia || 0) +
      (chiPhi || 0);
    return Math.max(0, tong);
  }, [tongTienHang, chiPhi, giamGia, memberDiscountAmount]);

  /** ---------------- THUẾ (MỚI) ---------------- */

  const taxMode = Form.useWatch("tax_mode", form) ?? 0; // 0|1
  const vatRate = Form.useWatch("vat_rate", form); // %

  const vatAmount = useMemo(() => {
    if (Number(taxMode) !== 1) return 0;
    const rate = Number(vatRate ?? 0);
    if (!(rate > 0)) return 0;
    return Math.round((subtotal * rate) / 100);
  }, [taxMode, vatRate, subtotal]);

  const grandTotal = useMemo(() => {
    if (Number(taxMode) === 1) return subtotal + vatAmount;
    return subtotal;
  }, [taxMode, subtotal, vatAmount]);

  const soTienDaThanhToan =
    Form.useWatch("so_tien_da_thanh_toan", form) || 0;

  // Đồng bộ so_tien_da_thanh_toan theo loại thanh toán
  useEffect(() => {
    if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[0].value) {
      // 0 = Chưa thanh toán
      form.setFieldsValue({ so_tien_da_thanh_toan: 0 });
    } else if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[2].value) {
      // 2 = Thanh toán toàn bộ
      form.setFieldsValue({ so_tien_da_thanh_toan: grandTotal || 0 });
    }
  }, [loaiThanhToan, grandTotal, form]);

  // Số tiền còn lại theo loại thanh toán
  const tongConLai = useMemo(() => {
    if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[0].value) {
      return Math.max(0, grandTotal || 0);
    }
    if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[2].value) {
      return 0;
    }
    const remain = (grandTotal || 0) - (soTienDaThanhToan || 0);
    return Math.max(0, remain);
  }, [loaiThanhToan, grandTotal, soTienDaThanhToan]);

  // Tính tổng tiền từng dòng dịch vụ nếu có chiet_khau (giữ cho tương thích)
  const calculatedProducts = useMemo(() => {
    if (!danhSachSanPham || !Array.isArray(danhSachSanPham)) {
      return [];
    }
    return danhSachSanPham.map((item: any, index: number) => {
      if (item && item.so_luong && item.don_gia) {
        const soLuong = Number(item.so_luong) || 0;
        const giaNhap = Number(item.don_gia) || 0;
        const chietKhau = Number(item.chiet_khau) || 0;
        const tongTien = soLuong * giaNhap * (1 - chietKhau / 100);
        return { ...item, tongTien, index };
      }
      return { ...item, tongTien: 0, index };
    });
  }, [danhSachSanPham]);

  const calculatedTongTienHang = useMemo(() => {
    return calculatedProducts.reduce((tong, item) => {
      return tong + (item.tongTien || 0);
    }, 0);
  }, [calculatedProducts]);

  const updateFormValues = useCallback(() => {
    calculatedProducts.forEach((item) => {
      const currentTongTien = form.getFieldValue([
        "danh_sach_san_pham",
        item.index,
        "tong_tien",
      ]);
      if (item.tongTien !== currentTongTien) {
        form.setFieldValue(
          ["danh_sach_san_pham", item.index, "tong_tien"],
          item.tongTien
        );
      }
    });
  }, [calculatedProducts, form]);

  useEffect(() => {
    // 🔹 Nếu đang ở chế độ wizard và KHÔNG phải Step 2 hoặc Step 7
    //    → bỏ qua recalculation để tránh lag (đặc biệt Step 6 - Chi phí khác)
    if (isWizard && stepMode && stepMode !== 2 && stepMode !== 7) {
      return;
    }

    const timer = setTimeout(() => {
      updateFormValues();

      if (Array.isArray(danhSachSanPham) && danhSachSanPham.length > 0) {
        setTongTienHang(calculatedTongTienHang);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isWizard, stepMode, updateFormValues, calculatedTongTienHang, danhSachSanPham]);


  // ===== Load hạng khách hàng (loai_khach_hang_ten) + % giảm giá thành viên =====
  useEffect(() => {
    const fetchTier = async () => {
      // Chỉ áp dụng cho KH hệ thống
      if (loaiKhachHang !== OPTIONS_LOAI_KHACH_HANG[0].value) {
        form.setFieldsValue({
          loai_khach_hang_ten: undefined,
          giam_gia_thanh_vien: 0,
        });
        return;
      }

      const id = khachHangId;
      if (!id) {
        form.setFieldsValue({
          loai_khach_hang_ten: undefined,
          giam_gia_thanh_vien: 0,
        });
        return;
      }

      try {
        const detail: any = await getDataById(
          id,
          API_ROUTE_CONFIG.KHACH_HANG
        );

        const tier = detail?.loai_khach_hang ?? detail?.loaiKhachHang ?? null;

        const tierName =
          tier?.ten_loai_khach_hang ?? "Khách hàng hệ thống";
        const tierPercent = Number(tier?.gia_tri_uu_dai ?? 0);

        form.setFieldsValue({
          loai_khach_hang_ten: tierName,
          giam_gia_thanh_vien: tierPercent,
        });
      } catch (_e) {
        form.setFieldsValue({
          loai_khach_hang_ten: undefined,
          giam_gia_thanh_vien: 0,
        });
      }
    };

    void fetchTier();
  }, [loaiKhachHang, khachHangId, form]);

  // ====== Re-sync phiếu thu theo mã báo giá ======
  const webBaseUrl = useMemo(() => {
    return (
      (import.meta as any).env?.VITE_WEB_BASE_URL ??
      "https://api.phgfloral.com"
    );
  }, []);

  const handleResync = async () => {
    const code: string = form.getFieldValue("ma_don_hang");
    if (!code) {
      message.warning("Chưa có mã báo giá để đồng bộ.");
      return;
    }
    const url = `${webBaseUrl}/admin/thu-chi/re-sync-by-code/${encodeURIComponent(
      code
    )}`;
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) {
        window.open(url, "_blank");
        message.info("Đã mở tab đồng bộ, vui lòng kiểm tra.");
        return;
      }
      const data = (await resp.json()) as {
        success?: boolean;
        message?: string;
      };
      if (data?.success) {
        message.success(data.message || "Đồng bộ phiếu thu thành công.");
      } else {
        message.error(data?.message || "Đồng bộ phiếu thu thất bại");
      }
    } catch (_e) {
      window.open(url, "_blank");
      message.info("Đã mở tab đồng bộ, vui lòng kiểm tra.");
    }
  };

  /** ====== CHI PHÍ QUẢN LÝ (%) – chỉ dùng khi wizardMode = true (Step 7) ====== */
  const managementFeePercent =
    Form.useWatch("management_fee_percent", form) ?? 0;

  useEffect(() => {
    if (!isWizard) return;
    const percent = Number(managementFeePercent) || 0;
    const base = Number(tongTienHang || 0);
    const mgmtAmount = Math.round((base * percent) / 100);
    // Ghi vào chi_phi để BE xử lý như cũ (subtotal = hàng - giảm + chi_phi)
    form.setFieldsValue({ chi_phi: mgmtAmount });
  }, [isWizard, managementFeePercent, tongTienHang, form]);

  return (
    <Row gutter={[10, 10]}>
      {/* ========== MODE LEGACY / EDIT: KHÔNG WIZARD ========== */}
      {!isWizard && (
        <>
          {/* STEP 1: THÔNG TIN KHÁCH HÀNG + SỰ KIỆN */}
          <div
            style={{
              display:
                !stepMode || stepMode === 1 ? "block" : "none",
              width: "100%",
            }}
          >
            <Row gutter={[10, 10]}>
              {/* ==== MÃ & NGÀY TẠO BÁO GIÁ ==== */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="ma_don_hang"
                  label="Mã báo giá"
                  rules={[]}
                >
                  <Input
                    placeholder="Tự sinh sau khi lưu"
                    disabled
                  />
                </Form.Item>
              </Col>

              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="ngay_tao_don_hang"
                  label="Ngày tạo báo giá"
                  rules={[
                    {
                      required: true,
                      message:
                        "Ngày tạo báo giá không được bỏ trống!",
                    },
                  ]}
                  initialValue={dayjs()}
                >
                  <DatePicker
                    placeholder="Nhập ngày tạo báo giá"
                    style={{ width: "100%" }}
                    format="DD/MM/YYYY"
                    disabled={d("ngay_tao_don_hang")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                  />
                </Form.Item>
              </Col>

              {/* Loại khách hàng */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="loai_khach_hang"
                  label="Loại khách hàng"
                  rules={[
                    {
                      required: true,
                      message:
                        "Loại khách hàng không được bỏ trống!",
                    },
                  ]}
                  initialValue={0}
                >
                  <Select
                    options={LOAI_KHACH_HANG_OPTIONS}
                    placeholder="Chọn loại khách hàng"
                    disabled={d("loai_khach_hang")}
                    getPopupContainer={(trigger) =>
                      (trigger &&
                        trigger.closest(".ant-modal")) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Form.Item>
              </Col>

              {/* TRẠNG THÁI BÁO GIÁ */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="trang_thai_don_hang"
                  label="Trạng thái báo giá"
                  rules={[]}
                  initialValue={0}
                >
                  <Select
                    options={BAO_GIA_STATUS_OPTIONS}
                    placeholder="Chọn trạng thái báo giá"
                    disabled={d("trang_thai_don_hang")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Form.Item>
              </Col>

              {/* KH hệ thống */}
              {loaiKhachHang ===
                LOAI_KHACH_HANG_OPTIONS[0].value && (
                <>
                  <Col
                    span={8}
                    xs={24}
                    sm={24}
                    md={24}
                    lg={8}
                    xl={8}
                  >
                    {khachHangDisplay ? (
                      <Form.Item
                        name="khach_hang_display"
                        label="Khách hàng"
                      >
                        <Input
                          placeholder="Khách hàng"
                          disabled
                        />
                      </Form.Item>
                    ) : (
                      <SelectFormApi
                        name="khach_hang_id"
                        label="Khách hàng"
                        path={
                          API_ROUTE_CONFIG.KHACH_HANG +
                          "/options"
                        }
                        placeholder="Chọn khách hàng"
                        rules={[
                          {
                            required:
                              loaiKhachHang ===
                              LOAI_KHACH_HANG_OPTIONS[0].value,
                            message:
                              "Khách hàng không được bỏ trống!",
                          },
                        ]}
                        disabled={d("khach_hang_id")}
                        getPopupContainer={(trigger) =>
                          (trigger &&
                            trigger.closest(".ant-modal")) ||
                          document.body
                        }
                        dropdownMatchSelectWidth={false}
                        popupClassName="phg-dd"
                      />
                    )}
                  </Col>

                  {/* Hạng khách hàng */}
                  <Col
                    span={8}
                    xs={24}
                    sm={24}
                    md={24}
                    lg={8}
                    xl={8}
                  >
                    <Form.Item
                      name="loai_khach_hang_ten"
                      label="Loại khách hàng"
                    >
                      <Input
                        placeholder="Tự động theo khách hàng"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                </>
              )}

              {/* KH vãng lai */}
              {loaiKhachHang ===
                LOAI_KHACH_HANG_OPTIONS[1].value && (
                <>
                  <Col
                    span={8}
                    xs={24}
                    sm={24}
                    md={24}
                    lg={8}
                    xl={8}
                  >
                    <Form.Item
                      name="ten_khach_hang"
                      label="Tên khách hàng"
                      rules={[
                        {
                          required:
                            loaiKhachHang ===
                            LOAI_KHACH_HANG_OPTIONS[1].value,
                          message:
                            "Tên khách hàng không được bỏ trống!",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Nhập tên khách hàng"
                        disabled={d("ten_khach_hang")}
                      />
                    </Form.Item>
                  </Col>
                  <Col
                    span={8}
                    xs={24}
                    sm={24}
                    md={24}
                    lg={8}
                    xl={8}
                  >
                    <Form.Item
                      name="so_dien_thoai"
                      label="Số điện thoại"
                      rules={[
                        {
                          required:
                            loaiKhachHang ===
                            LOAI_KHACH_HANG_OPTIONS[1].value,
                          message:
                            "Số điện thoại không được bỏ trống!",
                        },
                        {
                          pattern: phoneNumberVNPattern,
                          message:
                            "Số điện thoại không hợp lệ!",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Nhập số điện thoại"
                        disabled={d("so_dien_thoai")}
                      />
                    </Form.Item>
                  </Col>
                </>
              )}

              {/* KH Agency */}
              {loaiKhachHang ===
                LOAI_KHACH_HANG_OPTIONS[2].value && (
                <Col
                  span={8}
                  xs={24}
                  sm={24}
                  md={24}
                  lg={8}
                  xl={8}
                >
                  <SelectFormApi
                    name="khach_hang_id"
                    label="Khách hàng Agency"
                    path={
                      API_ROUTE_CONFIG.KHACH_HANG_PASS_CTV +
                      "/options"
                    }
                    placeholder="Chọn khách hàng Agency"
                    rules={[
                      {
                        required:
                          loaiKhachHang ===
                          LOAI_KHACH_HANG_OPTIONS[2].value,
                        message:
                          "Khách hàng không được bỏ trống!",
                      },
                    ]}
                    disabled={d("khach_hang_id")}
                    getPopupContainer={(trigger) =>
                      (trigger &&
                        trigger.closest(".ant-modal")) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Col>
              )}

              {/* Địa chỉ liên hệ / billing */}
              <Col
                span={16}
                xs={24}
                sm={24}
                md={24}
                lg={16}
                xl={16}
              >
                <Form.Item
                  name="dia_chi_giao_hang"
                  label="Địa chỉ liên hệ / xuất hóa đơn"
                  rules={[
                    {
                      required: true,
                      message:
                        "Địa chỉ không được bỏ trống!",
                    },
                  ]}
                >
                  <Input
                    placeholder="Nhập địa chỉ liên hệ / xuất hóa đơn"
                    disabled={d("dia_chi_giao_hang")}
                  />
                </Form.Item>
              </Col>

              {/* THÔNG TIN NGƯỜI NHẬN */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="nguoi_nhan_ten"
                  label="Tên người nhận"
                  rules={[{ max: 191, message: "Tối đa 191 ký tự" }]}
                >
                  <Input
                    placeholder="Nhập tên người nhận"
                    disabled={d("nguoi_nhan_ten")}
                  />
                </Form.Item>
              </Col>

              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="nguoi_nhan_sdt"
                  label="SĐT người nhận"
                  rules={[
                    { max: 20, message: "Tối đa 20 ký tự" },
                    {
                      pattern: phoneNumberVNPattern,
                      message:
                        "Số điện thoại không hợp lệ!",
                    },
                  ]}
                >
                  <Input
                    placeholder="Nhập số điện thoại người nhận (0… hoặc +84…)"
                    disabled={d("nguoi_nhan_sdt")}
                  />
                </Form.Item>
              </Col>

              {/* Ngày giờ tổ chức */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="nguoi_nhan_thoi_gian"
                  label="Ngày giờ tổ chức"
                  rules={[
                    {
                      required: true,
                      message:
                        "Ngày giờ tổ chức không được bỏ trống!",
                    },
                  ]}
                  getValueProps={(value) => {
                    if (!value) return { value };
                    const djs =
                      typeof value === "string" ||
                      typeof value === "number"
                        ? dayjs(value)
                        : value;
                    return {
                      value: djs?.isValid?.() ? djs : undefined,
                    };
                  }}
                  getValueFromEvent={(value) => value}
                >
                  <DatePicker
                    placeholder="Chọn ngày giờ tổ chức"
                    style={{ width: "100%" }}
                    showTime
                    format={CLIENT_DATETIME_FORMAT}
                    disabled={d("nguoi_nhan_thoi_gian")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                  />
                </Form.Item>
              </Col>

              {isDetail && (
                <Col
                  span={8}
                  xs={24}
                  sm={24}
                  md={24}
                  lg={8}
                  xl={8}
                >
                  <Form.Item
                    name="kenh_lien_he_display"
                    label="Kênh liên hệ"
                  >
                    <Input
                      placeholder="Kênh liên hệ"
                      disabled
                    />
                  </Form.Item>
                </Col>
              )}

              {/* ===== THÔNG TIN SỰ KIỆN ===== */}
              <Col span={24}>
                <Typography.Title
                  level={5}
                  style={{ marginTop: 16 }}
                >
                  Thông tin sự kiện
                </Typography.Title>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="project_name"
                  label="Tên dự án / sự kiện"
                >
                  <Input
                    placeholder="Nhập tên dự án / sự kiện"
                    disabled={d("project_name")}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="event_type"
                  label="Loại sự kiện"
                >
                  <Input
                    placeholder="VD: Khai trương, Hội nghị, Tiệc cưới..."
                    disabled={d("event_type")}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="event_start"
                  label="Thời gian bắt đầu sự kiện"
                >
                  <DatePicker
                    placeholder="Chọn thời gian bắt đầu"
                    showTime
                    format={CLIENT_DATETIME_FORMAT}
                    style={{ width: "100%" }}
                    disabled={d("event_start")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="event_end"
                  label="Thời gian kết thúc sự kiện"
                >
                  <DatePicker
                    placeholder="Chọn thời gian kết thúc"
                    showTime
                    format={CLIENT_DATETIME_FORMAT}
                    style={{ width: "100%" }}
                    disabled={d("event_end")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="guest_count"
                  label="Số lượng khách dự kiến"
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="Nhập số khách"
                    disabled={d("guest_count")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="venue_name"
                  label="Địa điểm / Nhà hàng"
                >
                  <Input
                    placeholder="Tên địa điểm, nhà hàng, khách sạn..."
                    disabled={d("venue_name")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="venue_address"
                  label="Địa chỉ tổ chức"
                >
                  <Input
                    placeholder="Địa chỉ chi tiết nơi tổ chức sự kiện"
                    disabled={d("venue_address")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_name"
                  label="Người liên hệ chính"
                >
                  <Input
                    placeholder="VD: Chị Lan - Marketing"
                    disabled={d("contact_name")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_phone"
                  label="SĐT người liên hệ"
                  rules={[
                    { max: 50, message: "Tối đa 50 ký tự" },
                    {
                      pattern: phoneNumberVNPattern,
                      message:
                        "Số điện thoại không hợp lệ!",
                    },
                  ]}
                >
                  <Input
                    placeholder="Nhập số điện thoại liên hệ"
                    disabled={d("contact_phone")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_email"
                  label="Email người liên hệ"
                  rules={[{ type: "email", message: "Email không hợp lệ" }]}
                >
                  <Input
                    placeholder="Nhập email liên hệ"
                    disabled={d("contact_email")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_department"
                  label="Phòng ban"
                >
                  <Input
                    placeholder="VD: Phòng Marketing, HR..."
                    disabled={d("contact_department")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_position"
                  label="Chức vụ"
                >
                  <Input
                    placeholder="VD: Trưởng phòng, Manager..."
                    disabled={d("contact_position")}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* STEP 2: DANH SÁCH DỊCH VỤ + TIỀN/THUẾ/THANH TOÁN (FULL VIEW) */}
          <div
            style={{
              display:
                !stepMode || stepMode === 2 ? "block" : "none",
              width: "100%",
            }}
          >
            <Row gutter={[10, 10]}>
              {/* ===== DANH SÁCH DỊCH VỤ ===== */}
              <Col span={24} style={{ marginBottom: 20 }}>
                <DanhSachSanPham
                  form={form}
                  isDetail={isDetail || !can("danh_sach_san_pham")}
                />
              </Col>

              {/* ===== HÀNG 1: GIẢM GIÁ / GIẢM GIÁ THÀNH VIÊN / CHI PHÍ / THUẾ / VAT ===== */}
              <Col span={24}>
                <Row gutter={[16, 8]} align="middle" wrap={false}>
                  <Col flex="0 0 20%">
                    <Form.Item
                      name="giam_gia"
                      label="Giảm giá"
                      rules={[
                        {
                          required: true,
                          message:
                            "Giảm giá không được bỏ trống!",
                        },
                      ]}
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        placeholder="Nhập giảm giá"
                        disabled={d("giam_gia")}
                        style={{ width: "100%" }}
                        addonAfter="đ"
                        formatter={formatter}
                        parser={parser}
                        min={0}
                        inputMode="numeric"
                      />
                    </Form.Item>
                  </Col>

                  <Col flex="0 0 20%">
                    <Form.Item
                      name="giam_gia_thanh_vien"
                      label="Giảm giá thành viên (%)"
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        disabled
                        style={{ width: "100%" }}
                        addonAfter="%"
                        min={0}
                        max={100}
                        inputMode="decimal"
                      />
                    </Form.Item>
                  </Col>

                  <Col flex="0 0 20%">
                    <Form.Item
                      name="chi_phi"
                      label="Chi phí vận chuyển"
                      rules={[
                        {
                          required: true,
                          message:
                            "Chi phí không được bỏ trống!",
                        },
                      ]}
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        placeholder="Nhập chi phí vận chuyển"
                        disabled={d("chi_phi")}
                        style={{ width: "100%" }}
                        addonAfter="đ"
                        formatter={formatter}
                        parser={parser}
                        min={0}
                        inputMode="numeric"
                      />
                    </Form.Item>
                  </Col>

                  <Col flex="0 0 20%">
                    <Form.Item
                      name="tax_mode"
                      label="Thuế"
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        options={TAX_MODE_OPTIONS as any}
                        placeholder="Chọn"
                        disabled={d("tax_mode")}
                        getPopupContainer={(trigger) =>
                          (trigger &&
                            trigger.closest(".ant-modal")) ||
                          document.body
                        }
                        dropdownMatchSelectWidth={false}
                        popupClassName="phg-dd"
                        onChange={(v) => {
                          if (v !== 1) {
                            form.setFieldsValue({
                              vat_rate: undefined,
                            });
                          } else {
                            form.setFieldsValue({ vat_rate: 8 });
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>

                  {Number(taxMode) === 1 ? (
                    <Col flex="0 0 20%">
                      <Form.Item
                        name="vat_rate"
                        label="VAT (%)"
                        initialValue={8}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          disabled={
                            d("vat_rate") ||
                            Number(taxMode) !== 1
                          }
                          style={{ width: "100%" }}
                          addonAfter="%"
                          min={0}
                          max={20}
                          step={0.5}
                          inputMode="decimal"
                        />
                      </Form.Item>
                    </Col>
                  ) : (
                    <Col flex="0 0 20%" />
                  )}
                </Row>
              </Col>

              {/* ===== HÀNG 2: LOẠI THANH TOÁN / ĐÃ THANH TOÁN ===== */}
              <Col span={24}>
                <Row
                  gutter={[16, 8]}
                  align="middle"
                  wrap={false}
                  style={{ marginTop: 8 }}
                >
                  <Col flex="0 0 33.33%">
                    <div style={{ height: 56 }} />
                  </Col>

                  <Col flex="0 0 320px">
                    <Form.Item
                      name="loai_thanh_toan"
                      label={
                        <span style={{ whiteSpace: "nowrap" }}>
                          Loại thanh toán
                        </span>
                      }
                      rules={[
                        {
                          required: true,
                          message:
                            "Loại thanh toán không được bỏ trống!",
                        },
                      ]}
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        options={OPTIONS_LOAI_THANH_TOAN}
                        placeholder="Chọn loại thanh toán"
                        disabled={d("loai_thanh_toan")}
                        getPopupContainer={(trigger) =>
                          (trigger &&
                            trigger.closest(".ant-modal")) ||
                          document.body
                        }
                        dropdownMatchSelectWidth={false}
                        popupClassName="phg-dd"
                      />
                    </Form.Item>
                  </Col>

                  <Col flex="1 1 33.33%">
                    {loaiThanhToan ===
                    OPTIONS_LOAI_THANH_TOAN[1].value ? (
                      <Form.Item
                        name="so_tien_da_thanh_toan"
                        label="Số tiền đã thanh toán"
                        style={{ marginBottom: 0 }}
                        rules={[
                          {
                            required: true,
                            message:
                              "Số tiền đã thanh toán không được bỏ trống!",
                          },
                          () => ({
                            validator(_, val) {
                              const max =
                                Number(grandTotal || 0);
                              const num = Number(val || 0);
                              return num >= 0 && num <= max
                                ? Promise.resolve()
                                : Promise.reject(
                                    new Error(
                                      `Tối đa ${formatter(
                                        max
                                      )} đ`
                                    )
                                  );
                            },
                          }),
                        ]}
                      >
                        <InputNumber
                          placeholder="Nhập số tiền đã thanh toán"
                          disabled={d("so_tien_da_thanh_toan")}
                          style={{ width: "100%" }}
                          addonAfter="đ"
                          formatter={formatter}
                          parser={parser}
                          min={0}
                          inputMode="numeric"
                        />
                      </Form.Item>
                    ) : (
                      <div style={{ height: 56 }} />
                    )}
                  </Col>
                </Row>
              </Col>

              {/* ===== HÀNG 3: Tổng & Còn lại ===== */}
              <Col span={24}>
                <Row
                  gutter={[16, 8]}
                  align="middle"
                  wrap={false}
                  style={{ marginTop: 8 }}
                >
                  <Col flex="0 0 50%">
                    <div style={{ textAlign: "left" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          marginBottom: 6,
                        }}
                      >
                        Tổng tiền thanh toán
                      </div>
                      <div style={{ fontSize: 20 }}>
                        {formatter(grandTotal) || 0} đ
                      </div>
                    </div>
                  </Col>

                  <Col flex="0 0 50%">
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          marginBottom: 6,
                        }}
                      >
                        Tổng tiền thanh toán còn lại
                      </div>
                      <div style={{ fontSize: 20 }}>
                        {formatter(tongConLai) || 0} đ
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>

              {/* Hàng thông tin thu thực tế + nút đồng bộ phiếu thu */}
              <Col span={24}>
                <Row align="middle" gutter={[10, 10]}>
                  <Col flex="auto">
                    <Typography.Text type="secondary">
                      <b>Tổng đã thu (thực tế)</b>:{" "}
                      {formatter(soTienDaThanhToan)} đ
                    </Typography.Text>
                  </Col>
                  <Col>
                    <Tooltip title="Đồng bộ lại phiếu thu theo mã báo giá (server sẽ tự cân)">
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleResync}
                        disabled={!form.getFieldValue("ma_don_hang")}
                      >
                        Đồng bộ phiếu thu
                      </Button>
                    </Tooltip>
                  </Col>
                </Row>
              </Col>

              <Col span={24}>
                <Form.Item name="ghi_chu" label="Ghi chú">
                  <Input.TextArea
                    placeholder="Ghi chú"
                    disabled={d("ghi_chu")}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </>
      )}

      {/* ========== MODE WIZARD 7 BƯỚC (Thêm mới) ========== */}
      {isWizard && (
        <>
          {/* STEP 1: Thông tin khách hàng & sự kiện (giống block trên, chỉ hiển thị khi stepMode=1) */}
          <div
            style={{
              display: stepMode === 1 ? "block" : "none",
              width: "100%",
            }}
          >
            {/* Tái sử dụng đúng block Step 1 ở trên (copy để tránh phá logic cũ) */}
            <Row gutter={[10, 10]}>
              {/* ==== MÃ & NGÀY TẠO BÁO GIÁ ==== */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="ma_don_hang"
                  label="Mã báo giá"
                  rules={[]}
                >
                  <Input
                    placeholder="Tự sinh sau khi lưu"
                    disabled
                  />
                </Form.Item>
              </Col>

              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="ngay_tao_don_hang"
                  label="Ngày tạo báo giá"
                  rules={[
                    {
                      required: true,
                      message:
                        "Ngày tạo báo giá không được bỏ trống!",
                    },
                  ]}
                  initialValue={dayjs()}
                >
                  <DatePicker
                    placeholder="Nhập ngày tạo báo giá"
                    style={{ width: "100%" }}
                    format="DD/MM/YYYY"
                    disabled={d("ngay_tao_don_hang")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                  />
                </Form.Item>
              </Col>

              {/* Loại khách hàng */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="loai_khach_hang"
                  label="Loại khách hàng"
                  rules={[
                    {
                      required: true,
                      message:
                        "Loại khách hàng không được bỏ trống!",
                    },
                  ]}
                  initialValue={0}
                >
                  <Select
                    options={LOAI_KHACH_HANG_OPTIONS}
                    placeholder="Chọn loại khách hàng"
                    disabled={d("loai_khach_hang")}
                    getPopupContainer={(trigger) =>
                      (trigger &&
                        trigger.closest(".ant-modal")) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Form.Item>
              </Col>

              {/* TRẠNG THÁI BÁO GIÁ */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="trang_thai_don_hang"
                  label="Trạng thái báo giá"
                  rules={[]}
                  initialValue={0}
                >
                  <Select
                    options={BAO_GIA_STATUS_OPTIONS}
                    placeholder="Chọn trạng thái báo giá"
                    disabled={d("trang_thai_don_hang")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Form.Item>
              </Col>

              {/* KH hệ thống */}
              {loaiKhachHang ===
                LOAI_KHACH_HANG_OPTIONS[0].value && (
                <>
                  <Col
                    span={8}
                    xs={24}
                    sm={24}
                    md={24}
                    lg={8}
                    xl={8}
                  >
                    {khachHangDisplay ? (
                      <Form.Item
                        name="khach_hang_display"
                        label="Khách hàng"
                      >
                        <Input
                          placeholder="Khách hàng"
                          disabled
                        />
                      </Form.Item>
                    ) : (
                      <SelectFormApi
                        name="khach_hang_id"
                        label="Khách hàng"
                        path={
                          API_ROUTE_CONFIG.KHACH_HANG +
                          "/options"
                        }
                        placeholder="Chọn khách hàng"
                        rules={[
                          {
                            required:
                              loaiKhachHang ===
                              LOAI_KHACH_HANG_OPTIONS[0].value,
                            message:
                              "Khách hàng không được bỏ trống!",
                          },
                        ]}
                        disabled={d("khach_hang_id")}
                        getPopupContainer={(trigger) =>
                          (trigger &&
                            trigger.closest(".ant-modal")) ||
                          document.body
                        }
                        dropdownMatchSelectWidth={false}
                        popupClassName="phg-dd"
                      />
                    )}
                  </Col>

                  {/* Hạng khách hàng */}
                  <Col
                    span={8}
                    xs={24}
                    sm={24}
                    md={24}
                    lg={8}
                    xl={8}
                  >
                    <Form.Item
                      name="loai_khach_hang_ten"
                      label="Loại khách hàng"
                    >
                      <Input
                        placeholder="Tự động theo khách hàng"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                </>
              )}

              {/* KH vãng lai */}
              {loaiKhachHang ===
                LOAI_KHACH_HANG_OPTIONS[1].value && (
                <>
                  <Col
                    span={8}
                    xs={24}
                    sm={24}
                    md={24}
                    lg={8}
                    xl={8}
                  >
                    <Form.Item
                      name="ten_khach_hang"
                      label="Tên khách hàng"
                      rules={[
                        {
                          required:
                            loaiKhachHang ===
                            LOAI_KHACH_HANG_OPTIONS[1].value,
                          message:
                            "Tên khách hàng không được bỏ trống!",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Nhập tên khách hàng"
                        disabled={d("ten_khach_hang")}
                      />
                    </Form.Item>
                  </Col>
                  <Col
                    span={8}
                    xs={24}
                    sm={24}
                    md={24}
                    lg={8}
                    xl={8}
                  >
                    <Form.Item
                      name="so_dien_thoai"
                      label="Số điện thoại"
                      rules={[
                        {
                          required:
                            loaiKhachHang ===
                            LOAI_KHACH_HANG_OPTIONS[1].value,
                          message:
                            "Số điện thoại không được bỏ trống!",
                        },
                        {
                          pattern: phoneNumberVNPattern,
                          message:
                            "Số điện thoại không hợp lệ!",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Nhập số điện thoại"
                        disabled={d("so_dien_thoai")}
                      />
                    </Form.Item>
                  </Col>
                </>
              )}

              {/* KH Agency */}
              {loaiKhachHang ===
                LOAI_KHACH_HANG_OPTIONS[2].value && (
                <Col
                  span={8}
                  xs={24}
                  sm={24}
                  md={24}
                  lg={8}
                  xl={8}
                >
                  <SelectFormApi
                    name="khach_hang_id"
                    label="Khách hàng Agency"
                    path={
                      API_ROUTE_CONFIG.KHACH_HANG_PASS_CTV +
                      "/options"
                    }
                    placeholder="Chọn khách hàng Agency"
                    rules={[
                      {
                        required:
                          loaiKhachHang ===
                          LOAI_KHACH_HANG_OPTIONS[2].value,
                        message:
                          "Khách hàng không được bỏ trống!",
                      },
                    ]}
                    disabled={d("khach_hang_id")}
                    getPopupContainer={(trigger) =>
                      (trigger &&
                        trigger.closest(".ant-modal")) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Col>
              )}

              {/* Địa chỉ liên hệ / billing */}
              <Col
                span={16}
                xs={24}
                sm={24}
                md={24}
                lg={16}
                xl={16}
              >
                <Form.Item
                  name="dia_chi_giao_hang"
                  label="Địa chỉ liên hệ / xuất hóa đơn"
                  rules={[
                    {
                      required: true,
                      message:
                        "Địa chỉ không được bỏ trống!",
                    },
                  ]}
                >
                  <Input
                    placeholder="Nhập địa chỉ liên hệ / xuất hóa đơn"
                    disabled={d("dia_chi_giao_hang")}
                  />
                </Form.Item>
              </Col>

              {/* THÔNG TIN NGƯỜI NHẬN */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="nguoi_nhan_ten"
                  label="Tên người nhận"
                  rules={[{ max: 191, message: "Tối đa 191 ký tự" }]}
                >
                  <Input
                    placeholder="Nhập tên người nhận"
                    disabled={d("nguoi_nhan_ten")}
                  />
                </Form.Item>
              </Col>

              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="nguoi_nhan_sdt"
                  label="SĐT người nhận"
                  rules={[
                    { max: 20, message: "Tối đa 20 ký tự" },
                    {
                      pattern: phoneNumberVNPattern,
                      message:
                        "Số điện thoại không hợp lệ!",
                    },
                  ]}
                >
                  <Input
                    placeholder="Nhập số điện thoại người nhận (0… hoặc +84…)"
                    disabled={d("nguoi_nhan_sdt")}
                  />
                </Form.Item>
              </Col>

              {/* Ngày giờ tổ chức */}
              <Col
                span={8}
                xs={24}
                sm={24}
                md={24}
                lg={8}
                xl={8}
              >
                <Form.Item
                  name="nguoi_nhan_thoi_gian"
                  label="Ngày giờ tổ chức"
                  rules={[
                    {
                      required: true,
                      message:
                        "Ngày giờ tổ chức không được bỏ trống!",
                    },
                  ]}
                  getValueProps={(value) => {
                    if (!value) return { value };
                    const djs =
                      typeof value === "string" ||
                      typeof value === "number"
                        ? dayjs(value)
                        : value;
                    return {
                      value: djs?.isValid?.() ? djs : undefined,
                    };
                  }}
                  getValueFromEvent={(value) => value}
                >
                  <DatePicker
                    placeholder="Chọn ngày giờ tổ chức"
                    style={{ width: "100%" }}
                    showTime
                    format={CLIENT_DATETIME_FORMAT}
                    disabled={d("nguoi_nhan_thoi_gian")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                  />
                </Form.Item>
              </Col>

              {/* ===== THÔNG TIN SỰ KIỆN ===== */}
              <Col span={24}>
                <Typography.Title
                  level={5}
                  style={{ marginTop: 16 }}
                >
                  Thông tin sự kiện
                </Typography.Title>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="project_name"
                  label="Tên dự án / sự kiện"
                >
                  <Input
                    placeholder="Nhập tên dự án / sự kiện"
                    disabled={d("project_name")}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="event_type"
                  label="Loại sự kiện"
                >
                  <Input
                    placeholder="VD: Khai trương, Hội nghị, Tiệc cưới..."
                    disabled={d("event_type")}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="event_start"
                  label="Thời gian bắt đầu sự kiện"
                >
                  <DatePicker
                    placeholder="Chọn thời gian bắt đầu"
                    showTime
                    format={CLIENT_DATETIME_FORMAT}
                    style={{ width: "100%" }}
                    disabled={d("event_start")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="event_end"
                  label="Thời gian kết thúc sự kiện"
                >
                  <DatePicker
                    placeholder="Chọn thời gian kết thúc"
                    showTime
                    format={CLIENT_DATETIME_FORMAT}
                    style={{ width: "100%" }}
                    disabled={d("event_end")}
                    getPopupContainer={(node) =>
                      (node && node.closest(".ant-modal")) ||
                      document.body
                    }
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="guest_count"
                  label="Số lượng khách dự kiến"
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="Nhập số khách"
                    disabled={d("guest_count")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="venue_name"
                  label="Địa điểm / Nhà hàng"
                >
                  <Input
                    placeholder="Tên địa điểm, nhà hàng, khách sạn..."
                    disabled={d("venue_name")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="venue_address"
                  label="Địa chỉ tổ chức"
                >
                  <Input
                    placeholder="Địa chỉ chi tiết nơi tổ chức sự kiện"
                    disabled={d("venue_address")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_name"
                  label="Người liên hệ chính"
                >
                  <Input
                    placeholder="VD: Chị Lan - Marketing"
                    disabled={d("contact_name")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_phone"
                  label="SĐT người liên hệ"
                  rules={[
                    { max: 50, message: "Tối đa 50 ký tự" },
                    {
                      pattern: phoneNumberVNPattern,
                      message:
                        "Số điện thoại không hợp lệ!",
                    },
                  ]}
                >
                  <Input
                    placeholder="Nhập số điện thoại liên hệ"
                    disabled={d("contact_phone")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_email"
                  label="Email người liên hệ"
                  rules={[{ type: "email", message: "Email không hợp lệ" }]}
                >
                  <Input
                    placeholder="Nhập email liên hệ"
                    disabled={d("contact_email")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_department"
                  label="Phòng ban"
                >
                  <Input
                    placeholder="VD: Phòng Marketing, HR..."
                    disabled={d("contact_department")}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="contact_position"
                  label="Chức vụ"
                >
                  <Input
                    placeholder="VD: Trưởng phòng, Manager..."
                    disabled={d("contact_position")}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* STEP 2–6: Báo giá theo nhóm dịch vụ (NS/CSVC/TIEC/TD/CPK) */}
          {/* Step 2: Nhân sự (NS) */}
   <div
  style={{
    display: stepMode === 2 ? "block" : "none",
    width: "100%",
  }}
>
  <Row gutter={[10, 10]}>
    <Col span={24}>
      <DanhSachSanPham
        form={form}
        isDetail={isDetail || !can("danh_sach_san_pham")}
        sectionGroupCode="NS"
        sectionLabel="Nhân sự"
      />
    </Col>
  </Row>
</div>


          {/* Step 3: Cơ sở vật chất (CSVC) */}
<div
  style={{
    display: stepMode === 3 ? "block" : "none",
    width: "100%",
  }}
>
  <Row gutter={[10, 10]}>
    <Col span={24}>
      <DanhSachSanPham
        form={form}
        isDetail={isDetail || !can("danh_sach_san_pham")}
        sectionGroupCode="CSVC"
        sectionLabel="Cơ sở vật chất"
      />
    </Col>
  </Row>
</div>


          {/* Step 4: Tiệc (TIEC) */}
          <div
            style={{
              display: stepMode === 4 ? "block" : "none",
              width: "100%",
            }}
          >
            <Row gutter={[10, 10]}>
              <Col span={24}>
                <DanhSachSanPham
                  form={form}
                  isDetail={isDetail || !can("danh_sach_san_pham")}
                  sectionGroupCode="TIEC"
                  sectionLabel="Tiệc"
                />
              </Col>
            </Row>
          </div>


          {/* Step 5: Thuê địa điểm (TD) */}
          <div
            style={{
              display: stepMode === 5 ? "block" : "none",
              width: "100%",
            }}
          >
            <Row gutter={[10, 10]}>
              <Col span={24}>
                <DanhSachSanPham
                  form={form}
                  isDetail={isDetail || !can("danh_sach_san_pham")}
                  sectionGroupCode="TD"
                  sectionLabel="Địa điểm / Thuê địa điểm"
                />
              </Col>
            </Row>
          </div>


          {/* Step 6: Chi phí khác (CPK) */}
          <div
            style={{
              display: stepMode === 6 ? "block" : "none",
              width: "100%",
            }}
          >
            <Row gutter={[10, 10]}>
              <Col span={24}>
                <DanhSachSanPham
                  form={form}
                  isDetail={isDetail || !can("danh_sach_san_pham")}
                  sectionGroupCode="CPK"
                  sectionLabel="Chi phí khác"
                />
              </Col>
            </Row>
          </div>


                    {/* STEP 7: Giảm giá, Chi phí quản lý (%), Thuế, Thanh toán, Ghi chú */}
          <div
            style={{
              display: stepMode === 7 ? "block" : "none",
              width: "100%",
            }}
          >
            <Row gutter={[10, 10]}>
              {/* HÀNG 1: Giảm giá / Giảm giá thành viên / Chi phí quản lý / Thuế / VAT */}
              <Col span={24}>
                <Row gutter={[16, 8]} align="middle" wrap={false}>
                  <Col flex="0 0 20%">
                    <Form.Item
                      name="giam_gia"
                      label="Giảm giá"
                      rules={[
                        {
                          required: true,
                          message: "Giảm giá không được bỏ trống!",
                        },
                      ]}
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        placeholder="Nhập giảm giá"
                        disabled={d("giam_gia")}
                        style={{ width: "100%" }}
                        addonAfter="đ"
                        formatter={formatter}
                        parser={parser}
                        min={0}
                        inputMode="numeric"
                      />
                    </Form.Item>
                  </Col>

                  <Col flex="0 0 20%">
                    <Form.Item
                      name="giam_gia_thanh_vien"
                      label="Giảm giá thành viên (%)"
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        disabled
                        style={{ width: "100%" }}
                        addonAfter="%"
                        min={0}
                        max={100}
                        inputMode="decimal"
                      />
                    </Form.Item>
                  </Col>

                  <Col flex="0 0 20%">
                    <Form.Item
                      name="management_fee_percent"
                      label="Chi phí quản lý (%)"
                      initialValue={10}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        // Cho phép chỉnh % quản lý (0..100)
                        disabled={d("chi_phi")}
                        style={{ width: "100%" }}
                        addonAfter="%"
                        min={0}
                        max={100}
                        inputMode="decimal"
                      />
                    </Form.Item>
                  </Col>

                  <Col flex="0 0 20%">
                    <Form.Item
                      name="chi_phi"
                      label="Chi phí quản lý (VND)"
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        placeholder="Tự động = % × Tổng hạng mục"
                        disabled
                        style={{ width: "100%" }}
                        addonAfter="đ"
                        formatter={formatter}
                        parser={parser}
                        min={0}
                        inputMode="numeric"
                      />
                    </Form.Item>
                  </Col>

                  <Col flex="0 0 20%">
                    <Form.Item
                      name="tax_mode"
                      label="Thuế"
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        options={TAX_MODE_OPTIONS as any}
                        placeholder="Chọn"
                        disabled={d("tax_mode")}
                        getPopupContainer={(trigger) =>
                          (trigger && trigger.closest(".ant-modal")) || document.body
                        }
                        dropdownMatchSelectWidth={false}
                        popupClassName="phg-dd"
                        onChange={(v) => {
                          if (v !== 1) {
                            form.setFieldsValue({ vat_rate: undefined });
                          } else {
                            form.setFieldsValue({ vat_rate: 8 });
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>

                  {Number(taxMode) === 1 ? (
                    <Col flex="0 0 20%">
                      <Form.Item
                        name="vat_rate"
                        label="VAT (%)"
                        initialValue={8}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          disabled={d("vat_rate") || Number(taxMode) !== 1}
                          style={{ width: "100%" }}
                          addonAfter="%"
                          min={0}
                          max={20}
                          step={0.5}
                          inputMode="decimal"
                        />
                      </Form.Item>
                    </Col>
                  ) : (
                    <Col flex="0 0 20%" />
                  )}
                </Row>
              </Col>

              {/* HÀNG 2: Loại thanh toán / Đã thanh toán */}
              <Col span={24}>
                <Row
                  gutter={[16, 8]}
                  align="middle"
                  wrap={false}
                  style={{ marginTop: 8 }}
                >
                  <Col flex="0 0 33.33%">
                    <div style={{ height: 56 }} />
                  </Col>

                  <Col flex="0 0 320px">
                    <Form.Item
                      name="loai_thanh_toan"
                      label={
                        <span style={{ whiteSpace: "nowrap" }}>
                          Loại thanh toán
                        </span>
                      }
                      rules={[
                        {
                          required: true,
                          message:
                            "Loại thanh toán không được bỏ trống!",
                        },
                      ]}
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        options={OPTIONS_LOAI_THANH_TOAN}
                        placeholder="Chọn loại thanh toán"
                        disabled={d("loai_thanh_toan")}
                        getPopupContainer={(trigger) =>
                          (trigger && trigger.closest(".ant-modal")) ||
                          document.body
                        }
                        dropdownMatchSelectWidth={false}
                        popupClassName="phg-dd"
                      />
                    </Form.Item>
                  </Col>

                  <Col flex="1 1 33.33%">
                    {loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[1].value ? (
                      <Form.Item
                        name="so_tien_da_thanh_toan"
                        label="Số tiền đã thanh toán"
                        style={{ marginBottom: 0 }}
                        rules={[
                          {
                            required: true,
                            message:
                              "Số tiền đã thanh toán không được bỏ trống!",
                          },
                          () => ({
                            validator(_, val) {
                              const max = Number(grandTotal || 0);
                              const num = Number(val || 0);
                              return num >= 0 && num <= max
                                ? Promise.resolve()
                                : Promise.reject(
                                    new Error(`Tối đa ${formatter(max)} đ`),
                                  );
                            },
                          }),
                        ]}
                      >
                        <InputNumber
                          placeholder="Nhập số tiền đã thanh toán"
                          disabled={d("so_tien_da_thanh_toan")}
                          style={{ width: "100%" }}
                          addonAfter="đ"
                          formatter={formatter}
                          parser={parser}
                          min={0}
                          inputMode="numeric"
                        />
                      </Form.Item>
                    ) : (
                      <div style={{ height: 56 }} />
                    )}
                  </Col>
                </Row>
              </Col>

              {/* HÀNG 3: Tổng & Còn lại */}
              <Col span={24}>
                <Row
                  gutter={[16, 8]}
                  align="middle"
                  wrap={false}
                  style={{ marginTop: 8 }}
                >
                  <Col flex="0 0 50%">
                    <div style={{ textAlign: "left" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          marginBottom: 6,
                        }}
                      >
                        Tổng tiền thanh toán
                      </div>
                      <div style={{ fontSize: 20 }}>
                        {formatter(grandTotal) || 0} đ
                      </div>
                    </div>
                  </Col>

                  <Col flex="0 0 50%">
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          marginBottom: 6,
                        }}
                      >
                        Tổng tiền thanh toán còn lại
                      </div>
                      <div style={{ fontSize: 20 }}>
                        {formatter(tongConLai) || 0} đ
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>

              {/* Hàng thông tin thu thực tế + nút đồng bộ phiếu thu */}
              <Col span={24}>
                <Row align="middle" gutter={[10, 10]}>
                  <Col flex="auto">
                    <Typography.Text type="secondary">
                      <b>Tổng đã thu (thực tế)</b>:{" "}
                      {formatter(soTienDaThanhToan)} đ
                    </Typography.Text>
                  </Col>
                  <Col>
                    <Tooltip title="Đồng bộ lại phiếu thu theo mã báo giá (server sẽ tự cân)">
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleResync}
                        disabled={!form.getFieldValue("ma_don_hang")}
                      >
                        Đồng bộ phiếu thu
                      </Button>
                    </Tooltip>
                  </Col>
                </Row>
              </Col>

              {/* Ghi chú */}
              <Col span={24}>
                <Form.Item name="ghi_chu" label="Ghi chú">
                  <Input.TextArea
                    placeholder="Ghi chú"
                    disabled={d("ghi_chu")}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>


          


          {/* STEP 8: Tuỳ biến Hạng mục (nhóm gói), Ghi chú & Người báo giá */}
          <div
            style={{
              display: stepMode === 8 ? "block" : "none",
              width: "100%",
            }}
          >
            <Row gutter={[10, 10]}>
              <Col span={24}>
                <Typography.Title level={5} style={{ marginBottom: 12 }}>
                  Tuỳ biến Hạng mục (nhóm gói), Ghi chú & Người báo giá
                </Typography.Title>
              </Col>

              {/* ===== HẠNG MỤC (NHÓM GÓI) ===== */}
              <Col span={24}>
                <Typography.Text strong>
                  Hạng mục (nhóm gói) hiển thị ở cột HẠNG MỤC trên báo giá
                </Typography.Text>
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginBottom: 8 }}
                >
                  Mỗi dòng tương ứng 1 Hạng mục gốc. Nếu Hạng mục gốc trùng với
                  giá trị hệ thống (VD: &quot;Âm thanh&quot;, &quot;Chi phí lắp đặt
                  thiết bị&quot;, ...), hệ thống sẽ dùng tên anh em nhập để hiển thị
                  trên PDF cho tất cả gói thuộc Hạng mục đó (chỉ áp dụng cho báo
                  giá này).
                </Typography.Paragraph>

                {/* quote_category_titles: array[{ key, label }] */}
                <Form.List name="quote_category_titles">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <Row
                          key={field.key}
                          gutter={8}
                          style={{ marginBottom: 8 }}
                        >
                          <Col span={8}>
                            <Form.Item
                              {...field}
                              name={[field.name, "key"]}
                              label="Hạng mục gốc"
                            >
                              <Input
                                placeholder='VD: Âm thanh, Chi phí lắp đặt thiết bị, Chi phí vận chuyển thiết bị...'
                              />
                            </Form.Item>
                          </Col>
                          <Col span={14}>
                            <Form.Item
                              {...field}
                              name={[field.name, "label"]}
                              label="Tên hiển thị trên báo giá"
                            >
                              <Input
                                placeholder="VD: Hệ thống âm thanh khu A, Lắp đặt & tháo dỡ hệ thống..."
                              />
                            </Form.Item>
                          </Col>
                          <Col
                            span={2}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginTop: 22,
                            }}
                          >
                            <Button
                              type="text"
                              danger
                              onClick={() => remove(field.name)}
                            >
                              Xoá
                            </Button>
                          </Col>
                        </Row>
                      ))}

                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                      >
                        Thêm Hạng mục
                      </Button>
                    </>
                  )}
                </Form.List>
              </Col>

              {/* ===== GHI CHÚ CUỐI BÁO GIÁ ===== */}
              <Col span={24}>
                <Form.Item
                  name="quote_footer_note"
                  label="Ghi chú / phần đuôi báo giá"
                >
                  <Input.TextArea
                    rows={4}
                    placeholder={
                      "VD:\n- Giá trên đã bao gồm toàn bộ chi phí nhân sự và trang thiết bị theo mô tả trong bảng báo giá.\n- Giá chưa bao gồm thuế VAT (nếu có thoả thuận khác sẽ ghi rõ trong hợp đồng).\n- Báo giá có hiệu lực đến ngày ..."
                    }
                  />
                </Form.Item>
              </Col>

              {/* ===== NGƯỜI BÁO GIÁ / XÁC NHẬN BÁO GIÁ ===== */}
              <Col span={24}>
                <Typography.Title
                  level={5}
                  style={{ marginTop: 8, marginBottom: 8 }}
                >
                  Thông tin Người báo giá / Xác nhận báo giá
                </Typography.Title>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="quote_signer_name"
                  label="Tên người báo giá"
                >
                  <Input placeholder="VD: Trần Tấn Phát" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="quote_signer_title"
                  label="Chức danh người báo giá"
                >
                  <Input placeholder="VD: Phụ trách kinh doanh" />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="quote_signer_phone"
                  label="Điện thoại người báo giá"
                >
                  <Input placeholder="Nếu bỏ trống sẽ dùng số điện thoại công ty" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="quote_signer_email"
                  label="Email người báo giá"
                  rules={[{ type: "email", message: "Email không hợp lệ" }]}
                >
                  <Input placeholder="Nếu bỏ trống sẽ dùng email công ty" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="quote_approver_note"
                  label='Nội dung trong ô "XÁC NHẬN BÁO GIÁ"'
                >
                  <Input placeholder='VD: Đại diện khách hàng, Trưởng phòng mua hàng...' />
                </Form.Item>
              </Col>
            </Row>
          </div>

        </>
      )}


    </Row>
  );
};

export default FormQuanLyBanHang;
