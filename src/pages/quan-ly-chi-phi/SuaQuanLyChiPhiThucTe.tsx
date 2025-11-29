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
  path: string; // ví dụ: /quan-ly-chi-phi/thuc-te
  id: number;
  title: string; // "QLCP Thực tế"
};

/**
 * SỬA QLCP THỰC TẾ
 * - KHÔNG còn wizard 7 bước.
 * - Modal duy nhất: hiển thị thông tin báo giá + bảng chi phí theo Hạng mục.
 */
const SuaQuanLyChiPhiThucTe = ({ path, id, title }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm() as [FormInstance];
  const dispatch = useDispatch();
  const { isMobile } = useResponsive();
  const [donHangState, setDonHangState] = useState<any | null>(null);

  const showModal = async () => {
    setIsModalOpen(true);
    setIsLoading(true);

    try {
      // ===== 1) Lấy bản ghi QLCP (data) – unwrap .data nếu có =====
    const res: any = await getDataById(id, path);
    const data: any = res?.data ?? res;
    console.log("[QLCP THỰC TẾ] raw cp =", res);
    console.log("[QLCP THỰC TẾ] cp data =", data);


      // ===== 2) Báo giá gốc (don_hang) =====
      let donHang: any =
        data?.don_hang ??
        data?.donHang ??
        data?.order ??
        null;

      const donHangId: number | null =
        data?.don_hang_id ??
        data?.donHangId ??
        (donHang?.id ?? null);

      // Nếu không có hoặc không đủ chi_tiet_don_hangs → gọi QUAN_LY_BAN_HANG
      // Nếu không có hoặc không đủ chi_tiet_don_hangs → gọi QUAN_LY_BAN_HANG
      if (!donHang || !Array.isArray(donHang.chi_tiet_don_hangs)) {
        if (donHangId) {
          const dhRes: any = await getDataById(
            donHangId,
            API_ROUTE_CONFIG.QUAN_LY_BAN_HANG
          );
          donHang = dhRes?.data ?? dhRes;
        } else {
          donHang = null;
        }
      }
      // Lưu donHang để header FormQuanLyChiPhi dùng
      setDonHangState(donHang);

      console.log("[QLCP THỰC TẾ] donHangId =", donHangId);
      console.log("[QLCP THỰC TẾ] donHang =", donHang);


      // ===== 3) Lấy items chi phí nếu đã có =====
      let rawItems: any[] = [];
      if (Array.isArray(data?.items) && data.items.length > 0) {
        rawItems = data.items;
      } else if (
        Array.isArray(data?.chi_phi_items) &&
        data.chi_phi_items.length > 0
      ) {
        rawItems = data.chi_phi_items;
      } else if (Array.isArray(data?.details) && data.details.length > 0) {
        rawItems = data.details;
      }

      // ===== 4) Nếu CHƯA có bảng chi phí -> build từ chi tiết Báo giá =====
      if (
        (!rawItems || rawItems.length === 0) &&
        donHang &&
        Array.isArray(donHang.chi_tiet_don_hangs)
      ) {
        rawItems = (donHang.chi_tiet_don_hangs as any[]).map((ct: any) => {
          const sp = ct.san_pham || ct.sanPham || {};
          const dm = sp.danh_muc || sp.danhMuc || {};
          const groupCodeRaw = dm.group_code || dm.groupCode || null;
          const groupCode = groupCodeRaw
            ? String(groupCodeRaw).toUpperCase()
            : null; // NS / CSVC / TIEC / TD / CPK

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
            section_code: groupCode, // Nhóm NS/CSVC/TIEC/TD/CPK
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

      // ===== 5) Chuẩn hoá item cho FE (cost/sell) =====
      const normItems = (rawItems || []).map((row: any) => {
        const secRaw =
          row?.section_code ??
          row?.section ??
          row?.group_code ??
          "";
  const secUpper = String(secRaw || "").toUpperCase();

  const allowedSections = [
    "NS",
    "CSVC",
    "TIEC",
    "TD",
    "CPK",
    "CPQL",
    "CPFT",
    "CPFG",
    "GG",
  ] as const;

  const sec: string = allowedSections.includes(secUpper as any)
    ? secUpper
    : "OTHER";


        const dvt =
          row?.dvt ??
          row?.don_vi_tinh_ten ??
          row?.don_vi_tinh?.ten_don_vi ??
          row?.don_vi_tinh?.ten ??
          "";

        const qty = Number(row?.so_luong ?? row?.qty ?? 0);

        const costUnit =
          row?.cost_unit_price ??
          row?.gia_cp ??
          row?.don_gia_cp ??
          0;

        const costTotal =
          row?.cost_total_amount ??
          row?.thanh_tien_cp ??
          qty * Number(costUnit || 0);

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

      // ===== 6) Đẩy vào form =====
      form.setFieldsValue({
        ...data,
        don_hang: donHang,
        items: normItems,
      });
    } catch (e) {
      console.error("[QLCP Thực tế] Lỗi load chi tiết", e);
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
      console.error("[QLCP Thực tế] Lỗi khi lưu", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = `Sửa ${title} – Thông tin báo giá`;

  const footer = (
    <Row justify="end" style={{ gap: 8 }}>
      <Button onClick={handleCancel}>Hủy</Button>
      <Button
        key="submit"
        form={`formSuaQLCPThucTe-${id}`}
        type="primary"
        htmlType="submit"
        size="large"
        loading={isSubmitting}
      >
        Lưu
      </Button>
    </Row>
  );

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
        title={modalTitle}
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
          id={`formSuaQLCPThucTe-${id}`}
          form={form}
          layout="vertical"
          onFinish={onUpdate}
        >
          <FormQuanLyChiPhi
            form={form}
            mode="thuc-te"
            donHang={donHangState}
          />

        </Form>
      </Modal>
    </>
  );
};

export default SuaQuanLyChiPhiThucTe;
