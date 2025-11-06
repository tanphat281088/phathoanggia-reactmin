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
import { ReloadOutlined } from "@ant-design/icons";
import { formatter, parser } from "../../utils/utils";
import SelectFormApi from "../../components/select/SelectFormApi";
import { donHangTrangThaiSelect } from "../../configs/select-config";

// ❌ Bỏ generateMaPhieu vì mã được BE tự sinh
// import { generateMaPhieu } from "../../helpers/funcHelper";
import dayjs from "dayjs";
import {
  OPTIONS_LOAI_KHACH_HANG,
  OPTIONS_LOAI_THANH_TOAN,
} from "../../utils/constant";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

/* ✅ FIX import: dùng default import đúng chuẩn */
import DanhSachSanPham from "./components/DanhSachSanPham";

import { useCallback, useEffect, useMemo, useState } from "react";
import { phoneNumberVNPattern } from "../../utils/patterns";


/** ====== BỔ SUNG: Định dạng ngày–giờ chuẩn ====== */
const CLIENT_DATETIME_FORMAT = "DD/MM/YYYY HH:mm";
const SERVER_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
/** =============================================== */

/** ====== THUẾ: 0=Không thuế (mặc định), 1=Có VAT ====== */
const TAX_MODE_OPTIONS = [
  { label: "Không thuế", value: 0 },
  { label: "Có thuế", value: 1 },
] as const;

const FormQuanLyBanHang = ({
  form,
  isDetail = false,
}: {
  form: FormInstance;
  isDetail?: boolean;
}) => {
  const loaiKhachHang = Form.useWatch("loai_khach_hang", form);
  const loaiThanhToan = Form.useWatch("loai_thanh_toan", form);

  const [tongTienHang, setTongTienHang] = useState<number>(0);

  // Theo dõi thay đổi trong danh sách sản phẩm
  const danhSachSanPham = Form.useWatch("danh_sach_san_pham", form) || [];

  // Nếu không có danh sách SP, nạp tổng tiền từ DB vào state để công thức hiển thị
// Nếu không có danh sách SP thì nạp tổng tiền từ DB để công thức hiển thị số
useEffect(() => {
  const dbTotal = Number(form.getFieldValue("tong_tien_hang") || 0);
  if ((!danhSachSanPham || danhSachSanPham.length === 0) && dbTotal > 0) {
    setTongTienHang(dbTotal);
  }
}, [form, danhSachSanPham]);



  /** ---------------- GIỮ BIẾN CŨ (tương thích ngược) ---------------- */
  // ĐƠN GIÁ ĐÃ GỒM VAT → KHÔNG dùng VAT (logic cũ)
  const chiPhi = Form.useWatch("chi_phi", form) || 0;
  const giamGia = Form.useWatch("giam_gia", form) || 0;

  // Tổng tiền thanh toán (CŨ) = Tổng hàng - Giảm giá + Chi phí (kẹp ≥ 0)
  // (Vẫn giữ để không phá những chỗ có thể đang dùng biến này trong UI khác)
  const tongTienThanhToan = useMemo(() => {
    const tong = (tongTienHang || 0) - (giamGia || 0) + (chiPhi || 0);
    return Math.max(0, tong);
  }, [tongTienHang, chiPhi, giamGia]);

  /** ---------------- THUẾ (MỚI) ---------------- */
  // Thuế (mặc định KHÔNG THUẾ để giữ y như cũ)
  const taxMode = Form.useWatch("tax_mode", form) ?? 0; // 0|1
  const vatRate = Form.useWatch("vat_rate", form);      // %

  // Subtotal = Tổng hàng - Giảm giá + Chi phí (kẹp ≥ 0)
  const subtotal = useMemo(() => {
    const tong = (tongTienHang || 0) - (giamGia || 0) + (chiPhi || 0);
    return Math.max(0, tong);
  }, [tongTienHang, chiPhi, giamGia]);

  // VAT chỉ áp dụng khi tax_mode=1 và vat_rate hợp lệ
  const vatAmount = useMemo(() => {
    if (Number(taxMode) !== 1) return 0;
    const rate = Number(vatRate ?? 0);
    if (!(rate > 0)) return 0;
    return Math.round(subtotal * rate / 100);
  }, [taxMode, vatRate, subtotal]);

  // Tổng tiền thanh toán cuối cùng
  const grandTotal = useMemo(() => {
    if (Number(taxMode) === 1) return subtotal + vatAmount;
    // giữ hành vi cũ khi Không thuế
    return subtotal;
  }, [taxMode, subtotal, vatAmount]);

  // Theo dõi số tiền đã thanh toán để tính "còn lại"
  const soTienDaThanhToan = Form.useWatch("so_tien_da_thanh_toan", form) || 0;

  // Đồng bộ giá trị "đã thanh toán" theo loại thanh toán
  useEffect(() => {
    if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[0].value) {
      // 0 = Chưa thanh toán
      form.setFieldsValue({ so_tien_da_thanh_toan: 0 });
    } else if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[2].value) {
      // 2 = Thanh toán toàn bộ
      form.setFieldsValue({ so_tien_da_thanh_toan: grandTotal || 0 });
    }
  }, [loaiThanhToan, grandTotal, form]);

  // Tính số tiền còn lại (kẹp ≥ 0) — phụ thuộc trực tiếp vào loại thanh toán
  const tongConLai = useMemo(() => {
    if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[0].value) {
      // 0 = Chưa thanh toán
      return Math.max(0, grandTotal || 0);
    }
    if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[2].value) {
      // 2 = Thanh toán toàn bộ
      return 0;
    }
    // 1 = Thanh toán một phần
    const remain = (grandTotal || 0) - (soTienDaThanhToan || 0);
    return Math.max(0, remain);
  }, [loaiThanhToan, grandTotal, soTienDaThanhToan]);

  // Tính toán tổng tiền cho từng sản phẩm
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

  // Tính tổng tiền hàng từ calculated products
  const calculatedTongTienHang = useMemo(() => {
    return calculatedProducts.reduce((tong, item) => {
      return tong + (item.tongTien || 0);
    }, 0);
  }, [calculatedProducts]);

  // Update form values khi có thay đổi trong calculations
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

  // Effect để update form values với debounce nhẹ
