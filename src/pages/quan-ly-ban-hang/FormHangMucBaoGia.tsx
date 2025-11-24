/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
  Pagination,
  Button,
} from "antd";
import type { FormInstance } from "antd";
import { useEffect, useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";

import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import {
  formatter,
  parser,
  formatVietnameseCurrency,
} from "../../utils/utils";
import SelectFormApi from "../../components/select/SelectFormApi";
import { getDataById, getDataSelect } from "../../services/getData.api";
import { OPTIONS_LOAI_THANH_TOAN } from "../../utils/constant";

const { Text, Title } = Typography;

type Mode = "create" | "edit";

export type SectionGroupCode = "NS" | "CSVC" | "TIEC" | "TD" | "CPK";

// Thứ tự & label section
const SECTION_ORDER: SectionGroupCode[] = ["NS", "CSVC", "TIEC", "TD", "CPK"];

const SECTION_LABELS: Record<string, string> = {
  NS: "Nhân sự",
  CSVC: "Cơ sở vật chất",
  TIEC: "Tiệc",
  TD: "Thuê địa điểm",
  CPK: "Chi phí khác",
  OTHER: "Khác",
};

// Dùng để đoán section_code từ tên Nhóm DM gói
const SECTION_GROUP_KEYWORDS: Record<SectionGroupCode, string[]> = {
  NS: ["nhân sự"],
  CSVC: ["cơ sở vật chất", "csvc"],
  TIEC: ["tiệc"],
  TD: ["thuê địa điểm", "địa điểm"],
  CPK: ["chi phí khác", "chi phí"],
};

const PACKAGE_UNIT_ID = 15;
const PAGE_SIZE = 20;

type GroupOption = { value: number | string; label: string };
type CategoryOption = { value: number | string; label: string };
type PackageOption = { value: number | string; label: string };

type Props = {
  form: FormInstance;
  mode: Mode;
  donHangInfo?: any;
  disabled?: boolean;
};

const FormHangMucBaoGia = ({ form, mode, donHangInfo, disabled }: Props) => {
  const isCreate = mode === "create";
  const isDisabled = !!disabled;

  // ===== WATCH FORM =====
  const items: any[] = Form.useWatch("items", form) || [];
  const giamGia = Form.useWatch("giam_gia", form) || 0;
  const chiPhi = Form.useWatch("chi_phi", form) || 0;
  const giamGiaThanhVien = Form.useWatch("giam_gia_thanh_vien", form) || 0;
  const taxMode = Form.useWatch("tax_mode", form) ?? 0;
  const vatRate = Form.useWatch("vat_rate", form);
  const loaiThanhToan = Form.useWatch("loai_thanh_toan", form);
  const soTienDaThanhToan = Form.useWatch("so_tien_da_thanh_toan", form) || 0;

  // ===== KHÔNG PHÂN TRANG: HIỂN THỊ TOÀN BỘ =====
  const totalItems = items.length || 0;
  const startIndex = 0;
  const endIndex = totalItems;

  // Thêm 1 dòng mới cho một section cụ thể (NS / CSVC / TIEC / TD / CPK / OTHER)
  const handleAddRowForSection = useCallback(
    (sectionCode: string) => {
      const list: any[] = form.getFieldValue("items") || [];

      // Tìm dòng cuối cùng trong section này (nếu có)
      let lastIndex = -1;
      for (let i = 0; i < list.length; i++) {
        const code = (list[i]?.section_code ?? "").toString().toUpperCase();
        if (code === sectionCode) {
          lastIndex = i;
        }
      }

      let newRow: any;
      if (lastIndex >= 0) {
        const base = list[lastIndex] || {};
        // Copy cấu trúc từ dòng cuối cùng trong section này
// Dòng mới: COPY MỘT SỐ GIÁ TRỊ CƠ BẢN, NHƯNG LUÔN LÀ DÒNG THƯỜNG (KHÔNG PHẢI GÓI)
      newRow = {
        san_pham_id: base.san_pham_id ?? null,
        san_pham_label: base.san_pham_label ?? "",
        don_vi_tinh_id: base.don_vi_tinh_id ?? undefined,
        so_luong: base.so_luong ?? 1,
        don_gia: base.don_gia ?? 0,
        thanh_tien: base.thanh_tien ?? 0,
        hang_muc: "", // cho anh gõ Hạng mục mới
        hang_muc_goc: "", // sẽ được map lại khi lưu
        chi_tiet: "",     // anh gõ Chi tiết mới
        section_code: sectionCode,
        is_package: false,       // ❗ luôn là dòng thường
        package_items: null,     // ❗ không mang theo package_items
      };

      list.splice(lastIndex + 1, 0, newRow);
    } else {
      // Nếu section này chưa có dòng nào → thêm 1 dòng trống
      newRow = {
        san_pham_id: null,
        san_pham_label: "",
        don_vi_tinh_id: undefined,
        so_luong: 0,
        don_gia: 0,
        thanh_tien: 0,
        hang_muc: "",
        hang_muc_goc: "",
        chi_tiet: "",
        section_code: sectionCode,
        is_package: false,
        package_items: null,
      };
      list.push(newRow);
    }

      form.setFieldsValue({ items: list });
    },
    [form]
  );

  // ===== Kiểu hiển thị gói: 0 = Trọn gói (1 dòng), 1 = Thành phần (nổ từng dịch vụ) =====
  const [packageDisplayMode, setPackageDisplayMode] = useState<0 | 1 | null>(
    null
  );


// ===== PICKER 3 TẦNG – GÓI DỊCH VỤ =====
const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);

// Luôn dùng string cho id để dễ so sánh
const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
  undefined
);
const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
  undefined
);
const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>(
  undefined
);

