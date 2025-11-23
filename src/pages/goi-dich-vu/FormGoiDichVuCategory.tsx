/* eslint-disable @typescript-eslint/no-unused-vars */
import { Col, Form, Input, Row, type FormInstance, Select } from "antd";
import { trangThaiSelect } from "../../configs/select-config";
import SelectFormApi from "../../components/select/SelectFormApi";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

const FormGoiDichVuCategory = ({ form }: { form: FormInstance }) => {
    return (
        <Row gutter={[10, 10]}>
            {/* Nhóm danh mục gói dịch vụ (tầng 1) */}
            <Col span={12}>
                <SelectFormApi
                    name="group_id"
                    label="Nhóm danh mục gói dịch vụ"
                    path={API_ROUTE_CONFIG.GOI_DICH_VU_GROUP + "/options"}
                    placeholder="Chọn nhóm (VD: Gói sự kiện âm thanh)"
                    rules={[
                        {
                            required: true,
                            message: "Nhóm danh mục gói dịch vụ không được bỏ trống!",
                        },
                    ]}
                />
            </Col>

            {/* Mã nhóm gói (có thể bỏ trống) */}
            <Col span={12}>
                <Form.Item
                    name="ma_nhom_goi"
                    label="Mã nhóm gói (có thể bỏ trống)"
                    rules={[]}
                >
                    <Input placeholder="VD: AM_THANH_TIEC_CUOI (có thể để trống)" />
                </Form.Item>
            </Col>

            {/* Tên nhóm gói (bắt buộc) */}
            <Col span={12}>
                <Form.Item
                    name="ten_nhom_goi"
                    label="Tên nhóm gói dịch vụ"
                    rules={[
                        {
                            required: true,
                            message: "Tên nhóm gói dịch vụ không được bỏ trống!",
                        },
                    ]}
                >
                    <Input placeholder="VD: Gói âm thanh tiệc cưới" />
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

export default FormGoiDichVuCategory;
