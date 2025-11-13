/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  InputNumber,
  Row,
  Typography,
  type FormInstance,
  Select,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

import SelectFormApi from "../../../components/select/SelectFormApi";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";
import { formatter, parser } from "../../../utils/utils";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { getDataSelect } from "../../../services/getData.api";


// ===== ƯU TIÊN 3 MÃ TRÊN CÙNG CHỈ CHO Ô CHỌN SẢN PHẨM =====
const PRIORITY_CODES = ["KG00001", "KG00002", "MO00001"] as const;
// ✅ whitelist mã được phép Nhập tay "Giá bán"
const EDITABLE_PRICE_CODES = new Set(["KG00001", "KG00002", "MO00001"]);


type OptionItem = { value: number | string; label: string; code?: string };

const sortWithPriority = (opts: OptionItem[]) => {
  if (!opts?.length) return opts;
  const rank = new Map(PRIORITY_CODES.map((c, i) => [c.toUpperCase(), i]));
  return [...opts]
    .map((o, i) => ({
      o,
      i,
      r: (() => {
        const L = String(o.label ?? "").toUpperCase();
        const V = String(o.value ?? "").toUpperCase();
        const C = String(o.code ?? "").toUpperCase();
        for (const c of PRIORITY_CODES) {
          const C0 = c.toUpperCase();
          if (C === C0 || V === C0 || L.includes(C0)) return rank.get(C0) ?? 9999;
        }
        return 9999;
      })(),
    }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r - b.r))
    .map((x) => x.o);
};

/** Chỉ dùng cho ô chọn SẢN PHẨM: tự fetch + tự sắp xếp ưu tiên */
function ProductPicker({
  value,
  onChange,
  disabled,
  placeholder,
  fallbackLabel, // NEW
}: {
  value?: number | string;
  onChange?: (v: any, opt?: any) => void;
  disabled?: boolean;
  placeholder?: string;
  fallbackLabel?: string; // NEW
}) {


  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const kwRef = useRef("");
// Chuẩn hoá value: nếu Form bơm {value,label} thì lấy id; nếu là số/string thì cast
const valueId: string | undefined =
  value && typeof value === "object" && "value" in (value as any)
    ? String((value as any).value)
    : (value == null ? undefined : String(value));

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
            code:
              it.ma_san_pham ?? it.ma_vt ?? it.ma_sp ?? it.code ?? it.ma ?? "",
          }))
        : [];
      setOptions(sortWithPriority(list));
    } finally {
      setLoading(false);
    }
  };

  // NEW: tải 1 sản phẩm theo id để dựng label đầy đủ khi mở form xem/sửa
