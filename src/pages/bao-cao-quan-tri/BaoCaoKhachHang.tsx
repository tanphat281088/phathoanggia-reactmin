/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Col,
  DatePicker,
  Row,
  Space,
  Statistic,
  Tag,
  Tabs,
  Table,
  Progress,
  Typography,
  Button,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { getCustomerSummary, type CustomerSummary, type CustomerTopItem } from "../../services/customer-report.api";
import { formatVietnameseCurrency } from "../../utils/utils";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const today = dayjs();
const startOfMonth = today.startOf("month");

type RangeValue = [Dayjs, Dayjs];

const percent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
};

const numberOrDash = (v: any) => (v === null || v === undefined ? "—" : v);

const BaoCaoKhachHang = () => {
  const [range, setRange] = useState<RangeValue>([startOfMonth, today]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CustomerSummary | null>(null);

  const fetchData = async (r: RangeValue) => {
    try {
      setLoading(true);
      const [fromD, toD] = r;
      const params = {
        from: fromD.format("YYYY-MM-DD"),
        to: toD.format("YYYY-MM-DD"),
      };
      const resp = await getCustomerSummary(params);
      setData(resp.data);
    } catch (e) {
      console.error("[BaoCaoKhachHang] fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRangeChange = (value: null | RangeValue) => {
    if (!value) return;
    setRange(value);
  };

  const onRefresh = () => {
    fetchData(range);
  };

  const kpi = data?.kpi;
  const segments = data?.segments;
  const messaging = data?.messaging;
  const behavior = data?.behavior;
  const loyalty = data?.loyalty;
  const topCustomers = data?.top_customers;

  const formattedPeriodText = useMemo(() => {
    if (!data?.params) return "";
    const f = dayjs(data.params.from);
    const t = dayjs(data.params.to);
    return `${f.format("DD/MM/YYYY")} → ${t.format("DD/MM/YYYY")}`;
  }, [data?.params]);

  const topLifetime: CustomerTopItem[] = topCustomers?.lifetime ?? [];
  const topPeriod: CustomerTopItem[] = topCustomers?.period ?? [];

  const topColumns = [
    {
      title: "Mã KH",
      dataIndex: "ma_kh",
      key: "ma_kh",
      width: 110,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Tên khách hàng",
      dataIndex: "ten_khach_hang",
      key: "ten_khach_hang",
      width: 200,
      ellipsis: true,
    },
    {
      title: "SĐT",
      dataIndex: "so_dien_thoai",
      key: "so_dien_thoai",
      width: 130,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Hạng",
      dataIndex: "loai_khach_hang",
      key: "loai_khach_hang",
      width: 120,
      render: (_: any, record: CustomerTopItem) => {
        const tier = record.loai_khach_hang || "Chưa có";
        const group = record.tier_group;
        let color: string = "default";
        if (group === "platinum") color = "purple";
        else if (group === "gold") color = "gold";
        else if (group === "silver") color = "blue";
        else if (group === "bronze") color = "orange";
        return <Tag color={color}>{tier}</Tag>;
      },
    },
    {
      title: "Mode",
      dataIndex: "customer_mode",
      key: "customer_mode",
      width: 130,
      render: (v: number) =>
        v === 1 ? <Tag color="magenta">Pass đơn & CTV</Tag> : <Tag color="green">Hệ thống</Tag>,
    },
    {
      title: "Kênh liên hệ",
      dataIndex: "kenh_lien_he",
      key: "kenh_lien_he",
      width: 150,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Doanh thu",
      dataIndex: "total_revenue",
      key: "total_revenue",
      width: 140,
      align: "right" as const,
      render: (v: number) => formatVietnameseCurrency(v),
    },
    {
      title: "Số đơn",
      dataIndex: "total_orders",
      key: "total_orders",
      width: 90,
      align: "right" as const,
    },
    {
      title: "AOV",
      dataIndex: "aov",
      key: "aov",
      width: 120,
      align: "right" as const,
      render: (v: number) => formatVietnameseCurrency(v),
    },
    {
      title: "Điểm hiện tại",
      dataIndex: "current_points",
      key: "current_points",
      width: 110,
      align: "right" as const,
      render: (v: number) => (v ?? 0).toLocaleString("vi-VN"),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* HEADER + FILTER */}
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space direction="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>
                Báo cáo khách hàng
              </Title>
              <Text type="secondary">
                Toàn cảnh khách hàng • Hạng thành viên • Kênh liên hệ • Zalo ZNS • Hành vi & Top khách hàng
              </Text>
              {formattedPeriodText && (
                <Text type="secondary">Kỳ: {formattedPeriodText}</Text>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={range}
                onChange={(val) => val && onRangeChange(val as RangeValue)}
                format="DD/MM/YYYY"
                allowClear={false}
              />
              <Button type="primary" onClick={onRefresh} loading={loading}>
                Xem báo cáo
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI ROW 1 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading} bordered={false}>
            <Statistic
              title="Tổng khách hàng"
              value={kpi?.total_customers ?? 0}
              valueStyle={{ fontSize: 26 }}
            />
            <Text type="secondary">
              Hoạt động: {(kpi?.active_customers ?? 0).toLocaleString("vi-VN")}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading} bordered={false}>
            <Statistic
              title="Khách hàng mới trong kỳ"
              value={kpi?.new_customers ?? 0}
              valueStyle={{ fontSize: 26 }}
            />
            <Text type="secondary">
              Có đơn trong kỳ:{" "}
              {(kpi?.customers_with_orders_period ?? 0).toLocaleString("vi-VN")}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading} bordered={false}>
            <Statistic
              title="Tỷ lệ khách hàng quay lại"
              value={kpi?.repeat_rate_period ? kpi.repeat_rate_period * 100 : 0}
              precision={1}
              suffix="%"
              valueStyle={{ fontSize: 26 }}
            />
            <Text type="secondary">
              Quay lại: {(kpi?.returning_customers_period ?? 0).toLocaleString("vi-VN")}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading} bordered={false}>
            <Statistic
              title="Doanh thu kỳ này (đã giao)"
              value={kpi?.revenue_period ?? 0}
              valueStyle={{ fontSize: 24 }}
              formatter={(val) => formatVietnameseCurrency(Number(val))}
            />
            <Text type="secondary">
              Doanh thu tích luỹ: {formatVietnameseCurrency(kpi?.total_revenue_lifetime ?? 0)}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* KPI ROW 2 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading} bordered={false}>
            <Statistic
              title="Điểm trung bình / khách hàng"
              value={kpi?.avg_points_per_customer ?? 0}
              valueStyle={{ fontSize: 26 }}
            />
            <Text type="secondary">
              KH có điểm: {(kpi?.customers_with_points ?? 0).toLocaleString("vi-VN")}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading} bordered={false}>
            <Statistic
              title="Doanh thu TB / khách hàng"
              value={kpi?.avg_revenue_per_customer ?? 0}
              valueStyle={{ fontSize: 24 }}
              formatter={(val) => formatVietnameseCurrency(Number(val))}
            />
            <Text type="secondary">
              Số đơn TB / khách: {numberOrDash(kpi?.avg_orders_per_customer)}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* SEGMENTS: BY TIER & MODE */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={14}>
          <Card
            loading={loading}
            bordered={false}
            title="Phân khúc theo hạng khách hàng"
            extra={<Text type="secondary">Đồng • Bạc • Vàng • VIP</Text>}
          >
            <Table
              size="small"
              rowKey={(r: any) => r.tier_id}
              pagination={false}
              dataSource={segments?.by_tier ?? []}
              columns={[
                { title: "Hạng", dataIndex: "tier_name", key: "tier_name" },
                {
                  title: "% Ưu đãi",
                  dataIndex: "gia_tri_uu_dai_pct",
                  key: "gia_tri_uu_dai_pct",
                  align: "right" as const,
                  render: (v: number) => `${v ?? 0}%`,
                },
                {
                  title: "Số KH",
                  dataIndex: "customer_count",
                  key: "customer_count",
                  align: "right" as const,
                },
                {
                  title: "Doanh thu tích luỹ",
                  dataIndex: "revenue_lifetime",
                  key: "revenue_lifetime",
                  align: "right" as const,
                  render: (v: number) => formatVietnameseCurrency(v),
                },
                {
                  title: "Doanh thu kỳ này",
                  dataIndex: "revenue_period",
                  key: "revenue_period",
                  align: "right" as const,
                  render: (v: number) => formatVietnameseCurrency(v),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card
            loading={loading}
            bordered={false}
            title="Khách hệ thống vs Pass & CTV"
          >
            {(segments?.by_mode ?? []).map((m) => {
              const label = m.label;
              const rev = m.revenue_period ?? 0;
              const totalRev = kpi?.revenue_period ?? 0;
              const pct = totalRev > 0 ? (rev / totalRev) * 100 : 0;
              return (
                <div key={m.mode} style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: "100%" }} size={4}>
                    <Text strong>{label}</Text>
                    <Progress
                      percent={Number(pct.toFixed(1))}
                      status="active"
                      format={(v) =>
                        `${v?.toFixed(1)}% • ${formatVietnameseCurrency(rev)}`
                      }
                    />
                  </Space>
                </div>
              );
            })}
            {(!segments?.by_mode || segments.by_mode.length === 0) && (
              <Text type="secondary">Chưa có dữ liệu.</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* SEGMENTS: BY CHANNEL */}
      <Card
        loading={loading}
        bordered={false}
        title="Phân khúc theo kênh liên hệ"
        extra={<Text type="secondary">Zalo • Facebook • Hotline • Website • TikTok...</Text>}
      >
        <Table
          size="small"
          rowKey={(r: any, idx) => `${r.kenh}-${idx}`}
          pagination={false}
          dataSource={segments?.by_channel ?? []}
          columns={[
            { title: "Kênh", dataIndex: "kenh", key: "kenh" },
            {
              title: "Số KH",
              dataIndex: "customer_count",
              key: "customer_count",
              align: "right" as const,
            },
            {
              title: "KH mới kỳ này",
              dataIndex: "new_customers_period",
              key: "new_customers_period",
              align: "right" as const,
            },
            {
              title: "Doanh thu kỳ này",
              dataIndex: "revenue_period",
              key: "revenue_period",
              align: "right" as const,
              render: (v: number) => formatVietnameseCurrency(v),
            },
            {
              title: "Số đơn kỳ này",
              dataIndex: "orders_period",
              key: "orders_period",
              align: "right" as const,
            },
            {
              title: "Tỷ lệ quay lại",
              dataIndex: "repeat_rate_period_by_channel",
              key: "repeat_rate_period_by_channel",
              align: "right" as const,
              render: (v: number) => percent(v),
            },
          ]}
        />
      </Card>

      {/* MESSAGING: ZNS POINTS + REVIEW */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            loading={loading}
            bordered={false}
            title="Zalo ZNS • Tích luỹ điểm thành viên"
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Space size={24}>
                <Statistic
                  title="Biến động điểm (lifetime)"
                  value={messaging?.points_zns.total_events_lifetime ?? 0}
                />
                <Statistic
                  title="Biến động kỳ này"
                  value={messaging?.points_zns.total_events_period ?? 0}
                />
              </Space>
              <Space size={24}>
                <Statistic
                  title="Đã gửi ZNS (kỳ này)"
                  value={messaging?.points_zns.events_sent_period ?? 0}
                />
                <Statistic
                  title="Pending"
                  value={messaging?.points_zns.events_pending_period ?? 0}
                />
                <Statistic
                  title="Lỗi"
                  value={messaging?.points_zns.events_failed_period ?? 0}
                />
              </Space>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text type="secondary">
                  KH có event ZNS kỳ này:{" "}
                  {(messaging?.points_zns.customers_with_events_period ?? 0).toLocaleString(
                    "vi-VN"
                  )}
                </Text>
                <Text type="secondary">
                  Tỉ lệ KH có ZNS điểm trên tổng KH có đơn kỳ này:{" "}
                  {percent(messaging?.points_zns.coverage_rate_period)}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            loading={loading}
            bordered={false}
            title="Zalo ZNS • Mời đánh giá dịch vụ"
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Space size={24}>
                <Statistic
                  title="Tổng invite (kỳ này)"
                  value={messaging?.review_zns.invites_total_period ?? 0}
                />
                <Statistic
                  title="Đã gửi"
                  value={messaging?.review_zns.invites_sent_period ?? 0}
                />
              </Space>
              <Space size={24}>
                <Statistic
                  title="Pending"
                  value={messaging?.review_zns.invites_pending_period ?? 0}
                />
                <Statistic
                  title="Lỗi"
                  value={messaging?.review_zns.invites_failed_period ?? 0}
                />
                <Statistic
                  title="Huỷ"
                  value={messaging?.review_zns.invites_cancelled_period ?? 0}
                />
              </Space>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text type="secondary">
                  Đơn đủ điều kiện mời review kỳ này:{" "}
                  {(messaging?.review_zns.eligible_orders_period ?? 0).toLocaleString(
                    "vi-VN"
                  )}
                </Text>
                <Text type="secondary">
                  Đơn đã có invite:{" "}
                  {(messaging?.review_zns.orders_with_invite_period ?? 0).toLocaleString(
                    "vi-VN"
                  )}
                  {" • Tỉ lệ phủ: "}
                  {percent(messaging?.review_zns.coverage_rate_period)}
                </Text>
                <Text type="secondary">
                  Tỉ lệ gửi ZNS review thành công:{" "}
                  {percent(messaging?.review_zns.success_rate_period)}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* BEHAVIOR + LOYALTY */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card loading={loading} bordered={false} title="Hành vi khách hàng">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Space size={24}>
                <Statistic
                  title="KH mua lần đầu (kỳ này)"
                  value={behavior?.first_time_buyers_period ?? 0}
                />
                <Statistic
                  title="KH quay lại (kỳ này)"
                  value={behavior?.returning_customers_period ?? 0}
                />
              </Space>
              <Space size={24}>
                <Statistic
                  title="Tỷ lệ khách quay lại"
                  value={(behavior?.repeat_rate_period ?? 0) * 100}
                  precision={1}
                  suffix="%"
                />
                <Statistic
                  title="Khoảng cách TB giữa 2 đơn"
                  value={behavior?.avg_days_between_orders ?? 0}
                  suffix="ngày"
                  precision={1}
                />
              </Space>
              <Space direction="vertical">
                <Text strong>Phân phối theo số đơn:</Text>
                <Text type="secondary">
                  • Mua 1 lần:{" "}
                  {behavior?.orders_per_customer_distribution.one_time_buyers ?? 0}
                </Text>
                <Text type="secondary">
                  • 2–3 đơn:{" "}
                  {behavior?.orders_per_customer_distribution.two_to_three_orders ?? 0}
                </Text>
                <Text type="secondary">
                  • &gt;3 đơn:{" "}
                  {behavior?.orders_per_customer_distribution.more_than_three_orders ?? 0}
                </Text>
              </Space>
              <Space direction="vertical">
                <Text strong>Phân loại theo Recency (lần mua gần nhất):</Text>
                <Text type="secondary">
                  • Active (0–30 ngày): {behavior?.recency_segments.active_0_30 ?? 0}
                </Text>
                <Text type="secondary">
                  • Warm (31–90 ngày): {behavior?.recency_segments.warm_31_90 ?? 0}
                </Text>
                <Text type="secondary">
                  • Cold (&gt;90 ngày): {behavior?.recency_segments.cold_91_plus ?? 0}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            loading={loading}
            bordered={false}
            title="Điểm & hạng trung thành"
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Space size={24}>
                <Statistic
                  title="Tổng điểm (ước lượng)"
                  value={loyalty?.overview.total_points_all_customers ?? 0}
                />
                <Statistic
                  title="Điểm TB / khách hàng"
                  value={loyalty?.overview.avg_points_per_customer ?? 0}
                />
              </Space>
              {loyalty?.overview.max_points_customer && (
                <Space direction="vertical">
                  <Text strong>Khách hàng tích điểm nhiều nhất</Text>
                  <Text>
                    {loyalty.overview.max_points_customer.ma_kh} •{" "}
                    {loyalty.overview.max_points_customer.ten_khach_hang} •{" "}
                    {loyalty.overview.max_points_customer.so_dien_thoai}
                  </Text>
                  <Text type="secondary">
                    Điểm:{" "}
                    {loyalty.overview.max_points_customer.points.toLocaleString("vi-VN")}
                  </Text>
                </Space>
              )}
              {!loyalty?.overview.max_points_customer && (
                <Text type="secondary">Chưa có dữ liệu điểm.</Text>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* TOP CUSTOMERS */}
      <Card
        loading={loading}
        bordered={false}
        title="Top khách hàng"
        extra={<Text type="secondary">Lifetime & Trong kỳ</Text>}
      >
        <Tabs
          defaultActiveKey="period"
          items={[
            {
              key: "period",
              label: "Top trong kỳ",
              children: (
                <Table<CustomerTopItem>
                  size="small"
                  rowKey={(r) => r.khach_hang_id}
                  dataSource={topPeriod}
                  columns={topColumns}
                  pagination={false}
                />
              ),
            },
            {
              key: "lifetime",
              label: "Top tích luỹ",
              children: (
                <Table<CustomerTopItem>
                  size="small"
                  rowKey={(r) => r.khach_hang_id}
                  dataSource={topLifetime}
                  columns={topColumns}
                  pagination={false}
                />
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

export default BaoCaoKhachHang;
