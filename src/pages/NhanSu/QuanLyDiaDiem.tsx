/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Alert,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import {
  workpointManageCreate,
  workpointManageDelete,
  workpointManageList,
  workpointManageUpdate,
  type WorkpointManageItem,
} from "../../services/workpoint-manage.api";

const { Title, Text } = Typography;

const normalizeRole = (v: string) =>
  String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const isAdminRole = (code: string) =>
  code === "super_admin" || code === "admin" || code.includes("admin");

const isManagerRole = (code: string) =>
  isAdminRole(code) ||
  code === "quan_ly" ||
  code === "quanly" ||
  code === "manager" ||
  code.includes("quan_ly") ||
  code.includes("manager");

export default function QuanLyDiaDiem() {
  const { message } = App.useApp();
  const { user } = useSelector((state: RootState) => state.auth);

  const vt: any = (user as any)?.vai_tro || {};
  const roleCode = normalizeRole(
    String(vt.ma_vai_tro ?? vt.ma ?? vt.code ?? vt.ten ?? vt.slug ?? vt.name ?? "")
  );

  const isAdmin = isAdminRole(roleCode);
  const isManager = isManagerRole(roleCode);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<WorkpointManageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [q, setQ] = useState("");
  const [type, setType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<number | undefined>(undefined);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkpointManageItem | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp: any = await workpointManageList({
        q: q || undefined,
        type,
        status,
        page,
        per_page: perPage,
      });

      const data = resp?.data ?? resp ?? {};
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.pagination?.total || 0));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        err?.message ||
        "Không tải được danh sách địa điểm";
      message.error(msg);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      loai_dia_diem: "fixed",
      ban_kinh_m: 150,
      trang_thai: true,
    });
    setModalOpen(true);
  };

  const openEdit = (row: WorkpointManageItem) => {
    setEditing(row);
    form.setFieldsValue({
      ma_dia_diem: row.ma_dia_diem || undefined,
      ten: row.ten,
      loai_dia_diem: row.loai_dia_diem || "fixed",
      dia_chi: row.dia_chi || undefined,
      lat: row.lat,
      lng: row.lng,
      ban_kinh_m: row.ban_kinh_m,
      ghi_chu: row.ghi_chu || undefined,
      trang_thai: row.trang_thai === 1,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        trang_thai: values.trang_thai ? 1 : 0,
      };

      if (editing) {
        await workpointManageUpdate(editing.id, payload);
        message.success("Đã cập nhật địa điểm");
      } else {
        await workpointManageCreate(payload);
        message.success("Đã tạo địa điểm mới");
      }

      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        err?.message ||
        "Lưu địa điểm thất bại";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: WorkpointManageItem) => {
    try {
      const resp: any = await workpointManageDelete(row.id);
      const msg =
        resp?.data?.message ||
        resp?.message ||
        (row.delete_mode === "archive" ? "Đã ẩn địa điểm" : "Đã xóa địa điểm");
      message.success(msg);
      fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        err?.message ||
        "Xóa/ẩn địa điểm thất bại";
      message.error(msg);
    }
  };

  const columns: ColumnsType<WorkpointManageItem> = [
    {
      title: "Mã",
      dataIndex: "ma_dia_diem",
      key: "ma_dia_diem",
      width: 130,
      ellipsis: true,
    },
    {
      title: "Tên địa điểm",
      dataIndex: "ten",
      key: "ten",
      width: 240,
      ellipsis: true,
    },
    {
      title: "Loại",
      dataIndex: "loai_label",
      key: "loai_label",
      width: 110,
      render: (_v, r) => (
        <Tag color={r.loai_dia_diem === "fixed" ? "blue" : "purple"}>
          {r.loai_label || r.loai_dia_diem || "-"}
        </Tag>
      ),
    },
    {
      title: "Nguồn",
      dataIndex: "nguon_tao",
      key: "nguon_tao",
      width: 100,
      render: (v) => v || "-",
    },
    {
      title: "Địa chỉ",
      dataIndex: "dia_chi",
      key: "dia_chi",
      ellipsis: true,
    },
    {
      title: "Bán kính",
      dataIndex: "ban_kinh_m",
      key: "ban_kinh_m",
      width: 90,
      render: (v) => `${v}m`,
    },
    {
      title: "Trạng thái",
      dataIndex: "trang_thai",
      key: "trang_thai",
      width: 110,
      render: (v, r) => (
        <Tag color={v === 1 ? "green" : "default"}>
          {r.trang_thai_label || (v === 1 ? "Đang dùng" : "Đã ẩn")}
        </Tag>
      ),
    },
    {
      title: "Số log",
      dataIndex: "cham_congs_count",
      key: "cham_congs_count",
      width: 90,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 220,
      render: (_v, row) => (
        <Space wrap>
          {isAdmin ? (
            <Button size="small" onClick={() => openEdit(row)}>
              Sửa
            </Button>
          ) : null}

          {row.can_delete && isManager ? (
            <Popconfirm
              title={row.delete_mode === "archive" ? "Địa điểm đã có log, hệ thống sẽ ẩn thay vì xóa cứng. Tiếp tục?" : "Xóa địa điểm này?"}
              okText={row.delete_mode === "archive" ? "Ẩn địa điểm" : "Xóa"}
              cancelText="Hủy"
              onConfirm={() => handleDelete(row)}
            >
              <Button size="small" danger>
                {row.delete_mode === "archive" ? "Ẩn" : "Xóa"}
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Title level={3} style={{ margin: 0 }}>
        Quản lý địa điểm
      </Title>

      <Alert
        type="info"
        showIcon
        message="Quy tắc quản lý"
        description={
          isAdmin
            ? "Quản trị viên có thể thêm, sửa, đổi tên, ẩn hoặc xóa địa điểm. Nếu địa điểm đã có log chấm công, hệ thống sẽ tự ẩn thay vì xóa cứng."
            : "Quản lý có thể dọn các địa điểm sự kiện được tạo từ điện thoại. Các địa điểm đã có log sẽ được ẩn thay vì xóa cứng."
        }
      />

      <Card>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8} lg={8}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text>Tìm kiếm</Text>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tên / mã / địa chỉ"
                allowClear
              />
            </Space>
          </Col>

          <Col xs={24} md={6} lg={4}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text>Loại</Text>
              <Select
                allowClear
                value={type}
                onChange={(v) => setType(v)}
                options={[
                  { value: "fixed", label: "Cố định" },
                  { value: "event", label: "Sự kiện" },
                ]}
                placeholder="Tất cả"
              />
            </Space>
          </Col>

          <Col xs={24} md={6} lg={4}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text>Trạng thái</Text>
              <Select
                allowClear
                value={status}
                onChange={(v) => setStatus(v)}
                options={[
                  { value: 1, label: "Đang dùng" },
                  { value: 0, label: "Đã ẩn" },
                ]}
                placeholder="Tất cả"
              />
            </Space>
          </Col>

          <Col xs={24} md={24} lg={8}>
            <Space style={{ marginTop: 22 }} wrap>
              <Button
                onClick={() => {
                  setPage(1);
                  fetchData();
                }}
                loading={loading}
              >
                Nạp dữ liệu
              </Button>

              {isAdmin ? (
                <Button type="primary" onClick={openCreate}>
                  Thêm địa điểm
                </Button>
              ) : null}
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table<WorkpointManageItem>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1200 }}
          pagination={{
            total,
            current: page,
            pageSize: perPage,
            showSizeChanger: true,
            onChange: (p, s) => {
              setPage(p);
              setPerPage(s);
            },
          }}
        />
      </Card>

      <Modal
        title={editing ? "Sửa địa điểm" : "Thêm địa điểm"}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        confirmLoading={saving}
        okText={editing ? "Lưu" : "Tạo"}
        cancelText="Hủy"
        width={760}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item label="Mã địa điểm" name="ma_dia_diem">
                <Input placeholder="Để trống để tự sinh" />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item
                label="Tên địa điểm"
                name="ten"
                rules={[{ required: true, message: "Vui lòng nhập tên địa điểm" }]}
              >
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Loại địa điểm" name="loai_dia_diem" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "fixed", label: "Cố định" },
                    { value: "event", label: "Sự kiện" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item label="Địa chỉ" name="dia_chi">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="Vĩ độ (lat)"
                name="lat"
                rules={[{ required: true, message: "Nhập lat" }]}
              >
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="Kinh độ (lng)"
                name="lng"
                rules={[{ required: true, message: "Nhập lng" }]}
              >
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="Bán kính hợp lệ (m)"
                name="ban_kinh_m"
                rules={[{ required: true, message: "Nhập bán kính" }]}
              >
                <InputNumber min={30} max={5000} style={{ width: "100%" }} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Ghi chú" name="ghi_chu">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Đang sử dụng" name="trang_thai" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Flex>
  );
}
