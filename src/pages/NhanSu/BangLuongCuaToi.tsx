/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Row,
  Col,
  Card,
  Descriptions,
  Statistic,
  Divider,
  Typography,
  Space,
  Spin,
  message,
} from "antd";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

const { Title, Text } = Typography;
const YM_FMT = "YYYY-MM";

function fmtMoney(v?: number | null) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("vi-VN") : "0";
}

export default function BangLuongCuaToi() {
  const [thang, setThang] = useState<string>(dayjs().format(YM_FMT));
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any | null>(null);

  const fetchData = async (ym: string) => {
    setLoading(true);
    try {
      const res: any = await axios.get(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_MY, {
        params: { thang: ym },
      });
      if (res?.success) {
        setData(res.data?.item || null);
      } else {
        message.warning(res?.message || "Không lấy được dữ liệu");
        setData(null);
      }
    } catch (e: any) {
      message.error(e?.message || "Lỗi tải dữ liệu");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(thang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thang]);

  const header = useMemo(
    () => (
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Bảng lương của tôi
        </Title>
        <Space>
          <Text type="secondary">Tháng</Text>
          <DatePicker
            picker="month"
            format="MM/YYYY"
            value={dayjs(thang + "-01")}
            onChange={(d) => {
              const v = d ? d.format(YM_FMT) : dayjs().format(YM_FMT);
              setThang(v);
            }}
            allowClear={false}
            size="middle"
          />
        </Space>
      </div>
    ),
    [thang]
  );

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        {header}
        <Card>
          <Spin />
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 16 }}>
        {header}
        <Card>
          <Text type="secondary">Chưa có dữ liệu lương cho kỳ {thang}.</Text>
        </Card>
      </div>
    );
  }

  // Fallback BH tổng & P/Q/R/T/U
  const tongBH = (data.bhxh || 0) + (data.bhyt || 0) + (data.bhtn || 0);
  const hasPQTU =
    "P_gross" in data ||
    "Q_insurance" in data ||
    "R_deduct_other" in data ||
    "T_advance" in data ||
    "U_net" in data;

  const P_gross =
    data.P_gross ??
    (Number(data.luong_theo_cong || 0) +
      Number(data.phu_cap || 0) +
      Number(data.thuong || 0) -
      Number(data.phat || 0));

  const Q_insurance = data.Q_insurance ?? tongBH;
  const R_deduct_other = data.R_deduct_other ?? Number(data.khau_tru_khac || 0);
  const T_advance = data.T_advance ?? Number(data.tam_ung || 0);
  const U_net = data.U_net ?? Number(data.thuc_nhan || 0);

  // ✅ NEW: đọc thêm metrics theo PHÚT CÔNG (nếu BE trả về)
  const metrics = (data.metrics || {}) as any;
  const stdMinutes: number | null = metrics.std_minutes ?? null;
  const actualMinutes: number | null = metrics.actual_minutes ?? null;
  const otMinutes: number | null = metrics.ot_minutes ?? null;
  const unitBaseMin: number | null = metrics.unit_base_min ?? null;
  const otRatePerMin: number | null = metrics.ot_rate_per_min ?? null;
  const otAmount: number | null = metrics.ot_amount ?? null;

  // Nếu BE chưa có metrics thì fallback actualMinutes = so_gio_cong (phút raw)
  const actualMinutesEffective =
    typeof actualMinutes === "number" ? actualMinutes : Number(data.so_gio_cong || 0);

  return (
    <div style={{ padding: 16 }}>
      {header}

      <Row gutter={[12, 12]}>
        {/* Cột trái: Cấu hình & Công */}
        <Col xs={24} md={12}>
          <Card title={<Text strong>Cấu hình & Công</Text>} bordered>
            <Descriptions column={1} size="small" colon={false} labelStyle={{ width: 220 }}>
              <Descriptions.Item label="Tháng">{data.thang}</Descriptions.Item>
              <Descriptions.Item label="Công chuẩn">{data.cong_chuan}</Descriptions.Item>
              <Descriptions.Item label="Ngày công">{data.so_ngay_cong}</Descriptions.Item>
              {/* ⚠️ so_gio_cong đang là PHÚT → đổi label cho rõ */}
              <Descriptions.Item label="Số phút công (raw từ bảng công)">
                {data.so_gio_cong}
              </Descriptions.Item>

              {/* ✅ MỚI: hiển thị phút công tiêu chuẩn & tăng ca dùng để tính lương */}
              <Descriptions.Item label="Số phút công tiêu chuẩn (28 ngày x 8h x 60p)">
                {stdMinutes !== null ? stdMinutes : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Số phút công thực tế (tính lương)">
                {actualMinutesEffective}
              </Descriptions.Item>
              <Descriptions.Item label="Số phút tăng ca (tính lương)">
                {otMinutes !== null ? otMinutes : Math.max(0, actualMinutesEffective - (stdMinutes || 0))}
              </Descriptions.Item>

              <Descriptions.Item label="Lương cơ bản">
                {fmtMoney(data.luong_co_ban)} đ
              </Descriptions.Item>
              <Descriptions.Item label="Hệ số">
                {Number(data.he_so ?? 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Khóa">
                {data.locked ? "Đã khóa" : "Chưa khóa"}
              </Descriptions.Item>
              <Descriptions.Item label="Tính lúc">
                {data.computed_at || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Cột phải: Cộng/Trừ */}
        <Col xs={24} md={12}>
          <Card title={<Text strong>Cộng/Trừ</Text>} bordered>
            <Descriptions column={1} size="small" colon={false} labelStyle={{ width: 180 }}>
              <Descriptions.Item label="Phụ cấp">
                {fmtMoney(data.phu_cap)} đ
              </Descriptions.Item>
              <Descriptions.Item label="Thưởng">
                {fmtMoney(data.thuong)} đ
              </Descriptions.Item>
              <Descriptions.Item label="Phạt">
                {fmtMoney(data.phat)} đ
              </Descriptions.Item>
              <Descriptions.Item label="BHXH">
                {fmtMoney(data.bhxh)} đ
              </Descriptions.Item>
              <Descriptions.Item label="BHYT">
                {fmtMoney(data.bhyt)} đ
              </Descriptions.Item>
              <Descriptions.Item label="BHTN">
                {fmtMoney(data.bhtn)} đ
              </Descriptions.Item>
              <Descriptions.Item label="Khấu trừ khác">
                {fmtMoney(data.khau_tru_khac)} đ
              </Descriptions.Item>
              <Descriptions.Item label="Tạm ứng">
                {fmtMoney(data.tam_ung)} đ
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Nếu muốn, có thể thêm 1 Card nhỏ giải thích đơn giá phút */}
      {unitBaseMin !== null || otRatePerMin !== null || otAmount !== null ? (
        <>
          <Divider style={{ margin: "12px 0" }} />
          <Card title={<Text strong>Chi tiết theo phút công</Text>} bordered>
            <Descriptions column={1} size="small" colon={false} labelStyle={{ width: 220 }}>
              <Descriptions.Item label="Đơn giá lương cơ bản / phút">
                {unitBaseMin !== null ? `${fmtMoney(unitBaseMin)} đ/phút` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Đơn giá tăng ca / phút">
                {otRatePerMin !== null ? `${fmtMoney(otRatePerMin)} đ/phút` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Lương tăng ca (từ phút tăng ca)">
                {otAmount !== null ? `${fmtMoney(otAmount)} đ` : "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </>
      ) : null}

      <Divider style={{ margin: "12px 0" }} />

      {/* Kết quả */}
      <Card title={<Text strong>Kết quả</Text>} bordered>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12} lg={8}>
            <Card size="small" bordered>
              <Statistic
                title="Lương theo công/khoán"
                value={fmtMoney(data.luong_theo_cong)}
                suffix="đ"
              />
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card size="small" bordered>
              <Statistic title="P (Gross)" value={fmtMoney(P_gross)} suffix="đ" />
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card size="small" bordered>
              <Statistic title="Q (Bảo hiểm)" value={fmtMoney(Q_insurance)} suffix="đ" />
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card size="small" bordered>
              <Statistic
                title="R (Khấu trừ khác)"
                value={fmtMoney(R_deduct_other)}
                suffix="đ"
              />
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card size="small" bordered>
              <Statistic title="T (Tạm ứng)" value={fmtMoney(T_advance)} suffix="đ" />
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card size="small" bordered>
              <Statistic
                title={hasPQTU ? "U (Thực lãnh) = P − Q − R − T" : "U (Thực lãnh)"}
                value={fmtMoney(U_net)}
                suffix="đ"
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
