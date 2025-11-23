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
    Button,
} from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { createFilterQuery, formatter, parser } from "../../utils/utils";
import SelectFormApi from "../../components/select/SelectFormApi";
import { trangThaiSelect } from "../../configs/select-config";
import ImageUploadSingle from "../../components/upload/ImageUploadSingle";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

type PackageItemRowProps = {
    field: any;
    remove: (name: any) => void;
    isDetail: boolean;
    form: FormInstance;
};

/**
 * 1 dòng cấu hình chi tiết trong gói:
 * - Thư mục / Danh mục chi tiết (danh_muc_id)
 * - Thiết bị / dịch vụ con (item_id) – filter theo danh_muc_id
 * - Số lượng
 * - Ghi chú
 */
const PackageItemRow = ({ field, remove, isDetail, form }: PackageItemRowProps) => {
    const folderId = Form.useWatch(
        ["package_items", field.name, "danh_muc_id"],
        form
    );

return (
    <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
        {/* Thư mục / Danh mục chi tiết */}
        <Col span={4}>
            <SelectFormApi
                name={[field.name, "danh_muc_id"]}
                label={undefined}
                path={API_ROUTE_CONFIG.DANH_MUC_SAN_PHAM + "/options?level=2"}
                placeholder="Chọn thư mục (VD: Loa, Mixer...)"
                filter={createFilterQuery(1, "trang_thai", "equal", 1)}
                rules={[]}
                disabled={isDetail}
            />
        </Col>

        {/* Chi tiết dịch vụ / thiết bị – RỘNG HƠN */}
        <Col span={15}>
            <SelectFormApi
                name={[field.name, "item_id"]}
                label={undefined}
                path={
                    folderId
                        ? `${API_ROUTE_CONFIG.SAN_PHAM}/options?danh_muc_id=${folderId}`
                        : `${API_ROUTE_CONFIG.SAN_PHAM}/options`
                }
                reload={folderId}
                placeholder={
                    folderId
                        ? "Chọn chi tiết trong thư mục"
                        : "Chọn chi tiết dịch vụ / thiết bị"
                }
                rules={[
                    {
                        required: true,
                        message: "Chưa chọn chi tiết dịch vụ / thiết bị!",
                    },
                ]}
                disabled={isDetail || !folderId}
                // input vẫn full 15/24 cột
                style={{ width: "100%" }}
                // 🔹 Cho phép dropdown rộng hơn input
                dropdownMatchSelectWidth={false}
                // 🔹 Ép khung dropdown rộng thêm (tùy anh chỉnh số px)
                dropdownStyle={{ minWidth: 900 }}
                // 🔹 Đảm bảo popup bám trong modal, không bị lệch / cắt
                getPopupContainer={(triggerNode) =>
                    (triggerNode.closest(".ant-modal") as HTMLElement) ||
                    document.body
                }
            />
        </Col>



        {/* Số lượng */}
        <Col span={3}>
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
        <Col span={1}>
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


const FormGoiDichVu = ({
    form,
    isDetail = false,
}: {
    form: FormInstance;
    isDetail?: boolean;
}) => {
    return (
        <Row gutter={[10, 10]}>
            {/* ẢNH GÓI DỊCH VỤ */}
            <Col span={24}>
                {!isDetail ? (
                    <Form.Item name="image" label="Ảnh minh hoạ gói">
                        <ImageUploadSingle />
                    </Form.Item>
                ) : (
                    <Form.Item name="image" label="Ảnh minh hoạ gói">
                        <Image
                            src={form.getFieldValue("image")}
                            width={100}
                            height={100}
                        />
                    </Form.Item>
                )}
            </Col>

            {/* MÃ + TÊN GÓI */}
            <Col span={12}>
                <Form.Item
                    name="ma_san_pham"
                    label="Mã gói dịch vụ (có thể bỏ trống)"
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
                    label="Tên gói dịch vụ"
                    rules={[
                        {
                            required: true,
                            message:
                                "Tên gói dịch vụ không được bỏ trống!",
                        },
                    ]}
                >
                    <Input
                        placeholder="VD: Gói âm thanh 100 khách..."
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>

            {/* DANH MỤC DỊCH VỤ (Âm thanh, Ánh sáng...) */}
            <Col span={12}>
                <SelectFormApi
                    name="danh_muc_id"
                    label="Danh mục dịch vụ"
                                       path={API_ROUTE_CONFIG.DANH_MUC_SAN_PHAM + "/options?level=1"}

                    placeholder="Chọn danh mục (VD: Âm thanh)"
                    filter={createFilterQuery(1, "trang_thai", "equal", 1)}
                    rules={[
                        {
                            required: true,
                            message:
                                "Danh mục dịch vụ không được bỏ trống!",
                        },
                    ]}
                    disabled={isDetail}
                />
            </Col>

            {/* ĐƠN VỊ TÍNH GÓI (Gói, Bộ, Set...) */}
            <Col span={12}>
                <SelectFormApi
                    mode="multiple"
                    name="don_vi_tinh_id"
                    label="Đơn vị tính gói"
                    path={API_ROUTE_CONFIG.DON_VI_TINH + "/options"}
                    placeholder="VD: Gói, bộ, set..."
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

            {/* GIÁ GÓI */}
            <Col span={12}>
                <Form.Item
                    name="gia_nhap_mac_dinh"
                    label="Giá gói dịch vụ"
                    rules={[
                        {
                            required: true,
                            message:
                                "Giá gói dịch vụ không được bỏ trống!",
                        },
                    ]}
                >
                    <InputNumber
                        placeholder="Nhập giá gói"
                        addonAfter="VNĐ"
                        style={{ width: "100%" }}
                        formatter={formatter}
                        parser={parser}
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>

            {/* GHI CHÚ GÓI */}
            <Col span={24}>
                <Form.Item name="ghi_chu" label="Ghi chú">
                    <Input.TextArea
                        placeholder="Mô tả thêm về gói: số khách, không gian, lưu ý kỹ thuật..."
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>

            {/* ẨN: loai_san_pham = GOI_DICH_VU (gói dịch vụ) */}
            <Col span={24} hidden>
                <Form.Item
                    name="loai_san_pham"
                    initialValue="GOI_DICH_VU"
                >
                    <Input type="hidden" />
                </Form.Item>
            </Col>

            {/* ẨN: is_package = 1 (GÓI DỊCH VỤ) */}
            <Col span={24} hidden>
                <Form.Item name="is_package" initialValue={1}>
                    <Input type="hidden" />
                </Form.Item>
            </Col>

            {/* ẨN: Trạng thái (default Kích hoạt) */}
            <Col span={24} hidden>
                <Form.Item
                    name="trang_thai"
                    label="Trạng thái"
                    initialValue={1}
                >
                    <Select options={trangThaiSelect} disabled={isDetail} />
                </Form.Item>
            </Col>

            {/* CẤU HÌNH CHI TIẾT TRONG GÓI */}
            <Col span={24}>
                <Form.Item
                    label="Cấu hình chi tiết trong gói"
                    tooltip="Chọn thư mục và chi tiết dịch vụ / thiết bị nằm trong gói này."
                >
                    <Form.List name="package_items">
                        {(fields, { add, remove }) => (
                            <>
{fields.length > 0 && (
    <Row gutter={8} style={{ fontWeight: 600 }}>
        <Col span={4}>Thư mục / Danh mục chi tiết</Col>
        <Col span={15}>Chi tiết dịch vụ / thiết bị</Col>
        <Col span={3}>Số lượng</Col>
        <Col span={1}>Ghi chú</Col>
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

export default FormGoiDichVu;