const [loadingPackage, setLoadingPackage] = useState(false);

// 🔍 LOG: theo dõi state & options
useEffect(() => {
  console.log("[FHB] selectedGroupId =", selectedGroupId);
}, [selectedGroupId]);


useEffect(() => {
  console.log("[FHB] groupOptions =", groupOptions);
}, [groupOptions]);




  // Nhóm DM gói (GOI_DICH_VU_GROUP)
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getDataSelect(
          `${API_ROUTE_CONFIG.GOI_DICH_VU_GROUP}/options`,
          {}
        );
        const list: GroupOption[] = Array.isArray(data)
          ? data.map((it: any) => ({
              // Ép value về string để đồng nhất
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


  // Khi chọn GROUP → load CATEGORY (GOI_DICH_VU_CATEGORY)
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
              // luôn dùng string để đồng bộ với selectedCategoryId
              value: String(it.value ?? it.id),
              label: it.label ?? it.ten_nhom_goi ?? it.name,
            }))
          : [];
        console.log("[FHB] fetched category options =", list);
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

useEffect(() => {
  console.log("[FHB] selectedCategoryId =", selectedCategoryId);
}, [selectedCategoryId]);

useEffect(() => {
  console.log("[FHB] selectedPackageId =", selectedPackageId);
}, [selectedPackageId]);

  // Khi chọn CATEGORY → load GÓI (GOI_DICH_VU_PACKAGE)
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
              // value cũng là string
              value: String(it.value ?? it.id),
              label: it.label ?? it.ten_goi ?? it.name,
            }))
          : [];
        console.log("[FHB] fetched package options =", list);
        setPackageOptions(list);
        setSelectedPackageId(undefined);
      } catch {
        setPackageOptions([]);
        setSelectedPackageId(undefined);
      }
    };
    fetchPackages();
  }, [selectedCategoryId]);


  // Đoán section_code từ label Nhóm DM gói
  const detectSectionCodeFromGroupLabel = (
    label: string | undefined
  ): SectionGroupCode | "OTHER" => {
    if (!label) return "OTHER";
    const lower = label.toLowerCase();
    for (const code of SECTION_ORDER) {
      const kws = SECTION_GROUP_KEYWORDS[code];
      if (kws.some((kw) => lower.includes(kw))) return code;
    }
    return "OTHER";
  };

  // ===== THÊM GÓI VÀO items =====
  const handleAddPackageToList = useCallback(
    async (pkgId?: string | number) => {
      const rawId = pkgId ?? selectedPackageId;
      const idToUse =
        rawId !== undefined && rawId !== null ? Number(rawId) : undefined;

      if (!idToUse || Number.isNaN(idToUse) || isDisabled) return;

      setLoadingPackage(true);
      try {
        const pkg: any = await getDataById(
          idToUse,
          API_ROUTE_CONFIG.GOI_DICH_VU_PACKAGE
        );
        if (!pkg || typeof pkg !== "object") {
          console.warn("[GoiDV] Không tìm thấy dữ liệu gói", pkg);
          return;
        }

        const packageModeFromBE: number = Number(pkg.package_mode ?? 0); // 0=Trọn gói,1=Thành phần

        // Mode hiệu lực: ưu tiên lựa chọn trên UI, nếu chưa chọn thì dùng cấu hình gói
        const effectiveMode =
          packageDisplayMode === null ? packageModeFromBE : packageDisplayMode;
        const packageMode: number = effectiveMode === 1 ? 1 : 0;


        const rawItems: any[] = Array.isArray(pkg.items) ? pkg.items : [];
        if (!rawItems.length) {
          console.warn("[GoiDV] Gói không có items", pkg);
          return;
        }

        // Giá gói
        let packagePrice = Number(
          pkg.gia_khuyen_mai != null ? pkg.gia_khuyen_mai : pkg.gia_niem_yet
        );
        if (!packagePrice || packagePrice <= 0) {
          packagePrice = rawItems.reduce(
            (sum, it: any) => sum + Number(it.thanh_tien ?? 0),
            0
          );
        }

        // SP đại diện
        const first = rawItems[0];
        const sp0 = first.san_pham || first.sanPham || {};
        const repSanPhamId = sp0.id ?? first.san_pham_id;
        if (!repSanPhamId) {
          console.warn("[GoiDV] Không tìm được san_pham_id đại diện", pkg);
          return;
        }

        // Chi tiết gói
        const packageItems = rawItems.map((it: any) => {
          const sp = it.san_pham || it.sanPham || {};
          const ten =
            sp.ten_san_pham ??
            sp.ten_vat_tu ??
            sp.ten ??
            sp.name ??
            "";
          return {
            ten_san_pham: ten,
            so_luong: Number(it.so_luong ?? 0),
            don_vi_tinh: "",
            ghi_chu: it.ghi_chu ?? "",
          };
        });

        const selectedCategory = categoryOptions.find(
          (opt) => String(opt.value) === String(selectedCategoryId)
        );
        const baseHangMuc: string | undefined =
          (selectedCategory?.label as string | undefined) ?? undefined;

        const selectedGroup = groupOptions.find(
          (opt) => String(opt.value) === String(selectedGroupId)
        );
        const groupLabel: string | undefined =
          (selectedGroup?.label as string | undefined) ?? undefined;

        const secCode = detectSectionCodeFromGroupLabel(groupLabel);
        const sectionCode =
          secCode === "OTHER"
            ? null
            : (secCode as SectionGroupCode);

        const currentList = (form.getFieldValue("items") || []) as any[];

        if (packageMode === 1) {
          // GÓI THÀNH PHẦN → nổ từng dịch vụ con
          const rowList: any[] = [];

          rawItems.forEach((it: any) => {
            const sp = it.san_pham || it.sanPham || {};
            const sanPhamId = sp.id ?? it.san_pham_id;
            if (!sanPhamId) return;

            const code =
              sp.ma_san_pham ?? sp.ma_vt ?? sp.ma_sp ?? sp.code ?? "";
            const name =
              sp.ten_san_pham ?? sp.ten_vat_tu ?? sp.ten ?? sp.name ?? "";

            const soLuong = Number(it.so_luong ?? 1) || 1;
            const donGia = Number(
              it.don_gia ?? sp.gia_nhap_mac_dinh ?? 0
            );
            const thanhTien = soLuong * donGia;

            rowList.push({
              san_pham_id: sanPhamId,
              san_pham_label: [code, name].filter(Boolean).join(" - "),
              don_vi_tinh_id: undefined,
              so_luong: soLuong,
              don_gia: donGia,
              thanh_tien: thanhTien,
              hang_muc: baseHangMuc,
              hang_muc_goc: baseHangMuc ?? null,
              chi_tiet: name,
              section_code: sectionCode,
              is_package: false,
              package_items: null,
            });
          });

          if (!rowList.length) return;

          form.setFieldsValue({
            items: [...currentList, ...rowList],
          });
        } else {
          // GÓI TRỌN GÓI
          const row = {
            san_pham_id: repSanPhamId,
            san_pham_label:
              pkg.ten_goi || pkg.ma_goi || `Gói dịch vụ #${pkg.id}`,
            don_vi_tinh_id: PACKAGE_UNIT_ID,
            so_luong: 1,
            don_gia: packagePrice,
            thanh_tien: packagePrice,
            hang_muc: baseHangMuc,
            hang_muc_goc: baseHangMuc ?? null,
            chi_tiet: pkg.ten_goi || "",
            section_code: sectionCode,
            is_package: true,
            package_items: packageItems,
          };

          form.setFieldsValue({
            items: [...currentList, row],
          });
        }
      } catch (e) {
        console.error("[GoiDV] Lỗi khi load gói dịch vụ", e);
      } finally {
        setLoadingPackage(false);
      }
    },
    [
      form,
      isDisabled,
      selectedPackageId,
      selectedGroupId,
      selectedCategoryId,
      categoryOptions,
      groupOptions,
      packageDisplayMode,
    ]
  );

  // ===== UPDATE THÀNH TIỀN =====
  const updateLineTotal = useCallback(
    (rowIndex: number) => {
      const arr: any[] = form.getFieldValue("items") || [];
      if (!Array.isArray(arr) || !arr[rowIndex]) return;
      const row = { ...(arr[rowIndex] || {}) };
      const qty = Number(row.so_luong ?? 0);
      const price = Number(row.don_gia ?? 0);
      row.thanh_tien = qty * price;
      arr[rowIndex] = row;
      form.setFieldsValue({ items: arr });
    },
    [form]
  );

  // ===== TỔNG / VAT / THANH TOÁN =====
  const tongTienHang = useMemo(
    () =>
      (items || []).reduce(
        (sum, r: any) => sum + Number(r?.thanh_tien ?? 0),
        0
      ),
    [items]
  );

  const memberDiscountAmount = useMemo(() => {
    const total = Number(tongTienHang || 0);
    const percent = Number(giamGiaThanhVien || 0);
    if (total <= 0 || percent <= 0) return 0;
    return Math.round((total * percent) / 100);
  }, [tongTienHang, giamGiaThanhVien]);

  const subtotal = useMemo(() => {
    const total =
      (tongTienHang || 0) -
      (memberDiscountAmount || 0) -
      (giamGia || 0) +
      (chiPhi || 0);
    return Math.max(0, total);
  }, [tongTienHang, giamGia, chiPhi, memberDiscountAmount]);

  const vatAmount = useMemo(() => {
    if (Number(taxMode) !== 1) return 0;
    const rate = Number(vatRate ?? 0);
    if (!(rate > 0)) return 0;
    return Math.round((subtotal * rate) / 100);
  }, [taxMode, vatRate, subtotal]);

  const grandTotal = useMemo(
    () => (Number(taxMode) === 1 ? subtotal + vatAmount : subtotal),
    [taxMode, subtotal, vatAmount]
  );

  useEffect(() => {
    if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[0].value) {
      form.setFieldsValue({ so_tien_da_thanh_toan: 0 });
    } else if (loaiThanhToan === OPTIONS_LOAI_THANH_TOAN[2].value) {
      form.setFieldsValue({ so_tien_da_thanh_toan: grandTotal || 0 });
    }
  }, [loaiThanhToan, grandTotal, form]);

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

  // ===== HEADER BÁO GIÁ =====
  const maBaoGia = donHangInfo?.ma_don_hang ?? "";
  const projectName = donHangInfo?.project_name ?? "";
  const eventType = donHangInfo?.event_type ?? "";
  const guestCount = donHangInfo?.guest_count ?? "";

  const ngayToChucText = useMemo(() => {
    const raw =
      donHangInfo?.nguoi_nhan_thoi_gian ??
      donHangInfo?.event_start ??
      null;
    if (!raw) return "";
    const d = dayjs(raw);
    return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "";
  }, [donHangInfo]);

  const khachHangText = useMemo(() => {
    const kh = donHangInfo?.khach_hang || donHangInfo?.khachHang || {};
    const ten =
      kh?.ten_khach_hang ?? donHangInfo?.ten_khach_hang ?? "";
    return ten || "";
  }, [donHangInfo]);

  const venueText = useMemo(() => {
    const venueName = donHangInfo?.venue_name ?? "";
    const venueAddr =
      donHangInfo?.venue_address ??
      donHangInfo?.dia_chi_giao_hang ??
      "";
    if (venueName) return venueAddr ? `${venueName} - ${venueAddr}` : venueName;
    return venueAddr || "";
  }, [donHangInfo]);

  // ===== RENDER =====
  return (
    <div style={{ width: "100%" }}>
      {/* HEADER */}
      <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
        <Title level={5} style={{ marginBottom: 8, textTransform: "uppercase" }}>
          {isCreate ? "Thêm" : "Sửa"} HẠNG MỤC BÁO GIÁ –{" "}
          {maBaoGia || "(Mã báo giá sẽ tự sinh sau khi lưu)"}
        </Title>

        <Row gutter={[12, 4]}>
          <Col xs={24} md={12}>
            <Row>
              <Col span={8}>
                <Text strong>Mã báo giá:</Text>
              </Col>
              <Col span={16}>{maBaoGia || "-"}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Text strong>Dự án / Sự kiện:</Text>
              </Col>
              <Col span={16}>{projectName || eventType || ""}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Text strong>Ngày tổ chức:</Text>
              </Col>
              <Col span={16}>{ngayToChucText}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Text strong>Địa điểm:</Text>
              </Col>
              <Col span={16}>{venueText}</Col>
            </Row>
          </Col>

          <Col xs={24} md={12}>
            <Row>
              <Col span={8}>
                <Text strong>Khách hàng:</Text>
              </Col>
              <Col span={16}>{khachHangText}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Text strong>Loại sự kiện:</Text>
              </Col>
              <Col span={16}>{eventType || ""}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Text strong>Số khách dự kiến:</Text>
              </Col>
              <Col span={16}>{guestCount || ""}</Col>
            </Row>
          </Col>
        </Row>

        <Row style={{ marginTop: 8 }}>
          <Col span={24}>
            <Form.Item name="ghi_chu" label="Ghi chú nội bộ (báo giá)">
              <Input.TextArea
                rows={2}
                placeholder="Nhập ghi chú nội bộ cho báo giá (nếu cần)"
                disabled={isDisabled}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* PICKER GÓI DỊCH VỤ */}
      <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: 8 }}>
        <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 8 }}>
          <Col flex="auto">
            <Space size={8} wrap>
              <Text strong>Kiểu hiển thị gói:</Text>

              <Button
                type={packageDisplayMode === 1 ? "default" : "primary"}
                size="small"
                disabled={isDisabled}
                onClick={() => setPackageDisplayMode(0)}
              >
                Trọn gói (1 dòng)
              </Button>

              <Button
                type={packageDisplayMode === 1 ? "primary" : "default"}
                size="small"
                disabled={isDisabled}
                onClick={() => setPackageDisplayMode(1)}
              >
                Thành phần (nổ từng dịch vụ)
              </Button>
            </Space>
          </Col>
        </Row>


        <Row gutter={[8, 8]} align="middle">
          {/* Tầng 1: Nhóm Danh mục gói */}
          <Col span={6}>
            <Select
              showSearch
              allowClear
              placeholder="Nhóm Danh mục gói"
              value={selectedGroupId}
              disabled={isDisabled}
              onChange={(v) => {
                const next =
                  v === undefined || v === null ? undefined : String(v);
                console.log("[FHB] Group Select onChange v =", v, "next =", next);
                setSelectedGroupId(next);
                setSelectedCategoryId(undefined);
                setSelectedPackageId(undefined);
              }}
              optionFilterProp="children"
              getPopupContainer={(node) =>
                (node && node.closest(".ant-modal")) || document.body
              }
              dropdownMatchSelectWidth={false}
              popupClassName="phg-dd"
            >
              {groupOptions.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Col>

          {/* Tầng 2: Nhóm gói dịch vụ */}
          <Col span={6}>
            <Select
              showSearch
              allowClear
              placeholder="Nhóm gói dịch vụ"
              value={selectedCategoryId}
              disabled={isDisabled || !selectedGroupId}
              onChange={(v) => {
                const next =
                  v === undefined || v === null ? undefined : String(v);
                console.log("[FHB] Category Select onChange v =", v, "next =", next);
                setSelectedCategoryId(next);
                setSelectedPackageId(undefined);
              }}
              optionFilterProp="children"
              getPopupContainer={(node) =>
                (node && node.closest(".ant-modal")) || document.body
              }
              dropdownMatchSelectWidth={false}
              popupClassName="phg-dd"
            >
              {categoryOptions.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Col>

          {/* Tầng 3: Gói dịch vụ */}
          <Col span={8}>
            <Select
              showSearch
              allowClear
              placeholder="Gói dịch vụ"
              value={selectedPackageId}
              disabled={isDisabled || !selectedCategoryId}
              onChange={(v) => {
                const next =
                  v === undefined || v === null ? undefined : String(v);
                console.log("[FHB] Package Select onChange v =", v, "next =", next);
                setSelectedPackageId(next);
              }}
              optionFilterProp="children"
              getPopupContainer={(node) =>
                (node && node.closest(".ant-modal")) || document.body
              }
              dropdownMatchSelectWidth={false}
              popupClassName="phg-dd"
            >
              {packageOptions.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Col>

          {/* Nút thêm gói vào bảng hạng mục */}
          <Col span={4}>
            <Button
              type="dashed"
              onClick={() => handleAddPackageToList()}
              loading={loadingPackage}
              disabled={isDisabled || !selectedPackageId}
              style={{ width: "100%" }}
            >
              Thêm gói
            </Button>
          </Col>
        </Row>
      </Card>


      {/* BẢNG HẠNG MỤC + SECTION */}
      <Card size="small" bodyStyle={{ padding: 8 }} style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginBottom: 8 }}>
          Bảng hạng mục báo giá
        </Title>

        <div style={{ width: "100%", overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
        <colgroup>
  <col style={{ width: "4%" }} />   {/* STT */}
  <col style={{ width: "20%" }} />  {/* HẠNG MỤC – TĂNG LÊN */}
  <col style={{ width: "32%" }} />  {/* CHI TIẾT – hơi giảm 1 chút */}
  <col style={{ width: "8%" }} />   {/* ĐVT */}
  <col style={{ width: "8%" }} />   {/* SL */}
  <col style={{ width: "12%" }} />  {/* ĐƠN GIÁ */}
  <col style={{ width: "12%" }} />  {/* THÀNH TIỀN */}
  <col style={{ width: "4%" }} />   {/* X – THU HẸP LẠI */}
</colgroup>

            <thead>
              <tr>
                {["STT", "HẠNG MỤC", "CHI TIẾT", "ĐVT", "SL", "ĐƠN GIÁ", "THÀNH TIỀN", ""].map(
                  (h) => (
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
                  )
                )}
              </tr>
            </thead>

            <Form.List name="items">
              {(fields, { add, remove }) => {
                type SectionInfo = {
                  code: string;
                  letter: string;
                  label: string;
                  rows: number[];
                };

                const sections: SectionInfo[] = [];
                const secIndex = new Map<string, number>();

fields.forEach((field) => {
  const idx = Number(field.name);
  const row = items[idx] || {};

  const rawCode = row.section_code as string | null | undefined;
  const upper =
    typeof rawCode === "string" ? rawCode.toUpperCase() : "";

  // Ưu tiên dùng section_code nếu đã có (NS/CSVC/TIEC/TD/CPK/OTHER),
  // nếu không có thì gom vào OTHER (Khác)
  let normalized: string;
  if (rawCode && typeof rawCode === "string") {
    normalized = rawCode;
  } else if (upper && SECTION_ORDER.includes(upper as SectionGroupCode)) {
    normalized = upper;
  } else {
    normalized = "OTHER";
  }

  if (!secIndex.has(normalized)) {
    const letter = String.fromCharCode(65 + secIndex.size); // A,B,C,...
    const label = SECTION_LABELS[normalized] ?? "Khác";
    sections.push({
      code: normalized,
      letter,
      label,
      rows: [],
    });
    secIndex.set(normalized, sections.length - 1);
  }

  const sIdx = secIndex.get(normalized)!;
  sections[sIdx].rows.push(idx);
});



                       // Sắp xếp theo thứ tự NS/CSVC/TIEC/TD/CPK/OTHER
                sections.sort((a, b) => {
                  const ia = SECTION_ORDER.indexOf(a.code as SectionGroupCode);
                  const ib = SECTION_ORDER.indexOf(b.code as SectionGroupCode);
                  const na = ia < 0 ? 999 : ia;
                  const nb = ib < 0 ? 999 : ib;
                  return na - nb;
                });

                const fieldMap = new Map<number, any>();
                fields.forEach((f) => fieldMap.set(Number(f.name), f));

                return (
                  <tbody>
                    {sections.map((sec) => {
                      const visible = sec.rows.filter(
                        (i) => i >= startIndex && i < endIndex
                      );
                      if (!visible.length) return null;
                      let stt = 1;

                      return (
                        <>
                          {/* Hàng section: A. CƠ SỞ VẬT CHẤT, B. CHI PHÍ KHÁC, ... */}
                          <tr key={`sec-${sec.code}`} style={{ background: "#fde9d9" }}>
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
                              colSpan={6}
                              style={{
                                border: "1px solid #eee",
                                padding: "4px",
                              }}
                            />
                          </tr>

                          {visible.map((idx) => {
                            const field = fieldMap.get(idx);
                            const row = items[idx] || {};
                            const key = field.key;
                            const sttRow = stt++;

                            return (
                              <tr key={key}>
                                {/* STT + hidden tech fields */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "center",
                                  }}
                                >
                                  {sttRow}
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "san_pham_id"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "san_pham_label"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "section_code"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "is_package"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "package_items"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
                                  </Form.Item>
                                </td>

                                {/* HẠNG MỤC (sửa trực tiếp) */}
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
                                    <Input
                                      placeholder="Hạng mục"
                                      disabled={isDisabled}
                                    />
                                  </Form.Item>
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "hang_muc_goc"]}
                                    hidden
                                  >
                                    <Input type="hidden" />
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
                                      disabled={isDisabled}
                                    />
                                  </Form.Item>
                                </td>

                                {/* ĐVT */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                  }}
                                >
                                  <SelectFormApi
                                    name={[field.name, "don_vi_tinh_id"]}
                                    path={`${API_ROUTE_CONFIG.DON_VI_TINH}/options`}
                                    placeholder="ĐVT"
                                    disabled={isDisabled}
                                    allowClear={false}
                                    style={{ width: "100%" }}
                                    formItemProps={{ style: { marginBottom: 0 } }}
                                  />
                                </td>

                                {/* SL */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
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
                                      disabled={isDisabled}
                                      onChange={() => updateLineTotal(idx)}
                                    />
                                  </Form.Item>
                                </td>

                                {/* ĐƠN GIÁ */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "right",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "don_gia"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      style={{ width: "100%" }}
                                      formatter={formatter}
                                      parser={parser}
                                      addonAfter="đ"
                                      disabled={isDisabled}
                                      onChange={() => updateLineTotal(idx)}
                                    />
                                  </Form.Item>
                                </td>

                                {/* THÀNH TIỀN */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "right",
                                  }}
                                >
                                  <Form.Item
                                    {...field}
                                    name={[field.name, "thanh_tien"]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      style={{ width: "100%" }}
                                      formatter={formatter}
                                      parser={parser}
                                      addonAfter="đ"
                                      disabled
                                    />
                                  </Form.Item>
                                </td>

                                {/* Xoá dòng */}
                                <td
                                  style={{
                                    border: "1px solid #eee",
                                    padding: "3px",
                                    textAlign: "center",
                                  }}
                                >
                                  {!isDisabled && (
                                    <Button
                                      type="text"
                                      danger
                                      onClick={() => remove(field.name)}
                                    >
                                      X
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Nút thêm dòng cho section này */}
                          {!isDisabled && (
                            <tr>
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #eee",
                                  padding: "4px",
                                  textAlign: "left",
                                }}
                              >
                                <Button
                                  type="dashed"
                                  onClick={() =>
                                    handleAddRowForSection(sec.code as string)
                                  }
                                >
                                  + Thêm dòng cho {sec.label}
                                </Button>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}

                    {/* Footer: chỉ hiển thị tổng số dòng */}
                    {!isDisabled && (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            border: "1px solid #eee",
                            padding: "4px",
                            textAlign: "left",
                          }}
                        >
                          <Text type="secondary">
                            Tổng số dòng: {totalItems}
                          </Text>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );




              }}
            </Form.List>
          </table>
        </div>


      </Card>

      {/* BLOCK TIỀN / THUẾ / THANH TOÁN */}
      <Card size="small" bodyStyle={{ padding: 8 }} style={{ marginBottom: 12 }}>
        <Row gutter={[16, 8]} align="middle" wrap={false}>
          <Col flex="0 0 20%">
            <Form.Item
              name="giam_gia"
              label="Giảm giá"
              initialValue={0}
              style={{ marginBottom: 0 }}
              rules={[
                { required: true, message: "Giảm giá không được bỏ trống!" },
              ]}
            >
              <InputNumber
                placeholder="Nhập giảm giá"
                disabled={isDisabled}
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
              label="Chi phí khác (VND)"
              initialValue={0}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                placeholder="Nhập chi phí"
                disabled={isDisabled}
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
                options={[
                  { label: "Không thuế", value: 0 },
                  { label: "Có VAT", value: 1 },
                ]}
                placeholder="Chọn"
                disabled={isDisabled}
                getPopupContainer={(trigger) =>
                  (trigger && trigger.closest(".ant-modal")) || document.body
                }
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
                  disabled={isDisabled || Number(taxMode) !== 1}
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
              label={<span style={{ whiteSpace: "nowrap" }}>Loại thanh toán</span>}
              rules={[
                {
                  required: true,
                  message: "Loại thanh toán không được bỏ trống!",
                },
              ]}
              initialValue={0}
              style={{ marginBottom: 0 }}
            >
              <Select
                options={OPTIONS_LOAI_THANH_TOAN}
                placeholder="Chọn loại thanh toán"
                disabled={isDisabled}
                getPopupContainer={(trigger) =>
                  (trigger && trigger.closest(".ant-modal")) || document.body
                }
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
                    message: "Số tiền đã thanh toán không được bỏ trống!",
                  },
                  () => ({
                    validator(_, val) {
                      const max = Number(grandTotal || 0);
                      const num = Number(val || 0);
                      return num >= 0 && num <= max
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error(`Tối đa ${formatter(max)} đ`)
                          );
                    },
                  }),
                ]}
              >
                <InputNumber
                  placeholder="Nhập số tiền đã thanh toán"
                  disabled={isDisabled}
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
                {formatVietnameseCurrency(grandTotal)} đ
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
                {formatVietnameseCurrency(tongConLai)} đ
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* GHI CHÚ + NGƯỜI BÁO GIÁ (PDF) */}
      <Card size="small" bodyStyle={{ padding: 8 }}>
        <Title level={5} style={{ marginBottom: 8 }}>
          Ghi chú & Thông tin người báo giá trên PDF
        </Title>

        <Form.Item name="quote_footer_note" label="Ghi chú cuối PDF">
          <Input.TextArea
            rows={3}
            placeholder="VD: Giá đã bao gồm nhân sự & thiết bị theo mô tả; chưa bao gồm VAT..."
            disabled={isDisabled}
          />
        </Form.Item>

        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Form.Item name="quote_signer_name" label="Tên người báo giá">
              <Input placeholder="VD: Trần Tấn Phát" disabled={isDisabled} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="quote_signer_title" label="Chức danh người báo giá">
              <Input placeholder="VD: Phụ trách kinh doanh" disabled={isDisabled} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="quote_signer_phone" label="Điện thoại người báo giá">
              <Input
                placeholder="Nếu bỏ trống sẽ dùng số công ty"
                disabled={isDisabled}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="quote_signer_email"
              label="Email người báo giá"
              rules={[{ type: "email", message: "Email không hợp lệ" }]}
            >
              <Input
                placeholder="Nếu bỏ trống sẽ dùng email công ty"
                disabled={isDisabled}
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              name="quote_approver_note"
              label='Nội dung ô "XÁC NHẬN BÁO GIÁ"'
            >
              <Input
                placeholder="VD: Đại diện khách hàng, Trưởng phòng mua hàng..."
                disabled={isDisabled}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default FormHangMucBaoGia;
