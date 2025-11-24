/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useMemo } from "react";
import { Form, Select, type SelectProps, type FormItemProps } from "antd";
import type { ReactNode } from "react";
import { getDataSelect } from "../../services/getData.api";
import type { Rule } from "antd/es/form";

/** Kiểu option thống nhất */
type OptionItem = { value: string | number; label: string };

interface SelectFormApiProps
  extends Omit<SelectProps, "path" | "filter" | "reload"> {
  /** Hỗ trợ NamePath của AntD: string | number | (string|number)[] */
  name?: any;
  label?: ReactNode;
  rules?: Rule[];
  initialValue?: any;

  /** Endpoint để lấy options */
  path: string;
  /** Filter thêm khi gọi API */
  filter?: any;
  /** Thay đổi giá trị này để ép fetch lại */
  reload?: boolean | any;

  /** ⬇️ Chỉ đặt true khi muốn controlled bằng tay (mặc định để Form.Item control) */
  forceControlledValue?: boolean;

  /** Ép option.value về number nếu parse được (mặc định false) */
  coerceValueToNumber?: boolean;

  /** Bơm sẵn option để hiển thị ngay (ví dụ {value: id hiện có, label: tên}) */
  extraOptions?: OptionItem[];

  /** ✅ (MỚI) danh sách mã ưu tiên — chỉ khi bạn truyền prop này */
  priorityCodes?: string[];
    /** Prop cho chính Form.Item bọc bên ngoài (để chỉnh marginBottom, className, ...) */
  formItemProps?: FormItemProps;
}

const DEBOUNCE_MS = 350;
const PAGE_SIZE = 30;

/** ===== Helper ưu tiên mã ===== */
const _eq = (a?: string, b?: string) =>
  (a ?? "").trim().toUpperCase() === (b ?? "").trim().toUpperCase();

function sortWithPriority(opts: OptionItem[], priorityCodes?: string[]) {
  if (!Array.isArray(opts) || !priorityCodes?.length) return opts;

  // map: code -> rank theo thứ tự bạn truyền
  const weight = new Map<string, number>();
  priorityCodes.forEach((c, i) => weight.set(c.trim().toUpperCase(), i));

  const rankOf = (o: OptionItem) => {
    const L = String(o?.label ?? "").toUpperCase();
    const V = typeof o?.value === "string" ? o.value.toUpperCase() : "";
    // match chính xác value hoặc label chứa mã
    for (const c of priorityCodes) {
      const C = c.trim().toUpperCase();
      if (_eq(V, C) || L.includes(C)) return weight.get(C) ?? 9999;
    }
    return 9999;
  };

  return [...opts]
    .map((o, i) => ({ o, i, r: rankOf(o) }))
    .sort((A, B) => {
      if (A.r !== B.r) return A.r - B.r; // nhóm ưu tiên lên trước theo thứ tự
      return A.i - B.i;                  // ổn định phần còn lại
    })
    .map((x) => x.o);
}

const SelectFormApi = ({
  mode,
  name,
  label,
  rules,
  initialValue,
  path,
  filter,
  placeholder,
  onChange,
  size = "middle",
  disabled,
  reload,
  value, // ⚠️ chỉ dùng khi forceControlledValue = true
  forceControlledValue = false,
  coerceValueToNumber = false,
  extraOptions,
  /** ⬇️ quan trọng: bóc tách để KHÔNG bị forward xuống <Select> */
  priorityCodes,
  getPopupContainer,
  dropdownMatchSelectWidth,
  popupClassName,
  formItemProps,
  ...restProps
}: SelectFormApiProps) => {
  const [apiOptions, setApiOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const keywordRef = useRef<string>("");
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Chuẩn hoá value theo cờ coerceValueToNumber */
  const normalizeValue = (raw: any): string | number => {
    if (coerceValueToNumber) {
      const n = Number(raw);
      return Number.isFinite(n) ? n : String(raw ?? "");
    }
    return typeof raw === "number" ? raw : String(raw ?? "");
  };

  /** Gộp extraOptions (prefill) + apiOptions, loại trùng theo value */
  const mergedOptions: OptionItem[] = useMemo(() => {
    const prefills = (extraOptions ?? []).map((o) => ({
      value: normalizeValue(o.value),
      label: o.label,
    }));
    const fetched = (apiOptions ?? []).map((o) => ({
      value: normalizeValue(o.value),
      label: o.label,
    }));

    const seen = new Set<string | number>();
    const out: OptionItem[] = [];
    for (const arr of [prefills, fetched]) {
      for (const it of arr) {
        const key = it.value;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(it);
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraOptions, apiOptions, coerceValueToNumber]);

  const fetchOptions = async (kw: string) => {
    if (!path || path.trim() === "") {
      setApiOptions([]);
      return;
    }
    setLoading(true);
    try {
      const query = (kw || "").trim();

      const data = await getDataSelect(path, {
        ...(filter || {}),
        keyword: query,
        q: query,
        search: query,
        term: query,
        limit: PAGE_SIZE,
      });

      const list: OptionItem[] = Array.isArray(data)
        ? data.map((item: any) => {
            const fallbackLabel =
              item.label ??
              item.ten_san_pham ??
              item.name ??
              [item.ma_khach_hang, item.ten_khach_hang, item.so_dien_thoai]
                .filter(Boolean)
                .join(" - ");
            const raw = item.id ?? item.value;
            return {
              value: normalizeValue(raw),
              label: String(fallbackLabel ?? ""),
            };
          })
        : [];

      // ✅ chỉ sắp xếp ưu tiên khi có priorityCodes
      setApiOptions(sortWithPriority(list, priorityCodes));
    } catch (e) {
      console.error("Error fetching options:", e);
      setApiOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions(keywordRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, path, reload, /* đảm bảo đổi ưu tiên sẽ re-sort khi reload */ priorityCodes]);

  const handleSearch = (kw: string) => {
    keywordRef.current = kw;
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => fetchOptions(kw), DEBOUNCE_MS);
  };

  const handleDropdownVisible = (open: boolean) => {
    if (open) handleSearch(keywordRef.current || "");
  };

  // ✅ Để Form.Item điều khiển giá trị: KHÔNG forward `value` trừ khi bắt buộc
  const selectProps: SelectProps = {
    options: mergedOptions,
    placeholder,
    mode,
    showSearch: true,
    allowClear: true,
    size,
    disabled,
    loading,
    onSearch: handleSearch,
    filterOption: false,
    optionFilterProp: "label",
    onDropdownVisibleChange: handleDropdownVisible,
    notFoundContent: loading ? "Đang tìm..." : "Không có dữ liệu",
    // Neo dropdown vào modal nếu không truyền từ ngoài
    getPopupContainer:
      getPopupContainer ||
      ((node) => (node && (node.closest(".ant-modal") as HTMLElement)) || document.body),
    // Giữ UI linh hoạt trong modal
    dropdownMatchSelectWidth: dropdownMatchSelectWidth ?? false,
    popupClassName: popupClassName ?? "phg-dd",
    ...restProps,
  };

  if (onChange) {
    selectProps.onChange = (v, opt) => onChange(v, opt);
  }
  if (forceControlledValue) {
    selectProps.value = value;
  }

  return (
    <Form.Item
      name={name}
      label={label}
      rules={rules}
      initialValue={initialValue}
      {...formItemProps}
    >
      <Select {...selectProps} />
    </Form.Item>
  );

};

export default SelectFormApi;
