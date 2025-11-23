/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Typography,
  type FormInstance,
  Select,
  notification,
  Space,     
} from "antd";
import { useCallback, useEffect, useState } from "react";

import SelectFormApi from "../../../components/select/SelectFormApi";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";
import { formatter, parser } from "../../../utils/utils";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { getDataSelect, getDataById } from "../../../services/getData.api";

type OptionItem = { value: number | string; label: string };
type PackageOption = { value: number | string; label: string };
type GroupOption = { value: number | string; label: string };
type CategoryOption = { value: number | string; label: string };

// Các group dịch vụ (map 1-1 với group_code)
type SectionGroupCode = "NS" | "CSVC" | "TIEC" | "TD" | "CPK";

// 🔹 Nhóm danh mục dịch vụ (dùng cho chọn DỊCH VỤ LẺ 3 tầng)
const SERVICE_GROUP_OPTIONS = [
  { label: "Nhân sự", value: "NS" },
  { label: "Cơ sở vật chất", value: "CSVC" },
  { label: "Tiệc", value: "TIEC" },
  { label: "Thuê địa điểm", value: "TD" },
  { label: "Chi phí khác", value: "CPK" },
];

// Map sectionGroupCode → các từ khoá dùng để tìm Nhóm danh mục gói dịch vụ phù hợp
const SECTION_GROUP_KEYWORDS: Record<SectionGroupCode, string[]> = {
  NS:   ["nhân sự"],
  CSVC: ["cơ sở vật chất", "csvc"],
  TIEC: ["tiệc"],
  TD:   ["thuê địa điểm", "địa điểm"],
  CPK:  ["chi phí khác", "chi phí"],
};

// ID đơn vị tính "Gói" trong don_vi_tinhs
const PACKAGE_UNIT_ID = 15;

// ==== PICKER CHỌN DỊCH VỤ (SAN_PHAM) CHO TỪNG DÒNG ====

