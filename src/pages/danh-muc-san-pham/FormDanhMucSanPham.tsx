/* eslint-disable @typescript-eslint/no-unused-vars */
import { Row, Col, Form, Input, type FormInstance, Select } from "antd";
import { trangThaiSelect } from "../../configs/select-config";
import ImageUploadSingle from "../../components/upload/ImageUploadSingle";
import SelectFormApi from "../../components/select/SelectFormApi";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { createFilterQuery } from "../../utils/utils";

// ✅ Nhóm dịch vụ cao nhất (code ngắn ≤ 10 ký tự)
const GROUP_CODE_OPTIONS = [
    { label: "Nhân sự", value: "NS" },
    { label: "Cơ sở vật chất", value: "CSVC" },
    { label: "Tiệc", value: "TIEC" },
    { label: "Thuê địa điểm", value: "TD" },
    { label: "Chi phí khác", value: "CPK" },
];

const FormDanhMucSanPham = ({ form }: { form: FormInstance }) => {
    return (
        <Row gutter={[10, 10]}>
            {/* Ảnh danh mục */}
            <Col span={24}>
                <Form.Item name="image" label="Ảnh danh mục">
                    <ImageUploadSingle />
                </Form.Item>
            </Col>

            {/* Mã + Tên danh mục */}
            <Col span={12}>
                <Form.Item
                    name="ma_danh_muc"
                    label="Mã danh mục (có thể bỏ trống)"
                    // ❌ Không required: để trống cho BE tự sinh
                    rules={[]}
                >
                    <Input placeholder="Để trống để hệ thống tự sinh" />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item
                    name="ten_danh_muc"
                    label="Tên danh mục"
                    rules={[
                        {
                            required: true,
                            message: "Tên danh mục không được bỏ trống!",
                        },
                    ]}
                >
                    <Input placeholder="Nhập tên danh mục" />
                </Form.Item>
            </Col>

            {/* NHÓM DỊCH VỤ (cao nhất) */}
            <Col span={12}>
                <Form.Item
                    name="group_code"
                    label="Nhóm dịch vụ"
                    tooltip="Nhân sự / Cơ sở vật chất / Tiệc / Thuê địa điểm / Chi phí khác"
                >
                    <Select
                        options={GROUP_CODE_OPTIONS}
                        placeholder="Chọn nhóm (có thể bỏ trống)"
                        allowClear
                    />
                </Form.Item>
            </Col>

            {/* DANH MỤC CHA (TẦNG TRÊN) */}
            <Col span={12}>
                <SelectFormApi
                    name="parent_id"
                    label="Danh mục cha (Tầng trên)"
                    path={API_ROUTE_CONFIG.DANH_MUC_SAN_PHAM + "/options"}
                    placeholder="Chọn danh mục cha (có thể bỏ trống)"
                    filter={createFilterQuery(1, "trang_thai", "equal", 1)}
                    // KHÔNG required → null = tầng 1, có parent = tầng 2
                    rules={[]}
                />
            </Col>

            {/* Ghi chú */}
            <Col span={24}>
                <Form.Item name="ghi_chu" label="Ghi chú">
                    <Input.TextArea placeholder="Nhập ghi chú" />
                </Form.Item>
            </Col>

            {/* Trạng thái (ẩn, default = 1) */}
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

export default FormDanhMucSanPham;
