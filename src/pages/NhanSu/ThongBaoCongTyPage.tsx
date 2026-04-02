/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import {
  companyNoticeDownload,
  companyNoticeList,
  companyNoticeShow,
  type CompanyNoticeItem,
} from "../../services/companyNotice.api";

const { Title, Text, Paragraph } = Typography;

const openBlob = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export default function ThongBaoCongTyPage() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CompanyNoticeItem[]>([]);

  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<CompanyNoticeItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await companyNoticeList({
        q: q || undefined,
        page: 1,
        per_page: 20,
      });
      if (resp?.success) {
        setItems(resp.data.items || []);
      }
    } catch (e: any) {
      message.error(e?.message || "Không tải được thông báo công ty.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (item: CompanyNoticeItem) => {
    setOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const resp = await companyNoticeShow(item.id);
      if (resp?.success) {
        setDetail(resp.data.item || null);
      }
    } catch (e: any) {
      message.error(e?.message || "Không tải được chi tiết thông báo.");
    } finally {
      setDetailLoading(false);
    }
  };

  const onOpenAttachment = async (item: CompanyNoticeItem) => {
    try {
      const blob = await companyNoticeDownload(item.id);
      openBlob(blob);
    } catch (e: any) {
      message.error(e?.message || "Không mở được file đính kèm.");
    }
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Title level={3} style={{ margin: 0 }}>
        Thông báo công ty
      </Title>

      <Card>
        <Input.Search
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={fetchData}
          placeholder="Tìm theo tiêu đề, tóm tắt hoặc nội dung"
          allowClear
          enterButton="Tìm"
        />
      </Card>

      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty description="Chưa có thông báo công ty" />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={[
                  <Button key="detail" type="link" onClick={() => openDetail(item)}>
                    Xem chi tiết
                  </Button>,
                  item.has_attachment ? (
                    <Button key="attachment" type="link" onClick={() => onOpenAttachment(item)}>
                      Mở file đính kèm
                    </Button>
                  ) : (
                    <span key="empty" />
                  ),
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space wrap>
                      <Text strong>{item.tieu_de}</Text>
                      {item.ghim_dau ? <Tag color="gold">Ghim</Tag> : null}
                    </Space>
                  }
                  description={
                    <Space wrap>
                      {item.publish_at ? (
                        <Text type="secondary">
                          Đăng: {dayjs(item.publish_at).format("DD/MM/YYYY HH:mm")}
                        </Text>
                      ) : (
                        <Text type="secondary">
                          Tạo: {item.created_at ? dayjs(item.created_at).format("DD/MM/YYYY HH:mm") : ""}
                        </Text>
                      )}
                      {item.has_attachment ? <Tag color="blue">Có file</Tag> : null}
                    </Space>
                  }
                />
                <Paragraph style={{ marginBottom: 0 }}>
                  {item.tom_tat || "Không có tóm tắt."}
                </Paragraph>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Drawer
        title={detail?.tieu_de || "Chi tiết thông báo"}
        open={open}
        onClose={() => setOpen(false)}
        width={720}
      >
        {detailLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : !detail ? (
          <Empty description="Không có dữ liệu" />
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <Space wrap>
              {detail.ghim_dau ? <Tag color="gold">Ghim đầu</Tag> : null}
              <Tag color={detail.trang_thai === "published" ? "green" : detail.trang_thai === "draft" ? "orange" : "default"}>
                {detail.trang_thai === "published"
                  ? "Đã đăng"
                  : detail.trang_thai === "draft"
                  ? "Nháp"
                  : "Lưu trữ"}
              </Tag>
            </Space>

            {detail.publish_at ? (
              <Text type="secondary">
                Ngày đăng: {dayjs(detail.publish_at).format("DD/MM/YYYY HH:mm")}
              </Text>
            ) : null}

            {detail.expires_at ? (
              <Text type="secondary">
                Hết hiệu lực: {dayjs(detail.expires_at).format("DD/MM/YYYY HH:mm")}
              </Text>
            ) : null}

            {detail.tom_tat ? (
              <Paragraph>
                <Text strong>Tóm tắt:</Text> {detail.tom_tat}
              </Paragraph>
            ) : null}

            <div>
              <Text strong>Nội dung:</Text>
              <Paragraph style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                {detail.noi_dung || "Không có nội dung chi tiết."}
              </Paragraph>
            </div>

            {detail.has_attachment ? (
              <Button onClick={() => onOpenAttachment(detail)}>
                Mở file đính kèm
              </Button>
            ) : null}
          </Space>
        )}
      </Drawer>
    </Space>
  );
}