function ProductPicker({
  value,
  onChange,
  disabled,
  placeholder,
  fallbackLabel,
}: {
  value?: number | string;
  onChange?: (v: any, opt?: any) => void;
  disabled?: boolean;
  placeholder?: string;
  fallbackLabel?: string;
}) {
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Chuẩn hoá value, hỗ trợ cả id thuần lẫn {value,label}
  const valueId: string | undefined =
    value && typeof value === "object" && "value" in (value as any)
      ? String((value as any).value)
      : value == null
      ? undefined
      : String(value);

  const fetchOptions = async (kw = "") => {
    setLoading(true);
    try {
      const q = kw.trim();
      const data = await getDataSelect(`${API_ROUTE_CONFIG.SAN_PHAM}/options`, {
        keyword: q,
        q,
        search: q,
        term: q,
        limit: 30,
      });
      const list: OptionItem[] = Array.isArray(data)
        ? data.map((it: any) => ({
            value: String(it.id ?? it.value),
            label:
              it.label ??
              it.ten_san_pham ??
              it.name ??
              [it.ma_san_pham, it.ten_san_pham].filter(Boolean).join(" - "),
          }))
        : [];
      setOptions(list);
    } finally {
      setLoading(false);
    }
  };

  // Tải 1 dịch vụ theo id để dựng label đầy đủ (khi sửa đơn)
  const fetchOneById = async (id: number | string) => {
    try {
      const raw: any = await getDataSelect(
        `${API_ROUTE_CONFIG.SAN_PHAM}/${id}`,
        {}
      );
      const it: any = raw?.data ?? raw ?? {};
      const code =
        it?.ma_san_pham ?? it?.ma_vt ?? it?.ma_sp ?? it?.code ?? "";
      const name =
        it?.ten_san_pham ?? it?.ten_vat_tu ?? it?.ten ?? it?.name ?? "";
      return {
        value: String(it?.id ?? id),
        label: [code, name].filter(Boolean).join(" - ") || String(id),
      } as OptionItem;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    fetchOptions("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nếu có fallbackLabel (BE đã gửi kèm label) -> bơm vào options để hiển thị luôn
  useEffect(() => {
    if (!fallbackLabel || !valueId) return;
    const exists = options.some((o) => String(o.value) === valueId);
    if (!exists) {
      setOptions((prev) => [
        { value: valueId, label: fallbackLabel },
        ...prev,
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId, fallbackLabel]);

  // Khi sửa đơn mà value hiện tại chưa có trong options -> fetch thêm 1 record
  useEffect(() => {
    (async () => {
      if (!valueId) return;
      const exists = options.some((o) => String(o.value) === valueId);
      if (exists) return;
      const one = await fetchOneById(valueId);
      if (one) setOptions((prev) => [one, ...prev]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId]);

  const handleSearch = (kw: string) => {
    fetchOptions(kw);
  };

  return (
    <Select
      labelInValue
      value={value as any}
      onChange={(v: any, opt: any) => onChange?.(v?.value ?? v, opt)}
      options={options}
      showSearch
      allowClear
      placeholder={placeholder}
      loading={loading}
      filterOption={false}
      onSearch={handleSearch}
      optionFilterProp="label"
      disabled={disabled}
      style={{ width: "100%" }}
      getPopupContainer={(node) =>
        (node && (node.closest(".ant-modal") as HTMLElement)) || document.body
      }
      dropdownMatchSelectWidth={false}
      popupClassName="phg-dd"
      notFoundContent={loading ? "Đang tìm..." : "Không có dữ liệu"}
    />
  );
}

// ==== END ProductPicker ====


const DanhSachSanPham = ({
  form,
  isDetail,
  sectionGroupCode,
  sectionLabel,
}: {
  form: FormInstance;
  isDetail: boolean;
  /**
   * Khi truyền sectionGroupCode => component chạy ở mode WIZARD
   * - Chỉ hiển thị các dòng có row.section_code === sectionGroupCode
   * - Các dòng mới thêm sẽ tự gắn section_code = sectionGroupCode
   */
  sectionGroupCode?: SectionGroupCode;
  /** Nhãn cho section: Nhân sự / CSVC / TIEC / TD / CPK (dùng cho title nếu cần) */
  sectionLabel?: string;
}) => {
  // Watch toàn bộ danh sách dịch vụ
  const danhSachSanPham = Form.useWatch("danh_sach_san_pham", form) || [];
  const isWizardSection = !!sectionGroupCode;

  // 🔹 Phân trang trong từng section (NS / CSVC / TIEC / TD / CPK)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [maxPage, setMaxPage] = useState<number>(1);

  // 🔹 Chế độ hiển thị gói: 0 = Trọn gói, 1 = Thành phần
const [packageDisplayMode, setPackageDisplayMode] = useState<0 | 1>(0);


  // Thêm 1 dòng chi tiết gói dịch vụ (package_items) cho 1 row gói
  const handleAddPackageItemRow = (rowIndex: number) => {



    const list = (form.getFieldValue("danh_sach_san_pham") || []) as any[];
    const currentRow = list[rowIndex] || {};
    const currentItems = Array.isArray(currentRow.package_items)
      ? [...currentRow.package_items]
      : [];

    currentItems.push({
      ten_san_pham: "",
      so_luong: 1,
      don_vi_tinh: "",
      ghi_chu: "",
    });

    list[rowIndex] = {
      ...currentRow,
      package_items: currentItems,
    };

    form.setFieldsValue({ danh_sach_san_pham: list });
  };

  // Tính tổng số trang (maxPage) theo dữ liệu hiện tại trong từng section
  useEffect(() => {
    if (!isWizardSection || !sectionGroupCode) {
      // Không ở mode wizard → luôn dùng 1 trang
      setCurrentPage(1);
      setMaxPage(1);
      return;
    }

    const pages = new Set<number>();

    (danhSachSanPham || []).forEach((row: any) => {
      if (!row) return;
      const sec = row.section_code as string | undefined;
      if (sec && sec.toUpperCase() === sectionGroupCode) {
        const p = Number(row.section_page ?? 1);
        if (p > 0) {
          pages.add(p);
        }
      }
    });

    const max = pages.size ? Math.max(...Array.from(pages)) : 1;
    setMaxPage(max);

    setCurrentPage((prev) => {
      if (!prev || prev < 1) return 1;
      if (prev > max) return max;
      return prev;
    });
  }, [isWizardSection, sectionGroupCode, danhSachSanPham]);
  const handleNextPage = () => {
    if (!isWizardSection) return;
    setCurrentPage((prev) => (prev < maxPage ? prev + 1 : prev));
  };

  const handlePrevPage = () => {
    if (!isWizardSection) return;
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const handleAddPage = () => {
    if (!isWizardSection) return;
    const next = maxPage + 1;
    setMaxPage(next);
    setCurrentPage(next);
  };

  // ========== CHỌN GÓI DỊCH VỤ & NỔ RA CHI TIẾT (3 TẦNG) ==========
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<
    string | number | undefined
  >(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | number | undefined
  >(undefined);
  const [selectedPackageId, setSelectedPackageId] = useState<
    string | number | undefined
  >(undefined);

  const [loadingPackage, setLoadingPackage] = useState(false);

  // 3 tầng cho DỊCH VỤ LẺ
  const [serviceGroupCode, setServiceGroupCode] = useState<string | undefined>(
    sectionGroupCode
  );
  const [serviceCategoryOptions, setServiceCategoryOptions] = useState<
    OptionItem[]
  >([]);
  const [serviceCategoryId, setServiceCategoryId] = useState<
    string | number | undefined
  >(undefined);

  const [serviceChildCategoryOptions, setServiceChildCategoryOptions] =
    useState<OptionItem[]>([]);
  const [serviceChildCategoryId, setServiceChildCategoryId] = useState<
    string | number | undefined
  >(undefined);

  const [serviceOptions, setServiceOptions] = useState<OptionItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<
    string | number | undefined
  >(undefined);
  const [loadingService, setLoadingService] = useState(false);

  // Khi có sectionGroupCode (wizard) → lock group, set luôn serviceGroupCode
  useEffect(() => {
    if (sectionGroupCode) {
      setServiceGroupCode(sectionGroupCode);
    }
  }, [sectionGroupCode]);

  // 1️⃣ Tải danh sách NHÓM DANH MỤC GÓI DỊCH VỤ (tầng 1)
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getDataSelect(
          `${API_ROUTE_CONFIG.GOI_DICH_VU_GROUP}/options`,
          {}
        );
        const list: GroupOption[] = Array.isArray(data)
          ? data.map((it: any) => ({
              value: it.value ?? it.id,
              label: it.label ?? it.ten_nhom ?? it.name,
            }))
          : [];
        setGroupOptions(list);
      } catch (e) {
        // ignore
      }
    };
    fetchGroups();
  }, []);


    // 🌟 Khi đang ở wizard (có sectionGroupCode), tự chọn Nhóm danh mục gói dịch vụ phù hợp
  useEffect(() => {
    if (!sectionGroupCode) return;
    if (!groupOptions || groupOptions.length === 0) return;

    const keywords = SECTION_GROUP_KEYWORDS[sectionGroupCode];
    if (!keywords || keywords.length === 0) return;

    const lowerKeywords = keywords.map((k) => k.toLowerCase());

    const matched = groupOptions.find((opt) => {
      const label = String(opt.label ?? "").toLowerCase();
      return lowerKeywords.some((kw) => label.includes(kw));
    });

    if (matched) {
      setSelectedGroupId(matched.value);
    } else {
      // Không tìm thấy group phù hợp → để user chọn tay (trong chế độ legacy),
      // nhưng vì wizard đã ẩn ô group, nên coi như không có gì để chọn.
      setSelectedGroupId(undefined);
    }
  }, [sectionGroupCode, groupOptions]);

  // 2️⃣ Khi chọn Group → load NHÓM GÓI DỊCH VỤ (tầng 2)
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
              value: it.value ?? it.id,
              label: it.label ?? it.ten_nhom_goi ?? it.name,
            }))
          : [];
        setCategoryOptions(list);
        setSelectedCategoryId(undefined);
        setPackageOptions([]);
        setSelectedPackageId(undefined);
      } catch (e) {
        setCategoryOptions([]);
      }
    };
    fetchCategories();
  }, [selectedGroupId]);

  // 3️⃣ Khi chọn Category → load GÓI DỊCH VỤ (tầng 3)
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
              value: it.value ?? it.id,
              label: it.label ?? it.ten_goi ?? it.name,
            }))
          : [];
        setPackageOptions(list);
        setSelectedPackageId(undefined);
      } catch (e) {
        setPackageOptions([]);
      }
    };
    fetchPackages();
  }, [selectedCategoryId]);

  // ====== Hàm thêm GÓI vào danh sách (1 dòng, giá = giá gói) ======
  const handleAddPackageToList = useCallback(
    async (pkgId?: string | number) => {
      const rawId = pkgId ?? selectedPackageId;

      // ép id về number cho chắc
      const idToUse =
        rawId !== undefined && rawId !== null ? Number(rawId) : undefined;

      if (!idToUse || Number.isNaN(idToUse) || isDetail) return;

      setLoadingPackage(true);
      try {
        // Lấy chi tiết gói bằng helper getDataById
        const pkg: any = await getDataById(
          idToUse,
          API_ROUTE_CONFIG.GOI_DICH_VU_PACKAGE
        );

        if (!pkg || typeof pkg !== "object") {
          console.warn("[GoiDV] Không tìm thấy dữ liệu gói hợp lệ", pkg);
          return;
        }
// 0 = Trọn gói, 1 = Thành phần
const packageModeFromBE: number = Number(pkg.package_mode ?? 0);

// 🔹 Chế độ hiệu lực: ưu tiên lựa chọn tại màn báo giá
const packageMode: number = packageDisplayMode ?? packageModeFromBE;


        // Mảng items từ BE
        const rawItems: any[] = Array.isArray(pkg.items) ? pkg.items : [];

        if (!rawItems.length) {
          console.warn("[GoiDV] Gói không có items", pkg);
          notification.error({
            message: "Gói dịch vụ chưa có chi tiết",
            description:
              "Gói bạn chọn chưa cấu hình danh sách dịch vụ con. Vào Quản lý Gói dịch vụ → Gói dịch vụ, thêm 'Cấu hình chi tiết trong gói', rồi thử lại.",
          });
          return;
        }

        // Giá gói: ưu tiên giá khuyến mãi, sau đó giá niêm yết
        let packagePrice = Number(
          pkg.gia_khuyen_mai != null ? pkg.gia_khuyen_mai : pkg.gia_niem_yet
        );
        if (!packagePrice || packagePrice <= 0) {
          // fallback: lấy tổng thanh_tien các items
          packagePrice = rawItems.reduce(
            (sum, it: any) => sum + Number(it.thanh_tien ?? 0),
            0
          );
        }

        // Dùng item đầu tiên làm san_pham_id "đại diện" cho gói
        const first = rawItems[0];
        const sp0 = first.san_pham || first.sanPham || {};
        const repSanPhamId = sp0.id ?? first.san_pham_id;

        if (!repSanPhamId) {
          console.warn(
            "[GoiDV] Không tìm được san_pham_id đại diện cho gói",
            {
              pkg,
              first,
            }
          );
          return;
        }

        // Map chi tiết con để hiện trong Card "Chi tiết gói dịch vụ"
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
            don_vi_tinh: "", // nếu sau này cần thì map thêm
            ghi_chu: it.ghi_chu ?? "",
          };
        });

