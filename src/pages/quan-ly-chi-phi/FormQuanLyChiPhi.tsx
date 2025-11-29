// /src/pages/quan-ly-chi-phi/FormQuanLyChiPhi.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState, useEffect } from "react";

import {
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Typography,
  type FormInstance,
  Space,
  Divider,
  Button,
  Select,
} from "antd";
import dayjs from "dayjs";
import { formatter, parser } from "../../utils/utils";
import React from "react";
import { getDataSelect } from "../../services/getData.api";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

type ChiPhiMode = "de-xuat" | "thuc-te";

type Props = {
  form: FormInstance;
  mode: ChiPhiMode; // "de-xuat" | "thuc-te"
  // stepMode giữ cho tương thích với code cũ nhưng KHÔNG còn dùng trong component này
  stepMode?: number;
  // donHang truyền trực tiếp từ parent (ưu tiên nếu có)
  donHang?: any;
};

// ===== SECTION CODE =====
type SectionKey =
  | "NS"
  | "CSVC"
  | "TIEC"
  | "TD"
  | "CPK"
  | "CPQL"
  | "CPFT"
  | "CPFG"
  | "GG"
  | "OTHER";

const SECTION_ORDER: SectionKey[] = [
  "NS",
  "CSVC",
  "TIEC",
  "TD",
  "CPK",
  "CPQL",
  "CPFT",
  "CPFG",
  "GG",
  "OTHER",
];

const SECTION_LABELS: Record<SectionKey, string> = {
  NS: "Nhân sự",
  CSVC: "Cơ sở vật chất",
  TIEC: "Tiệc",
  TD: "Thuê địa điểm",
  CPK: "Chi phí khác",
  CPQL: "Chi phí quản lý",
  CPFT: "Chi phí phát sinh tăng",
  CPFG: "Chi phí phát sinh giảm",
  GG: "Giảm giá",
  OTHER: "Khác",
};


type GroupOption = { value: string; label: string };
type CategoryOption = { value: string; label: string };
type PackageOption = { value: string; label: string };

const SECTION_GROUP_KEYWORDS: Record<SectionKey, string[]> = {
  NS: ["nhân sự"],
  CSVC: ["cơ sở vật chất", "csvc"],
  TIEC: ["tiệc"],
  TD: ["thuê địa điểm", "địa điểm"],
  CPK: ["chi phí khác"],
  CPQL: ["chi phí quản lý", "quản lý"],
  CPFT: ["chi phí phát sinh tăng", "phát sinh tăng"],
  CPFG: ["chi phí phát sinh giảm", "phát sinh giảm"],
  GG: ["giảm giá", "discount"],
  OTHER: [],
};

type SectionInfo = {
  code: SectionKey;
  label: string;
  letter: string;
  rows: number[]; // index trong mảng items
};

