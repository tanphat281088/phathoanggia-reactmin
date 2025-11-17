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
import { useCallback, useEffect, useState } from "react";

import SelectFormApi from "../../../components/select/SelectFormApi";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";
import { formatter, parser } from "../../../utils/utils";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { getDataSelect } from "../../../services/getData.api";

type OptionItem = { value: number | string; label: string };

// ==== PICKER CHỌN DỊCH VỤ (SAN_PHAM) ====

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
}: {
  form: FormInstance;
  isDetail: boolean;
}) => {
  // Watch toàn bộ danh sách dịch vụ
  const danhSachSanPham = Form.useWatch("danh_sach_san_pham", form) || [];

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

      // Nếu có san_pham_id mới → kiểm tra xem có phải GÓI DỊCH VỤ không
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
        } catch (e) {
          // ignore, nếu lỗi thì coi như dịch vụ thường
        }
      }
    },
    [form]
  );

  return (
    <>
      <Card>
        <Typography.Title level={4}>Danh sách dịch vụ</Typography.Title>
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
                <Row
                  gutter={[8, 8]}
                  className="product-row"
                  style={{ marginBottom: 16 }}
                >
                  <Col span={9}>
                    <Typography.Text strong>Dịch vụ</Typography.Text>
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
                  const packageItems: any[] = Array.isArray(
                    row?.package_items
                  )
                    ? row.package_items
                    : [];

                  return (
                    <div key={key}>
                      <Row
                        gutter={[8, 8]}
                        className="product-row"
                        style={{ marginBottom: isPackage ? 4 : 8 }}
                      >
                        {/* DỊCH VỤ */}
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
                              if (
                                val &&
                                typeof val === "object" &&
                                "value" in val
                              ) {
                                return { value: val };
                              }
                              const v =
                                val == null ? undefined : String(val);
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
                            path={
                              sanPhamId
                                ? `${API_ROUTE_CONFIG.DON_VI_TINH}/options-by-san-pham/${sanPhamId}`
                                : ""
                            }
                            reload={sanPhamId}
                            placeholder="Chọn đơn vị tính"
                            showSearch
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

                      {/* ✅ Nếu là GÓI DỊCH VỤ: hiển thị chi tiết thiết bị bên trong gói */}
                      {isPackage && packageItems.length > 0 && (
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
                                <Row
                                  key={idx}
                                  style={{ marginBottom: 2 }}
                                >
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

                {!isDetail && (
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
