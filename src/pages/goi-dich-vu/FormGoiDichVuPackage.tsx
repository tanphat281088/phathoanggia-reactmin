/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  type FormInstance,
  Select,
  Button,
} from "antd";
import { useEffect } from "react";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { createFilterQuery, formatter, parser } from "../../utils/utils";
import SelectFormApi from "../../components/select/SelectFormApi";
import { trangThaiSelect } from "../../configs/select-config";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

// ===== 1 dòng chi tiết gói (items.*) =====
type PackageItemRowProps = {
  field: any;
  remove: (name: any) => void;
  isDetail: boolean;
  form: FormInstance;
};

const PackageItemRow = ({ field, remove, isDetail, form }: PackageItemRowProps) => {
  // Theo dõi thư mục đang chọn ở dòng này
  const folderId = Form.useWatch(["items", field.name, "danh_muc_id"], form);

  return (
    <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
      {/* Thư mục / Danh mục chi tiết (Loa, Mixer, Đèn...) */}
      <Col span={6}>
        <SelectFormApi
          name={[field.name, "danh_muc_id"]}
          label={undefined}
          path={API_ROUTE_CONFIG.DANH_MUC_SAN_PHAM + "/options"}
          placeholder="Chọn thư mục (Loa, Mixer, Đèn...)"
          filter={createFilterQuery(1, "trang_thai", "equal", 1)}
          rules={[]}
          disabled={isDetail}
        />
      </Col>

      {/* Chi tiết dịch vụ / thiết bị (san_pham_id) – lọc theo thư mục nếu có */}
      <Col span={10}>
        <SelectFormApi
          name={[field.name, "san_pham_id"]}
          label={undefined}
          path={
            folderId
              ? `${API_ROUTE_CONFIG.SAN_PHAM}/options?danh_muc_id=${folderId}`
              : `${API_ROUTE_CONFIG.SAN_PHAM}/options`
          }
          reload={folderId}
          placeholder={
            folderId ? "Chọn dịch vụ trong thư mục" : "Chọn dịch vụ / thiết bị"
          }
          rules={[
            {
              required: true,
              message: "Chưa chọn dịch vụ / thiết bị!",
            },
          ]}
          disabled={isDetail || !folderId}
        />
      </Col>

      {/* Số lượng */}
      <Col span={4}>
        <Form.Item
          name={[field.name, "so_luong"]}
          rules={[
            {
              required: true,
              message: "Số lượng không được bỏ trống!",
            },
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            placeholder="Số lượng"
            disabled={isDetail}
          />
        </Form.Item>
      </Col>

      {/* Ghi chú */}
      <Col span={3}>
        <Form.Item name={[field.name, "ghi_chu"]}>
          <Input placeholder="Ghi chú" disabled={isDetail} />
        </Form.Item>
      </Col>

      {/* Xoá dòng */}
      <Col span={1}>
        {!isDetail && (
          <Button
            type="text"
            danger
            icon={<MinusCircleOutlined />}
            onClick={() => remove(field.name)}
          />
        )}
      </Col>
    </Row>
  );
};

// ===== Form chính của Gói dịch vụ =====
const FormGoiDichVuPackage = ({
  form,
  isDetail = false,
}: {
  form: FormInstance;
  isDetail?: boolean;
}) => {
  // 🔹 Theo dõi Nhóm danh mục gói (tầng 1)
  const groupId = Form.useWatch("group_id", form);

  // Khi đổi nhóm gói → reset category_id
  useEffect(() => {
    form.setFieldsValue({
      category_id: undefined,
    });
  }, [groupId, form]);

  return (
    <Row gutter={[10, 10]}>
      {/* Nhóm danh mục gói (tầng 1) */}
      <Col span={12}>
        <SelectFormApi
          name="group_id"
          label="Nhóm danh mục gói"
          path={API_ROUTE_CONFIG.GOI_DICH_VU_GROUP + "/options"}
          placeholder="Chọn nhóm danh mục (VD: Cơ sở vật chất, Nhân sự...)"
          rules={[]}
          disabled={isDetail}
        />
      </Col>

      {/* Nhóm gói dịch vụ (tầng 2) */}
      <Col span={12}>
        <SelectFormApi
          name="category_id"
          label="Nhóm gói dịch vụ"
          path={
            groupId
              ? `${API_ROUTE_CONFIG.GOI_DICH_VU_CATEGORY}/options?group_id=${groupId}`
              : `${API_ROUTE_CONFIG.GOI_DICH_VU_CATEGORY}/options`
          }
          placeholder="Chọn nhóm gói (VD: Gói âm thanh tiệc cưới)"
          rules={[
            {
              required: true,
              message: "Nhóm gói dịch vụ không được bỏ trống!",
            },
          ]}
          disabled={isDetail || !groupId}
        />
      </Col>

      {/* Mã gói (có thể bỏ trống) */}
      <Col span={12}>
        <Form.Item
          name="ma_goi"
          label="Mã gói dịch vụ (có thể bỏ trống)"
          rules={[]}
        >
          <Input
            placeholder="VD: GDV_AMTHANH_100K_BASIC (có thể để trống)"
            disabled={isDetail}
          />
        </Form.Item>
      </Col>

      {/* Tên gói dịch vụ */}
      <Col span={12}>
        <Form.Item
          name="ten_goi"
          label="Tên gói dịch vụ"
          rules={[
            {
              required: true,
              message: "Tên gói dịch vụ không được bỏ trống!",
            },
          ]}
        >
          <Input
            placeholder="VD: Gói âm thanh 100 khách - Basic"
            disabled={isDetail}
          />
        </Form.Item>
      </Col>

      {/* Giá niêm yết */}
      <Col span={12}>
        <Form.Item
          name="gia_niem_yet"
          label="Giá niêm yết gói dịch vụ"
          rules={[
            {
              required: true,
              message: "Giá niêm yết là bắt buộc!",
            },
          ]}
        >
          <InputNumber
            placeholder="Nhập giá gói"
            addonAfter="VNĐ"
            style={{ width: "100%" }}
            formatter={formatter}
            parser={parser}
            min={0}
            disabled={isDetail}
          />
        </Form.Item>
      </Col>

      {/* Giá khuyến mãi (optional) */}
      <Col span={12}>
        <Form.Item
          name="gia_khuyen_mai"
          label="Giá khuyến mãi (nếu có)"
          rules={[]}
        >
          <InputNumber
            placeholder="Nhập giá khuyến mãi (nếu có)"
            addonAfter="VNĐ"
            style={{ width: "100%" }}
            formatter={formatter}
            parser={parser}
            min={0}
            disabled={isDetail}
          />
        </Form.Item>
      </Col>

      {/* Mô tả ngắn */}
      <Col span={24}>
        <Form.Item name="mo_ta_ngan" label="Mô tả ngắn">
          <Input.TextArea
            placeholder="Mô tả ngắn: phù hợp loại sự kiện, số khách, không gian..."
            disabled={isDetail}
          />
        </Form.Item>
      </Col>

      {/* Mô tả chi tiết */}
      <Col span={24}>
        <Form.Item name="mo_ta_chi_tiet" label="Mô tả chi tiết">
          <Input.TextArea
            placeholder="Mô tả chi tiết hơn về gói (có thể dùng cho landing page / in báo giá)"
            disabled={isDetail}
            rows={4}
          />
        </Form.Item>
      </Col>

      {/* Loại gói dịch vụ (ẩn, luôn default = 0 - Trọn gói) */}
      <Col span={24} hidden>
        <Form.Item name="package_mode" initialValue={0}>
          <Input type="hidden" />
        </Form.Item>
      </Col>

      {/* Trạng thái (ẩn, default = 1) */}
      <Col span={24} hidden>
        <Form.Item
          name="trang_thai"
          label="Trạng thái"
          initialValue={1}
        >
          <Select options={trangThaiSelect} disabled={isDetail} />
        </Form.Item>
      </Col>

      {/* ===== Danh sách chi tiết trong gói ===== */}
      <Col span={24}>
        <Form.Item
          label="Cấu hình chi tiết trong gói"
          tooltip="Chọn thư mục (Loa, Mixer, Đèn...) rồi chọn dịch vụ / thiết bị và số lượng tương ứng."
        >
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {/* Header */}
                {fields.length > 0 && (
                  <Row gutter={8} style={{ fontWeight: 600 }}>
                    <Col span={6}>Thư mục / Danh mục chi tiết</Col>
                    <Col span={10}>Dịch vụ / Thiết bị</Col>
                    <Col span={4}>Số lượng</Col>
                    <Col span={3}>Ghi chú</Col>
                    <Col span={1}></Col>
                  </Row>
                )}

                {fields.map((field) => (
                  <PackageItemRow
                    key={field.key}
                    field={field}
                    remove={remove}
                    isDetail={isDetail}
                    form={form}
                  />
                ))}

                {!isDetail && (
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                    style={{ marginTop: 8 }}
                  >
                    Thêm chi tiết trong gói
                  </Button>
                )}
              </>
            )}
          </Form.List>
        </Form.Item>
      </Col>
    </Row>
  );
};

export default FormGoiDichVuPackage;