const FormQuanLyChiPhi = ({ form, mode, donHang: donHangProp }: Props) => {
  const isDeXuat = mode === "de-xuat";

  // ===== WATCH DỮ LIỆU TỪ FORM / PROP =====
  const rootValues: any = Form.useWatch([], form) || {};
  const donHang: any =
    donHangProp ||
    Form.useWatch("don_hang", form) ||
    rootValues?.don_hang ||
    rootValues?.donHang ||
    rootValues?.order ||
    {};
  const items: any[] = Form.useWatch("items", form) || [];

  // ===== THỨ TỰ SECTION ĐỘNG (A, B, C, ...) =====
  const [sectionOrderState, setSectionOrderState] =
    useState<SectionKey[]>(SECTION_ORDER);

  // ===== KIỂU HIỂN THỊ GÓI (chỉ hiển thị, không sửa DonHang) =====
  const packageDisplayMode: 0 | 1 = useMemo(() => {
    const chiTiets =
      donHang?.chi_tiet_don_hangs ||
      donHang?.chiTietDonHangs ||
      donHang?.chi_tiet ||
      [];
    if (Array.isArray(chiTiets) && chiTiets.some((ct: any) => ct?.is_package)) {
      // Có ít nhất 1 dòng gói → coi như "Trọn gói"
      return 0;
    }
    return 1; // Mặc định: Thành phần
  }, [donHang]);


  // ===== STATE CHỌN GÓI DỊCH VỤ CHO QLCP =====
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >();
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>();
  const [loadingPackage, setLoadingPackage] = useState(false);

  // Lấy nhóm danh mục gói (tầng 1)
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getDataSelect(
          `${API_ROUTE_CONFIG.GOI_DICH_VU_GROUP}/options`,
          {}
        );
        const list: GroupOption[] = Array.isArray(data)
          ? data.map((it: any) => ({
              value: String(it.value ?? it.id),
              label: it.label ?? it.ten_nhom ?? it.name,
            }))
          : [];
        setGroupOptions(list);
      } catch {
        setGroupOptions([]);
      }
    };
    fetchGroups();
  }, []);

  // Khi chọn Group → load Nhóm gói (tầng 2)
  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedGroupId) {
        setCategoryOptions([]);
        setSelectedCategoryId(undefined);
        setPackageOptions([]);
        setSelectedPackageId(undefined);
        return;
      }
      try {
        const data = await getDataSelect(
          `${API_ROUTE_CONFIG.GOI_DICH_VU_CATEGORY}/options?group_id=${selectedGroupId}`,
          {}
        );
        const list: CategoryOption[] = Array.isArray(data)
          ? data.map((it: any) => ({
              value: String(it.value ?? it.id),
              label: it.label ?? it.ten_nhom_goi ?? it.name,
            }))
          : [];
        setCategoryOptions(list);
        setSelectedCategoryId(undefined);
        setPackageOptions([]);
        setSelectedPackageId(undefined);
      } catch {
        setCategoryOptions([]);
        setSelectedCategoryId(undefined);
        setPackageOptions([]);
        setSelectedPackageId(undefined);
      }
    };
    fetchCategories();
  }, [selectedGroupId]);

  // Khi chọn Category → load Gói (tầng 3)
  useEffect(() => {
    const fetchPackages = async () => {
      if (!selectedCategoryId) {
        setPackageOptions([]);
        setSelectedPackageId(undefined);
        return;
      }
      try {
        const data = await getDataSelect(
          `${API_ROUTE_CONFIG.GOI_DICH_VU_PACKAGE}/options?category_id=${selectedCategoryId}`,
          {}
        );
        const list: PackageOption[] = Array.isArray(data)
          ? data.map((it: any) => ({
              value: String(it.value ?? it.id),
              label: it.label ?? it.ten_goi ?? it.name,
            }))
          : [];
        setPackageOptions(list);
        setSelectedPackageId(undefined);
      } catch {
        setPackageOptions([]);
        setSelectedPackageId(undefined);
      }
    };
    fetchPackages();
  }, [selectedCategoryId]);

  const detectSectionCodeFromGroupLabel = (label?: string): SectionKey => {
    if (!label) return "OTHER";
    const lower = label.toLowerCase();
    for (const code of SECTION_ORDER) {
      const kws = SECTION_GROUP_KEYWORDS[code];
      if (kws.some((kw) => lower.includes(kw))) return code;
    }
    return "OTHER";
  };

  const handleAddPackageToCostList = useCallback(() => {
    if (!selectedPackageId || !selectedCategoryId) return;

    const category = categoryOptions.find(
      (c) => c.value === selectedCategoryId
    );
    const pkg = packageOptions.find((p) => p.value === selectedPackageId);
    const group = groupOptions.find((g) => g.value === selectedGroupId);

    if (!category || !pkg) return;

    const baseHangMuc = category.label;
    const chiTiet = pkg.label;

    const secCode = detectSectionCodeFromGroupLabel(group?.label);
    const section_code = secCode === "OTHER" ? null : secCode;

    const list: any[] = form.getFieldValue("items") || [];
    list.push({
      section_code,
      hang_muc: baseHangMuc,
      hang_muc_goc: baseHangMuc,
      chi_tiet: chiTiet,
      dvt: "Gói",
      so_luong: 1,
      sup: "",
      cost_unit_price: 0,
      cost_total_amount: 0,
      sell_unit_price: 0,
      sell_total_amount: 0,
    });
    form.setFieldsValue({ items: list });
  }, [
    selectedPackageId,
    selectedCategoryId,
    selectedGroupId,
    categoryOptions,
    packageOptions,
    groupOptions,
    form,
  ]);




  // ===== GROUP ITEMS THEO SECTION =====
  const sections: SectionInfo[] = useMemo(() => {


    // Tạo base cho tất cả section để luôn có nút "Thêm dòng" dù chưa có dữ liệu
    const base: SectionInfo[] = SECTION_ORDER.map((code) => ({
      code,
      label: SECTION_LABELS[code],
      letter: "",
      rows: [],
    }));
    const mapIndex = new Map<SectionKey, number>();
    base.forEach((sec, idx) => mapIndex.set(sec.code, idx));

    (items || []).forEach((row: any, idx: number) => {
      const raw = String(row?.section_code ?? "").toUpperCase();
      const code: SectionKey = SECTION_ORDER.includes(raw as SectionKey)
        ? (raw as SectionKey)
        : "OTHER";
      const secIdx = mapIndex.get(code);
      if (secIdx === undefined) return;
      base[secIdx].rows.push(idx);
    });

    // Sắp xếp theo thứ tự sectionOrderState
    const sorted = [...base].sort((a, b) => {
      const ia = sectionOrderState.indexOf(a.code);
      const ib = sectionOrderState.indexOf(b.code);
      const na = ia < 0 ? 999 : ia;
      const nb = ib < 0 ? 999 : ib;
      return na - nb;
    });

    // Gán letter A,B,C,... theo thứ tự sau khi sort
    sorted.forEach((sec, index) => {
      sec.letter = String.fromCharCode(65 + index);
    });

    return sorted;
  }, [items, sectionOrderState]);

    const visibleSections = useMemo(
    () => sections.filter((s) => s.rows.length > 0),
    [sections]
  );

  // ===== TÍNH TỔNG DOANH THU / CHI PHÍ / LỢI NHUẬN =====
  const { totalRevenue, totalCost, totalMargin, marginPercent } = useMemo(() => {
    let rev = 0;
    let cost = 0;

    (items || []).forEach((r: any) => {
      rev += Number(r?.sell_total_amount || 0);
      cost += Number(r?.cost_total_amount || 0);
    });

    const margin = rev - cost;
    const percent =
      rev > 0 ? Math.round((margin * 10000) / rev) / 100 : null; // làm tròn 2 chữ số

    return {
      totalRevenue: rev,
      totalCost: cost,
      totalMargin: margin,
      marginPercent: percent,
    };
  }, [items]);

  // ===== UPDATE THÀNH TIỀN CHI PHÍ (cost_total_amount = so_luong * cost_unit_price) =====
  const updateCostTotal = useCallback(
    (rowIndex: number) => {
      const arr: any[] = form.getFieldValue("items") || [];
      if (!Array.isArray(arr) || !arr[rowIndex]) return;

      const row = { ...(arr[rowIndex] || {}) };
      const qty = Number(row.so_luong || 0);
      const unit = Number(row.cost_unit_price || 0);

      row.cost_total_amount = Math.round(qty * unit);
      arr[rowIndex] = row;
      form.setFieldsValue({ items: arr });
    },
    [form]
  );

  // ===== DI CHUYỂN DÒNG TRONG CÙNG 1 SECTION =====
  const moveRow = useCallback(
    (fromIndex: number, toIndex: number) => {
      const arr: any[] = form.getFieldValue("items") || [];
      if (
        !Array.isArray(arr) ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= arr.length ||
        toIndex >= arr.length
      ) {
        return;
      }

      const fromRow = arr[fromIndex];
      const toRow = arr[toIndex];
      if (!fromRow || !toRow) return;

      // Chỉ cho move trong cùng section_code
      const secFrom = String(fromRow.section_code ?? "").toUpperCase();
      const secTo = String(toRow.section_code ?? "").toUpperCase();
      if (secFrom !== secTo) return;

      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      form.setFieldsValue({ items: arr });
    },
    [form]
  );

  // ===== DI CHUYỂN NGUYÊN NHÓM (SECTION) TRÊN UI =====
  const moveSection = useCallback((code: SectionKey, direction: -1 | 1) => {
    setSectionOrderState((prev) => {
      const idx = prev.indexOf(code);
      if (idx === -1) return prev;

      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(newIdx, 0, moved);
      return next;
    });
  }, []);

  // ===== THÊM DÒNG CHI PHÍ CHO 1 SECTION =====
  const handleAddRowForSection = useCallback(
    (sectionCode: SectionKey) => {
      const list: any[] = form.getFieldValue("items") || [];

      list.push({
        section_code: sectionCode,
        hang_muc: "",
        hang_muc_goc: "",
        chi_tiet: "",
        dvt: "",
        so_luong: 0,
        sup: "",
        cost_unit_price: 0,
        cost_total_amount: 0,
        sell_unit_price: 0,
        sell_total_amount: 0,
      });

      form.setFieldsValue({ items: list });
    },
    [form]
  );

  // ===== FORMAT THÔNG TIN BÁO GIÁ GỐC =====
  const ngayToChucText = useMemo(() => {
    const raw = donHang?.nguoi_nhan_thoi_gian || donHang?.event_start || null;
    if (!raw) return "";
    const d = dayjs(raw);
    return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "";
  }, [donHang]);

  const khachHangText = useMemo(() => {
    const kh = donHang?.khach_hang || donHang?.khachHang || {};
    const ten = kh?.ten_khach_hang ?? donHang?.ten_khach_hang ?? "";
    return ten || "";
  }, [donHang]);

  const soKhachText = useMemo(() => {
    const v = donHang?.guest_count;
    if (v === null || v === undefined) return "";
    return String(v);
  }, [donHang]);

  const titleHeader = isDeXuat
    ? "Quản lý chi phí ĐỀ XUẤT"
    : "Quản lý chi phí THỰC TẾ";

  // ===== THUẾ & THANH TOÁN (READONLY – LẤY TỪ ĐƠN HÀNG) =====
  const taxMode = Number(donHang?.tax_mode ?? 0);
  const vatRate =
    taxMode === 1 && donHang?.vat_rate !== undefined && donHang?.vat_rate !== null
      ? Number(donHang.vat_rate)
      : undefined;

  const tongCanThanhToan = Number(donHang?.tong_tien_can_thanh_toan ?? 0);
  const daThanhToan = Number(donHang?.so_tien_da_thanh_toan ?? 0);

  let loaiThanhToan = donHang?.loai_thanh_toan;
  if (loaiThanhToan === undefined || loaiThanhToan === null) {
    if (tongCanThanhToan <= 0 || daThanhToan <= 0) loaiThanhToan = 0;
    else if (daThanhToan >= tongCanThanhToan) loaiThanhToan = 2;
    else loaiThanhToan = 1;
  }
  const conLai = Math.max(0, tongCanThanhToan - daThanhToan);

  const loaiThanhToanLabel =
    loaiThanhToan === 2
      ? "Thanh toán toàn bộ"
      : loaiThanhToan === 1
      ? "Thanh toán một phần"
      : "Chưa thanh toán";

  return (
    <div style={{ width: "100%" }}>
      {/* ====== HEADER THÔNG TIN BÁO GIÁ ====== */}
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        bodyStyle={{ padding: 12 }}
      >
        <Typography.Title
          level={5}
          style={{ marginBottom: 8, textTransform: "uppercase" }}
        >
          {titleHeader} – Báo giá: {donHang?.ma_don_hang || ""}
        </Typography.Title>

        <Row gutter={[12, 4]}>
          <Col xs={24} md={12}>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Mã báo giá:</Typography.Text>
              </Col>
              <Col span={16}>{donHang?.ma_don_hang || ""}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Dự án / Sự kiện:</Typography.Text>
              </Col>
              <Col span={16}>
                {donHang?.project_name || donHang?.event_type || ""}
              </Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Ngày tổ chức:</Typography.Text>
              </Col>
              <Col span={16}>{ngayToChucText}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Địa điểm:</Typography.Text>
              </Col>
              <Col span={16}>
                {donHang?.venue_name
                  ? `${donHang.venue_name}${
                      donHang?.venue_address ? " - " + donHang.venue_address : ""
                    }`
                  : donHang?.venue_address || donHang?.dia_chi_giao_hang || ""}
              </Col>
            </Row>
          </Col>

          <Col xs={24} md={12}>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Khách hàng:</Typography.Text>
              </Col>
              <Col span={16}>{khachHangText}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Loại sự kiện:</Typography.Text>
              </Col>
              <Col span={16}>{donHang?.event_type || ""}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Số khách dự kiến:</Typography.Text>
              </Col>
              <Col span={16}>{soKhachText}</Col>
            </Row>
          </Col>
        </Row>

        <Divider style={{ margin: "8px 0" }} />

        <Row>
          <Col span={24}>
            <Form.Item name="note" label="Ghi chú nội bộ (Chi phí)">
              <Input.TextArea
                rows={2}
                placeholder="Nhập ghi chú nội bộ cho bảng chi phí (nếu cần)"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* ====== KIỂU HIỂN THỊ GÓI (READONLY) ====== */}
      <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: 8 }}>
        <Row gutter={[8, 8]} align="middle">
          <Col flex="auto">
            <Space size={8} wrap>
              <Typography.Text strong>Kiểu hiển thị gói:</Typography.Text>
              <Button
                size="small"
                type={packageDisplayMode === 0 ? "primary" : "default"}
                disabled
              >
                Trọn gói (Hiện nguyên 1 gói)
              </Button>
              <Button
                size="small"
                type={packageDisplayMode === 1 ? "primary" : "default"}
                disabled
              >
                Thành phần (Hiện ra từng dòng dịch vụ)
              </Button>
            </Space>
          </Col>
          <Col flex="none">
            <Typography.Text type="secondary">
              * Thay đổi kiểu hiển thị gói tại màn <b>Sửa Báo giá</b>.
            </Typography.Text>
          </Col>
        </Row>
      </Card>


      {/* ====== CHỌN GÓI DỊCH VỤ ĐỂ THÊM DÒNG CHI PHÍ ====== */}
      <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: 8 }}>
        <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 8 }}>
          <Col span={6}>
            <Typography.Text strong>Thêm gói vào chi phí:</Typography.Text>
          </Col>
        </Row>

        <Row gutter={[8, 8]} align="middle">
          {/* Tầng 1: Nhóm danh mục gói */}
          <Col xs={24} md={6}>
            <Select
              showSearch
              allowClear
              placeholder="Nhóm Danh mục gói"
              options={groupOptions}
              value={selectedGroupId}
              onChange={(v) =>
                setSelectedGroupId(
                  v === undefined || v === null ? undefined : String(v)
                )
              }
              optionFilterProp="label"
              dropdownMatchSelectWidth={false}
              popupClassName="phg-dd"
            />
          </Col>

          {/* Tầng 2: Nhóm gói dịch vụ */}
          <Col xs={24} md={6}>
            <Select
              showSearch
              allowClear
              placeholder="Nhóm gói dịch vụ"
              options={categoryOptions}
              value={selectedCategoryId}
              onChange={(v) =>
                setSelectedCategoryId(
                  v === undefined || v === null ? undefined : String(v)
                )
              }
              optionFilterProp="label"
              disabled={!selectedGroupId}
              dropdownMatchSelectWidth={false}
              popupClassName="phg-dd"
            />
          </Col>

          {/* Tầng 3: Gói dịch vụ */}
          <Col xs={24} md={8}>
            <Select
              showSearch
              allowClear
              placeholder="Gói dịch vụ"
              options={packageOptions}
              value={selectedPackageId}
              onChange={(v) =>
                setSelectedPackageId(
                  v === undefined || v === null ? undefined : String(v)
                )
              }
              optionFilterProp="label"
              disabled={!selectedCategoryId}
              dropdownMatchSelectWidth={false}
              popupClassName="phg-dd"
            />
          </Col>

          {/* Nút thêm gói */}
          <Col xs={24} md={4}>
            <Button
              type="dashed"
              onClick={handleAddPackageToCostList}
              disabled={!selectedPackageId}
              loading={loadingPackage}
              style={{ width: "100%" }}
            >
              Thêm gói vào chi phí
            </Button>
          </Col>
        </Row>
      </Card>


      {/* ====== BẢNG CHI PHÍ – THEO HẠNG MỤC / SECTION ====== */}
      <Card size="small" bodyStyle={{ padding: 8 }} style={{ marginBottom: 12 }}>
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          Bảng chi phí theo Hạng mục
        </Typography.Title>

        <div
          style={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <colgroup>
              <col style={{ width: "4%" }} /> {/* STT */}
              <col style={{ width: "12%" }} /> {/* HẠNG MỤC */}
              <col style={{ width: "28%" }} /> {/* CHI TIẾT */}
              <col style={{ width: "6%" }} /> {/* ĐVT */}
              <col style={{ width: "6%" }} /> {/* SL */}
              <col style={{ width: "10%" }} /> {/* SUP */}
              <col style={{ width: "9%" }} /> {/* Đơn giá CP */}
              <col style={{ width: "9%" }} /> {/* Thành tiền CP */}
              <col style={{ width: "8%" }} /> {/* Đơn giá bán */}
              <col style={{ width: "8%" }} /> {/* Thành tiền bán */}
              <col style={{ width: "10%" }} /> {/* Actions */}
            </colgroup>

            <thead>
              <tr>
                {[
                  "STT",
                  "HẠNG MỤC",
                  "CHI TIẾT",
                  "ĐVT",
                  "SL",
                  "SUP",
                  "Đơn giá CP",
                  "Thành tiền CP",
                  "Đơn giá bán",
                  "Thành tiền bán",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      border: "1px solid #ccc",
                      padding: "4px",
                      textAlign: "center",
                      background: "#f5f5f5",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <Form.List name="items">
              {(fields, { remove }) => {
                const fieldMap = new Map<number, any>();
                fields.forEach((f) => fieldMap.set(Number(f.name), f));

                const totalItems = items.length || 0;

                return (
                  <tbody>
                        {visibleSections.map((sec, sectionIndex) => {

                      // luôn render section để có nút "Thêm dòng", kể cả khi chưa có rows
                      const rowIndices = sec.rows;
                      let stt = 1;

                      return (
                        <React.Fragment key={sec.code}>
                          {/* HÀNG SECTION: A. CƠ SỞ VẬT CHẤT ... */}
                          <tr
                            style={{
                              background: "#fde9d9",
                            }}
                          >
                            <td
                              colSpan={2}
                              style={{
                                border: "1px solid #eee",
                                padding: "4px",
                                fontWeight: 600,
                              }}
                            >
                              {sec.letter}. {sec.label.toUpperCase()}
                            </td>
                            <td
                              colSpan={9}
                              style={{
                                border: "1px solid #eee",
                                padding: "4px",
                                textAlign: "right",
                              }}
                            >
                              <Space size={4}>
                                <Button
                                  size="small"
                                  type="text"
                                  disabled={sectionIndex === 0}
                                  onClick={() => moveSection(sec.code, -1)}
                                >
                                  ↑ Nhóm
                                </Button>
                                <Button
                                  size="small"
                                  type="text"
                            disabled={sectionIndex === visibleSections.length - 1}

                                  onClick={() => moveSection(sec.code, +1)}
                                >
                                  ↓ Nhóm
                                </Button>
                              </Space>
                            </td>
                          </tr>

                          {rowIndices.map((rowIndex) => {
                            const field = fieldMap.get(rowIndex);
                            if (!field) return null;

                            const row = items[rowIndex] || {};
                            const key = field.key;
                            const sttRow = stt++;

                            // Tìm index trước / sau trong cùng section để moveRow
                            const posInSection = rowIndices.indexOf(rowIndex);
                            const prevIndex =
                              posInSection > 0
                                ? rowIndices[posInSection - 1]
                                : null;
                            const nextIndex =
                              posInSection < rowIndices.length - 1
                                ? rowIndices[posInSection + 1]
                                : null;

                            return (
                              <tr key={key}>
                                {/* STT + các field ẩn để submit về BE */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "center",
                                  }}
                                >
                                  {sttRow}
                                  {/* section_code */}
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "section_code"]}
                                    initialValue={sec.code}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                  {/* chi_tiet_don_hang_id */}
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "chi_tiet_don_hang_id"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                  {/* hang_muc_goc */}
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "hang_muc_goc"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                  {/* supplier_id */}
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "supplier_id"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                  {/* note */}
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "note"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                </td>

                                {/* HẠNG MỤC */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "hang_muc"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="Hạng mục (Âm thanh, Nhân sự...)" />
                                  </Form.Item>
                                </td>

                                {/* CHI TIẾT */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "chi_tiet"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input.TextArea
                                      autoSize={{ minRows: 1, maxRows: 3 }}
                                      placeholder="Chi tiết hạng mục / dịch vụ"
                                    />
                                  </Form.Item>
                                </td>

                                {/* ĐVT */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "center",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "dvt"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="ĐVT" />
                                  </Form.Item>
                                </td>

                                {/* SL */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "center",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "so_luong"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      style={{ width: "100%" }}
                                      onChange={() => updateCostTotal(rowIndex)}
                                    />
                                  </Form.Item>
                                </td>

                                {/* SUP */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "sup"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="Tên Supplier / NCC" />
                                  </Form.Item>
                                </td>

                                {/* ĐƠN GIÁ CP */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "right",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "cost_unit_price"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      style={{ width: "100%" }}
                                      formatter={formatter}
                                      parser={parser}
                                      addonAfter="đ"
                                      onChange={() => updateCostTotal(rowIndex)}
                                    />
                                  </Form.Item>
                                </td>

                                {/* THÀNH TIỀN CP */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "right",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "cost_total_amount"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      style={{ width: "100%" }}
                                      formatter={formatter}
                                      parser={parser}
                                      addonAfter="đ"
                                    />
                                  </Form.Item>
                                </td>

                                {/* ĐƠN GIÁ BÁN (READONLY) */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "right",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "sell_unit_price"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      disabled
                                      style={{ width: "100%" }}
                                      formatter={formatter}
                                      parser={parser}
                                      addonAfter="đ"
                                    />
                                  </Form.Item>
                                </td>

                                {/* THÀNH TIỀN BÁN (READONLY) */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "right",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "sell_total_amount"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      disabled
                                      style={{ width: "100%" }}
                                      formatter={formatter}
                                      parser={parser}
                                      addonAfter="đ"
                                    />
                                  </Form.Item>
                                </td>

                                {/* ACTIONS: ↑ ↓ X */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "center",
                                  }}
                                >
                                  <Space size={4}>
                                    <Button
                                      type="text"
                                      size="small"
                                      disabled={prevIndex === null}
                                      onClick={() =>
                                        prevIndex !== null &&
                                        moveRow(rowIndex, prevIndex)
                                      }
                                    >
                                      ↑
                                    </Button>
                                    <Button
                                      type="text"
                                      size="small"
                                      disabled={nextIndex === null}
                                      onClick={() =>
                                        nextIndex !== null &&
                                        moveRow(rowIndex, nextIndex)
                                      }
                                    >
                                      ↓
                                    </Button>
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      onClick={() => remove(field.name)}
                                    >
                                      X
                                    </Button>
                                  </Space>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Nút thêm dòng cho section này */}
                          <tr>
                            <td
                              colSpan={11}
                              style={{
                                border: "1px solid #eee",
                                padding: "4px",
                                textAlign: "left",
                              }}
                            >
                              <Button
                                type="dashed"
                                onClick={() => handleAddRowForSection(sec.code)}
                              >
                                + Thêm dòng chi phí cho {sec.label}
                              </Button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}

                    {/* FOOTER: tổng số dòng */}
                    <tr>
                      <td
                        colSpan={11}
                        style={{
                          border: "1px solid #eee",
                          padding: "4px",
                          textAlign: "left",
                        }}
                      >
                        <Typography.Text type="secondary">
                          Tổng số dòng: {totalItems}
                        </Typography.Text>
                      </td>
                    </tr>
                  </tbody>
                );
              }}
            </Form.List>
          </table>
        </div>
      </Card>

      {/* ====== THUẾ & THANH TOÁN (READONLY – THAM CHIẾU BÁO GIÁ) ====== */}
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        bodyStyle={{ padding: 8 }}
      >
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          Thuế & Thanh toán (tham chiếu từ Báo giá)
        </Typography.Title>
        <Row gutter={[16, 8]}>
          <Col xs={24} md={6}>
            <Typography.Text strong>Thuế:</Typography.Text>
            <div>{taxMode === 1 ? "Có VAT" : "Không thuế"}</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>VAT (%):</Typography.Text>
            <div>{taxMode === 1 && vatRate !== undefined ? vatRate : "-"}</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>Loại thanh toán:</Typography.Text>
            <div>{loaiThanhToanLabel}</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>Số tiền đã thanh toán:</Typography.Text>
            <div>{formatter(daThanhToan)} đ</div>
          </Col>
        </Row>
        <Row gutter={[16, 8]} style={{ marginTop: 4 }}>
          <Col xs={24} md={6}>
            <Typography.Text strong>Tổng tiền thanh toán:</Typography.Text>
            <div>{formatter(tongCanThanhToan)} đ</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>
              Tổng tiền thanh toán còn lại:
            </Typography.Text>
            <div>{formatter(conLai)} đ</div>
          </Col>
        </Row>
      </Card>

      {/* ====== TỔNG HỢP LÃI LỖ (HIỂN THỊ) ====== */}
      <Card size="small" bodyStyle={{ padding: 8 }}>
        <Row gutter={[8, 4]}>
          <Col xs={24} md={6}>
            <Typography.Text strong>Tổng doanh thu:</Typography.Text>
            <div>{formatter(totalRevenue)} đ</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>Tổng chi phí:</Typography.Text>
            <div>{formatter(totalCost)} đ</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>Lợi nhuận:</Typography.Text>
            <div>{formatter(totalMargin)} đ</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>Tỉ suất lợi nhuận:</Typography.Text>
            <div>
              {marginPercent !== null ? `${marginPercent.toFixed(2)} %` : "-"}
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default FormQuanLyChiPhi;
