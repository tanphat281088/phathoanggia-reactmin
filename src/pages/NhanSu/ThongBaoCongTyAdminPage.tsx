/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs, { type Dayjs } from "dayjs";
import {
  companyNoticeAdminCreate,
  companyNoticeAdminDelete,
  companyNoticeAdminDownload,
  companyNoticeAdminList,
  companyNoticeAdminShow,
  companyNoticeAdminUpdate,
  type CompanyNoticeItem,
  type CompanyNoticeStatus,
} from "../../services/companyNotice.api";

const { Title, Text } = Typography;
const { TextArea } = Input;

const openBlob = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export default function ThongBaoCongTyAdminPage() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CompanyNoticeItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyNoticeItem | null>(null);
  const [form] = Form.useForm();

  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const params = useMemo(
    () => ({
      q: q || undefined,
      trang_thai: status || "all",
      page: 1,
      per_page: 50,
    }),
    [q, status]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await companyNoticeAdminList(params);
      if (resp?.success) {
        setRows(resp.data.items || []);
      }
    } catch (e: any) {
      message.error(e?.message || "Không tải được danh sách thông báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const openCreate = () => {
    setEditing(null);
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({
      trang_thai: "draft",
      ghim_dau: false,
      publish_at: null,
      expires_at: null,
    });
    setOpen(true);
  };

  const openEdit = async (item: CompanyNoticeItem) => {
    try {
      const resp = await companyNoticeAdminShow(item.id);
      const full = resp?.data?.item;
      if (!full) return;

      setEditing(full);
      setFileList([]);
      form.setFieldsValue({
        tieu_de: full.tieu_de,
        tom_tat: full.tom_tat,
        noi_dung: full.noi_dung,
        trang_thai: full.trang_thai,
        ghim_dau: full.ghim_dau,
        publish_at: full.publish_at ? dayjs(full.publish_at) : null,
        expires_at: full.expires_at ? dayjs(full.expires_at) : null,
      });
      setOpen(true);
    } catch (e: any) {
      message.error(e?.message || "Không tải được dữ liệu chỉnh sửa.");
    }
  };

  const onOpenAttachment = async (item: CompanyNoticeItem) => {
    try {
      const blob = await companyNoticeAdminDownload(item.id);
      openBlob(blob);
    } catch (e: any) {
      message.error(e?.message || "Không mở được file đính kèm.");
    }
  };

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();

      const attachment = fileList[0]?.originFileObj as File | undefined;

      const payload = {
        tieu_de: v.tieu_de as string,
        tom_tat: (v.tom_tat || "") as string,
        noi_dung: (v.noi_dung || "") as string,
        trang_thai: v.trang_thai as CompanyNoticeStatus,
        ghim_dau: !!v.ghim_dau,
        publish_at: v.publish_at ? (v.publish_at as Dayjs).format("YYYY-MM-DD HH:mm:ss") : undefined,
        expires_at: v.expires_at ? (v.expires_at as Dayjs).format("YYYY-MM-DD HH:mm:ss") : undefined,
        attachment: attachment ?? null,
      };

      if (editing) {
        await companyNoticeAdminUpdate(editing.id, payload);
        message.success("Đã cập nhật thông báo.");
      } else {
        await companyNoticeAdminCreate(payload);
        message.success("Đã tạo thông báo.");
      }

      setOpen(false);
      setEditing(null);
      setFileList([]);
      form.resetFields();
      fetchData();
    } catch {
      // đã handle ở dưới
    }
  };

  const onDelete = async (id: number) => {
    try {
      await companyNoticeAdminDelete(id);
      message.success("Đã xoá thông báo.");
      fetchData();
    } catch (e: any) {
      message.error(e?.message || "Không xoá được thông báo.");
    }
  };

  const columns: ColumnsType<CompanyNoticeItem> = [
    {
      title: "Tiêu đề",
      dataIndex: "tieu_de",
      key: "tieu_de",
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "trang_thai",
      key: "trang_thai",
      width: 130,
      render: (v: CompanyNoticeStatus) => {
        if (v === "published") return <Tag color="green">Đã đăng</Tag>;
        if (v === "draft") return <Tag color="orange">Nháp</Tag>;
        return <Tag>Lưu trữ</Tag>;
      },
    },
    {
      title: "Ghim",
      dataIndex: "ghim_dau",
      key: "ghim_dau",
      width: 90,
      render: (v: boolean) => (v ? <Tag color="gold">Có</Tag> : <Tag>Không</Tag>),
    },
    {
      title: "Đăng lúc",
      dataIndex: "publish_at",
      key: "publish_at",
      width: 170,
      render: (v?: string | null) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : ""),
    },
    {
      title: "Hết hạn",
      dataIndex: "expires_at",
      key: "expires_at",
      width: 170,
      render: (v?: string | null) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : ""),
    },
    {
      title: "File",
      key: "file",
      width: 140,
      render: (_, r) =>
        r.has_attachment ? (
          <Button type="link" onClick={() => onOpenAttachment(r)}>
            Xem file
          </Button>
        ) : (
          <Text type="secondary">Không có</Text>
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 200,
      render: (_, r) => (
        <Space>
          <Button onClick={() => openEdit(r)}>Sửa</Button>
          <Popconfirm title="Xoá thông báo này?" onConfirm={() => onDelete(r.id)}>
            <Button danger>Xoá</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Title level={3} style={{ margin: 0 }}>
        Quản trị thông báo công ty
      </Title>

      <Card>
        <Space align="end" wrap>
          <Space direction="vertical" size={4}>
            <Text>Tìm kiếm</Text>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tiêu đề / tóm tắt / nội dung"
              style={{ width: 260 }}
            />
          </Space>

          <Space direction="vertical" size={4}>
            <Text>Trạng thái</Text>
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: 180 }}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "draft", label: "Nháp" },
                { value: "published", label: "Đã đăng" },
                { value: "archived", label: "Lưu trữ" },
              ]}
            />
          </Space>

          <Button onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" onClick={openCreate}>
            Thêm thông báo
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<CompanyNoticeItem>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editing ? "Sửa thông báo công ty" : "Thêm thông báo công ty"}
        open={open}
        onOk={onSubmit}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          setFileList([]);
        }}
        okText={editing ? "Cập nhật" : "Tạo mới"}
        width={860}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="tieu_de"
            label="Tiêu đề"
            rules={[{ required: true, message: "Nhập tiêu đề" }]}
          >
            <Input placeholder="Ví dụ: Thông báo nghỉ lễ 30/4 - 1/5" />
          </Form.Item>

          <Form.Item name="tom_tat" label="Tóm tắt">
            <Input placeholder="Mô tả ngắn" />
          </Form.Item>

          <Form.Item name="noi_dung" label="Nội dung">
            <TextArea rows={8} placeholder="Nhập nội dung chi tiết thông báo..." />
          </Form.Item>

          <Space style={{ display: "flex" }} size={16} wrap>
            <Form.Item
              name="trang_thai"
              label="Trạng thái"
              rules={[{ required: true, message: "Chọn trạng thái" }]}
            >
              <Select
                style={{ width: 180 }}
                options={[
                  { value: "draft", label: "Nháp" },
                  { value: "published", label: "Đã đăng" },
                  { value: "archived", label: "Lưu trữ" },
                ]}
              />
            </Form.Item>

            <Form.Item name="publish_at" label="Đăng lúc">
              <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: 220 }} />
            </Form.Item>

            <Form.Item name="expires_at" label="Hết hạn">
              <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: 220 }} />
            </Form.Item>
          </Space>

          <Form.Item
            name="ghim_dau"
            label="Ghim đầu"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch checkedChildren="Ghim" unCheckedChildren="Không" />
          </Form.Item>

          <Form.Item label="File đính kèm (PDF / JPG / JPEG / PNG)">
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              fileList={fileList}
              onChange={({ fileList: next }) => setFileList(next.slice(-1))}
            >
              <Button>Chọn file</Button>
            </Upload>

            {editing?.has_attachment ? (
              <div style={{ marginTop: 8 }}>
                <Button type="link" onClick={() => onOpenAttachment(editing)}>
                  Xem file hiện tại
                </Button>
              </div>
            ) : null}
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
