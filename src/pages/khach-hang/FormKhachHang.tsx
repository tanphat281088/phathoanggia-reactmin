/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Row,
  Col,
  Form,
  Input,
  type FormInstance,
  Select,
  DatePicker,
} from "antd";
import dayjs from "dayjs";
import { phonePattern } from "../../utils/patterns";

/** Danh sách cố định cho dropdown Kênh liên hệ (đặc thù ERP sự kiện) */
const KENH_LIEN_HE_OPTIONS = [
  "Facebook",
  "Zalo",
  "Hotline",
  "Website",
  "Khách cũ",
  "Khách quen giới thiệu",
  "Khác",
].map((v) => ({ label: v, value: v }));

/** Loại khách chuyên ngành sự kiện */
const CUSTOMER_TYPE_OPTIONS = [
  { label: "Khách Event (doanh nghiệp / brand)", value: 0 },
  { label: "Khách Wedding (tiệc cưới)", value: 1 },
  { label: "Khách Agency (khách sỉ / planner)", value: 2 },
];

const FormKhachHang = ({ form }: { form: FormInstance }) => {
  const customerType = Form.useWatch("customer_type", form);

  return (
    <Row gutter={[10, 10]}>
      {/* MÃ KH - tự sinh sau khi lưu, chỉ đọc */}
      <Col span={12}>
        <Form.Item name="ma_kh" label="Mã KH">
          <Input placeholder="Tự sinh sau khi lưu" disabled />
        </Form.Item>
      </Col>

      {/* LOẠI KHÁCH HÀNG: Event / Wedding / Agency */}
      <Col span={12}>
        <Form.Item
          name="customer_type"
          label="Nhóm khách hàng"
          rules={[
            {
              required: true,
              message: "Vui lòng chọn Nhóm khách hàng (Event / Wedding / Agency)!",
            },
          ]}
          initialValue={0}
        >
          <Select
            options={CUSTOMER_TYPE_OPTIONS}
            placeholder="Chọn nhóm khách hàng"
          />
        </Form.Item>
      </Col>

      {/* TÊN KH (tuỳ loại khách, label hơi khác cho dễ hiểu) */}
      <Col span={12}>
        <Form.Item
          name="ten_khach_hang"
          label={
            customerType === 1
              ? "Tên khách hàng (cô dâu / chú rể / đại diện)"
              : "Tên khách hàng / người liên hệ"
          }
          rules={[
            { required: true, message: "Tên khách hàng không được bỏ trống!" },
          ]}
        >
          <Input
            placeholder="Nhập tên khách hàng / người liên hệ chính"
          />
        </Form.Item>
      </Col>

      {/* EMAIL (không bắt buộc) */}
      <Col span={12}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { type: "email", message: "Email không hợp lệ!" },
          ]}
        >
          <Input placeholder="Nhập email (không bắt buộc)" />
        </Form.Item>
      </Col>

      {/* SỐ ĐIỆN THOẠI */}
      <Col span={12}>
        <Form.Item
          name="so_dien_thoai"
          label="Số điện thoại"
          rules={[
            { required: true, message: "Số điện thoại không được bỏ trống!" },
            { pattern: phonePattern, message: "Số điện thoại không hợp lệ!" },
          ]}
        >
          <Input placeholder="Nhập số điện thoại" />
        </Form.Item>
      </Col>

      {/* KÊNH LIÊN HỆ (bắt buộc) */}
      <Col span={12}>
        <Form.Item
          name="kenh_lien_he"
          label="Kênh liên hệ"
          tooltip="Nguồn khách liên hệ (VD: Facebook, Zalo, Khách cũ, Khách quen giới thiệu...)"
          rules={[
            { required: true, message: "Vui lòng chọn Kênh liên hệ" },
          ]}
        >
          <Select
            placeholder="Chọn kênh liên hệ"
            showSearch
            allowClear={false}
            options={KENH_LIEN_HE_OPTIONS}
            filterOption={(input, option) =>
              (option?.label as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Col>

      {/* B2B: Event / Agency → thông tin công ty */}
      {(customerType === 0 || customerType === 2) && (
        <>
          <Col span={12}>
            <Form.Item
              name="company_name"
              label="Tên công ty / tổ chức"
            >
              <Input placeholder="Nhập tên công ty / tổ chức (nếu có)" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="tax_code"
              label="Mã số thuế"
            >
              <Input placeholder="Nhập mã số thuế (không bắt buộc)" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="department"
              label="Phòng ban"
            >
              <Input placeholder="VD: Marketing, HR, Truyền thông..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="position"
              label="Chức vụ"
            >
              <Input placeholder="VD: Trưởng phòng, Manager..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="industry"
              label="Ngành hàng"
            >
              <Input placeholder="VD: Ngân hàng, FMCG, Giáo dục..." />
            </Form.Item>
          </Col>
        </>
      )}

      {/* WEDDING: thông tin cô dâu / chú rể / ngày cưới / nhà hàng */}
      {customerType === 1 && (
        <>
          <Col span={12}>
            <Form.Item
              name="bride_name"
              label="Tên cô dâu"
            >
              <Input placeholder="Nhập tên cô dâu" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="groom_name"
              label="Tên chú rể"
            >
              <Input placeholder="Nhập tên chú rể" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="wedding_date"
              label="Ngày cưới"
            >
              <DatePicker
                style={{ width: "100%" }}
                placeholder="Chọn ngày cưới"
                format="DD/MM/YYYY"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="wedding_venue"
              label="Nhà hàng / Địa điểm cưới"
            >
              <Input placeholder="Nhập tên nhà hàng / địa điểm" />
            </Form.Item>
          </Col>
        </>
      )}

      {/* ĐỊA CHỈ */}
      <Col span={24}>
        <Form.Item
          name="dia_chi"
          label="Địa chỉ"
          rules={[]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Nhập địa chỉ (không bắt buộc)"
          />
        </Form.Item>
      </Col>

      {/* Nguồn chi tiết */}
      <Col span={24}>
        <Form.Item
          name="source_detail"
          label="Nguồn chi tiết"
        >
          <Input.TextArea
            rows={2}
            placeholder="VD: Khách cũ từ năm 2023, giới thiệu bởi anh Nam..."
          />
        </Form.Item>
      </Col>

      {/* Ghi chú hiển thị */}
      <Col span={24}>
        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input.TextArea
            rows={3}
            placeholder="Ghi chú chung (có thể show cho team, một phần cho khách)"
          />
        </Form.Item>
      </Col>

      {/* Ghi chú nội bộ */}
      <Col span={24}>
        <Form.Item name="note_internal" label="Ghi chú nội bộ">
          <Input.TextArea
            rows={3}
            placeholder="Ghi chú nội bộ (chỉ team xem, không show cho khách)"
          />
        </Form.Item>
      </Col>

      {/* is_system_customer: KH hệ thống / vãng lai -> backend default = 1, ở đây set luôn 1 */}
      <Form.Item name="is_system_customer" initialValue={1} hidden>
        <Input type="hidden" />
      </Form.Item>
    </Row>
  );
};

export default FormKhachHang;
