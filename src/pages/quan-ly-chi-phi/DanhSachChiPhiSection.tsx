/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Typography,
} from "antd";
import type { FormInstance } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { formatter, parser } from "../../utils/utils";

const { Text } = Typography;

export type ChiPhiSectionCode = "NS" | "CSVC" | "TIEC" | "TD" | "CPK" | "OTHER";

type Props = {
  form: FormInstance;
  sectionCode: ChiPhiSectionCode;
  sectionLabel: string; // Ví dụ: "Nhân sự", "Cơ sở vật chất", ...
  isDetail?: boolean;
};

/**
 * Bảng chi phí (1 section) – dùng cho CPĐX / CPTT
 *
 * Cột:
 *  STT | HẠNG MỤC | CHI TIẾT | ĐVT | SL | SUP | ĐƠN GIÁ CP | THÀNH TIỀN CP | ĐƠN GIÁ BÁN | THÀNH TIỀN BÁN
 *
 * Dữ liệu nằm trong Form.List name="items":
 *  mỗi item:
 *   - section_code       (NS/CSVC/TIEC/TD/CPK/OTHER)
 *   - hang_muc           (Hạng mục hiển thị)
 *   - hang_muc_goc       (Hạng mục gốc – có thể dùng map)
 *   - description        (Chi tiết)
 *   - dvt                (ĐVT)
 *   - qty                (SL)
 *   - supplier_name      (SUP)
 *   - cost_unit_price    (Đơn giá chi phí)
 *   - cost_total_amount  (Thành tiền chi phí)
 *   - sell_unit_price    (Đơn giá bán – readonly)
 *   - sell_total_amount  (Thành tiền bán – readonly)
 */
