/* eslint-disable @typescript-eslint/no-explicit-any */
import { EditOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Tabs,
  Table,
  Typography,
  Select,
} from "antd";
import type { FormInstance } from "antd";
import { useState } from "react";
import { useResponsive } from "../../hooks/useReponsive";
import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { putData } from "../../services/updateData";
import { setReload } from "../../redux/slices/main.slice";
import dayjs from "dayjs";
import {
  formatter,
  parser,
  formatVietnameseCurrency,
} from "../../utils/utils";

const { Text, Title } = Typography;

const SuaHopDong = ({
  path,
  id,
  title,
}: {
  path: string;
  id: number;
  title: string;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form] = Form.useForm() as [FormInstance];
  const dispatch = useDispatch();
  const { isMobile } = useResponsive();

  const [donHangState, setDonHangState] = useState<any | null>(null);
  const [hopDongState, setHopDongState] = useState<any | null>(null);
  const [itemsState, setItemsState] = useState<any[]>([]);

  const showModal = async () => {
    setIsModalOpen(true);
    setIsLoading(true);

    try {
      // 1) LOAD HỢP ĐỒNG
      const hdRaw: any = await getDataById(id, path);
      const hd: any = hdRaw?.data ?? hdRaw ?? {};
      setHopDongState(hd);

      // 2) LOAD BÁO GIÁ GỐC
      const donHangId =
        hd?.don_hang_id ?? hd?.donHangId ?? hd?.don_hang?.id ?? hd?.donHang?.id;
      let donHang: any = null;
      if (donHangId) {
        const res: any = await getDataById(donHangId, "/quan-ly-ban-hang");
        donHang = res?.data ?? res;
      }
      setDonHangState(donHang);

      // 3) HẠNG MỤC (items) – readonly
      const items = Array.isArray(hd?.items) ? hd.items : [];
      setItemsState(items);

      // 4) CHUẨN HÓA NGÀY
      if (hd?.ngay_hop_dong) {
        hd.ngay_hop_dong = dayjs(hd.ngay_hop_dong).format("YYYY-MM-DD");
      }

      // 5) SET FORM VALUES (chỉ các field hop_dongs)
      form.setFieldsValue({
        ...hd,
      });
    } catch (e) {
      console.error("[HĐ] Lỗi load:", e);
      setIsModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setItemsState([]);
    setHopDongState(null);
    setDonHangState(null);
    setIsModalOpen(false);
  };

  const closeAndReload = () => {
    handleCancel();
    dispatch(setReload());
  };

  // ===== WATCH FORM ĐỂ TÍNH PREVIEW THANH TOÁN =====
  const tongSauVat = Form.useWatch("tong_sau_vat", form) || 0;
  const dot1TyLe = Form.useWatch("dot1_ty_le", form) || 0;
  const dot2TyLe = Form.useWatch("dot2_ty_le", form) || 0;

  const previewDot1Amount = Math.round(
    (Number(tongSauVat) || 0) * (Number(dot1TyLe) || 0) / 100
  );
  const previewDot2Amount =
    (Number(tongSauVat) || 0) - previewDot1Amount;

  const onUpdate = async (values: any) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...values,
        // Chuẩn hoá ngày trước khi gửi
        ngay_hop_dong: values?.ngay_hop_dong
          ? dayjs(values.ngay_hop_dong).format("YYYY-MM-DD")
          : null,
        // KHÔNG gửi body_json nữa để tránh đè nội dung luật cố định trong template Word
      };

      await putData(path, id, payload, closeAndReload);
    } catch (e) {
      console.error("[HĐ] Lỗi khi lưu:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ====== CỘT HẠNG MỤC (ITEMS) READONLY ======
  const itemColumns = [
    {
      title: "STT",
      dataIndex: "stt",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Nhóm",
      dataIndex: "section_letter",
      width: 80,
      render: (_: any, record: any) =>
        (record?.section_letter || "") +
        (record?.section_code ? ` (${record.section_code})` : ""),
    },
    {
      title: "Hạng mục",
      dataIndex: "hang_muc",
      width: 160,
    },
    {
      title: "Chi tiết",
      dataIndex: "chi_tiet",
      width: 280,
    },
    {
      title: "ĐVT",
      dataIndex: "dvt",
      width: 80,
    },
    {
      title: "SL",
      dataIndex: "so_luong",
      width: 80,
    },
    {
      title: "Đơn giá",
      dataIndex: "don_gia",
      width: 120,
      align: "right" as const,
      render: (v: any) => formatVietnameseCurrency(Number(v || 0)),
    },
    {
      title: "Thành tiền",
      dataIndex: "thanh_tien",
      width: 140,
      align: "right" as const,
      render: (v: any) => formatVietnameseCurrency(Number(v || 0)),
    },
  ];

  return (
    <>
      <Button
        onClick={showModal}
        type="primary"
        size="small"
        icon={<EditOutlined />}
        title={`Sửa ${title}`}
      />

      <Modal
        title={`Sửa ${title}`}
        open={isModalOpen}
        onCancel={handleCancel}
        maskClosable={false}
        style={{ top: 24 }}
        width={isMobile ? "100%" : 1100}
        styles={{
          body: {
            maxHeight: isMobile ? "calc(100vh - 140px)" : "calc(100vh - 160px)",
            overflow: "auto",
            padding: isMobile ? 12 : 24,
          },
        }}
        loading={isLoading}
        footer={
          <Row justify="end" style={{ gap: 8 }}>
            <Button onClick={handleCancel}>Hủy</Button>
            <Button
              key="submit"
              form={`formSuaHopDong-${id}`}
              type="primary"
              htmlType="submit"
              size="large"
              loading={isSubmitting}
            >
              Lưu
            </Button>
          </Row>
        }
      >
        <Form
          id={`formSuaHopDong-${id}`}
          form={form}
          layout="vertical"
          onFinish={onUpdate}
        >
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: "1",
                label: "Thông tin & thanh toán",
                children: (
                  <>
                    {/* == Báo giá gốc == */}
                    {donHangState && (
                      <Card
                        size="small"
                        style={{ marginBottom: 16 }}
                        title={
                          <span style={{ fontWeight: 600 }}>
                            Báo giá gốc: {donHangState?.ma_don_hang || "-"}
                          </span>
                        }
                      >
                        <Row gutter={[12, 6]}>
                          <Col span={12}>
                            <Text strong>Khách hàng: </Text>
                            <Text>
                              {donHangState?.ten_khach_hang ??
                                donHangState?.khach_hang?.ten_khach_hang ??
                                "-"}
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong>Số điện thoại: </Text>
                            <Text>
                              {donHangState?.so_dien_thoai ??
                                donHangState?.khach_hang?.so_dien_thoai ??
                                "-"}
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong>Ngày tổ chức: </Text>
                            <Text>
                              {donHangState?.nguoi_nhan_thoi_gian
                                ? dayjs(
                                    donHangState.nguoi_nhan_thoi_gian
                                  ).format("DD/MM/YYYY HH:mm")
                                : ""}
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong>Địa điểm: </Text>
                            <Text>
                              {donHangState?.venue_name
                                ? `${donHangState.venue_name} - ${
                                    donHangState.venue_address ??
                                    donHangState.dia_chi_giao_hang ??
                                    ""
                                  }`
                                : donHangState?.dia_chi_giao_hang ?? "-"}
                            </Text>
                          </Col>

                          <Col span={12}>
                            <Text strong>Giá trị trước VAT: </Text>
                            <Text>
                              {formatVietnameseCurrency(
                                Number(donHangState?.subtotal || 0)
                              )}{" "}
                              đ
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong>VAT: </Text>
                            <Text>
                              {donHangState?.vat_rate != null
                                ? `${donHangState.vat_rate}%`
                                : "Không VAT"}
                            </Text>
                          </Col>

                          <Col span={12}>
                            <Text strong>Tổng sau VAT: </Text>
                            <Text>
                              {formatVietnameseCurrency(
                                Number(
                                  donHangState?.tong_tien_can_thanh_toan ??
                                    donHangState?.grand_total ??
                                    0
                                )
                              )}{" "}
                              đ
                            </Text>
                          </Col>
                        </Row>
                      </Card>
                    )}

                                      {/* == Thông tin HĐ == */}
                    <Card
                      size="small"
                      style={{ marginBottom: 16 }}
                      title="Thông tin Hợp đồng"
                    >
                      {/* Số HĐ + Ngày ký HĐ */}
                      <Row gutter={[12, 6]}>
                        <Col span={8}>
                          <Form.Item name="so_hop_dong" label="Số Hợp đồng">
                            <Input placeholder="Nhập số Hợp đồng" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            name="ngay_hop_dong"
                            label="Ngày ký Hợp đồng"
                          >
                            <Input type="date" />
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* BÊN A (Khách hàng) */}
                      <Row gutter={[12, 6]}>
                        <Col span={12}>
                          <Title level={5} style={{ marginBottom: 8 }}>
                            BÊN A (Khách hàng)
                          </Title>

                          <Form.Item name="ben_a_ten" label="Tên Bên A">
                            <Input placeholder="Tên Bên A" />
                          </Form.Item>

                          <Form.Item
                            name="ben_a_dia_chi"
                            label="Địa chỉ Bên A"
                          >
                            <Input placeholder="Địa chỉ Bên A" />
                          </Form.Item>

                          <Form.Item
                            name="ben_a_mst"
                            label="Mã số thuế Bên A"
                          >
                            <Input placeholder="Mã số thuế" />
                          </Form.Item>

                          {/* Xưng hô + Người đại diện Bên A */}
                          <Row gutter={8}>
                            <Col span={8}>
                              <Form.Item
                                name="ben_a_xung_ho"
                                label="Xưng hô"
                              >
                                <Select
                                  allowClear
                                  placeholder="Chọn"
                                  options={[
                                    { label: "Ông", value: "Ông" },
                                    { label: "Bà", value: "Bà" },
                                  ]}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={16}>
                              <Form.Item
                                name="ben_a_dai_dien"
                                label="Người đại diện Bên A"
                              >
                                <Input placeholder="Họ tên người đại diện" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Form.Item
                            name="ben_a_chuc_vu"
                            label="Chức vụ người đại diện"
                          >
                            <Input placeholder="Chức vụ" />
                          </Form.Item>

                          <Form.Item
                            name="ben_a_dien_thoai"
                            label="Điện thoại Bên A"
                          >
                            <Input placeholder="Điện thoại" />
                          </Form.Item>

                          <Form.Item name="ben_a_email" label="Email Bên A">
                            <Input placeholder="Email" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>



                    {/* == Giá trị & thanh toán == */}
                    <Card
                      size="small"
                      style={{ marginBottom: 16 }}
                      title="Giá trị Hợp đồng & thanh toán"
                    >
                      <Row gutter={[12, 6]}>
                        <Col span={6}>
                          <Form.Item
                            name="tong_truoc_vat"
                            label="Tổng trước VAT"
                          >
                            <InputNumber
                              style={{ width: "100%" }}
                              formatter={formatter}
                              parser={parser}
                              addonAfter="đ"
                              min={0}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="vat_rate" label="VAT (%)">
                            <InputNumber
                              style={{ width: "100%" }}
                              min={0}
                              max={20}
                              step={0.5}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="vat_amount" label="Tiền VAT">
                            <InputNumber
                              style={{ width: "100%" }}
                              formatter={formatter}
                              parser={parser}
                              addonAfter="đ"
                              min={0}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item name="tong_sau_vat" label="Tổng sau VAT">
                            <InputNumber
                              style={{ width: "100%" }}
                              formatter={formatter}
                              parser={parser}
                              addonAfter="đ"
                              min={0}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item
                            name="tong_sau_vat_bang_chu"
                            label="Tổng sau VAT (bằng chữ)"
                          >
                            <Input.TextArea
                              rows={2}
                              placeholder="Sẽ được BE tự tính lại nếu để trống"
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={[12, 6]} style={{ marginTop: 8 }}>
                        <Col span={12}>
                          <Title level={5}>Thanh toán Đợt 1</Title>
                          <Row gutter={[8, 4]}>
                            <Col span={8}>
                              <Form.Item
                                name="dot1_ty_le"
                                label="Tỷ lệ (%)"
                              >
                                <InputNumber
                                  style={{ width: "100%" }}
                                  addonAfter="%"
                                  min={0}
                                  max={100}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={16}>
                              <Form.Item
                                name="dot1_thoi_diem_text"
                                label="Thời điểm thanh toán"
                              >
                                <Input placeholder="VD: Trước khi thực hiện chương trình..." />
                              </Form.Item>
                            </Col>
                            <Col span={24}>
                              <Text type="secondary">
                                Số tiền ước tính (theo % và tổng HĐ):{" "}
                                <strong>
                                  {formatVietnameseCurrency(
                                    previewDot1Amount
                                  )}{" "}
                                  đ
                                </strong>
                              </Text>
                            </Col>
                          </Row>
                        </Col>

                        <Col span={12}>
                          <Title level={5}>Thanh toán Đợt 2</Title>
                          <Row gutter={[8, 4]}>
                            <Col span={8}>
                              <Form.Item
                                name="dot2_ty_le"
                                label="Tỷ lệ (%)"
                              >
                                <InputNumber
                                  style={{ width: "100%" }}
                                  addonAfter="%"
                                  min={0}
                                  max={100}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={16}>
                              <Form.Item
                                name="dot2_thoi_diem_text"
                                label="Thời điểm thanh toán"
                              >
                                <Input placeholder="VD: Ngay sau khi kết thúc chương trình..." />
                              </Form.Item>
                            </Col>
                            <Col span={24}>
                              <Text type="secondary">
                                Số tiền ước tính (phần còn lại):{" "}
                                <strong>
                                  {formatVietnameseCurrency(
                                    previewDot2Amount
                                  )}{" "}
                                  đ
                                </strong>
                              </Text>
                            </Col>
                          </Row>
                        </Col>
                      </Row>
                    </Card>
                  </>
                ),
              },
              {
                key: "2",
                label: "Hạng mục (readonly)",
                children: (
                  <Card
                    size="small"
                    title="Bảng hạng mục Hợp đồng (A/B/C/D/E)"
                  >
                    <Table
                      rowKey={(r: any, idx) => r.id ?? idx}
                      columns={itemColumns}
                      dataSource={itemsState}
                      pagination={false}
                      size="small"
                      scroll={{ x: 800, y: 300 }}
                    />
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        Bảng này được sinh tự động từ Báo giá. Nếu cần chỉnh
                        sửa hạng mục, anh em PHG vui lòng điều chỉnh lại ở phần Báo giá rồi
                        chuyển sang Hợp đồng lần nữa.
                      </Text>
                    </div>
                  </Card>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </>
  );
};

export default SuaHopDong;
