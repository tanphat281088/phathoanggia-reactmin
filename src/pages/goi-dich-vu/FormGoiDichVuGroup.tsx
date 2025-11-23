/* eslint-disable @typescript-eslint/no-unused-vars */
import { Col, Form, Input, Row, type FormInstance, Select } from "antd";
import { trangThaiSelect } from "../../configs/select-config";

const FormGoiDichVuGroup = ({ form }: { form: FormInstance }) => {
    return (
        <Row gutter={[10, 10]}>
            {/* Mã nhóm (có thể bỏ trống) */}
            <Col span={12}>
                <Form.Item
                    name="ma_nhom"
                    label="Mã nhóm (có thể bỏ trống)"
                    rules={[]}
                >
                    <Input placeholder="VD: GDV_AM_THANH (có thể để trống)" />
                </Form.Item>
            </Col>

            {/* Tên nhóm (bắt buộc) */}
            <Col span={12}>
                <Form.Item
                    name="ten_nhom"
                    label="Tên nhóm danh mục gói"
                    rules={[
                        {
                            required: true,
                            message: "Tên nhóm không được bỏ trống!",
                        },
                    ]}
                >
                    <Input placeholder="VD: Gói sự kiện âm thanh" />
                </Form.Item>
            </Col>

            {/* Ghi chú */}
            <Col span={24}>
                <Form.Item name="ghi_chu" label="Ghi chú">
                    <Input.TextArea placeholder="Nhập ghi chú (nếu có)" />
                </Form.Item>
            </Col>

            {/* Trạng thái (ẩn, default = 1) */}
            <Col span={24} hidden>
                <Form.Item
                    name="trang_thai"
                    label="Trạng thái"
                    initialValue={1}
                >
                    <Select options={trangThaiSelect} />
                </Form.Item>
            </Col>
        </Row>
    );
};

export default FormGoiDichVuGroup;