const DanhSachChiPhiSection = ({
  form,
  sectionCode,
  sectionLabel,
  isDetail,
}: Props) => {
  const disabled = !!isDetail;

  // Watch toàn bộ items để lọc theo section_code
  const items = Form.useWatch("items", form) || [];

  // Map index global -> STT trong section
  const sttMap = useMemo(() => {
    const map: Record<number, number> = {};
    let stt = 1;
    (items as any[]).forEach((row, idx) => {
      const sec = String(row?.section_code ?? "").toUpperCase();
      if (sec === sectionCode) {
        map[idx] = stt;
        stt++;
      }
    });
    return map;
  }, [items, sectionCode]);

  // Khi user đổi SL / Đơn giá CP: nếu Thành tiền CP đang rỗng/0 thì auto = SL * ĐG
  const autoFillCostTotal = (idx: number) => {
    const row = (form.getFieldValue(["items", idx]) || {}) as any;
    const qty = Number(row?.qty ?? 0);
    const unit = Number(row?.cost_unit_price ?? 0);
    const currentTotal = row?.cost_total_amount;

    if (!currentTotal || currentTotal === 0) {
      const total = Math.round(qty * unit);
      form.setFieldValue(["items", idx, "cost_total_amount"], total);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 4,
        padding: 8,
        marginBottom: 16,
      }}
    >
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {sectionLabel} – Chi phí
      </Typography.Title>

      {/* Header */}
      <Row
        gutter={[4, 4]}
        style={{
          fontWeight: 600,
          borderBottom: "1px solid #ddd",
          paddingBottom: 4,
          marginBottom: 4,
          fontSize: 11,
        }}
      >
        <Col span={1}>
          <Text>STT</Text>
        </Col>
        <Col span={3}>
          <Text>Hạng mục</Text>
        </Col>
        <Col span={4}>
          <Text>Chi tiết</Text>
        </Col>
        <Col span={2}>
          <Text>ĐVT</Text>
        </Col>
        <Col span={2}>
          <Text>SL</Text>
        </Col>
        <Col span={3}>
          <Text>SUP</Text>
        </Col>
        <Col span={3}>
          <Text>Đơn giá CP</Text>
        </Col>
        <Col span={3}>
          <Text>Thành tiền CP</Text>
        </Col>
        <Col span={3}>
          <Text>Đơn giá bán</Text>
        </Col>
        <Col span={3}>
          <Text>Thành tiền bán</Text>
        </Col>
        <Col span={1}></Col>
      </Row>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => {
              const idx = field.name as number;
              const row = (items[idx] || {}) as any;
              const sec = String(row?.section_code ?? "").toUpperCase();

              // Chỉ render dòng thuộc section này
              if (sec !== sectionCode) {
                return null;
              }

              const stt = sttMap[idx] ?? 0;

              return (
                <Row
                  key={field.key}
                  gutter={[4, 4]}
                  style={{
                    marginBottom: 4,
                    borderBottom: "1px dotted #f0f0f0",
                    paddingBottom: 2,
                  }}
                  align="top"
                >
                  {/* STT + hidden section_code */}
                  <Col span={1}>
                    <Text>{stt}</Text>
                    <Form.Item
                      name={[field.name, "section_code"]}
                      initialValue={sectionCode}
                      hidden
                    >
                      <Input type="hidden" />
                    </Form.Item>
                  </Col>

                  {/* Hạng mục */}
                  <Col span={3}>
                    <Form.Item
                      name={[field.name, "hang_muc"]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder="Hạng mục"
                        disabled={disabled}
                        size="small"
                      />
                    </Form.Item>
                    {/* Hạng mục gốc (optional) */}
                    <Form.Item
                      name={[field.name, "hang_muc_goc"]}
                      hidden
                    >
                      <Input type="hidden" />
                    </Form.Item>
                  </Col>

                  {/* Chi tiết */}
                  <Col span={4}>
                    <Form.Item
                      name={[field.name, "description"]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input.TextArea
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        placeholder="Chi tiết hạng mục / thiết bị / dịch vụ"
                        disabled={disabled}
                        size="small"
                      />
                    </Form.Item>
                  </Col>

                  {/* ĐVT */}
                  <Col span={2}>
                    <Form.Item
                      name={[field.name, "dvt"]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder="ĐVT"
                        disabled={disabled}
                        size="small"
                      />
                    </Form.Item>
                  </Col>

                  {/* SL */}
                  <Col span={2}>
                    <Form.Item
                      name={[field.name, "qty"]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        placeholder="SL"
                        disabled={disabled}
                        size="small"
                        onBlur={() => autoFillCostTotal(idx)}
                      />
                    </Form.Item>
                  </Col>

                  {/* SUP */}
                  <Col span={3}>
                    <Form.Item
                      name={[field.name, "supplier_name"]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder="Tên SUP / NCC"
                        disabled={disabled}
                        size="small"
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "supplier_id"]}
                      hidden
                    >
                      <Input type="hidden" />
                    </Form.Item>
                  </Col>

                  {/* Đơn giá chi phí */}
                  <Col span={3}>
                    <Form.Item
                      name={[field.name, "cost_unit_price"]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        placeholder="ĐG CP"
                        formatter={formatter}
                        parser={parser}
                        addonAfter="đ"
                        disabled={disabled}
                        size="small"
                        onBlur={() => autoFillCostTotal(idx)}
                      />
                    </Form.Item>
                  </Col>

                  {/* Thành tiền chi phí */}
                  <Col span={3}>
                    <Form.Item
                      name={[field.name, "cost_total_amount"]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        placeholder="TT CP"
                        formatter={formatter}
                        parser={parser}
                        addonAfter="đ"
                        disabled={disabled}
                        size="small"
                      />
                    </Form.Item>
                  </Col>

                  {/* Đơn giá bán (readonly) */}
                  <Col span={3}>
                    <Form.Item
                      name={[field.name, "sell_unit_price"]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        formatter={formatter}
                        parser={parser}
                        addonAfter="đ"
                        disabled
                        size="small"
                      />
                    </Form.Item>
                  </Col>

                  {/* Thành tiền bán (readonly) */}
                  <Col span={3}>
                    <Form.Item
                      name={[field.name, "sell_total_amount"]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        formatter={formatter}
                        parser={parser}
                        addonAfter="đ"
                        disabled
                        size="small"
                      />
                    </Form.Item>
                  </Col>

                  {/* Xoá dòng */}
                  <Col span={1}>
                    {!disabled && (
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
            })}

            {/* Nút thêm dòng chi phí */}
            {!disabled && (
              <Row>
                <Col span={24}>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    size="small"
                    onClick={() =>
                      add({
                        section_code: sectionCode,
                        hang_muc: "",
                        hang_muc_goc: "",
                        description: "",
                        dvt: "",
                        qty: 0,
                        supplier_name: "",
                        cost_unit_price: 0,
                        cost_total_amount: 0,
                        sell_unit_price: 0,
                        sell_total_amount: 0,
                      })
                    }
                  >
                    Thêm dòng chi phí
                  </Button>
                </Col>
              </Row>
            )}
          </>
        )}
      </Form.List>
    </div>
  );
};

export default DanhSachChiPhiSection;
