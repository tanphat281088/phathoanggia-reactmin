/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Row,
    Col,
    Form,
    Input,
    InputNumber,
    type FormInstance,
    Select,
    DatePicker,
    Table,
    Typography,
    Tooltip,
} from "antd";
import { formatter, parser } from "../../utils/utils";
import SelectFormApi from "../../components/select/SelectFormApi";
import { trangThaiSelect } from "../../configs/select-config";
import { generateMaPhieu } from "../../helpers/funcHelper";
import {
    OPTIONS_LOAI_PHIEU_CHI,
    OPTIONS_PHUONG_THUC_THANH_TOAN,
} from "../../utils/constant";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import dayjs from "dayjs";
import { getDataById, getDataSelect } from "../../services/getData.api";
import { useCallback, useEffect, useState } from "react";
import { WarningOutlined } from "@ant-design/icons";

const FormPhieuChi = ({
    form,
    isDetail,
    chiTietPhieuChi,
}: {
    form: FormInstance;
    isDetail?: boolean;
    chiTietPhieuChi?: any;
}) => {
    const nhaCungCapId = Form.useWatch("nha_cung_cap_id", form);
    const loaiPhieuChi = Form.useWatch("loai_phieu_chi", form);
    const phuongThucThanhToan = Form.useWatch("phuong_thuc_thanh_toan", form);
    const phieuNhapKhoId = Form.useWatch("phieu_nhap_kho_id", form);
    const categoryParentCode = Form.useWatch("category_parent_code", form); // NEW: theo dõi danh mục CHA

    // ⭐ NEW: theo dõi tài khoản chi (CK)
    const taiKhoanId = Form.useWatch("tai_khoan_id", form);

    const [nhieuPhieuNhapKho, setNhieuPhieuNhapKho] = useState<any[]>([]);

    const fetchInfoPhieuNhapKho = async () => {
        const response = await getDataById(
            phieuNhapKhoId,
            API_ROUTE_CONFIG.PHIEU_NHAP_KHO
        );
        form.setFieldValue(
            "so_tien_can_thanh_toan",
            Number(response?.tong_tien) - Number(response?.da_thanh_toan)
        );
    };

    const fetchTongTienCanThanhToanTheoNhaCungCap = async () => {
        const response = await getDataById(
            nhaCungCapId,
            API_ROUTE_CONFIG.PHIEU_NHAP_KHO +
                "/tong-tien-can-thanh-toan-theo-nha-cung-cap"
        );
        form.setFieldValue("so_tien_can_thanh_toan", response);
    };

    const fetchNhieuPhieuNhapKhoTheoNhaCungCap = useCallback(async () => {
        const response = await getDataSelect(
            API_ROUTE_CONFIG.PHIEU_NHAP_KHO +
                "/options-by-nha-cung-cap/" +
                nhaCungCapId,
            {
                chua_hoan_thanh: isDetail ? false : true,
            }
        );
        setNhieuPhieuNhapKho(
            !isDetail
                ? response.map((item: any) => ({
                      ...item,
                      so_tien_thanh_toan: 0,
                  }))
                : response
                      .filter((item: any) =>
                          chiTietPhieuChi?.find(
                              (item2: any) =>
                                  item2.ma_phieu_nhap_kho ==
                                      item.ma_phieu_nhap_kho &&
                                  item2.tong_tien_da_thanh_toan > 0
                          )
                      )
                      .map((item: any) => ({
                          ...item,
                          so_tien_thanh_toan: chiTietPhieuChi?.find(
                              (item: any) =>
                                  item.ma_phieu_nhap_kho == item.ma_phieu_nhap_kho
                          )?.tong_tien_da_thanh_toan,
                      }))
        );
    }, [nhaCungCapId]);

    useEffect(() => {
        if (phieuNhapKhoId && loaiPhieuChi === 1) {
            fetchInfoPhieuNhapKho();
        }
        if (nhaCungCapId && loaiPhieuChi === 2) {
            fetchTongTienCanThanhToanTheoNhaCungCap();
        }
        if (loaiPhieuChi === 4 && nhaCungCapId) {
            fetchNhieuPhieuNhapKhoTheoNhaCungCap();
        }
    }, [phieuNhapKhoId, loaiPhieuChi, nhaCungCapId]);

    const columns = [
        {
            title: "Phiếu nhập kho",
            dataIndex: !isDetail ? "label" : "ma_phieu_nhap_kho",
            key: "phieu_nhap_kho",
        },
        {
            title: "Số tiền thanh toán",
            dataIndex: "so_tien_thanh_toan",
            key: "so_tien_thanh_toan",
            render: (text: string, record: any) => {
                return (
                    <InputNumber
                        placeholder="Nhập số tiền chi"
                        style={{ width: "100%" }}
                        formatter={formatter}
                        parser={parser}
                        addonAfter="đ"
                        disabled={isDetail}
                        onChange={(value) => {
                            const updatedPhieuNhapKho = nhieuPhieuNhapKho.map(
                                (item) =>
                                    item.id === record.id
                                        ? { ...item, so_tien_thanh_toan: value }
                                        : item
                            );

                            form.setFieldValue(
                                "phieu_nhap_kho_ids",
                                updatedPhieuNhapKho.filter(
                                    (item) => item.so_tien_thanh_toan > 0
                                )
                            );

                            const tongTien = updatedPhieuNhapKho.reduce(
                                (acc, item) =>
                                    acc + (item.so_tien_thanh_toan || 0),
                                0
                            );

                            form.setFieldValue("so_tien", tongTien);
                        }}
                        defaultValue={
                            chiTietPhieuChi?.find(
                                (item: any) =>
                                    item.ma_phieu_nhap_kho ==
                                    record.ma_phieu_nhap_kho
                            )?.tong_tien_da_thanh_toan
                        }
                    />
                );
            },
        },
    ];

    return (
        <Row gutter={[10, 10]}>
            <Col span={12}>
                <Form.Item
                    name="ma_phieu_chi"
                    label="Mã phiếu chi"
                    rules={[
                        {
                            required: true,
                            message: "Mã phiếu chi không được bỏ trống!",
                        },
                    ]}
                    initialValue={generateMaPhieu("CHI")}
                >
                    <Input
                        placeholder="Nhập mã phiếu chi"
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item
                    name="ngay_chi"
                    label="Ngày chi"
                    rules={[
                        {
                            required: true,
                            message: "Ngày chi không được bỏ trống!",
                        },
                    ]}
                    initialValue={dayjs()}
                >
                    <DatePicker
                        placeholder="Chọn ngày chi"
                        format="DD/MM/YYYY"
                        style={{ width: "100%" }}
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>
            <Col span={24}>
                <Form.Item
                    name="loai_phieu_chi"
                    label="Loại phiếu chi"
                    rules={[
                        {
                            required: true,
                            message: "Loại phiếu chi không được bỏ trống!",
                        },
                    ]}
                >
                    <Select
                        options={OPTIONS_LOAI_PHIEU_CHI}
                        placeholder="Chọn loại phiếu chi"
                        onChange={(value) => {
                            form.setFieldValue("nha_cung_cap_id", undefined);
                            form.setFieldValue("phieu_nhap_kho_id", undefined);
                            form.setFieldValue("so_tien_can_thanh_toan", 0);
                            form.setFieldValue("category_parent_code", undefined); // NEW
                            form.setFieldValue("category_id", undefined);           // NEW
                        }}
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>

            {/* ================= Danh mục chi (CHA → CON) ================= */}
            <Col span={24}>
                <SelectFormApi
                    name="category_parent_code"
                    label="Nhóm danh mục chi (CHA)"
                    path={API_ROUTE_CONFIG.EXPENSE_CATEGORIES_PARENTS} // /expense-categories/parents
                    placeholder="Chọn nhóm CHA (vd: Giá vốn / Bán hàng / QLDN / Tài chính / Khác)"
                    disabled={isDetail}
                    onChange={() => {
                        // Đổi CHA thì reset CON
                        form.setFieldValue("category_id", undefined);
                    }}
                />
            </Col>

            <Col span={24}>
                <SelectFormApi
                    name="category_id"
                    label="Danh mục chi (CON)"
                    path={
  categoryParentCode
      ? `/expense-categories/options?parent_code=${categoryParentCode}`
      : `/expense-categories/options?parent_code=COGS`
}

                    placeholder="Chọn danh mục chi (con) theo nhóm CHA"
                    rules={[
                        {
                            required: loaiPhieuChi === 3,
                            message:
                                "Vui lòng chọn danh mục chi (CON) khi Loại phiếu = Chi khác!",
                        },
                    ]}
                    disabled={isDetail || !categoryParentCode}
                />
                <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
                    Gợi ý:&nbsp;
                    <Typography.Text code>COGS</Typography.Text> = chi NVL trực tiếp (hoa, phụ kiện, in ấn, ship phục vụ đơn);&nbsp;
                    <Typography.Text code>BH</Typography.Text> = marketing/khuyến mãi/ship bán hàng;&nbsp;
                    <Typography.Text code>QLDN</Typography.Text> = VPP, điện nước, thuê mặt bằng, dịch vụ;&nbsp;
                    <Typography.Text code>TC</Typography.Text> = phí/lãi tài chính;&nbsp;
                    <Typography.Text code>CHI_KHAC</Typography.Text> = khoản khác.
                </Typography.Paragraph>
            </Col>
            {/* ============================================================ */}

            {(loaiPhieuChi === 1 ||
                loaiPhieuChi === 2 ||
                loaiPhieuChi === 4) && (
                <Col span={12}>
                    <SelectFormApi
                        name="nha_cung_cap_id"
                        label="Nhà cung cấp"
                        path={API_ROUTE_CONFIG.NHA_CUNG_CAP + "/options"}
                        placeholder="Chọn nhà cung cấp"
                        rules={[
                            {
                                required:
                                    loaiPhieuChi === 1 ||
                                    loaiPhieuChi === 2 ||
                                    loaiPhieuChi === 4,
                                message: "Nhà cung cấp không được bỏ trống!",
                            },
                        ]}
                        onChange={() => {
                            // Reset phiếu nhập kho khi thay đổi nhà cung cấp
                            form.setFieldValue("phieu_nhap_kho_id", undefined);
                            form.setFieldValue("so_tien_can_thanh_toan", 0);
                            form.setFieldValue("phieu_nhap_kho_ids", []);
                            setNhieuPhieuNhapKho([]);
                        }}
                        disabled={isDetail}
                    />
                </Col>
            )}
            {loaiPhieuChi === 1 && (
                <Col span={12}>
                    <SelectFormApi
                        name="phieu_nhap_kho_id"
                        label="Phiếu nhập kho"
                        path={
                            nhaCungCapId
                                ? API_ROUTE_CONFIG.PHIEU_NHAP_KHO +
                                  "/options-by-nha-cung-cap/" +
                                  nhaCungCapId
                                : ""
                        }
                        filter={{
                            chua_hoan_thanh: true,
                        }}
                        reload={nhaCungCapId}
                        placeholder="Chọn phiếu nhập kho"
                        rules={[
                            {
                                required: loaiPhieuChi === 1,
                                message: "Phiếu nhập kho không được bỏ trống!",
                            },
                        ]}
                        disabled={isDetail}
                    />
                </Col>
            )}
            {(loaiPhieuChi === 1 || loaiPhieuChi === 2) && !isDetail && (
                <Col span={12}>
                    <Form.Item
                        name="so_tien_can_thanh_toan"
                        label="Số tiền cần thanh toán"
                    >
                        <InputNumber
                            placeholder="Nhập số tiền cần thanh toán"
                            style={{ width: "100%" }}
                            formatter={formatter}
                            parser={parser}
                            addonAfter="đ"
                            disabled
                        />
                    </Form.Item>
                </Col>
            )}

            {loaiPhieuChi === 4 &&
                nhaCungCapId &&
                nhieuPhieuNhapKho.length > 0 && (
                    <Col span={24}>
                        <Table
                            columns={columns}
                            dataSource={nhieuPhieuNhapKho}
                            rowKey="id"
                            pagination={false}
                            bordered
                            style={{ marginBottom: 20 }}
                        />
                        <Form.Item name="phieu_nhap_kho_ids" hidden>
                            <Input />
                        </Form.Item>
                    </Col>
                )}

            <Col span={12}>
                <Form.Item
                    name="so_tien"
                    label="Số tiền chi"
                    rules={[
                        {
                            required: loaiPhieuChi === 4 ? false : true,
                            message: "Số tiền chi không được bỏ trống!",
                        },
                    ]}
                    initialValue={0}
                >
                    <InputNumber
                        placeholder="Nhập số tiền chi"
                        style={{ width: "100%" }}
                        formatter={formatter}
                        parser={parser}
                        addonAfter="đ"
                        disabled={isDetail || loaiPhieuChi === 4}
                    />
                </Form.Item>
            </Col>

            <Col span={12}>
                <Form.Item
                    name="nguoi_nhan"
                    label="Người nhận"
                    rules={[
                        {
                            required: true,
                            message: "Người nhận không được bỏ trống!",
                        },
                    ]}
                >
                    <Input placeholder="Nhập người nhận" disabled={isDetail} />
                </Form.Item>
            </Col>

            <Col span={12}>
                <Form.Item
                    name="phuong_thuc_thanh_toan"
                    label="Phương thức thanh toán"
                    rules={[
                        {
                            required: true,
                            message:
                                "Phương thức thanh toán không được bỏ trống!",
                        },
                    ]}
                >
                    <Select
                        options={OPTIONS_PHUONG_THUC_THANH_TOAN}
                        placeholder="Chọn phương thức thanh toán"
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>

            {/* ⭐ NEW: Khi chuyển khoản → chọn tài khoản chi (CK) giống Phiếu thu */}
            {phuongThucThanhToan === 2 && (
                <Col span={12}>
                    <SelectFormApi
                        name="tai_khoan_id"
                        label="Tài khoản chi (CK)"
                        path={API_ROUTE_CONFIG.CASH_ACCOUNTS_OPTIONS}
                        placeholder="Chọn tài khoản chuyển đi"
                        disabled={isDetail}
                        onChange={(opt: any) => {
                            // Tự điền ngân hàng + số tài khoản khi chọn
                            const bank  = opt?.extra?.ngan_hang ?? undefined;
                            const accno = opt?.extra?.so_tai_khoan ?? undefined;
                            if (bank)  form.setFieldValue("ngan_hang", bank);
                            if (accno) form.setFieldValue("so_tai_khoan", accno);
                        }}
                    />
                </Col>
            )}

            {/* Hai ô dưới vẫn giữ để cho phép nhập tay khi KHÔNG chọn từ dropdown */}
            {phuongThucThanhToan === 2 && (
                <Col span={12}>
                    <Form.Item
                        name="so_tai_khoan"
                        label="Số tài khoản"
                        rules={[
                            {
                                // chỉ bắt buộc khi chuyển khoản và CHƯA chọn từ dropdown
                                required: phuongThucThanhToan === 2 && !taiKhoanId,
                                message: "Số tài khoản không được bỏ trống!",
                            },
                        ]}
                    >
                        <Input
                            placeholder="Nhập số tài khoản"
                            disabled={isDetail || !!taiKhoanId}
                        />
                    </Form.Item>
                </Col>
            )}

            {phuongThucThanhToan === 2 && (
                <Col span={12}>
                    <Form.Item
                        name="ngan_hang"
                        label="Ngân hàng"
                        rules={[
                            {
                                required: phuongThucThanhToan === 2 && !taiKhoanId,
                                message: "Ngân hàng không được bỏ trống!",
                            },
                        ]}
                    >
                        <Input
                            placeholder="Nhập ngân hàng"
                            disabled={isDetail || !!taiKhoanId}
                        />
                    </Form.Item>
                </Col>
            )}

            {loaiPhieuChi === 3 && (
                <Col span={24}>
                    <Form.Item
                        name="ly_do_chi"
                        label="Lý do chi"
                        rules={[
                            {
                                required: loaiPhieuChi === 3,
                                message: "Lý do chi không được bỏ trống!",
                            },
                        ]}
                    >
                        <Input.TextArea
                            placeholder="Nhập lý do chi"
                            rows={2}
                            disabled={isDetail}
                        />
                    </Form.Item>
                </Col>
            )}
            <Col span={24}>
                <Form.Item name="ghi_chu" label="Ghi chú">
                    <Input.TextArea
                        placeholder="Nhập ghi chú"
                        rows={2}
                        disabled={isDetail}
                    />
                </Form.Item>
            </Col>
        </Row>
    );
};

export default FormPhieuChi;
