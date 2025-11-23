/* eslint-disable @typescript-eslint/no-explicit-any */
import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Form, Modal, Row } from "antd";
import type { FormInstance } from "antd";
import { useResponsive } from "../../hooks/useReponsive";
import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { putData } from "../../services/updateData";
import { setReload } from "../../redux/slices/main.slice";
import FormQuanLyChiPhi from "./FormQuanLyChiPhi";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

type Props = {
  path: string; // ví dụ: /quan-ly-chi-phi/de-xuat
  id: number;
  title: string; // "QLCP Đề xuất"
};

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * SỬA QLCP ĐỀ XUẤT – Wizard:
 *  1. Thông tin báo giá
 *  2. Nhân sự – Chi phí
 *  3. CSVC  – Chi phí
 *  4. Tiệc  – Chi phí
 *  5. Thuê địa điểm – Chi phí
 *  6. Chi phí khác – Chi phí
 *  7. Tổng hợp chi phí & lãi lỗ
 */
const SuaQuanLyChiPhiDeXuat = ({ path, id, title }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm() as [FormInstance];
  const dispatch = useDispatch();
  const { isMobile } = useResponsive();

  const [step, setStep] = useState<Step>(1);

  const showModal = async () => {
    setStep(1);
    setIsModalOpen(true);
    setIsLoading(true);

    try {
      // ===== 1) Lấy bản ghi QLCP (cp) =====
      const cp: any = await getDataById(id, path);

      // ===== 2) Xác định donHangId =====
      let donHang: any =
        cp?.don_hang ??
        cp?.donHang ??
        cp?.order ??
        null;

      const donHangId: number | null =
        cp?.don_hang_id ??
        cp?.donHangId ??
        (donHang?.id ?? null);

      // ===== 3) Gọi THẲNG API BÁO GIÁ nếu cần =====
      // Nếu cp không embed don_hang hoặc không có chi_tiet_don_hangs → gọi /quan-ly-ban-hang/{id}
      if (!donHang || !Array.isArray(donHang.chi_tiet_don_hangs)) {
        if (donHangId) {
          donHang = await getDataById(
            donHangId,
            API_ROUTE_CONFIG.QUAN_LY_BAN_HANG
          );
        } else {
          donHang = null;
        }
      }

      // ===== 4) Lấy items chi phí nếu đã tồn tại trong QLCP =====
      let rawItems: any[] = [];
      if (Array.isArray(cp?.items) && cp.items.length > 0) {
        rawItems = cp.items;
      } else if (
        Array.isArray(cp?.chi_phi_items) &&
        cp.chi_phi_items.length > 0
      ) {
        rawItems = cp.chi_phi_items;
      } else if (Array.isArray(cp?.details) && cp.details.length > 0) {
        rawItems = cp.details;
      }

      // ===== 5) Nếu CHƯA có bảng chi phí → BUILD TỪ CHI TIẾT BÁO GIÁ =====
      if (
        (!rawItems || rawItems.length === 0) &&
        donHang &&
        Array.isArray(donHang.chi_tiet_don_hangs)
      ) {
        rawItems = (donHang.chi_tiet_don_hangs as any[]).map((ct: any) => {
          const sp = ct.san_pham || ct.sanPham || {};
          const dm = sp.danh_muc || sp.danhMuc || {};

          // group_code NS / CSVC / TIEC / TD / CPK
          const groupCodeRaw = dm.group_code || dm.groupCode || null;
          const groupCode = groupCodeRaw
            ? String(groupCodeRaw).toUpperCase()
            : null;

          const dvt =
            ct.don_vi_tinh?.ten_don_vi ??
            ct.don_vi_tinh?.ten ??
            ct.don_vi_tinh_ten ??
            "";

          const name =
            sp.ten_san_pham ??
            sp.ten_vat_tu ??
            sp.ten ??
            sp.name ??
            "";

          const qty = Number(ct.so_luong ?? 0);
          const sellUnit = Number(ct.don_gia ?? 0);
          const sellTotal =
            Number(ct.thanh_tien ?? ct.tong_tien ?? 0) ||
            qty * sellUnit;

          return {
            section_code: groupCode, // Nhóm NS / CSVC / TIEC / TD / CPK
            hang_muc: ct.hang_muc_goc ?? null,
            chi_tiet: name,
            dvt,
            so_luong: qty,

            // 3 cột CHI PHÍ (để anh điền)
            sup: "",
            cost_unit_price: 0,
            cost_total_amount: 0,

            // Cột DOANH THU copy y chang Báo giá
            sell_unit_price: sellUnit,
            sell_total_amount: sellTotal,
          };
        });
      }

      // ===== 6) Chuẩn hoá items cho FE (cost/sell/section_code...) =====
      const normItems = (rawItems || []).map((row: any) => {
        const secRaw =
          row?.section_code ??
          row?.section ??
          row?.group_code ??
          "";
        const secUpper = String(secRaw || "").toUpperCase();
        const sec: string =
          secUpper === "NS" ||
          secUpper === "CSVC" ||
          secUpper === "TIEC" ||
          secUpper === "TD" ||
          secUpper === "CPK"
            ? secUpper
            : "OTHER";

        const dvt =
          row?.dvt ??
          row?.don_vi_tinh_ten ??
          row?.don_vi_tinh?.ten_don_vi ??
          row?.don_vi_tinh?.ten ??
          "";

        const qty = Number(row?.so_luong ?? row?.qty ?? 0);

        // Chi phí
        const costUnit =
          row?.cost_unit_price ??
          row?.gia_cp ??
          row?.don_gia_cp ??
          0;

        const costTotal =
          row?.cost_total_amount ??
          row?.thanh_tien_cp ??
          qty * Number(costUnit || 0);

        // Doanh thu
        const sellUnit =
          row?.sell_unit_price ??
          row?.don_gia_ban ??
          row?.don_gia ??
          0;

        const sellTotal =
          row?.sell_total_amount ??
          row?.thanh_tien_ban ??
          row?.thanh_tien ??
          qty * Number(sellUnit || 0);

        const chiTiet =
          row?.chi_tiet ??
          row?.description ??
          row?.ten_san_pham ??
          row?.name ??
          "";

        return {
          ...row,
          section_code: sec,
          hang_muc: row?.hang_muc ?? row?.hang_muc_goc ?? null,
          chi_tiet: chiTiet,
          dvt,
          so_luong: qty,
          sup: row?.sup ?? row?.supplier_name ?? "",
          cost_unit_price: Number(costUnit || 0),
          cost_total_amount: Number(costTotal || 0),
          sell_unit_price: Number(sellUnit || 0),
          sell_total_amount: Number(sellTotal || 0),
        };
      });

      // ===== 7) Đẩy vào form =====
      form.setFieldsValue({
        ...cp,
        don_hang: donHang, // để Step 1 hiển thị thông tin báo giá
        items: normItems,
      });
    } catch (e) {
      console.error("[QLCP Đề xuất] Lỗi load chi tiết", e);
      setIsModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  const closeAndReload = () => {
    handleCancel();
    dispatch(setReload());
  };

  const onUpdate = async (values: any) => {
    setIsSubmitting(true);
    try {
      await putData(path, id, values, closeAndReload);
    } catch (error) {
      console.error("[QLCP Đề xuất] Lỗi khi lưu", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== Tiêu đề theo step =====
  const stepTitle = (() => {
    switch (step) {
      case 1:
        return `Sửa ${title} – Thông tin báo giá`;
      case 2:
        return `Sửa ${title} – Nhân sự (NS)`;
      case 3:
        return `Sửa ${title} – Cơ sở vật chất (CSVC)`;
      case 4:
        return `Sửa ${title} – Tiệc (TIEC)`;
      case 5:
        return `Sửa ${title} – Thuê địa điểm (TD)`;
      case 6:
        return `Sửa ${title} – Chi phí khác (CPK)`;
      case 7:
        return `Sửa ${title} – Tổng hợp chi phí & lãi lỗ`;
      default:
        return `Sửa ${title}`;
    }
  })();

  // ===== Điều khiển wizard =====
  const handleNextStep = async () => {
    try {
      if (step < 7) {
        setStep((prev) => (prev + 1) as Step);
      }
    } catch (_e) {
      // AntD sẽ tự highlight nếu có validate
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  // ===== Footer =====
  const footer =
    step < 7
      ? [
          <Row justify="end" key="footer-step-mid" style={{ gap: 8 }}>
            <Button onClick={handleCancel}>Hủy</Button>
            <Button onClick={handlePrevStep} disabled={step === 1}>
              Quay lại
            </Button>
            <Button type="primary" onClick={handleNextStep}>
              Tiếp tục
            </Button>
          </Row>,
        ]
      : [
          <Row justify="end" key="footer-step7" style={{ gap: 8 }}>
            <Button onClick={handlePrevStep}>Quay lại</Button>
            <Button
              key="submit"
              form={`formSuaQLCPDeXuat-${id}`}
              type="primary"
              htmlType="submit"
              size="large"
              loading={isSubmitting}
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
        loading={isLoading}
        footer={footer}
      >
        <Form
          id={`formSuaQLCPDeXuat-${id}`}
          form={form}
          layout="vertical"
          onFinish={onUpdate}
        >
          <FormQuanLyChiPhi
            form={form}
            mode="de-xuat"
            stepMode={step}
          />
        </Form>
      </Modal>
    </>
  );
};

export default SuaQuanLyChiPhiDeXuat;
