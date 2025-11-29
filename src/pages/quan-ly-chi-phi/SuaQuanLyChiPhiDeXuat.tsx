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

/**
 * SỬA QLCP ĐỀ XUẤT
 * - KHÔNG còn wizard 7 bước.
 * - Modal duy nhất: hiển thị thông tin báo giá + bảng chi phí theo Hạng mục.
 */
const SuaQuanLyChiPhiDeXuat = ({ path, id, title }: Props) => {
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
      const cp: any = await getDataById(id, path);

      const donHangId: number | null =
        cp?.don_hang_id ??
        cp?.donHangId ??
        cp?.don_hang?.id ??
        cp?.donHang?.id ??
        null;

      let donHang: any = null;

      if (donHangId) {
        const dhRes: any = await getDataById(
          donHangId,
          API_ROUTE_CONFIG.QUAN_LY_BAN_HANG
        );
        donHang = dhRes?.data ?? dhRes;
      }

      setDonHangState(donHang);

      console.log("QLCP cp =", cp);
      console.log("QLCP donHangId =", donHangId);
      console.log("QLCP donHang =", donHang);

      // ===== Map Hạng mục Step 8 (quote_category_titles) nếu có =====
      const categoryTitleMap: Record<string, string> = {};
      try {
        const rawCt = (donHang as any)?.quote_category_titles;
        let arr: any = rawCt;

        // Có thể là JSON string hoặc array
        if (typeof rawCt === "string") {
          try {
            const parsed = JSON.parse(rawCt);
            if (Array.isArray(parsed)) arr = parsed;
          } catch {
            // ignore parse error
          }
        }

        if (Array.isArray(arr)) {
          arr.forEach((row: any) => {
            const key = row?.key;
            const label = row?.label;
            if (key && label) {
              categoryTitleMap[String(key)] = String(label);
            }
          });
        }
      } catch {
        // ignore
      }

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

          // 🔹 HẠNG MỤC GỐC: từ chi tiết đơn hoặc danh mục
          const baseHangMuc =
            ct.hang_muc_goc ??
            dm.ten_danh_muc ??
            dm.tenDanhMuc ??
            null;

          // 🔹 HẠNG MỤC HIỂN THỊ:
          //  - Nếu Step 8 có map key = baseHangMuc → dùng label
          //  - Nếu không → dùng baseHangMuc
          const hangMuc =
            baseHangMuc && categoryTitleMap[baseHangMuc]
              ? categoryTitleMap[baseHangMuc]
              : baseHangMuc;

          return {
            section_code: groupCode, // Nhóm NS / CSVC / TIEC / TD / CPK
            hang_muc: hangMuc,
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
        don_hang: donHang, // để header hiển thị thông tin báo giá
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

  const modalTitle = `Sửa ${title} – Thông tin báo giá`;

  const footer = (
    <Row justify="end" style={{ gap: 8 }}>
      <Button onClick={handleCancel}>Hủy</Button>
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
          id={`formSuaQLCPDeXuat-${id}`}
          form={form}
          layout="vertical"
          onFinish={onUpdate}
        >
          <FormQuanLyChiPhi
            form={form}
            mode="de-xuat"
            donHang={donHangState}
          />

        </Form>
      </Modal>
    </>
  );
};

export default SuaQuanLyChiPhiDeXuat;
