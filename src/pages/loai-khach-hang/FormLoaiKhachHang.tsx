/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Row,
    Col,
    Form,
    Input,
    InputNumber,
    type FormInstance,
    Select,
    Tooltip,
} from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { formatter, parser } from "../../utils/utils";
import { trangThaiSelect } from "../../configs/select-config";

const FormLoaiKhachHang = ({ form }: { form: FormInstance }) => {
    return (
        <Row gutter={[10, 10]}>
            {/* Tên loại khách hàng */}
            <Col span={12}>
                <Form.Item
                    name="ten_loai_khach_hang"
                    label="Tên loại khách hàng"
                    rules={[
                        {
                            required: true,
                            message:
                                "Tên loại khách hàng không được bỏ trống!",
                        },
                    ]}
                >
                    <Input placeholder="VD: Thành viên Đồng, Bạc, Vàng, VIP..." />
                </Form.Item>
            </Col>

            {/* Ngưỡng doanh thu (VNĐ) */}
            <Col span={12}>
                <Form.Item
                    name="nguong_doanh_thu"
                    label={
                        <span>
                            Ngưỡng doanh thu (VNĐ){" "}
                            <Tooltip title="Tổng doanh thu tích lũy để đạt hạng này.">
                                <QuestionCircleOutlined style={{ color: "#1890ff" }} />
                            </Tooltip>
                        </span>
                    }
                    rules={[
                        {
                            required: true,
                            message:
                                "Ngưỡng doanh thu không được bỏ trống!",
                        },
                    ]}
                >
                    <InputNumber
                        placeholder="VD: 10.000.000"
                        style={{ width: "100%" }}
                        formatter={formatter}
                        parser={parser}
                        min={0}
                    />
                </Form.Item>
            </Col>

            {/* Giá trị ưu đãi (%) – nhập phần trăm giảm giá/ưu đãi */}
            <Col span={12}>
                <Form.Item
                    name="gia_tri_uu_dai"
                    label={
                        <span>
                            Giá trị ưu đãi (%){" "}
                            <Tooltip title="Phần trăm ưu đãi cho hạng này (giảm giá trên báo giá / thanh toán).">
                                <QuestionCircleOutlined style={{ color: "#1890ff" }} />
                            </Tooltip>
                        </span>
                    }
                    rules={[
                        {
                            required: true,
                            message:
                                "Giá trị ưu đãi không được bỏ trống!",
                        },
                    ]}
                >
                    <InputNumber
                        placeholder="VD: 5, 10, 15..."
                        style={{ width: "100%" }}
                        min={0}
                        max={100}
                        addonAfter="%"
                    />
                </Form.Item>
            </Col>

            {/* Ngưỡng điểm – chỉ hiển thị, backend tự tính floor(nguong_doanh_thu/1000) */}
            <Col span={12}>
                <Form.Item
                    name="nguong_diem"
                    label={
                        <span>
                            Ngưỡng điểm{" "}
                            <Tooltip title="Tự động tính: 1 điểm = 1.000 VNĐ doanh thu tích lũy. Hệ thống tự sync khi lưu.">
                                <QuestionCircleOutlined style={{ color: "#1890ff" }} />
                            </Tooltip>
                        </span>
                    }
                >
                    <InputNumber
                        disabled
                        style={{ width: "100%" }}
                        placeholder="Hệ thống tự tính từ ngưỡng doanh thu"
                    />
                </Form.Item>
            </Col>

            {/* Trạng thái (ẩn, default 1) */}
            <Col xs={24} md={12} lg={24} hidden>
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

export default FormLoaiKhachHang;
