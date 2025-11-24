// /src/pages/quan-ly-chi-phi/FormQuanLyChiPhi.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState, useEffect } from "react";
import {
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Typography,
  type FormInstance,
  Pagination,
  Space,
  Divider,
  Button,
} from "antd";
import dayjs from "dayjs";
import { formatter, parser } from "../../utils/utils";

type ChiPhiMode = "de-xuat" | "thuc-te";

type Props = {
  form: FormInstance;
  mode: ChiPhiMode; // "de-xuat" | "thuc-te"
  // stepMode giữ cho tương thích với code cũ nhưng KHÔNG còn dùng trong component này
  stepMode?: number;
  // donHang truyền trực tiếp từ parent (ưu tiên nếu có)
  donHang?: any;
};


const PAGE_SIZE = 20; // số dòng chi tiết hiển thị trong 1 trang modal

const FormQuanLyChiPhi = ({ form, mode, donHang: donHangProp }: Props) => {

  const isDeXuat = mode === "de-xuat";

  // ===== WATCH DỮ LIỆU TỪ FORM / PROP =====
  const rootValues: any = Form.useWatch([], form) || {};
  const donHang: any =
    donHangProp ||                         // 👈 ƯU TIÊN: props từ parent
    Form.useWatch("don_hang", form) ||
    rootValues?.don_hang ||
    rootValues?.donHang ||
    rootValues?.order ||
    {};
  const items: any[] = Form.useWatch("items", form) || [];




  const [currentPage, setCurrentPage] = useState<number>(1);

  // Mỗi khi items thay đổi mà ít trang hơn -> thu nhỏ currentPage cho hợp lệ
  useEffect(() => {
    const total = items.length || 0;
    const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [items, currentPage]);

  const totalItems = items.length || 0;
  const maxPage = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  // ===== TÍNH TỔNG DOANH THU / CHI PHÍ / LỢI NHUẬN =====
  const { totalRevenue, totalCost, totalMargin, marginPercent } = useMemo(() => {
    let rev = 0;
    let cost = 0;

    (items || []).forEach((r: any) => {
      rev += Number(r?.sell_total_amount || 0);
      cost += Number(r?.cost_total_amount || 0);
    });

    const margin = rev - cost;
    const percent =
      rev > 0 ? Math.round((margin * 10000) / rev) / 100 : null; // làm tròn 2 chữ số

    return {
      totalRevenue: rev,
      totalCost: cost,
      totalMargin: margin,
      marginPercent: percent,
    };
  }, [items]);

  // ===== UPDATE THÀNH TIỀN CHI PHÍ (cost_total_amount = so_luong * cost_unit_price) =====
  const updateCostTotal = useCallback(
    (rowIndex: number) => {
      const arr: any[] = form.getFieldValue("items") || [];
      if (!Array.isArray(arr) || !arr[rowIndex]) return;

      const row = { ...(arr[rowIndex] || {}) };
      const qty = Number(row.so_luong || 0);
      const unit = Number(row.cost_unit_price || 0);

      row.cost_total_amount = qty * unit;
      arr[rowIndex] = row;
      form.setFieldsValue({ items: arr });
    },
    [form]
  );

  // ===== FORMAT THÔNG TIN BÁO GIÁ GỐC =====
  const ngayToChucText = useMemo(() => {
    const raw = donHang?.nguoi_nhan_thoi_gian || donHang?.event_start || null;
    if (!raw) return "";
    const d = dayjs(raw);
    return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "";
  }, [donHang]);

  const khachHangText = useMemo(() => {
    const kh = donHang?.khach_hang || donHang?.khachHang || {};
    const ten = kh?.ten_khach_hang ?? donHang?.ten_khach_hang ?? "";
    return ten || "";
  }, [donHang]);

  const soKhachText = useMemo(() => {
    const v = donHang?.guest_count;
    if (v === null || v === undefined) return "";
    return String(v);
  }, [donHang]);

  const titleHeader = isDeXuat
    ? "Quản lý chi phí ĐỀ XUẤT"
    : "Quản lý chi phí THỰC TẾ";

  return (
    <div style={{ width: "100%" }}>
      {/* ====== HEADER THÔNG TIN BÁO GIÁ ====== */}
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        bodyStyle={{ padding: 12 }}
      >
        <Typography.Title
          level={5}
          style={{ marginBottom: 8, textTransform: "uppercase" }}
        >
          {titleHeader} – Báo giá: {donHang?.ma_don_hang || ""}
        </Typography.Title>

        <Row gutter={[12, 4]}>
          <Col xs={24} md={12}>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Mã báo giá:</Typography.Text>
              </Col>
              <Col span={16}>{donHang?.ma_don_hang || ""}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Dự án / Sự kiện:</Typography.Text>
              </Col>
              <Col span={16}>
                {donHang?.project_name || donHang?.event_type || ""}
              </Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Ngày tổ chức:</Typography.Text>
              </Col>
              <Col span={16}>{ngayToChucText}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Địa điểm:</Typography.Text>
              </Col>
              <Col span={16}>
                {donHang?.venue_name
                  ? `${donHang.venue_name}${
                      donHang?.venue_address ? " - " + donHang.venue_address : ""
                    }`
                  : donHang?.venue_address || donHang?.dia_chi_giao_hang || ""}
              </Col>
            </Row>
          </Col>

          <Col xs={24} md={12}>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Khách hàng:</Typography.Text>
              </Col>
              <Col span={16}>{khachHangText}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Loại sự kiện:</Typography.Text>
              </Col>
              <Col span={16}>{donHang?.event_type || ""}</Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Text strong>Số khách dự kiến:</Typography.Text>
              </Col>
              <Col span={16}>{soKhachText}</Col>
            </Row>
          </Col>
        </Row>

        <Divider style={{ margin: "8px 0" }} />

        <Row>
          <Col span={24}>
            <Form.Item name="note" label="Ghi chú nội bộ (Chi phí)">
              <Input.TextArea
                rows={2}
                placeholder="Nhập ghi chú nội bộ cho bảng chi phí (nếu cần)"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* ====== BẢNG CHI PHÍ – GIỐNG TEMPLATE BÁO GIÁ + 3 CỘT SUP ====== */}
      <Card size="small" bodyStyle={{ padding: 8 }} style={{ marginBottom: 12 }}>
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          Bảng chi phí theo Hạng mục
        </Typography.Title>

        <div
          style={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <colgroup>
              <col style={{ width: "4%" }} /> {/* STT */}
              <col style={{ width: "10%" }} /> {/* Hạng mục */}
              <col style={{ width: "26%" }} /> {/* Chi tiết */}
              <col style={{ width: "6%" }} /> {/* ĐVT */}
              <col style={{ width: "6%" }} /> {/* SL */}
              <col style={{ width: "10%" }} /> {/* SUP */}
              <col style={{ width: "9%" }} /> {/* Đơn giá CP */}
              <col style={{ width: "9%" }} /> {/* Thành tiền CP */}
              <col style={{ width: "10%" }} /> {/* Đơn giá bán */}
              <col style={{ width: "10%" }} /> {/* Thành tiền bán */}
            </colgroup>
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  STT
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  HẠNG MỤC
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  CHI TIẾT
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  ĐVT
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  SL
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  SUP
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  Đơn giá CP
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  Thành tiền CP
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  Đơn giá bán
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "4px",
                    textAlign: "center",
                    background: "#f5f5f5",
                  }}
                >
                  Thành tiền bán
                </th>
              </tr>
            </thead>

            <Form.List name="items">
              {(fields, { add }) => (
                <tbody>
                  {fields
                    .filter((field) => {
                      const idx = Number(field.name);
                      return idx >= start && idx < end;
                    })
                    .map((field) => {
                      const idx = Number(field.name);
                      const stt = idx + 1;

                      return (
                        <tr key={field.key}>
                          {/* STT + các field ẩn để submit về BE */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                              textAlign: "center",
                            }}
                          >
                            {stt}
                            {/* section_code */}
                            <Form.Item
                              {...field}
                              name={[field.name, "section_code"]}
                              hidden
                            >
                              <Input type="hidden" />
                            </Form.Item>
                            {/* chi_tiet_don_hang_id */}
                            <Form.Item
                              {...field}
                              name={[field.name, "chi_tiet_don_hang_id"]}
                              hidden
                            >
                              <Input type="hidden" />
                            </Form.Item>
                            {/* hang_muc_goc */}
                            <Form.Item
                              {...field}
                              name={[field.name, "hang_muc_goc"]}
                              hidden
                            >
                              <Input type="hidden" />
                            </Form.Item>
                            {/* supplier_id */}
                            <Form.Item
                              {...field}
                              name={[field.name, "supplier_id"]}
                              hidden
                            >
                              <Input type="hidden" />
                            </Form.Item>
                            {/* note (nếu sau này dùng) */}
                            <Form.Item
                              {...field}
                              name={[field.name, "note"]}
                              hidden
                            >
                              <Input type="hidden" />
                            </Form.Item>
                          </td>

                          {/* HẠNG MỤC */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                            }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "hang_muc"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="Hạng mục (Âm thanh, Nhân sự...)" />
                            </Form.Item>
                          </td>

                          {/* CHI TIẾT */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                            }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "chi_tiet"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input.TextArea
                                autoSize={{ minRows: 1, maxRows: 3 }}
                                placeholder="Chi tiết hạng mục / dịch vụ"
                              />
                            </Form.Item>
                          </td>

                          {/* ĐVT */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                              textAlign: "center",
                            }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "dvt"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="ĐVT" />
                            </Form.Item>
                          </td>

                          {/* SL */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                              textAlign: "center",
                            }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "so_luong"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                min={0}
                                style={{ width: "100%" }}
                                onChange={() => updateCostTotal(idx)}
                              />
                            </Form.Item>
                          </td>

                          {/* SUP */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                            }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "sup"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="Tên Supplier / NCC" />
                            </Form.Item>
                          </td>

                          {/* ĐƠN GIÁ CP */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                              textAlign: "right",
                            }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "cost_unit_price"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                min={0}
                                style={{ width: "100%" }}
                                formatter={formatter}
                                parser={parser}
                                addonAfter="đ"
                                onChange={() => updateCostTotal(idx)}
                              />
                            </Form.Item>
                          </td>

                          {/* THÀNH TIỀN CP */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                              textAlign: "right",
                            }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "cost_total_amount"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                disabled
                                style={{ width: "100%" }}
                                formatter={formatter}
                                parser={parser}
                                addonAfter="đ"
                              />
                            </Form.Item>
                          </td>

                          {/* ĐƠN GIÁ BÁN (READONLY) */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                              textAlign: "right",
                            }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "sell_unit_price"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                disabled
                                style={{ width: "100%" }}
                                formatter={formatter}
                                parser={parser}
                                addonAfter="đ"
                              />
                            </Form.Item>
                          </td>

                          {/* THÀNH TIỀN BÁN (READONLY) */}
                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: "3px",
                              textAlign: "right",
                            }}
                          >
                            <Form.Item
                              {...field}
                              name={[field.name, "sell_total_amount"]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                disabled
                                style={{ width: "100%" }}
                                formatter={formatter}
                                parser={parser}
                                addonAfter="đ"
                              />
                            </Form.Item>
                          </td>
                        </tr>
                      );
                    })}

                  {/* Nút thêm dòng chi phí */}
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        border: "1px solid #eee",
                        padding: "4px",
                        textAlign: "left",
                      }}
                    >
                      <Space>
                        <Typography.Text type="secondary">
                          Tổng số dòng: {totalItems}
                        </Typography.Text>
                        <Button
                          type="dashed"
                          onClick={() =>
                            add({
                              so_luong: 0,
                              sup: "",
                              cost_unit_price: 0,
                              cost_total_amount: 0,
                              sell_unit_price: 0,
                              sell_total_amount: 0,
                            })
                          }
                        >
                          + Thêm dòng chi phí
                        </Button>
                      </Space>
                    </td>
                  </tr>
                </tbody>
              )}
            </Form.List>
          </table>
        </div>

        {/* PHÂN TRANG NỘI BỘ MODAL */}
        {totalItems > PAGE_SIZE && (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography.Text type="secondary">
              Hiển thị{" "}
              {totalItems === 0
                ? "0"
                : `${start + 1}–${Math.min(end, totalItems)}`}{" "}
              / {totalItems} dòng
            </Typography.Text>
            <Pagination
              size="small"
              current={currentPage}
              total={totalItems}
              pageSize={PAGE_SIZE}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </Card>

      {/* ====== TỔNG HỢP LÃI LỖ (HIỂN THỊ) ====== */}
      <Card size="small" bodyStyle={{ padding: 8 }}>
        <Row gutter={[8, 4]}>
          <Col xs={24} md={6}>
            <Typography.Text strong>Tổng doanh thu:</Typography.Text>
            <div>{formatter(totalRevenue)} đ</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>Tổng chi phí:</Typography.Text>
            <div>{formatter(totalCost)} đ</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>Lợi nhuận:</Typography.Text>
            <div>{formatter(totalMargin)} đ</div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text strong>Tỉ suất lợi nhuận:</Typography.Text>
            <div>
              {marginPercent !== null ? `${marginPercent.toFixed(2)} %` : "-"}
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default FormQuanLyChiPhi;