// Effect để update form values với debounce nhẹ
useEffect(() => {
  const timer = setTimeout(() => {
    updateFormValues();
    // ❗ Không ghi đè tổng từ DB khi danh_sach_san_pham đang rỗng
    if (Array.isArray(danhSachSanPham) && danhSachSanPham.length > 0) {
      setTongTienHang(calculatedTongTienHang);
    }
  }, 50);
  return () => clearTimeout(timer);
}, [updateFormValues, calculatedTongTienHang, danhSachSanPham]);


  // ====== Re-sync phiếu thu theo mã đơn ngay trong form ======
  const webBaseUrl = useMemo(() => {
    // nếu có ENV VITE_WEB_BASE_URL thì dùng; mặc định 8000 là Laravel
    return (import.meta as any).env?.VITE_WEB_BASE_URL ?? "https://api.phgfloral.com";
  }, []);

  const handleResync = async () => {
    const code: string = form.getFieldValue("ma_don_hang");
    if (!code) {
      message.warning("Chưa có mã đơn hàng để đồng bộ.");
      return;
    }
    const url = `${webBaseUrl}/admin/thu-chi/re-sync-by-code/${encodeURIComponent(
      code
    )}`;
    try {
      const resp = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      if (!resp.ok) {
        window.open(url, "_blank");
        message.info("Đã mở tab đồng bộ, vui lòng kiểm tra.");
        return;
      }
      const data = (await resp.json()) as { success?: boolean; message?: string };
      if (data?.success) {
        message.success(data.message || "Đồng bộ phiếu thu thành công.");
      } else {
        message.error(data?.message || "Đồng bộ phiếu thu thất bại.");
      }
    } catch (_e) {
      // Nếu fetch lỗi (CORS, v.v.) → fallback mở tab
      window.open(url, "_blank");
      message.info("Đã mở tab đồng bộ, vui lòng kiểm tra.");
    }
  };

  return (
    <Row gutter={[10, 10]}>
      <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
        <Form.Item
          name="ma_don_hang"
          label="Mã đơn hàng"
          // ❗Không required và không initialValue (BE tự sinh sau khi lưu)
          rules={[]}
        >
          <Input
            placeholder="Tự sinh sau khi lưu"
            // Cho phép xem (read-only) — nếu đang ở màn tạo mới sẽ để trống
            disabled={isDetail}
          />
        </Form.Item>
      </Col>

      <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
        <Form.Item
          name="ngay_tao_don_hang"
          label="Ngày tạo đơn hàng"
          rules={[{ required: true, message: "Ngày tạo đơn hàng không được bỏ trống!" }]}
          initialValue={dayjs()}
        >
          <DatePicker
            placeholder="Nhập ngày tạo đơn hàng"
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            disabled={isDetail}
            /* ✅ Neo popup trong modal để dễ bấm */
            getPopupContainer={(node) => (node && node.closest(".ant-modal")) || document.body}
          />
        </Form.Item>
      </Col>

      <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
        <Form.Item
          name="loai_khach_hang"
          label="Loại khách hàng"
          rules={[{ required: true, message: "Loại khách hàng không được bỏ trống!" }]}
          initialValue={0}
        >
          <Select
            options={OPTIONS_LOAI_KHACH_HANG}
            placeholder="Chọn loại khách hàng"
            disabled={isDetail}
            /* ⬇️ render dropdown TRONG modal để không bị lớp khác ăn click */
            getPopupContainer={(trigger) =>
              (trigger && trigger.closest(".ant-modal")) || document.body
            }
            dropdownMatchSelectWidth={false}
            popupClassName="phg-dd"   /* để CSS nâng z-index */
          />
        </Form.Item>
      </Col>

      {/* ===== TRẠNG THÁI ĐƠN HÀNG (0=Chưa giao,1=Đang giao,2=Đã giao,3=Đã hủy) ===== */}
      <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
        <Form.Item
          name="trang_thai_don_hang"
          label="Trạng thái đơn hàng"
          rules={[]}
          initialValue={0}
        >
          <Select
            options={donHangTrangThaiSelect}
            placeholder="Chọn trạng thái"
            disabled={isDetail}
            /* ✅ Neo popup trong modal để dễ bấm */
            getPopupContainer={(node) => (node && node.closest(".ant-modal")) || document.body}
            dropdownMatchSelectWidth={false}
            popupClassName="phg-dd"   // ⬅️ THÊM DÒNG NÀY
          />
        </Form.Item>
      </Col>

      {loaiKhachHang === OPTIONS_LOAI_KHACH_HANG[0].value && (
        <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
          <SelectFormApi
            name="khach_hang_id"
            label="Khách hàng"
            path={API_ROUTE_CONFIG.KHACH_HANG + "/options"}
            placeholder="Chọn khách hàng"
            rules={[
              {
                required: loaiKhachHang === OPTIONS_LOAI_KHACH_HANG[0].value,
                message: "Khách hàng không được bỏ trống!",
              },
            ]}
            disabled={isDetail}
            /* ⬇️ render dropdown TRONG modal để không bị lớp khác ăn click */
            getPopupContainer={(trigger) =>
              (trigger && trigger.closest(".ant-modal")) || document.body
            }
            dropdownMatchSelectWidth={false}
            popupClassName="phg-dd"
          />
        </Col>
      )}

      {loaiKhachHang === OPTIONS_LOAI_KHACH_HANG[1].value && (
        <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
          <Form.Item
            name="ten_khach_hang"
            label="Tên khách hàng"
            rules={[
              {
                required: loaiKhachHang === OPTIONS_LOAI_KHACH_HANG[1].value,
                message: "Tên khách hàng không được bỏ trống!",
              },
            ]}
          >
            <Input placeholder="Nhập tên khách hàng" disabled={isDetail} />
          </Form.Item>
        </Col>
      )}

      {loaiKhachHang === OPTIONS_LOAI_KHACH_HANG[1].value && (
        <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
          <Form.Item
            name="so_dien_thoai"
            label="Số điện thoại"
            rules={[
              {
                required: loaiKhachHang === OPTIONS_LOAI_KHACH_HANG[1].value,
                message: "Số điện thoại không được bỏ trống!",
              },
              { pattern: phoneNumberVNPattern, message: "Số điện thoại không hợp lệ!" },
            ]}
          >
            <Input placeholder="Nhập số điện thoại" disabled={isDetail} />
          </Form.Item>
        </Col>
      )}

      <Col span={16} xs={24} sm={24} md={24} lg={16} xl={16}>
        <Form.Item
          name="dia_chi_giao_hang"
          label="Địa chỉ giao hàng"
          rules={[{ required: true, message: "Địa chỉ giao hàng không được bỏ trống!" }]}
        >
          <Input placeholder="Nhập địa chỉ giao hàng" disabled={isDetail} />
        </Form.Item>
      </Col>

      {/* ===== THÔNG TIN NGƯỜI NHẬN ===== */}
      <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
        <Form.Item
          name="nguoi_nhan_ten"
          label="Tên người nhận"
          rules={[{ max: 191, message: "Tối đa 191 ký tự" }]}
        >
          <Input placeholder="Nhập tên người nhận" disabled={isDetail} />
        </Form.Item>
      </Col>

      <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
        <Form.Item
          name="nguoi_nhan_sdt"
          label="SĐT người nhận"
          rules={[
            { max: 20, message: "Tối đa 20 ký tự" },
            { pattern: phoneNumberVNPattern, message: "Số điện thoại không hợp lệ!" },
          ]}
        >
          <Input placeholder="Nhập số điện thoại người nhận (0… hoặc +84…)" disabled={isDetail} />
        </Form.Item>
      </Col>

      <Col span={8} xs={24} sm={24} md={24} lg={8} xl={8}>
        <Form.Item
          name="nguoi_nhan_thoi_gian"
          label="Ngày giờ nhận"
          rules={[]}
          /** ===== BỔ SUNG: luôn chuyển giá trị vào thành dayjs (giữ cả giờ) ===== */
          getValueProps={(value) => {
            if (!value) return { value };
            const d =
              typeof value === "string" || typeof value === "number"
                ? dayjs(value)
                : value;
            return { value: d?.isValid?.() ? d : undefined };
          }}
          getValueFromEvent={(value) => value} // giữ nguyên đối tượng dayjs, không tự stringify
        >
          <DatePicker
            placeholder="Chọn ngày giờ nhận"
            style={{ width: "100%" }}
            showTime
            format={CLIENT_DATETIME_FORMAT}
            disabled={isDetail}
            /* ✅ Neo popup trong modal để dễ bấm */
            getPopupContainer={(node) => (node && node.closest(".ant-modal")) || document.body}
          />
        </Form.Item>
      </Col>
      {/* ===== END – THÔNG TIN NGƯỜI NHẬN ===== */}

      <Col span={24} style={{ marginBottom: 20 }}>
        <DanhSachSanPham form={form} isDetail={isDetail} />
      </Col>

{/* ===== HÀNG 1: GIẢM GIÁ / CHI PHÍ / THUẾ / VAT (4 CỘT — KHÔNG RỚT) ===== */}
<Col span={24}>
  <Row gutter={[16, 8]} align="middle" wrap={false}>
    {/* Giảm giá */}
    <Col flex="0 0 25%">
      <Form.Item
        name="giam_gia"
        label="Giảm giá"
        rules={[{ required: true, message: "Giảm giá không được bỏ trống!" }]}
        initialValue={0}
        style={{ marginBottom: 0 }}
      >
        <InputNumber
          placeholder="Nhập giảm giá"
          disabled={isDetail}
          style={{ width: "100%" }}
          addonAfter="đ"
          formatter={formatter}
          parser={parser}
          min={0}
          inputMode="numeric"
        />
      </Form.Item>
    </Col>

    {/* Chi phí vận chuyển */}
    <Col flex="0 0 25%">
      <Form.Item
        name="chi_phi"
        label="Chi phí vận chuyển"
        rules={[{ required: true, message: "Chi phí không được bỏ trống!" }]}
        initialValue={0}
        style={{ marginBottom: 0 }}
      >
        <InputNumber
          placeholder="Nhập chi phí vận chuyển"
          disabled={isDetail}
          style={{ width: "100%" }}
          addonAfter="đ"
          formatter={formatter}
          parser={parser}
          min={0}
          inputMode="numeric"
        />
      </Form.Item>
    </Col>

    {/* Thuế */}
    <Col flex="0 0 25%">
      <Form.Item
        name="tax_mode"
        label="Thuế"
        initialValue={0}
        style={{ marginBottom: 0 }}
      >
        <Select
          options={TAX_MODE_OPTIONS as any}
          placeholder="Chọn"
          disabled={isDetail}
          getPopupContainer={(trigger) =>
            (trigger && trigger.closest(".ant-modal")) || document.body
          }
          dropdownMatchSelectWidth={false}
          popupClassName="phg-dd"
          onChange={(v) => {
            if (v !== 1) {
              form.setFieldsValue({ vat_rate: undefined });
            } else {
              form.setFieldsValue({ vat_rate: 8 }); // mặc định 8%
            }
          }}
        />
      </Form.Item>
    </Col>

    {/* VAT (%) — chỉ render khi Có thuế, Không thuế render cột trống để giữ 4 cột cân */}
    {Number(taxMode) === 1 ? (
      <Col flex="0 0 25%">
        <Form.Item
          name="vat_rate"
          label="VAT (%)"
          initialValue={8}
          style={{ marginBottom: 0 }}
        >
          <InputNumber
            disabled
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
      <Col flex="0 0 25%" />
    )}
  </Row>
</Col>

{/* ===== HÀNG 2: TỔNG TIỀN / LOẠI THANH TOÁN / SỐ TIỀN ĐÃ THANH TOÁN (3 CỘT — KHÔNG RỚT) ===== */}
<Col span={24}>
  <Row gutter={[16, 8]} align="middle" wrap={false} style={{ marginTop: 8 }}>
    {/* Tổng tiền thanh toán — trái */}
    <Col flex="0 0 33.33%">
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: 600, whiteSpace: "nowrap", marginBottom: 6 }}>
          Tổng tiền thanh toán
        </div>
        <div style={{ fontSize: 20 }}>
          {formatter(grandTotal) || 0} đ
        </div>
      </div>
    </Col>

    {/* Loại thanh toán — giữa (cố định bề rộng để ổn định) */}
    <Col flex="0 0 320px">
      <Form.Item
        name="loai_thanh_toan"
        label={<span style={{ whiteSpace: "nowrap" }}>Loại thanh toán</span>}
        rules={[{ required: true, message: "Loại thanh toán không được bỏ trống!" }]}
        initialValue={0}
        style={{ marginBottom: 0 }}
      >
        <Select
          options={OPTIONS_LOAI_THANH_TOAN}
          placeholder="Chọn loại thanh toán"
          disabled={isDetail}
          getPopupContainer={(trigger) =>
            (trigger && trigger.closest(".ant-modal")) || document.body
          }
          dropdownMatchSelectWidth={false}
          popupClassName="phg-dd"
        />
      </Form.Item>
    </Col>

    {/* Số tiền đã thanh toán — phải; nếu KHÔNG “một phần” vẫn giữ chỗ để không rớt */}
    <Col flex="1 1 33.33%">
      {loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[1].value ? (
        <Form.Item
          name="so_tien_da_thanh_toan"
          label="Số tiền đã thanh toán"
          style={{ marginBottom: 0 }}
          rules={[
            { required: true, message: "Số tiền đã thanh toán không được bỏ trống!" },
            () => ({
              validator(_, val) {
                const max = Number(grandTotal || 0);
                const num = Number(val || 0);
                return num >= 0 && num <= max
                  ? Promise.resolve()
                  : Promise.reject(new Error(`Tối đa ${formatter(max)} đ`));
              },
            }),
          ]}
        >
          <InputNumber
            placeholder="Nhập số tiền đã thanh toán"
            disabled={isDetail}
            style={{ width: "100%" }}
            addonAfter="đ"
            formatter={formatter}
            parser={parser}
            min={0}
            inputMode="numeric"
          />
        </Form.Item>
      ) : (
        <div style={{ height: 56 }} /> // giữ chiều cao để hàng không nhảy
      )}
    </Col>
  </Row>
</Col>

{/* ===== HÀNG 3: TỔNG TIỀN CÒN LẠI — 1 CỘT, CĂN GIỮA (KHÔNG RỚT) ===== */}
<Col span={24}>
  <Row wrap={false}>
    <Col flex="1 1 100%">
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          Tổng tiền thanh toán còn lại
        </div>
        <div style={{ fontSize: 20 }}>
          {formatter(tongConLai) || 0} đ
        </div>
      </div>
    </Col>
  </Row>
</Col>


      {/* Hàng thông tin thanh toán thực tế + nút đồng bộ */}
      <Col span={24}>
        <Row align="middle" gutter={[10, 10]}>
          <Col flex="auto">
            <Typography.Text type="secondary">
              <b>Tổng đã thu (thực tế)</b>: {formatter(soTienDaThanhToan)} đ
            </Typography.Text>
          </Col>
          <Col>
            <Tooltip title="Đồng bộ lại phiếu thu theo mã đơn (server sẽ tự cân)">
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
          <Input.TextArea placeholder="Ghi chú" disabled={isDetail} />
        </Form.Item>
      </Col>
    </Row>
  );
};

export default FormQuanLyBanHang;
