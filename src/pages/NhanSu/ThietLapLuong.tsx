/* src/pages/NhanSu/ThietLapLuong.tsx */
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

const { Title, Text } = Typography;

type Profile = {
  user_id: number;
  salary_mode: "khoan" | "cham_cong";
  muc_luong_co_ban: number;
  he_so: number;
  cong_chuan?: number;
  cong_chuan_override?: number | null;

  support_allowance?: number;
  phone_allowance?: number;
  meal_per_day?: number;
  meal_extra_default?: number;

  apply_insurance: 0 | 1;
  insurance_base_mode: "base" | "prorate" | "none";
  pt_bhxh: number;
  pt_bhyt: number;
  pt_bhtn: number;

  note?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
};

type PreviewMetrics = {
  base: number;
  cong_chuan: number;
  so_ngay_cong: number;
  daily_rate: number;
  fixed_pay: number;
  allow_fixed: number;
  meal_amount: number;
  ot_amount: number;
  P_gross: number;
  bhxh: number;
  bhyt: number;
  bhtn: number;
  Q_insurance: number;
  R_deduct_other: number;
  T_advance: number;
  U_net: number;
};

function toVND(n?: number) {
  return (n ?? 0).toLocaleString("vi-VN");
}

// Trả về number cho InputNumber.parser
const parseVND = (v?: string | number) => {
  const s = typeof v === "number" ? String(v) : (v ?? "");
  const n = Number(String(s).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};


const ThietLapLuong: React.FC = () => {
  // ======= state cơ bản
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<string>(dayjs().format("YYYY-MM"));
  const [users, setUsers] = useState<{ value: number; label: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [form] = Form.useForm<Profile>();

  // Đọc realtime để disable %BH khi không trừ BH hoặc chọn 'none'
const applyInsurance = Form.useWatch("apply_insurance", form) ?? 1;
const insuranceBaseMode = Form.useWatch("insurance_base_mode", form) ?? "prorate";
const disableInsPct = !applyInsurance || insuranceBaseMode === "none";

// Parser number cho InputNumber có formatter
const parseVND = (v?: string | number) => {
  const s = typeof v === "number" ? String(v) : (v ?? "");
  const n = Number(String(s).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const [metrics, setMetrics] = useState<PreviewMetrics | null>(null);

  // ======= nạp danh sách user (fallback robust cho nhiều shape BE)
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res: any = await axios.get(API_ROUTE_CONFIG.NGUOI_DUNG, {
        params: { page: 1, per_page: 200 },
      });
      const list =
        (Array.isArray(res?.data?.collection) && res.data.collection) ||
        (Array.isArray(res?.data?.items) && res.data.items) ||
        (Array.isArray(res?.data?.data) && res.data.data) ||
        (Array.isArray(res?.collection) && res.collection) ||
        (Array.isArray(res?.items) && res.items) ||
        (Array.isArray(res?.data) && res.data) ||
        [];
      const opts = (list as any[]).map((u) => ({
        value: u.id,
        label: u.name || u.email || `#${u.id}`,
      }));
      setUsers(opts);
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "Không tải được danh sách nhân viên");
    } finally {
      setLoadingUsers(false);
    }
  };

  // ======= nạp profile theo user
  const fetchProfile = async (uid: number) => {
    try {
      const res: any = await axios.get(API_ROUTE_CONFIG.NHAN_SU_LUONG_PROFILE_GET, {
        params: { user_id: uid },
      });
      if (res?.success) {
        const p: Profile = res.data?.profile ?? ({} as any);
        // Chuẩn hoá giá trị form
        form.setFieldsValue({
          user_id: uid,
          salary_mode: (p.salary_mode as any) || "cham_cong",
          muc_luong_co_ban: p.muc_luong_co_ban ?? 0,
          he_so: p.he_so ?? 1.0,
          cong_chuan: p.cong_chuan ?? 26,
          cong_chuan_override: p.cong_chuan_override ?? 28,

          support_allowance: p.support_allowance ?? 0,
          phone_allowance: p.phone_allowance ?? 0,
          meal_per_day: p.meal_per_day ?? 0,
          meal_extra_default: p.meal_extra_default ?? 0,

          apply_insurance: (p.apply_insurance as any) ?? 1,
          insurance_base_mode: (p.insurance_base_mode as any) ?? "prorate",
          pt_bhxh: p.pt_bhxh ?? 8.0,
          pt_bhyt: p.pt_bhyt ?? 1.5,
          pt_bhtn: p.pt_bhtn ?? 1.0,

          note: (p as any).note ?? null,
          effective_from: (p as any).effective_from ?? null,
          effective_to: (p as any).effective_to ?? null,
        });
      } else {
        message.error(res?.message || "Không lấy được hồ sơ lương");
      }
    } catch (e: any) {
      message.error(e?.message || "Lỗi lấy hồ sơ lương");
    }
  };

  // ======= lưu hồ sơ
const onSave = async () => {
  if (!userId) {
    message.warning("Chọn nhân viên trước khi lưu");
    return;
  }
  try {
    const v = await form.validateFields();

    // sanitize: bỏ undefined/null & ép default số
    const clean = (obj: any) =>
      Object.fromEntries(
        Object.entries(obj).map(([k, val]) => {
          if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
            // set default hợp lý theo field
            if (["cong_chuan", "cong_chuan_override", "support_allowance", "phone_allowance", "meal_per_day", "meal_extra_default"].includes(k)) {
              return [k, undefined]; // bỏ hẳn để BE fill default
            }
            if (["pt_bhxh", "pt_bhyt", "pt_bhtn", "he_so"].includes(k)) {
              return [k, undefined]; // để BE fill default
            }
            return [k, undefined];
          }
          // ép kiểu số cho các field numeric
          if (["muc_luong_co_ban","cong_chuan","cong_chuan_override","support_allowance","phone_allowance","meal_per_day","meal_extra_default"].includes(k)) {
            return [k, Number(val) || 0];
          }
          if (["pt_bhxh","pt_bhyt","pt_bhtn","he_so"].includes(k)) {
            return [k, Number(val)];
          }
          return [k, val];
        }).filter(([_, v]) => v !== undefined)
      );

    const payload = {
      user_id: userId,
      salary_mode: v.salary_mode || "cham_cong",
      ...clean(v),
    };

    console.log("[SAVE-PAYROLL-PROFILE] payload=", payload);
    setSaving(true);
    const res: any = await axios.post(API_ROUTE_CONFIG.NHAN_SU_LUONG_PROFILE_UPSERT, payload);
    console.log("[SAVE-PAYROLL-PROFILE] response=", res);
    if (res?.success) {
      message.success("Đã lưu thiết lập lương");
    } else {
      message.error(res?.message || "Lưu thất bại");
    }
  } catch (e: any) {
    if (e?.errorFields) return;
    console.error("[SAVE-PAYROLL-PROFILE] error=", e?.response?.data || e);
    message.error(e?.response?.data?.data?.message || e?.message || "Lỗi lưu hồ sơ");
  } finally {
    setSaving(false);
  }
};



  // ======= preview
  const onPreview = async () => {
    if (!userId) {
      message.warning("Chọn nhân viên trước khi xem trước");
      return;
    }
    try {
      setPreviewing(true);
      const res: any = await axios.get(API_ROUTE_CONFIG.NHAN_SU_LUONG_PREVIEW, {
        params: { user_id: userId, thang: month },
      });
      if (res?.success) {
        setMetrics(res.data?.metrics ?? null);
      } else {
        setMetrics(null);
        message.error(res?.message || "Không xem trước được");
      }
    } catch (e: any) {
      setMetrics(null);
      message.error(e?.message || "Lỗi xem trước");
    } finally {
      setPreviewing(false);
    }
  };

  // ======= recompute tháng (snapshot)
  const onRecompute = async () => {
    if (!userId) {
      message.warning("Chọn nhân viên trước khi tính lại");
      return;
    }
    try {
      setRecomputing(true);
      const res: any = await axios.post(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_RECOMPUTE, null, {
        params: { thang: month, user_id: userId },
      });
      if (res?.success) {
        message.success("Đã tổng hợp bảng lương (snapshot)");
      } else {
        message.error(res?.message || "Không thể tổng hợp");
      }
    } catch (e: any) {
      message.error(e?.message || "Lỗi tổng hợp");
    } finally {
      setRecomputing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (userId) fetchProfile(userId);
    setMetrics(null);
  }, [userId]);

  const header = useMemo(
    () => (
      <Card style={{ marginBottom: 12 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col flex="auto">
            <Title level={4} style={{ margin: 0 }}>
              Thiết lập lương
            </Title>
            <Text type="secondary">Cấu hình tham số lương & xem trước tính lương theo tháng</Text>
          </Col>
          <Col>
            <Space wrap>
              <Select
                showSearch
                allowClear
                placeholder="Chọn nhân viên"
                style={{ minWidth: 260 }}
                loading={loadingUsers}
                options={users}
                optionFilterProp="label"
                onChange={(v) => setUserId(v as number)}
              />
              <DatePicker
                picker="month"
                value={dayjs(month + "-01")}
                onChange={(d) => setMonth(d ? d.format("YYYY-MM") : dayjs().format("YYYY-MM"))}
                allowClear={false}
              />
              <Button type="primary" onClick={onSave} loading={saving} disabled={!userId}>
                Lưu hồ sơ
              </Button>
              <Button onClick={onPreview} loading={previewing} disabled={!userId}>
                Xem trước
              </Button>
              <Button onClick={onRecompute} loading={recomputing} disabled={!userId}>
                Tính lại tháng
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    ),
    [users, loadingUsers, userId, month, saving, previewing, recomputing]
  );

  return (
    <div style={{ padding: 12 }}>
      {header}

      <Row gutter={[12, 12]}>
        {/* Form cấu hình */}
        <Col xs={24} md={14}>
          <Card title="Thông số hồ sơ lương" bordered>
            <Form<Profile> form={form} layout="vertical">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Hình thức lương" name="salary_mode" rules={[{ required: true }]}>
                    <Radio.Group>
                      <Radio.Button value="khoan">Lương khoán (không theo công)</Radio.Button>
                      <Radio.Button value="cham_cong">Lương chấm công</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
           <Form.Item
  label="Mức lương cơ bản (VND)"
  name="muc_luong_co_ban"
  rules={[{ required: true, message: "Nhập số tiền (đơn vị: đồng)" }]}
  help="Nhập số tiền (đơn vị: đồng). Ví dụ: 6.000.000"
>
  <InputNumber
    min={0}
    step={50000}
    style={{ width: "100%" }}
    formatter={(v) => `${Number(v || 0).toLocaleString("vi-VN")}`}
    parser={parseVND}
    addonAfter="đ"
  />
</Form.Item>

                </Col>

                <Col span={8}>
<Form.Item label="Hệ số" name="he_so" rules={[{ required: true, message: "Nhập hệ số (ví dụ 1.0)" }]} help="Số thập phân. Ví dụ 1.0">
  <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
</Form.Item>

                </Col>
                <Col span={8}>
<Form.Item
  label="Công chuẩn (mặc định)"
  name="cong_chuan"
  help="Số ngày công tiêu chuẩn của 1 tháng (ví dụ 26) — chỉ dùng khi không điền ô 'Công chuẩn áp dụng'"
>
  <InputNumber min={1} max={31} style={{ width: "100%" }} />
</Form.Item>

<Form.Item
  label="Công chuẩn áp dụng"
  name="cong_chuan_override"
  tooltip="Để trống sẽ dùng Công chuẩn (mặc định)"
  help="Ví dụ 28 nếu bạn muốn tính 28 công/tháng"
>
  <InputNumber min={1} max={31} style={{ width: "100%" }} />
</Form.Item>

                </Col>

                <Col span={8}>
<Form.Item label="Phụ cấp hỗ trợ" name="support_allowance" help="Khoản cố định theo THÁNG (đồng/tháng)">
  <InputNumber
    min={0}
    step={50000}
    style={{ width: "100%" }}
    formatter={(v) => `${Number(v || 0).toLocaleString("vi-VN")}`}
    parser={parseVND}
    addonAfter="đ/tháng"
  />
</Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Phụ cấp điện thoại" name="phone_allowance" help="Khoản cố định theo THÁNG (đồng/tháng)">
  <InputNumber
    min={0}
    step={50000}
    style={{ width: "100%" }}
    formatter={(v) => `${Number(v || 0).toLocaleString("vi-VN")}`}
    parser={parseVND}
    addonAfter="đ/tháng"
  />
</Form.Item>
                </Col>
                <Col span={8}>
<Form.Item label="Ăn trưa / ngày" name="meal_per_day" help="Đơn giá ăn trưa theo NGÀY công (đồng/ngày)">
  <InputNumber
    min={0}
    step={10000}
    style={{ width: "100%" }}
    formatter={(v) => `${Number(v || 0).toLocaleString("vi-VN")}`}
    parser={parseVND}
    addonAfter="đ/ngày"
  />
</Form.Item>
                </Col>

                <Col span={8}>
                 <Form.Item label="Phụ cấp cơm cố định" name="meal_extra_default" help="Khoản cố định theo THÁNG (đồng/tháng)">
  <InputNumber
    min={0}
    step={50000}
    style={{ width: "100%" }}
    formatter={(v) => `${Number(v || 0).toLocaleString("vi-VN")}`}
    parser={parseVND}
    addonAfter="đ/tháng"
  />
</Form.Item>
                </Col>
                <Col span={8}>
                <Form.Item label="Trừ bảo hiểm?" name="apply_insurance" valuePropName="checked">
  <Switch />
</Form.Item>
                </Col>
                <Col span={8}>
   <Form.Item label="Cách tính lương đóng BH" name="insurance_base_mode" help="Chọn 'Không trừ BH' nếu bạn không muốn khấu trừ BH tháng này">
  <Select
    options={[
      { value: "prorate", label: "Theo phần công (khuyên dùng)" },
      { value: "base",    label: "Theo base cả tháng" },
      { value: "none",    label: "Không trừ BH (Cách B)" },
    ]}
  />
</Form.Item>
                </Col>

                <Col span={8}>
<Form.Item label="% BHXH" name="pt_bhxh" help="Nhập phần trăm (ví dụ 8)">
  <InputNumber min={0} max={100} step={0.5} style={{ width: "100%" }} addonAfter="%" disabled={disableInsPct} />
</Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="% BHYT" name="pt_bhyt" help="Nhập phần trăm (ví dụ 1.5)">
  <InputNumber min={0} max={100} step={0.5} style={{ width: "100%" }} addonAfter="%" disabled={disableInsPct} />
</Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="% BHTN" name="pt_bhtn" help="Nhập phần trăm (ví dụ 1)">
  <InputNumber min={0} max={100} step={0.5} style={{ width: "100%" }} addonAfter="%" disabled={disableInsPct} />
</Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Preview breakdown */}
        <Col xs={24} md={10}>
          <Card
            title={
              <Space>
                <span>Kết quả xem trước</span>
                <Text type="secondary">({dayjs(month + "-01").format("MM/YYYY")})</Text>
              </Space>
            }
            extra={
              <Button onClick={onPreview} disabled={!userId} loading={previewing}>
                Làm mới
              </Button>
            }
          >
            {!metrics ? (
              <Text type="secondary">Chọn nhân viên và bấm “Xem trước” để hiển thị P/Q/R/T/U.</Text>
            ) : (
              <div style={{ lineHeight: 1.9 }}>
                <div>
                  <Text type="secondary">Base (MLCB×HS): </Text>
                  <Text strong>{toVND(metrics.base)} đ</Text>
                </div>
                <div>
                  <Text type="secondary">Công chuẩn: </Text>
                  <Text strong>{metrics.cong_chuan}</Text>
                  <Text type="secondary"> • Ngày công thực tế: </Text>
                  <Text strong>{metrics.so_ngay_cong}</Text>
                </div>
                <div>
                  <Text type="secondary">Lương theo công/khoán: </Text>
                  <Text strong>{toVND(metrics.fixed_pay)} đ</Text>
                </div>
                <div>
                  <Text type="secondary">Phụ cấp cố định: </Text>
                  <Text strong>{toVND(metrics.allow_fixed)} đ</Text>
                </div>
                <div>
                  <Text type="secondary">Tiền cơm: </Text>
                  <Text strong>{toVND(metrics.meal_amount)} đ</Text>
                </div>
                <div>
                  <Text type="secondary">Tăng ca: </Text>
                  <Text strong>{toVND(metrics.ot_amount)} đ</Text>
                </div>

                <div style={{ marginTop: 8 }}>
                  <Text>P (Gross) = </Text>
                  <Text code>
                    {toVND(metrics.P_gross)} đ
                  </Text>
                </div>

                <div>
                  <Text type="secondary">BHXH: </Text>
                  <Text>{toVND(metrics.bhxh)} đ</Text>
                  <Text type="secondary"> • BHYT: </Text>
                  <Text>{toVND(metrics.bhyt)} đ</Text>
                  <Text type="secondary"> • BHTN: </Text>
                  <Text>{toVND(metrics.bhtn)} đ</Text>
                </div>
                <div>
                  <Text>Q (Bảo hiểm) = </Text>
                  <Text code>{toVND(metrics.Q_insurance)} đ</Text>
                </div>

                <div>
                  <Text>R (Khấu trừ khác) = </Text>
                  <Text code>{toVND(metrics.R_deduct_other)} đ</Text>
                </div>
                <div>
                  <Text>T (Tạm ứng) = </Text>
                  <Text code>{toVND(metrics.T_advance)} đ</Text>
                </div>

                <div style={{ marginTop: 8 }}>
                  <Text strong>U (Thực lãnh) = P − Q − R − T = </Text>
                  <Text strong code>
                    {toVND(metrics.U_net)} đ
                  </Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ThietLapLuong;
