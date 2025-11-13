import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  List,
  Avatar,
  Typography,
  Space,
} from "antd";
import {
  ShoppingCartOutlined,
  UserOutlined,
  InboxOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  TruckOutlined,
  ShopOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const { Title, Text } = Typography;

/* ========== Formatters ========== */
const formatCurrency = (amount?: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatNumber = (n?: number) =>
  new Intl.NumberFormat("vi-VN").format(Number(n || 0));

const COLORS = [
  "#1890ff",
  "#52c41a",
  "#faad14",
  "#f5222d",
  "#722ed1",
  "#13c2c2",
  "#eb2f96",
  "#a0d911",
  "#2f54eb",
  "#fa8c16",
  "#8c8c8c",
];

const Heading = ({ title }: { title: string }) => (
  <Title level={2} style={{ marginBottom: 24 }}>
    {title}
  </Title>
);

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [statsRes, actRes] = await Promise.all([
          fetch(`${API_URL}/dashboard/statistics?top=10&months=12&inv_months=6`),
          fetch(`${API_URL}/dashboard/activities`),
        ]);

        const statsData = await statsRes.json();
        const activitiesData = await actRes.json();

        if (!statsData?.success) {
          throw new Error(statsData?.message || "Không thể lấy dữ liệu thống kê");
        }
        if (!activitiesData?.success) {
          throw new Error(activitiesData?.message || "Không thể lấy dữ liệu hoạt động");
        }

        setDashboardData(statsData.data || {});
        setActivities(activitiesData.data || []);
      } catch (err: any) {
        setError(err?.message || "Không thể tải dữ liệu dashboard");
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_URL]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Heading title="Thống kê" />
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Heading title="Thống kê" />
        <Alert message="Lỗi tải dữ liệu" description={error} type="error" showIcon />
      </div>
    );
  }

  // ===== Unpack an toàn =====
  const overview = dashboardData?.overview || {};
  const revenue = dashboardData?.revenue || {};
  const inventory = dashboardData?.inventory || {};
  const orders = dashboardData?.orders || {};
  const charts = dashboardData?.charts || {};
  const customerChannels = dashboardData?.customer_channels || { total: 0, items: [] };
  const kpis = dashboardData?.kpis || {};
  const kpm = dashboardData?.kpis_month || {};

  // Pie: kênh liên hệ
  const channelChart = Array.isArray(customerChannels?.items)
    ? customerChannels.items.map((x: any) => ({
        name: x?.channel ?? "Không rõ",
        value: Number(x?.count ?? 0),
      }))
    : [];

  // Pie: phân bố danh mục
  const categoryChart = Array.isArray(charts?.category_chart)
    ? charts.category_chart.map((x: any) => ({
        name: x?.name ?? x?.ten_danh_muc ?? "Không rõ",
        value: Number(x?.value ?? x?.count ?? 0),
      }))
    : [];

  // Top sản phẩm
  const topSelling = dashboardData?.top_selling_products?.items || [];

  // Pie: Thu vs Chi (tháng)
  const monthFinancePie = [
    { name: "Thu", value: Number(kpm?.month_receipts || 0) },
    { name: "Chi", value: Number(kpm?.month_payments || 0) },
  ];

  // Bar: Doanh thu tháng (đã giao) vs Đơn mới trong tháng
  const monthRevenueCompare = [
    {
      name: "Tháng hiện tại",
      delivered: Number(revenue?.month_revenue || 0),
      newOrders: Number(kpm?.month_new_orders_revenue || 0),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <Heading title="Thống kê" />

      {/* ===== KPI: Tổng quan ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng sản phẩm"
              value={overview.total_products}
              prefix={<InboxOutlined />}
              valueStyle={{ color: "#1890ff" }}
              formatter={(v) => formatNumber(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng khách hàng"
              value={overview.total_customers}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#52c41a" }}
              formatter={(v) => formatNumber(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng đơn hàng"
              value={overview.total_orders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: "#722ed1" }}
              formatter={(v) => formatNumber(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng giá trị kho"
              value={overview.total_inventory_value}
              prefix={<ShopOutlined />}
              valueStyle={{ color: "#faad14" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
      </Row>

      {/* ===== KPI: Hôm nay (đã giao / đơn mới / thu / chi / cần giao) ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Doanh thu hôm nay (đã giao)"
              value={kpis.today_revenue_delivered}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#52c41a" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Doanh thu đơn mới hôm nay"
              value={kpis.today_new_orders_revenue}
              prefix={<RiseOutlined />}
              valueStyle={{ color: "#1890ff" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Tổng thu hôm nay"
              value={kpis.today_receipts}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#52c41a" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Tổng chi hôm nay"
              value={kpis.today_payments}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#fa541c" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
      </Row>

      {/* ===== KPI: Vận hành hôm nay ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Đơn cần giao hôm nay"
              value={kpis.today_deliveries_count}
              prefix={<TruckOutlined />}
              valueStyle={{ color: "#13c2c2" }}
              formatter={(v) => formatNumber(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Tổng tồn kho"
              value={inventory.total_stock}
              prefix={<InboxOutlined />}
              valueStyle={{ color: "#2f54eb" }}
              formatter={(v) => formatNumber(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Đơn tạo hôm nay"
              value={orders.today_orders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: "#722ed1" }}
              formatter={(v) => formatNumber(Number(v as any))}
            />
          </Card>
        </Col>
      </Row>

      {/* ===== KPI: Tháng (đơn mới / thu / chi / LNTT) ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Doanh thu đã giao (tháng)"
              value={revenue.month_revenue}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#52c41a" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Doanh thu đơn mới (tháng)"
              value={kpm.month_new_orders_revenue}
              prefix={<RiseOutlined />}
              valueStyle={{ color: "#1890ff" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Tổng thu (tháng)"
              value={kpm.month_receipts}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#52c41a" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Tổng chi (tháng)"
              value={kpm.month_payments}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#fa541c" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="Lợi nhuận trước thuế (tháng)" size="small">
            <Statistic
              value={revenue.month_profit}
              prefix={Number(revenue.month_profit) >= 0 ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{ color: Number(revenue.month_profit) >= 0 ? "#52c41a" : "#f5222d" }}
              formatter={(v) => formatCurrency(Number(v as any))}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="So sánh Thu và Chi" size="small">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={monthFinancePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  label={({ name = "" }) => name}
                >
                  {monthFinancePie.map((_, idx) => (
                    <Cell key={idx} fill={idx === 0 ? "#52c41a" : "#fa541c"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [formatCurrency(Number(v)), n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ===== Charts: Doanh thu tháng | Nhập - Xuất kho ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Doanh thu theo tháng" size="small">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts?.revenue_chart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Doanh thu"]} />
                <Line type="monotone" dataKey="revenue" stroke="#1890ff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Doanh thu đã giao vs Đơn mới (tháng)" size="small">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthRevenueCompare}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v))]} />
                <Legend />
                <Bar dataKey="delivered" name="Đã giao" fill="#2f54eb" />
                <Bar dataKey="newOrders" name="Đơn mới" fill="#fa8c16" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Nhập - Xuất kho" size="small">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts?.inventory_chart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v))]} />
                <Legend />
                <Bar dataKey="imports" fill="#52c41a" name="Nhập kho" />
                <Bar dataKey="exports" fill="#1890ff" name="Xuất kho" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Khách hàng theo kênh liên hệ" size="small">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  label={({ name = "" }) => (name.length > 16 ? `${name.slice(0, 14)}…` : name)}
                >
            {channelChart.map((_: any, idx: number) => (
  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
))}

                </Pie>
                <Tooltip formatter={(v: any) => [formatNumber(v as number), "Khách hàng"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Top 10 Phân bố sản phẩm theo danh mục" size="small">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name = "" }) => (name.length > 16 ? `${name.slice(0, 14)}…` : name)}
                >
           {categoryChart.map((_: any, idx: number) => (
  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
))}

                </Pie>
                <Tooltip formatter={(v: any) => [formatNumber(v as number), "Sản phẩm"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Hoạt động gần đây" size="small">
            <List
              dataSource={activities}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={item.type === "order" ? <ShoppingCartOutlined /> : <TruckOutlined />}
                        style={{ backgroundColor: item.type === "order" ? "#52c41a" : "#1890ff" }}
                      />
                    }
                    title={item.title}
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.description}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          <CalendarOutlined /> {item.time}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
