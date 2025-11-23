/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { Card, Col, Form, Row, Typography, Input } from "antd";
import type { FormInstance } from "antd";
import { formatVietnameseCurrency } from "../../utils/utils";
import DanhSachChiPhiSection, {
  type ChiPhiSectionCode,
} from "./DanhSachChiPhiSection";

const { Title, Text } = Typography;

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type Props = {
  form: FormInstance;
  /** de-xuat | thuc-te */
  mode: "de-xuat" | "thuc-te";
  isDetail?: boolean;
  /** bước wizard: 1..7 – nếu không truyền thì hiện tất cả */
  stepMode?: Step;
};

/**
 * FORM CHI PHÍ cho 1 báo giá
 *
 * - Step 1: Thông tin báo giá (INFO ONLY)
 * - Step 2: Nhân sự – Chi phí
 * - Step 3: CSVC  – Chi phí
 * - Step 4: Tiệc  – Chi phí
 * - Step 5: Thuê địa điểm – Chi phí
 * - Step 6: Chi phí khác – Chi phí
 * - Step 7: Tổng hợp lãi/lỗ
 */
const FormQuanLyChiPhi = ({ form, mode, isDetail, stepMode }: Props) => {
  const disabled = !!isDetail;

  // Báo giá gốc (được set vào form là field "don_hang")
  const donHang = Form.useWatch("don_hang", form) || {};

  // Items chi phí
  const items = Form.useWatch("items", form) || [];

  const sectionLabels: Record<ChiPhiSectionCode, string> = {
    NS: "Nhân sự",
    CSVC: "Cơ sở vật chất",
    TIEC: "Tiệc",
    TD: "Thuê địa điểm",
    CPK: "Chi phí khác",
    OTHER: "Khác",
  };

  // Tổng doanh thu / chi phí / lãi lỗ
  const totals = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;

    (items as any[]).forEach((row) => {
      const costTotal = Number(row?.cost_total_amount ?? 0);
      const sellTotal = Number(row?.sell_total_amount ?? 0);
      totalCost += costTotal;
      totalRevenue += sellTotal;
    });

    const margin = totalRevenue - totalCost;
    const marginPercent =
      totalRevenue > 0
        ? Math.round((margin * 10000) / totalRevenue) / 100
        : 0;

    return {
      totalRevenue,
      totalCost,
      margin,
      marginPercent,
    };
  }, [items]);

  const titleText =
    mode === "de-xuat" ? "Quản lý chi phí ĐỀ XUẤT" : "Quản lý chi phí THỰC TẾ";

  const showStep = (target: Step) =>
    !stepMode || (stepMode as number) === target;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ===== HEADER: THÔNG TIN BÁO GIÁ (luôn hiện ở mọi step) ===== */}
      <Card size="small">
        <Title level={5} style={{ marginBottom: 8 }}>
          {titleText}
        </Title>

        <Row gutter={[8, 4]}>
          <Col span={12}>
            <Text strong>Mã báo giá:</Text>{" "}
            <Text>{donHang.ma_don_hang ?? ""}</Text>
          </Col>
          <Col span={12}>
            <Text strong>Khách hàng:</Text>{" "}
            <Text>{donHang.ten_khach_hang ?? ""}</Text>
          </Col>

          <Col span={12}>
            <Text strong>Dự án / Sự kiện:</Text>{" "}
            <Text>{donHang.project_name ?? ""}</Text>
          </Col>
          <Col span={12}>
            <Text strong>Loại sự kiện:</Text>{" "}
            <Text>{donHang.event_type ?? ""}</Text>
          </Col>

          <Col span={12}>
            <Text strong>Ngày tổ chức:</Text>{" "}
            <Text>
              {donHang.event_start
                ? String(donHang.event_start)
                : donHang.nguoi_nhan_thoi_gian
                ? String(donHang.nguoi_nhan_thoi_gian)
                : ""}
            </Text>
          </Col>
          <Col span={12}>
            <Text strong>Số khách dự kiến:</Text>{" "}
            <Text>{donHang.guest_count ?? ""}</Text>
          </Col>

          <Col span={24}>
            <Text strong>Địa điểm tổ chức:</Text>{" "}
            <Text>
              {donHang.venue_name
                ? `${donHang.venue_name} – ${donHang.venue_address ?? ""}`
                : donHang.venue_address ?? ""}
            </Text>
          </Col>
        </Row>

        {/* Ghi chú nội bộ cho bảng chi phí */}
        {showStep(1) && (
          <Row style={{ marginTop: 8 }}>
            <Col span={24}>
              <Form.Item
                name="note"
                label="Ghi chú nội bộ (Chi phí)"
                style={{ marginBottom: 0 }}
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Nhập ghi chú nội bộ cho bảng chi phí (nếu cần)"
                  disabled={disabled}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Card>

      {/* ===== STEP 2: NHÂN SỰ – CHI PHÍ ===== */}
      {showStep(2) && (
        <DanhSachChiPhiSection
          form={form}
          sectionCode="NS"
          sectionLabel={sectionLabels.NS}
          isDetail={isDetail}
        />
      )}

      {/* ===== STEP 3: CSVC – CHI PHÍ ===== */}
      {showStep(3) && (
        <DanhSachChiPhiSection
          form={form}
          sectionCode="CSVC"
          sectionLabel={sectionLabels.CSVC}
          isDetail={isDetail}
        />
      )}

      {/* ===== STEP 4: TIỆC – CHI PHÍ ===== */}
      {showStep(4) && (
        <DanhSachChiPhiSection
          form={form}
          sectionCode="TIEC"
          sectionLabel={sectionLabels.TIEC}
          isDetail={isDetail}
        />
      )}

      {/* ===== STEP 5: THUÊ ĐỊA ĐIỂM – CHI PHÍ ===== */}
      {showStep(5) && (
        <DanhSachChiPhiSection
          form={form}
          sectionCode="TD"
          sectionLabel={sectionLabels.TD}
          isDetail={isDetail}
        />
      )}

      {/* ===== STEP 6: CHI PHÍ KHÁC ===== */}
      {showStep(6) && (
        <DanhSachChiPhiSection
          form={form}
          sectionCode="CPK"
          sectionLabel={sectionLabels.CPK}
          isDetail={isDetail}
        />
      )}

      {/* ===== STEP 7: TỔNG HỢP LÃI/LỖ ===== */}
      {showStep(7) && (
        <Card size="small">
          <Title level={5} style={{ marginBottom: 8 }}>
            Tổng hợp chi phí & lãi lỗ
          </Title>

          <Row gutter={[8, 4]}>
            <Col span={12}>
              <Text strong>Tổng DOANH THU (bán):</Text>{" "}
              <Text>
                {formatVietnameseCurrency(totals.totalRevenue)} đ
              </Text>
            </Col>
            <Col span={12}>
              <Text strong>Tổng CHI PHÍ (SUP):</Text>{" "}
              <Text>
                {formatVietnameseCurrency(totals.totalCost)} đ
              </Text>
            </Col>

            <Col span={12}>
              <Text strong>LỢI NHUẬN gộp:</Text>{" "}
              <Text>
                {formatVietnameseCurrency(totals.margin)} đ
              </Text>
            </Col>
            <Col span={12}>
              <Text strong>% LỢI NHUẬN:</Text>{" "}
              <Text>{totals.marginPercent.toFixed(2)} %</Text>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default FormQuanLyChiPhi;
