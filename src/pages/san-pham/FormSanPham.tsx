/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Row,
    Col,
    Form,
    Input,
    InputNumber,
    type FormInstance,
    Select,
    Image,
} from "antd";
import { createFilterQuery, formatter, parser } from "../../utils/utils";
import SelectFormApi from "../../components/select/SelectFormApi";
import { trangThaiSelect } from "../../configs/select-config";
import ImageUploadSingle from "../../components/upload/ImageUploadSingle";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

const FormSanPham = ({
    form,
    isDetail = false,
}: {
    form: FormInstance;
    isDetail?: boolean;
}) => {
    const loaiSanPham = Form.useWatch("loai_san_pham", form);

    return (
        <Row gutter={[10, 10]}>
            {/* ẢNH CHI TIẾT DV / THIẾT BỊ */}
            <Col span={24}>
                {!isDetail ? (
                    <Form.Item name="image" label="Ảnh minh hoạ">
                        <ImageUploadSingle />
                    </Form.Item>
                ) : (
                    <Form.Item name="image" label="Ảnh minh hoạ">
                        <Image
                            src={form.getFieldValue("image")}
                            width={100}
                            height={100}
                        />
                    </Form.Item>
                )}
            </Col>

            {/* MÃ + TÊN CHI TIẾT DV / THIẾT BỊ */}
            <Col span={12}>
                <Form.Item
                    name="ma_san_pham"
                    label="Mã chi tiết dịch vụ / thiết bị (có thể bỏ trống)"
                    rules={[]}
                >
                    <Input
                        placeholder="Để trống để hệ thống tự sinh"
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item
                    name="ten_san_pham"
                    label="Tên chi tiết dịch vụ / thiết bị"
                    rules={[
                        {
                            required: true,
                            message:
                                "Tên chi tiết dịch vụ / thiết bị không được bỏ trống!",
                        },
                    ]}
                >
                    <Input
                        placeholder="VD: Loa EV 50, Mixer MG16XU..."
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>

            {/* LOẠI DỊCH VỤ: Thuê ngoài / Tự cung cấp */}
            <Col span={12}>
                <Form.Item
                    name="loai_san_pham"
                    label="Loại dịch vụ"
                    rules={[
                        {
                            required: true,
                            message: "Loại dịch vụ không được bỏ trống!",
                        },
                    ]}
                >
                    <Select
                        placeholder="Chọn loại dịch vụ"
                        disabled={isDetail}
                        options={[
                            {
                                label: "Thuê ngoài",
                                value: "SP_NHA_CUNG_CAP", // map về code cũ
                            },
                            {
                                label: "Tự cung cấp",
                                value: "SP_SAN_XUAT", // map về code cũ
                            },
                        ]}
                    />
                </Form.Item>
            </Col>

            {/* ĐƠN VỊ TÍNH */}
            <Col span={12}>
                <SelectFormApi
                    mode="multiple"
                    name="don_vi_tinh_id"
                    label="Đơn vị tính"
                    path={API_ROUTE_CONFIG.DON_VI_TINH + "/options"}
                    placeholder="Chọn đơn vị tính"
                    filter={createFilterQuery(1, "trang_thai", "equal", 1)}
                    rules={[
                        {
                            required: true,
                            message: "Đơn vị tính không được bỏ trống!",
                        },
                    ]}
                    disabled={isDetail}
                />
            </Col>

            {/* NHÀ CUNG CẤP – chỉ hiện với loại Thuê ngoài */}
            {loaiSanPham === "SP_NHA_CUNG_CAP" && (
                <Col span={24}>
                    <SelectFormApi
                        mode="multiple"
                        name="nha_cung_cap_id"
                        label="Nhà cung cấp"
                        path={API_ROUTE_CONFIG.NHA_CUNG_CAP + "/options"}
                        placeholder="Chọn nhà cung cấp"
                        filter={createFilterQuery(
                            1,
                            "trang_thai",
                            "equal",
                            1
                        )}
                        rules={[]}
                        disabled={isDetail}
                    />
                </Col>
            )}

            {/* GIÁ CHI TIẾT DV / THIẾT BỊ */}
            <Col span={12}>
                <Form.Item
                    name="gia_nhap_mac_dinh"
                    label="Giá chi tiết dịch vụ / thiết bị"
                    rules={[
                        {
                            required: true,
                            message:
                                "Giá chi tiết dịch vụ / thiết bị không được bỏ trống!",
                        },
                    ]}
                >
                    <InputNumber
                        placeholder="Nhập giá chi tiết"
                        addonAfter="VNĐ"
                        style={{ width: "100%" }}
                        formatter={formatter}
                        parser={parser}
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>

            {/* GHI CHÚ */}
            <Col span={24}>
                <Form.Item name="ghi_chu" label="Ghi chú">
                    <Input.TextArea
                        placeholder="Nhập ghi chú"
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>

            {/* Trạng thái (ẩn, default = 1) */}
            <Col xs={24} md={12} lg={24} hidden>
                <Form.Item
                    name="trang_thai"
                    label="Trạng thái"
                    initialValue={1}
                >
                    <Select options={trangThaiSelect} disabled={isDetail} />
                </Form.Item>
            </Col>
        </Row>
    );
};

export default FormSanPham;