// NEW: tải 1 sản phẩm theo id (unwrap dạng {data: {...}}) để dựng label đầy đủ
// DÙNG AXIOS (getDataSelect) ĐỂ BẢO TOÀN AUTH/COOKIE
const fetchOneById = async (id: number | string) => {
  try {
    const raw: any = await getDataSelect(`${API_ROUTE_CONFIG.SAN_PHAM}/${id}`, {});
    const it: any = raw?.data ?? raw ?? {};

    const code =
      it?.ma_san_pham ?? it?.ma_vt ?? it?.ma_sp ?? it?.code ?? "";
    const name =
      it?.ten_san_pham ?? it?.ten_vat_tu ?? it?.ten ?? it?.name ?? "";

    return {
      value: String(it?.id ?? id),
      label: [code, name].filter(Boolean).join(" - ") || String(id),
      code,
    } as OptionItem;
  } catch {
    return null;
  }
};



  useEffect(() => {
    fetchOptions("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DEBUG: log lần đầu vào
useEffect(() => {
  console.log("[PP] mount value=", value, " fallbackLabel=", fallbackLabel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


// NEW: Nếu có fallbackLabel từ BE (đã load kèm đơn) → bơm option ngay
useEffect(() => {
  if (!fallbackLabel || !valueId) return;
  const exists = options.some((o) => String(o.value) === valueId);
  if (!exists) {
    setOptions((prev) => sortWithPriority([{ value: valueId, label: fallbackLabel }, ...prev]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [valueId, fallbackLabel]);




// NEW: Khi mở Xem/Sửa, nếu value hiện tại chưa có trong options thì tải 1 bản ghi và thêm vào
useEffect(() => {
  (async () => {
    if (!valueId) return;
    const exists = options.some((o) => String(o.value) === valueId);
    if (exists) return;
    const one = await fetchOneById(valueId);
    if (one) setOptions((prev) => sortWithPriority([one, ...prev]));
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [valueId]);




  const handleSearch = (kw: string) => {
    kwRef.current = kw;
    window.clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = window.setTimeout(() => fetchOptions(kw), 300);
  };






return (
  <Select
    labelInValue
    value={value as any}          // ⬅️ FORWARD GIÁ TRỊ TỪ FORM XUỐNG SELECT
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
// ===== HẾT BLOCK ƯU TIÊN =====




const LOAI_GIA_OPTIONS = [
  { label: "Đặt ngay", value: 1 },
  { label: "Đặt trước 3 ngày", value: 2 },
] as const;

const DanhSachSanPham = ({
  form,
  isDetail,
}: {
  form: FormInstance;
  isDetail: boolean;
}) => {
  // Watch toàn bộ danh sách sản phẩm để lấy giá trị ở từng dòng
  const danhSachSanPham = Form.useWatch("danh_sach_san_pham", form) || [];


  // Lấy mã từ option hoặc label (ví dụ "... - KG00001")
const extractCodeFromOption = (opt?: any): string | null => {
  if (!opt) return null;
  const c = opt.code ?? opt.ma_san_pham ?? opt.ma_vt ?? opt.ma_sp ?? opt.ma ?? null;
  if (c) return String(c);
  const L = String(opt.label ?? "").toUpperCase();
  const m = L.match(/\b(KG|MO)\d{5}\b/i);
  return m ? m[0] : null;
};

// Fallback: lấy mã theo id sản phẩm (chỉ gọi khi cần)
const loadProductCodeById = async (id?: number | string): Promise<string | null> => {
  if (!id) return null;
  try {
    const raw: any = await getDataSelect(`${API_ROUTE_CONFIG.SAN_PHAM}/${id}`, {});
    const it: any = raw?.data ?? raw ?? {};
    return (it?.ma_san_pham || it?.ma_sp || it?.code || it?.ma_vt || null) as string | null;
  } catch {
    return null;
  }
};


  // ✅ theo dõi hàng nào được bật ô "Giá bán"
const [editablePriceRows, setEditablePriceRows] = useState<Record<number, boolean>>({});


const handleChangeSanPham = useCallback(
  async (name: number, value?: any, option?: any) => {
    // reset các field phụ thuộc
    form.setFieldValue(["danh_sach_san_pham", name, "don_vi_tinh_id"], undefined);
    form.setFieldValue(["danh_sach_san_pham", name, "loai_gia"], undefined);
    form.setFieldValue(["danh_sach_san_pham", name, "so_luong"], undefined);
    form.setFieldValue(["danh_sach_san_pham", name, "don_gia"], undefined);
    form.setFieldValue(["danh_sach_san_pham", name, "tong_tien"], undefined);

    // 1) thử lấy mã từ option
    let code = extractCodeFromOption(option);

    // 2) nếu chưa có → fallback gọi theo id (value)
    if (!code) code = await loadProductCodeById(value);

    // Lưu (nếu muốn dùng lại ở render sau)
    form.setFieldValue(["danh_sach_san_pham", name, "ma_san_pham"], code || undefined);

    // Bật/tắt ô Giá bán theo whitelist
    const canEdit = !!code && EDITABLE_PRICE_CODES.has(String(code).toUpperCase());
    setEditablePriceRows((prev) => ({ ...prev, [name]: canEdit }));
  },
  [form]
);



  const handleGetGiaBanSanPham = useCallback(
    async (
      name: number,
      sanPhamId?: number,
      donViTinhId?: number,
      loaiGia?: number
    ) => {
      form.setFieldValue(["danh_sach_san_pham", name, "don_gia"], undefined);

      if (!sanPhamId || !donViTinhId || !loaiGia) return;

      const response = await getDataSelect(
        API_ROUTE_CONFIG.QUAN_LY_BAN_HANG + `/get-gia-ban-san-pham`,
        {
          san_pham_id: sanPhamId,
          don_vi_tinh_id: donViTinhId,
          loai_gia: loaiGia,
        }
      );

      if (response !== undefined && response !== null) {
        form.setFieldValue(["danh_sach_san_pham", name, "don_gia"], response);
      }
    },
    [form]
  );

  return (
    <>
      <Card>
        <Typography.Title level={4}>Danh sách sản phẩm</Typography.Title>
        <Divider />
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
                <Row gutter={[8, 8]} className="product-row" style={{ marginBottom: 16 }}>
                  <Col span={7}>
                    <Typography.Text strong>Tên SP/NVL</Typography.Text>
                  </Col>
                  <Col span={3}>
                    <Typography.Text strong>Đơn vị tính</Typography.Text>
                  </Col>
                  <Col span={3}>
                    <Typography.Text strong>Loại giá</Typography.Text>
                  </Col>
                  <Col span={4}>
                    <Typography.Text strong>Giá bán</Typography.Text>
                  </Col>
                  <Col span={2}>
                    <Typography.Text strong>Số lượng</Typography.Text>
                  </Col>
                  <Col span={3}>
                    <Typography.Text strong>Tổng tiền</Typography.Text>
                  </Col>
                  <Col span={2}>
                    <Typography.Text strong>Thao tác</Typography.Text>
                  </Col>
                </Row>

                {fields.map(({ key, name, ...restField }) => {
                  const sanPhamId = danhSachSanPham?.[name]?.san_pham_id;
                  const donViTinhId = danhSachSanPham?.[name]?.don_vi_tinh_id;

                  return (
                    <Row
                      key={key}
                      gutter={[8, 8]}
                      className="product-row"
                      style={{ marginBottom: 8 }}
                    >
<Col span={7}>
<Form.Item
  {...restField}
  name={[name, "san_pham_id"]}
  rules={[{ required: true, message: "Vui lòng chọn sản phẩm!" }]}

  // ✅ Quan trọng: nếu form đã có dạng {value,label} thì trả nguyên xi,
  //   còn nếu là id (số/chuỗi) thì bọc thành {value,label} để Select hiển thị đúng
  getValueProps={(val: any) => {
    if (val && typeof val === "object" && "value" in val) {
      // Form đang giữ object { value, label } → trả thẳng, KHÔNG stringify
      return { value: val };
    }
    const v = val == null ? undefined : String(val);
    const lbl = danhSachSanPham?.[name]?.san_pham_label || v;
    return v == null ? { value: undefined } : { value: { value: v, label: lbl } };
  }}

  // Khi người dùng chọn lại, chỉ lưu id thuần (để BE nhận id)
  getValueFromEvent={(opt: any) => (opt && opt.value) ? opt.value : opt}
>
  <ProductPicker
    placeholder="Chọn sản phẩm"
    disabled={isDetail}
    onChange={(v: any, opt: any) => handleChangeSanPham(name, v, opt)}
    fallbackLabel={danhSachSanPham?.[name]?.san_pham_label || undefined}
  />
</Form.Item>

</Col>




                    {/* ĐƠN VỊ TÍNH (3) */}
<Col span={3}>
  <SelectFormApi
    name={[name, "don_vi_tinh_id"]}
   
    rules={[{ required: true, message: "Vui lòng chọn đơn vị tính!" }]}
    path={
      sanPhamId
        ? `${API_ROUTE_CONFIG.DON_VI_TINH}/options-by-san-pham/${sanPhamId}`
        : ""
    }
    reload={sanPhamId}
    placeholder="Chọn đơn vị tính"
    showSearch
    disabled={isDetail || !sanPhamId}
    onChange={(value) => {
      const loaiGia = danhSachSanPham?.[name]?.loai_gia;
      if (loaiGia) {
        handleGetGiaBanSanPham(
          name,
          danhSachSanPham?.[name]?.san_pham_id,
          value,
          loaiGia
        );
      } else {
        form.setFieldValue(
          ["danh_sach_san_pham", name, "don_gia"],
          undefined
        );
      }
    }}
  />
</Col>


                      {/* LOẠI GIÁ (3) */}
                      <Col span={3}>
                        <Form.Item
                          {...restField}
                          name={[name, "loai_gia"]}
                          rules={[
                            { required: true, message: "Vui lòng chọn loại giá!" },
                          ]}
                        >
                          <Select
                            options={LOAI_GIA_OPTIONS as any}
                            placeholder="Chọn loại giá"
                            disabled={isDetail || !sanPhamId || !donViTinhId}
                            onChange={(value) => {
                              handleGetGiaBanSanPham(
                                name,
                                danhSachSanPham?.[name]?.san_pham_id,
                                danhSachSanPham?.[name]?.don_vi_tinh_id,
                                value
                              );
                            }}
                          />
                        </Form.Item>
                      </Col>

                      {/* GIÁ BÁN (don_gia) (4) */}
                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, "don_gia"]}
                          rules={[
                            { required: true, message: "Vui lòng nhập giá bán!" },
                          ]}
                        >
              <InputNumber
  min={0}
  placeholder={editablePriceRows[name] ? "Nhập giá" : "Giá tự động"}
  style={{ width: "100%" }}
  formatter={formatter}
  parser={parser}
  addonAfter="đ"
  disabled={isDetail || !editablePriceRows[name]}
/>

                        </Form.Item>
                      </Col>

                      {/* SỐ LƯỢNG (2) */}
                      <Col span={2}>
                        <Form.Item
                          {...restField}
                          name={[name, "so_luong"]}
                          rules={[
                            { required: true, message: "Vui lòng nhập số lượng!" },
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

                      {/* TỔNG TIỀN (3) – nghe theo don_gia */}
                      <Col span={3}>
                        <Form.Item
                          {...restField}
                          name={[name, "tong_tien"]}
                          dependencies={[
                            [name, "so_luong"],
                            [name, "don_gia"], // 👉 đổi sang don_gia
                            [name, "chiet_khau"],
                          ]}
                        >
                          <InputNumber
                            placeholder="Tổng tiền"
                            style={{ width: "100%" }}
                            formatter={formatter}
                            parser={parser}
                            disabled
                            addonAfter="đ"
                          />
                        </Form.Item>
                      </Col>

                      {/* XOÁ (2) */}
                      <Col span={2}>
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          disabled={isDetail}
                        />
                      </Col>
                    </Row>
                  );
                })}

                {!isDetail && (
                  <Row>
                    <Col span={24}>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        block
                        icon={<PlusOutlined />}
                      >
                        Thêm sản phẩm
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
