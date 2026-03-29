import {
  Card,
  Col,
  Divider,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  BankOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

const COMPANY = {
  name: "PHÁT HOÀNG GIA",
  legalName: "Công ty TNHH Sự Kiện Phát Hoàng Gia",
  intro:
    "Phát Hoàng Gia là đơn vị cung cấp dịch vụ tổ chức sự kiện, dịch vụ cưới và các hạng mục cho thuê – cung cấp nhân sự, thiết bị phục vụ chương trình. Trang này dùng để hiển thị thông tin doanh nghiệp trong hệ thống quản trị nội bộ.",
  addressMain: "68 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
  branch1: "102 Nguyễn Minh Hoàng, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh",
  branch2: "111 Nguyễn Minh Hoàng, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh",
  branchHn: "229 Tây Sơn, Phường Ngã Tư Sở, Quận Đống Đa, Hà Nội",
  hotline: "0919 43 43 44",
  phone: "(028) 3811 3444 • (028) 5404 2100",
  email: "info@phathoanggia.com.vn",
  website: "phathoanggia.com.vn",
  director: "Trần Tấn Phát",
  scale1: "40 nhân viên",
  scale2: "14 trung tâm hội nghị tiệc cưới",
  scale3: "110 sự kiện / năm",
  scale4: "4200 tiệc cưới / năm",
};

const SERVICE_GROUPS = [
  "Tổ chức sự kiện",
  "Tổ chức hội nghị – hội thảo",
  "Khai trương, khánh thành, động thổ",
  "Tất niên, tân niên, tri ân khách hàng",
  "Activation, team building",
  "Cho thuê âm thanh, ánh sáng, màn hình LED",
  "Cung cấp MC, ca sĩ, PG/PB, nhóm nhảy, ban nhạc",
  "Dịch vụ cưới và trang trí cưới",
];

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <Space align="start" size={10} style={{ width: "100%" }}>
    <span style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 15 }}>{value}</Text>
    </div>
  </Space>
);

export default function DashboardPage() {
  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <Card
        bordered={false}
        style={{ borderRadius: 16, marginBottom: 16 }}
        bodyStyle={{ padding: 28 }}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Title level={2} style={{ margin: 0 }}>
            {COMPANY.name}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            Thông tin doanh nghiệp trong hệ thống quản trị nội bộ
          </Text>

          <div style={{ marginTop: 8 }}>
            <Tag color="blue">Thông tin công ty</Tag>
            <Tag color="green">Phát Hoàng Gia</Tag>
            <Tag color="purple">ERP nội bộ</Tag>
          </div>

          <Paragraph style={{ marginTop: 12, marginBottom: 0, fontSize: 15 }}>
            {COMPANY.intro}
          </Paragraph>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title="Thông tin doanh nghiệp"
            bordered={false}
            style={{ borderRadius: 16, height: "100%" }}
          >
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <InfoRow
                icon={<BankOutlined />}
                label="Tên pháp lý"
                value={COMPANY.legalName}
              />
              <InfoRow
                icon={<UserOutlined />}
                label="Giám đốc"
                value={COMPANY.director}
              />
              <InfoRow
                icon={<EnvironmentOutlined />}
                label="Văn phòng / Trụ sở chính"
                value={COMPANY.addressMain}
              />
              <InfoRow
                icon={<EnvironmentOutlined />}
                label="Kho hàng / Chi nhánh 1"
                value={COMPANY.branch1}
              />
              <InfoRow
                icon={<EnvironmentOutlined />}
                label="Kho hàng / Chi nhánh 2"
                value={COMPANY.branch2}
              />
              <InfoRow
                icon={<EnvironmentOutlined />}
                label="Chi nhánh Hà Nội"
                value={COMPANY.branchHn}
              />
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title="Liên hệ"
            bordered={false}
            style={{ borderRadius: 16, height: "100%" }}
          >
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <InfoRow
                icon={<PhoneOutlined />}
                label="Hotline"
                value={COMPANY.hotline}
              />
              <InfoRow
                icon={<PhoneOutlined />}
                label="Điện thoại bàn"
                value={COMPANY.phone}
              />
              <InfoRow
                icon={<MailOutlined />}
                label="Email"
                value={COMPANY.email}
              />
              <InfoRow
                icon={<GlobalOutlined />}
                label="Website"
                value={COMPANY.website}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={12}>
          <Card
            title="Lĩnh vực hoạt động"
            bordered={false}
            style={{ borderRadius: 16, height: "100%" }}
          >
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              {SERVICE_GROUPS.map((item) => (
                <Space key={item} align="start">
                  <ToolOutlined style={{ marginTop: 4, color: "#1677ff" }} />
                  <Text>{item}</Text>
                </Space>
              ))}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title="Quy mô & năng lực"
            bordered={false}
            style={{ borderRadius: 16, height: "100%" }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Card size="small" bordered style={{ borderRadius: 12 }}>
                  <InfoRow
                    icon={<TeamOutlined />}
                    label="Nhân sự"
                    value={COMPANY.scale1}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" bordered style={{ borderRadius: 12 }}>
                  <InfoRow
                    icon={<SafetyCertificateOutlined />}
                    label="Đối tác / trung tâm"
                    value={COMPANY.scale2}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" bordered style={{ borderRadius: 12 }}>
                  <InfoRow
                    icon={<CalendarOutlined />}
                    label="Sự kiện"
                    value={COMPANY.scale3}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" bordered style={{ borderRadius: 12 }}>
                  <InfoRow
                    icon={<CalendarOutlined />}
                    label="Tiệc cưới"
                    value={COMPANY.scale4}
                  />
                </Card>
              </Col>
            </Row>

            <Divider />

            <Paragraph style={{ marginBottom: 0 }}>
              Làm việc bằng cái tâm nhé PHGers!.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