// 🔹 Hạng mục gốc cơ bản = tên Nhóm gói dịch vụ (Nhóm gói tầng 2)
const selectedCategory = categoryOptions.find(
  (opt) => String(opt.value) === String(selectedCategoryId)
);
const baseHangMucGoc: string | undefined =
  (selectedCategory?.label as string | undefined) ?? undefined;

const currentList = (form.getFieldValue("danh_sach_san_pham") ||
  []) as any[];

// 🔹 Với GÓI THÀNH PHẦN: tạo key Hạng mục gốc RIÊNG cho mỗi gói (để Step 8 tách ra)
//    - Đếm tất cả các dòng có cùng "gốc" (VD: "Hệ thống âm thanh", "Hệ thống âm thanh #2", ...)
//    - Gói mới sẽ là:   Hệ thống âm thanh         (nếu chưa có gói nào)
//                       Hệ thống âm thanh #2      (gói thứ 2)
//                       Hệ thống âm thanh #3      (gói thứ 3) ...
let hangMucGoc: string | undefined = baseHangMucGoc;

if (packageMode === 1 && baseHangMucGoc) {
  const sameRootCount = currentList.filter((r: any) => {
    const v = String(r?.hang_muc_goc ?? "");
    return (
      v === baseHangMucGoc ||
      v.startsWith(`${baseHangMucGoc} #`)
    );
  }).length;

  if (sameRootCount === 0) {
    // Gói thành phần đầu tiên của nhóm này → dùng tên gốc
    hangMucGoc = baseHangMucGoc;
  } else {
    // Gói thứ 2 trở đi → #2, #3, ...
    hangMucGoc = `${baseHangMucGoc} #${sameRootCount + 1}`;
  }
}


        // 🔹 Nếu package_mode = 1 → GÓI THÀNH PHẦN → nổ thành nhiều dòng dịch vụ con
        if (packageMode === 1) {
          const componentRows: any[] = [];

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
            const tongTien = soLuong * donGia;

     componentRows.push({
  san_pham_id: sanPhamId,
  san_pham_label: [code, name].filter(Boolean).join(" - "),
  // ĐVT: để trống cho anh chọn theo từng dịch vụ
  don_vi_tinh_id: undefined,
  so_luong: soLuong,
  don_gia: donGia,
  tong_tien: tongTien,
  is_package: false, // ❗ từng dòng là dịch vụ lẻ
  hang_muc_goc: hangMucGoc, // 🔹 KEY RIÊNG cho từng gói thành phần
  section_code: sectionGroupCode ?? undefined,
  section_page: currentPage, // 🔹 TRANG HIỆN TẠI
});

          });

          if (componentRows.length === 0) {
            console.warn("[GoiDV] Gói thành phần không có dịch vụ hợp lệ", pkg);
            return;
          }

          form.setFieldValue("danh_sach_san_pham", [
            ...currentList,
            ...componentRows,
          ]);
        } else {
          // 🔹 GÓI TRỌN GÓI (bundle) – giữ behaviour cũ: 1 dòng + card chi tiết
const row = {
  san_pham_id: repSanPhamId,
  san_pham_label:
    pkg.ten_goi || pkg.ma_goi || `Gói dịch vụ #${pkg.id}`,
  don_vi_tinh_id: PACKAGE_UNIT_ID, // Gói
  so_luong: 1,
  don_gia: packagePrice,
  tong_tien: packagePrice,
  is_package: true,
  package_items: packageItems,
  hang_muc_goc: baseHangMucGoc,
  section_code: sectionGroupCode ?? undefined,
  section_page: currentPage, // 🔹 TRANG HIỆN TẠI
};


          form.setFieldValue("danh_sach_san_pham", [...currentList, row]);
        }




      } catch (e) {
        console.error("[GoiDV] Lỗi khi load gói dịch vụ", e);
      } finally {
        setLoadingPackage(false);
      }
    },
   [form, isDetail, selectedPackageId, sectionGroupCode, selectedCategoryId, categoryOptions, currentPage]

  );

  // ========== CHỌN DỊCH VỤ LẺ 4 TẦNG (chỉ dùng khi KHÔNG ở wizard) ==========

  // Khi chọn Nhóm danh mục dịch vụ (NS/CSVC/...) → load DANH MỤC TẦNG 1
  useEffect(() => {
    const fetchServiceCategoriesLevel1 = async () => {
      if (!serviceGroupCode) {
        setServiceCategoryOptions([]);
        setServiceCategoryId(undefined);
        setServiceChildCategoryOptions([]);
        setServiceChildCategoryId(undefined);
        setServiceOptions([]);
        setSelectedServiceId(undefined);
        return;
      }
      try {
        const data = await getDataSelect(
          `${API_ROUTE_CONFIG.DANH_MUC_SAN_PHAM}/options?level=1&group_code=${encodeURIComponent(
            serviceGroupCode
          )}`,
          {}
        );
        const list: OptionItem[] = Array.isArray(data)
          ? data.map((it: any) => ({
              value: it.value ?? it.id,
              label: it.label ?? it.ten_danh_muc ?? it.name,
            }))
          : [];
        setServiceCategoryOptions(list);
        setServiceCategoryId(undefined);
        setServiceChildCategoryOptions([]);
        setServiceChildCategoryId(undefined);
        setServiceOptions([]);
        setSelectedServiceId(undefined);
      } catch {
        setServiceCategoryOptions([]);
        setServiceCategoryId(undefined);
        setServiceChildCategoryOptions([]);
        setServiceChildCategoryId(undefined);
        setServiceOptions([]);
        setSelectedServiceId(undefined);
      }
    };

    // Chỉ chạy khi KHÔNG ở wizard (vì wizard không cho chọn dịch vụ lẻ)
    if (!isWizardSection) {
      fetchServiceCategoriesLevel1();
    }
  }, [serviceGroupCode, isWizardSection]);

  // Khi chọn DANH MỤC TẦNG 1 → load DANH MỤC TẦNG 2
  useEffect(() => {
    const fetchServiceCategoriesLevel2 = async () => {
      if (!serviceCategoryId) {
        setServiceChildCategoryOptions([]);
        setServiceChildCategoryId(undefined);
        setServiceOptions([]);
        setSelectedServiceId(undefined);
        return;
      }
      try {
        const data = await getDataSelect(
          `${API_ROUTE_CONFIG.DANH_MUC_SAN_PHAM}/options?level=2&parent_id=${serviceCategoryId}`,
          {}
        );
        const list: OptionItem[] = Array.isArray(data)
          ? data.map((it: any) => ({
              value: it.value ?? it.id,
              label: it.label ?? it.ten_danh_muc ?? it.name,
            }))
          : [];
        setServiceChildCategoryOptions(list);
        setServiceChildCategoryId(undefined);
        setServiceOptions([]);
        setSelectedServiceId(undefined);
      } catch {
        setServiceChildCategoryOptions([]);
        setServiceChildCategoryId(undefined);
        setServiceOptions([]);
        setSelectedServiceId(undefined);
      }
    };

    if (!isWizardSection) {
      fetchServiceCategoriesLevel2();
    }
  }, [serviceCategoryId, isWizardSection]);

  // Khi chọn DANH MỤC TẦNG 2 → load DỊCH VỤ
  useEffect(() => {
    const fetchServices = async () => {
      if (!serviceChildCategoryId) {
        setServiceOptions([]);
        setSelectedServiceId(undefined);
        return;
      }
      try {
        const data = await getDataSelect(
          `${API_ROUTE_CONFIG.SAN_PHAM}/options?danh_muc_id=${serviceChildCategoryId}`,
          {}
        );
        const list: OptionItem[] = Array.isArray(data)
          ? data.map((it: any) => ({
              value: it.value ?? it.id,
              label:
                it.label ??
                it.ten_san_pham ??
                [it.ma_san_pham, it.ten_san_pham]
                  .filter(Boolean)
                  .join(" - "),
            }))
          : [];
        setServiceOptions(list);
        setSelectedServiceId(undefined);
      } catch {
        setServiceOptions([]);
        setSelectedServiceId(undefined);
      }
    };

    if (!isWizardSection) {
      fetchServices();
    }
  }, [serviceChildCategoryId, isWizardSection]);

  // Thêm DỊCH VỤ lẻ vào danh sách (chỉ dùng khi không phải wizard)
  const handleAddServiceToList = useCallback(
    async (svcId?: string | number) => {
      if (isWizardSection) return; // wizard không dùng dịch vụ lẻ

      const rawId = svcId ?? selectedServiceId;
      const idToUse =
        rawId !== undefined && rawId !== null ? Number(rawId) : undefined;

      if (!idToUse || Number.isNaN(idToUse) || isDetail) return;

      setLoadingService(true);
      try {
        const sp: any = await getDataById(
          idToUse,
          API_ROUTE_CONFIG.SAN_PHAM
        );

        if (!sp || typeof sp !== "object") {
          console.warn("[DV] Không tìm thấy dữ liệu dịch vụ", sp);
          return;
        }

        const sanPhamId = sp.id;
        if (!sanPhamId) return;

        const soLuong = 1;
        const donGia = Number(sp.gia_nhap_mac_dinh ?? 0);
        const tongTien = soLuong * donGia;

        const code =
          sp.ma_san_pham ?? sp.ma_vt ?? sp.ma_sp ?? sp.code ?? "";
        const name =
          sp.ten_san_pham ?? sp.ten_vat_tu ?? sp.ten ?? sp.name ?? "";

        const currentList = form.getFieldValue("danh_sach_san_pham") || [];

        form.setFieldValue("danh_sach_san_pham", [
          ...currentList,
          {
            san_pham_id: sanPhamId,
            san_pham_label: [code, name].filter(Boolean).join(" - "),
            don_vi_tinh_id: undefined,
            so_luong: soLuong,
            don_gia: donGia,
            tong_tien: tongTien,
          },
        ]);
      } catch (e) {
        console.error("[DV] Lỗi khi load dịch vụ", e);
      } finally {
        setLoadingService(false);
      }
    },
    [form, isDetail, selectedServiceId, isWizardSection]
  );

  const handleChangeSanPham = useCallback(
    async (name: number, value?: any, option?: any) => {
      // reset các field phụ thuộc
      form.setFieldValue(
        ["danh_sach_san_pham", name, "don_vi_tinh_id"],
        undefined
      );
      form.setFieldValue(
        ["danh_sach_san_pham", name, "so_luong"],
        undefined
      );
      form.setFieldValue(
        ["danh_sach_san_pham", name, "don_gia"],
        undefined
      );
      form.setFieldValue(
        ["danh_sach_san_pham", name, "tong_tien"],
        undefined
      );

      // reset flag gói dịch vụ + chi tiết gói
      form.setFieldValue(
        ["danh_sach_san_pham", name, "is_package"],
        false
      );
      form.setFieldValue(
        ["danh_sach_san_pham", name, "package_items"],
        undefined
      );

      // Lưu label dịch vụ để hiển thị lại khi sửa đơn
      const label = option?.label ?? undefined;
      if (label) {
        form.setFieldValue(
          ["danh_sach_san_pham", name, "san_pham_label"],
          label
        );
      }

      // Nếu có san_pham_id mới → kiểm tra xem có phải GÓI DỊCH VỤ kiểu cũ không
      if (value) {
        try {
          const raw: any = await getDataSelect(
            `${API_ROUTE_CONFIG.SAN_PHAM}/${value}`,
            {}
          );
          const it: any = raw?.data ?? raw ?? {};

          if (
            it?.loai_san_pham === "GOI_DICH_VU" &&
            Array.isArray(it.package_items) &&
            it.package_items.length > 0
          ) {
            const items = it.package_items.map((pIt: any) => ({
              ten_san_pham:
                pIt?.item?.ten_san_pham ??
                pIt?.item_name ??
                pIt?.ten_san_pham ??
                "",
              so_luong: pIt?.so_luong ?? 0,
              don_vi_tinh: pIt?.don_vi_tinh ?? "",
              ghi_chu: pIt?.ghi_chu ?? "",
            }));

            form.setFieldValue(
              ["danh_sach_san_pham", name, "is_package"],
              true
            );
            form.setFieldValue(
              ["danh_sach_san_pham", name, "package_items"],
              items
            );
          }
        } catch {
          // ignore, nếu lỗi thì coi như dịch vụ thường
        }
      }
    },
    [form]
  );

  return (
    <>
         <Card>
      <Typography.Title
        level={5}
        style={{ marginBottom: 8 }}
      >
        {sectionLabel
          ? `Danh sách dịch vụ - ${sectionLabel}`
          : "Danh sách dịch vụ"}
      </Typography.Title>
      <Divider style={{ margin: "8px 0 12px" }} />



        {/* ========== THANH ĐIỀU KHIỂN TRANG (WIZARD) ========== */}
        {isWizardSection && (
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: 8 }}
          >
            <Col>
              <Typography.Text strong>
                {sectionLabel
                  ? `Trang ${currentPage} / ${maxPage} - ${sectionLabel}`
                  : `Trang ${currentPage} / ${maxPage}`}
              </Typography.Text>
            </Col>
            <Col>
              <Space size={8}>
                <Button
                  size="small"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                >
                  Trang trước
                </Button>
                <Button
                  size="small"
                  onClick={handleNextPage}
                  disabled={currentPage >= maxPage}
                >
                  Trang sau
                </Button>
                <Button
                  size="small"
                  type="dashed"
                  onClick={handleAddPage}
                >
                  + Thêm trang
                </Button>
              </Space>
            </Col>
          </Row>
        )}


{/* ========== KHU VỰC CHỌN NHANH ========== */}
{!isDetail && (
  <>
    {/* 🔹 Chọn cách hiển thị gói: Trọn gói / Thành phần */}
    <Row style={{ marginBottom: 8 }}>
      <Col span={24}>
        <Space size={8}>
          <Typography.Text strong>Kiểu hiển thị gói:</Typography.Text>
          <Button
            type={packageDisplayMode === 0 ? "primary" : "default"}
            size="small"
            onClick={() => setPackageDisplayMode(0)}
          >
            Trọn gói (1 dòng)
          </Button>
          <Button
            type={packageDisplayMode === 1 ? "primary" : "default"}
            size="small"
            onClick={() => setPackageDisplayMode(1)}
          >
            Thành phần (nổ từng dịch vụ)
          </Button>
        </Space>
      </Col>
    </Row>

    {/* 1️⃣ Chọn GÓI DỊCH VỤ (3 tầng) */}
    <Row
      gutter={[8, 8]}
      style={{ marginBottom: 12, alignItems: "center" }}
    >

              {/* Tầng 1: Nhóm danh mục gói */}
{!sectionGroupCode && (
                <Col span={5}>
                  <Select
                    showSearch
                    allowClear
                    placeholder="Nhóm danh mục gói dịch vụ"
                    options={groupOptions}
                    value={selectedGroupId}
                    onChange={(v) => {
                      setSelectedGroupId(v);
                    }}
                    optionFilterProp="label"
                    getPopupContainer={(node) =>
                      (node &&
                        (node.closest(".ant-modal") as HTMLElement)) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Col>
              )}

              {/* Tầng 2: Nhóm gói */}
              <Col span={5}>
                <Select
                  showSearch
                  allowClear
                  placeholder="Nhóm gói dịch vụ"
                  options={categoryOptions}
                  value={selectedCategoryId}
                  onChange={(v) => {
                    setSelectedCategoryId(v);
                  }}
                  optionFilterProp="label"
                  disabled={!selectedGroupId}
                  getPopupContainer={(node) =>
                    (node &&
                      (node.closest(".ant-modal") as HTMLElement)) ||
                    document.body
                  }
                  dropdownMatchSelectWidth={false}
                  popupClassName="phg-dd"
                />
              </Col>

              {/* Tầng 3: Gói dịch vụ */}
              <Col span={10}>
                <Select
                  showSearch
                  allowClear
                  placeholder="Gói dịch vụ"
                  options={packageOptions}
                  value={selectedPackageId}
                  onChange={(v) => setSelectedPackageId(v)}
                  optionFilterProp="label"
                  disabled={!selectedCategoryId}
                  getPopupContainer={(node) =>
                    (node &&
                      (node.closest(".ant-modal") as HTMLElement)) ||
                    document.body
                  }
                  dropdownMatchSelectWidth={false}
                  popupClassName="phg-dd"
                />
              </Col>

              {/* Nút thêm gói */}
              <Col span={4}>
                <Button
                  type="dashed"
                  onClick={() => handleAddPackageToList()}


                  loading={loadingPackage}
                  disabled={!selectedPackageId}
                  style={{ width: "100%" }}
                >
                  Thêm gói vào danh sách
                </Button>
              </Col>
            </Row>

            {/* 2️⃣ Chọn DỊCH VỤ LẺ (4 tầng) – CHỈ khi KHÔNG ở wizard */}
            {!isWizardSection && (
              <Row
                gutter={[8, 8]}
                style={{ marginBottom: 16, alignItems: "center" }}
              >
                {/* Tầng 1: Nhóm danh mục dịch vụ (NS, CSVC,...) */}
                <Col span={5}>
                  <Select
                    allowClear
                    placeholder="Nhóm danh mục dịch vụ"
                    options={SERVICE_GROUP_OPTIONS}
                    value={serviceGroupCode}
                    onChange={(v) => setServiceGroupCode(v)}
                    getPopupContainer={(node) =>
                      (node &&
                        (node.closest(".ant-modal") as HTMLElement)) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Col>

                {/* Tầng 2: Danh mục TẦNG 1 */}
                <Col span={5}>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Danh mục tầng 1"
                    options={serviceCategoryOptions}
                    value={serviceCategoryId}
                    onChange={(v) => setServiceCategoryId(v)}
                    optionFilterProp="label"
                    disabled={!serviceGroupCode}
                    getPopupContainer={(node) =>
                      (node &&
                        (node.closest(".ant-modal") as HTMLElement)) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Col>

                {/* Tầng 3: Danh mục TẦNG 2 */}
                <Col span={5}>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Danh mục tầng 2"
                    options={serviceChildCategoryOptions}
                    value={serviceChildCategoryId}
                    onChange={(v) => setServiceChildCategoryId(v)}
                    optionFilterProp="label"
                    disabled={!serviceCategoryId}
                    getPopupContainer={(node) =>
                      (node &&
                        (node.closest(".ant-modal") as HTMLElement)) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Col>

                {/* Tầng 4: Chi tiết dịch vụ */}
                <Col span={7}>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Chi tiết dịch vụ"
                    options={serviceOptions}
                    value={selectedServiceId}
                    onChange={(v) => setSelectedServiceId(v)}
                    optionFilterProp="label"
                    disabled={!serviceChildCategoryId}
                    loading={loadingService}
                    getPopupContainer={(node) =>
                      (node &&
                        (node.closest(".ant-modal") as HTMLElement)) ||
                      document.body
                    }
                    dropdownMatchSelectWidth={false}
                    popupClassName="phg-dd"
                  />
                </Col>

                {/* Nút thêm dịch vụ */}
                <Col span={2}>
                  <Button
                    type="dashed"
                    onClick={() => handleAddServiceToList()}
                    loading={loadingService}
                    disabled={!selectedServiceId}
                    style={{ width: "100%" }}
                  >
                    Thêm dịch vụ
                  </Button>
                </Col>
              </Row>
            )}
          </>
        )}

        {/* ========== FORM.LIST CHI TIẾT DỊCH VỤ ========== */}
        <div
          className="product-list-container"
          style={{
            overflowX: "auto",
            overflowY: "visible",
          }}
        >
          <Form.List name="danh_sach_san_pham">
            {(fields, { add, remove }) => (
              <>
                {/* Header: tổng span = 24 */}
                <Row
                  gutter={[8, 8]}
                  className="product-row"
                  style={{ marginBottom: 16 }}
                >
                  <Col span={9}>
                    <Typography.Text strong>Dịch vụ / Gói dịch vụ</Typography.Text>
                  </Col>
                  <Col span={4}>
                    <Typography.Text strong>Đơn vị tính</Typography.Text>
                  </Col>
                  <Col span={4}>
                    <Typography.Text strong>Đơn giá</Typography.Text>
                  </Col>
                  <Col span={3}>
                    <Typography.Text strong>Số lượng</Typography.Text>
                  </Col>
                  <Col span={3}>
                    <Typography.Text strong>Thành tiền</Typography.Text>
                  </Col>
                  <Col span={1}>
                    <Typography.Text strong> </Typography.Text>
                  </Col>
                </Row>

                {fields.map(({ key, name, ...restField }) => {
                  const row = danhSachSanPham?.[name] || {};
                  const sanPhamId = row?.san_pham_id;
                  const isPackage = !!row?.is_package;
                  const packageItems: any[] = Array.isArray(row?.package_items)
                    ? row.package_items
                    : [];

                  const rawSecCode = row?.section_code as string | undefined;
                  const rowSectionCode = rawSecCode
                    ? (rawSecCode.toUpperCase() as SectionGroupCode)
                    : undefined;
                  const rowPage = row?.section_page ? Number(row.section_page) || 1 : 1;

                  if (isWizardSection) {
                    if (rowSectionCode && rowSectionCode !== sectionGroupCode) {
                      return null; // ẩn dòng khác group
                    }
                    if (rowPage !== currentPage) {
                      return null; // ẩn dòng khác trang
                    }
                  }

                  // 🔹 ĐVT: luôn lấy full list /don-vi-tinh/options
                  const dvtPath = `${API_ROUTE_CONFIG.DON_VI_TINH}/options`;

                  return (
                    <div key={key}>
                      <Row
                        gutter={[8, 8]}
                        className="product-row"
                        style={{ marginBottom: isPackage ? 4 : 8 }}
                      >
                        {/* DỊCH VỤ / GÓI */}
                        <Col span={9}>
                          <Form.Item
                            {...restField}
                            name={[name, "san_pham_id"]}
                            rules={[
                              {
                                required: true,
                                message: "Vui lòng chọn dịch vụ!",
                              },
                            ]}
                            getValueProps={(val: any) => {
                              if (val && typeof val === "object" && "value" in val) {
                                return { value: val };
                              }
                              const v = val == null ? undefined : String(val);
                              const lbl =
                                danhSachSanPham?.[name]?.san_pham_label || v;
                              return v == null
                                ? { value: undefined }
                                : { value: { value: v, label: lbl } };
                            }}
                            getValueFromEvent={(opt: any) =>
                              opt && opt.value ? opt.value : opt
                            }
                          >
                            <ProductPicker
                              placeholder="Chọn dịch vụ"
                              disabled={isDetail}
                              onChange={(v: any, opt: any) =>
                                handleChangeSanPham(name, v, opt)
                              }
                              fallbackLabel={
                                danhSachSanPham?.[name]?.san_pham_label ||
                                undefined
                              }
                            />
                          </Form.Item>
                        </Col>

                        {/* ĐƠN VỊ TÍNH */}
                        <Col span={4}>
                          <SelectFormApi
                            name={[name, "don_vi_tinh_id"]}
                            rules={[
                              {
                                required: true,
                                message: "Vui lòng chọn đơn vị tính!",
                              },
                            ]}
                            path={dvtPath}
                            placeholder="Chọn đơn vị tính"
                            showSearch
                            // Khoá khi đang xem chi tiết hoặc chưa chọn dịch vụ
                            disabled={isDetail || !sanPhamId}
                          />
                        </Col>

                        {/* ĐƠN GIÁ (don_gia) */}
                        <Col span={4}>
                          <Form.Item
                            {...restField}
                            name={[name, "don_gia"]}
                            rules={[
                              {
                                required: true,
                                message: "Vui lòng nhập đơn giá!",
                              },
                            ]}
                          >
                            <InputNumber
                              min={0}
                              placeholder="Đơn giá"
                              style={{ width: "100%" }}
                              formatter={formatter}
                              parser={parser}
                              addonAfter="đ"
                              disabled={isDetail}
                            />
                          </Form.Item>
                        </Col>

                        {/* SỐ LƯỢNG */}
                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, "so_luong"]}
                            rules={[
                              {
                                required: true,
                                message: "Vui lòng nhập số lượng!",
                              },
                            ]}
                          >
                            <InputNumber
                              min={1}
                              placeholder="Số lượng"
                              style={{ width: "100%" }}
                              disabled={isDetail}
                            />
                          </Form.Item>
                        </Col>

                        {/* THÀNH TIỀN (hiển thị, disable) */}
                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, "tong_tien"]}
                            dependencies={[
                              [name, "so_luong"],
                              [name, "don_gia"],
                            ]}
                          >
                            <InputNumber
                              placeholder="Thành tiền"
                              style={{ width: "100%" }}
                              formatter={formatter}
                              parser={parser}
                              disabled
                              addonAfter="đ"
                            />
                          </Form.Item>
                        </Col>

                        {/* XOÁ DÒNG */}
                        <Col span={1}>
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(name)}
                            disabled={isDetail}
                          />
                        </Col>
                      </Row>

                      {/* Chi tiết gói dịch vụ – EDITABLE khi không phải isDetail */}
                      {!isDetail && isPackage && packageItems.length > 0 && (
                        <Row
                          style={{
                            marginBottom: 12,
                            paddingLeft: 24,
                          }}
                        >
                          <Col span={23}>
                            <Card
                              size="small"
                              type="inner"
                              title="Chi tiết gói dịch vụ"
                            >
                              <Row
                                style={{
                                  fontWeight: 600,
                                  marginBottom: 4,
                                }}
                              >
                                <Col span={14}>Thiết bị / Dịch vụ con</Col>
                                <Col span={4}>Số lượng</Col>
                                <Col span={6}>Ghi chú</Col>
                              </Row>
                              {packageItems.map((_pIt, idx) => (
                                <Row
                                  key={idx}
                                  style={{ marginBottom: 4 }}
                                  gutter={4}
                                >
                                  <Col span={14}>
                                    <Form.Item
                                      name={[
                                        name,
                                        "package_items",
                                        idx,
                                        "ten_san_pham",
                                      ]}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Input placeholder="Tên thiết bị / dịch vụ con" />
                                    </Form.Item>
                                  </Col>
                                  <Col span={4}>
                                    <Form.Item
                                      name={[
                                        name,
                                        "package_items",
                                        idx,
                                        "so_luong",
                                      ]}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <InputNumber
                                        min={0}
                                        style={{ width: "100%" }}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={6}>
                                    <Form.Item
                                      name={[
                                        name,
                                        "package_items",
                                        idx,
                                        "ghi_chu",
                                      ]}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Input placeholder="Ghi chú" />
                                    </Form.Item>
                                  </Col>
                                </Row>
              
                              ))}
                              {/* 👉 Nút thêm dòng chi tiết gói dịch vụ (CHỈ dùng khi Thêm/Sửa) */}
        <Row style={{ marginTop: 8 }}>
          <Col span={24}>
            <Button
              type="dashed"
              size="small"
              onClick={() => handleAddPackageItemRow(name)}
            >
              + Thêm dòng chi tiết
            </Button>
          </Col>
        </Row>
                            </Card>
                          </Col>
                        </Row>
                      )}

                      {/* Chi tiết gói dịch vụ – READONLY khi isDetail */}
                      {isDetail && isPackage && packageItems.length > 0 && (
                        <Row
                          style={{
                            marginBottom: 12,
                            paddingLeft: 24,
                          }}
                        >
                          <Col span={23}>
                            <Card
                              size="small"
                              type="inner"
                              title="Chi tiết gói dịch vụ"
                            >
                              <Row
                                style={{
                                  fontWeight: 600,
                                  marginBottom: 4,
                                }}
                              >
                                <Col span={14}>Thiết bị / Dịch vụ con</Col>
                                <Col span={4}>Số lượng</Col>
                                <Col span={6}>Ghi chú</Col>
                              </Row>
                              {packageItems.map((pIt, idx) => (
                                <Row key={idx} style={{ marginBottom: 2 }}>
                                  <Col span={14}>
                                    <Typography.Text>
                                      {pIt.ten_san_pham || "-"}
                                    </Typography.Text>
                                  </Col>
                                  <Col span={4}>
                                    <Typography.Text>
                                      {pIt.so_luong ?? 0}
                                    </Typography.Text>
                                  </Col>
                                  <Col span={6}>
                                    <Typography.Text type="secondary">
                                      {pIt.ghi_chu || ""}
                                    </Typography.Text>
                                  </Col>
                                </Row>
                              ))}
                            </Card>
                          </Col>
                        </Row>
                      )}
                    </div>
                  );
                })}

                {/* Nút thêm dịch vụ lẻ – chỉ còn dùng cho mode không wizard */}
                {!isDetail && !isWizardSection && (
                  <Row>
                    <Col span={24}>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        block
                        icon={<PlusOutlined />}
                      >
                        Thêm dịch vụ
                      </Button>
                    </Col>
                  </Row>
                )}
              </>
            )}
          </Form.List>
        </div>
      </Card>
    </>
  );
};

export default DanhSachSanPham;
