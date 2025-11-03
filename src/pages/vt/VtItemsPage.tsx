/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
  Select,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  vtItemsList,
  vtItemCreate,
  vtItemUpdate,
  vtItemDelete,
  type VtItem,
  vtCategoryOptions,  // +
  vtGroupOptions,     // +
  vtUnitOptions,      // +
} from "../../services/vt.api";
import type { JSX } from "react";

type QueryState = {
  q?: string;
  loai?: "ASSET" | "CONSUMABLE";
  page: number;
  per_page: number;
};

const defaultQuery: QueryState = { page: 1, per_page: 20 };

export default function VtItemsPage(): JSX.Element {
  const [query, setQuery] = useState<QueryState>(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VtItem | null>(null);
  const [form] = Form.useForm<VtItem>();

  // Dropdown options (distinct from existing items)
  const [catOpts, setCatOpts] = useState<string[]>([]);
  const [groupOpts, setGroupOpts] = useState<string[]>([]);
  const [unitOpts, setUnitOpts] = useState<string[]>([]);
  const [optLoading, setOptLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await vtItemsList(query);
      const data = res?.data || {};
      setRows(data.collection || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      message.error(e?.message || "Lỗi tải danh sách vật tư");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.per_page, query.loai]);

  const onSearch = (v: string) => {
    setQuery((s) => ({ ...s, q: v || undefined, page: 1 }));
  };

const loadDistinctOptions = async () => {
  try {
    setOptLoading(true);
    const [cRes, gRes, uRes] = await Promise.all([
      vtCategoryOptions(),
      vtGroupOptions(),
      vtUnitOptions(),
    ]);
    setCatOpts((cRes?.data || []).map((o:any) => o.label));
    setGroupOpts((gRes?.data || []).map((o:any) => o.label));
    setUnitOpts((uRes?.data || []).map((o:any) => o.label));
  } catch {
    // bỏ qua
  } finally {
    setOptLoading(false);
  }
};


  const onCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ loai: "CONSUMABLE", trang_thai: 1 } as any);
    // Tải dropdown khi mở
    loadDistinctOptions();
    setOpen(true);
  };

  const onEdit = (r: VtItem) => {
    setEditing(r);
    form.setFieldsValue({ ...r });
    // Tải dropdown khi mở
    loadDistinctOptions();
    setOpen(true);
  };


  // ⬇️⬇️ DÁN NGAY SAU HÀM onEdit KẾT THÚC (sau dấu };) ⬇️⬇️
const onClone = (r: VtItem) => {
  // MỞ MODAL TẠO MỚI nhưng prefill từ record gốc
  setEditing(null);                 // rất quan trọng: submit sẽ đi luồng CREATE
  form.resetFields();
  form.setFieldsValue({
    // KHÔNG set ma_vt → BE tự sinh
    ten_vt: r.ten_vt,
    danh_muc_vt: r.danh_muc_vt,
    nhom_vt: r.nhom_vt,
    don_vi_tinh: r.don_vi_tinh,
    loai: r.loai,                   // "ASSET" | "CONSUMABLE"
    trang_thai: r.trang_thai ?? 1,
    ghi_chu: r.ghi_chu,
  } as any);

  // đảm bảo dropdown có option để hiển thị
  loadDistinctOptions();
  setOpen(true);
};
// ⬆️⬆️ HẾT KHỐI DÁN ⬆️⬆️




const doDelete = React.useCallback(async (r: VtItem) => {
  const id = Number(r.id);
  if (!id) { message.error("ID vật tư không hợp lệ"); return; }
  try {
    await vtItemDelete(id);
    message.success(`Đã xóa vật tư ${r.ma_vt}`);
    setRows(prev => prev.filter((x:any) => Number(x.id) !== id)); // optimistic
    await fetchData();                                            // đồng bộ lại
  } catch (e:any) {
    message.error(e?.message || "Xóa vật tư thất bại");
  }
}, [fetchData]);



// VtItemsPage.tsx
// Dùng useCallback để columns luôn nhận handler mới nhất
const onDelete = React.useCallback((r: VtItem) => {
  const id = Number((r as any)?.id);
  if (!id) {
    console.warn('[VT][DELETE] invalid id from row:', r);
    message.error('ID vật tư không hợp lệ (id=undefined)');
    return;
  }

  Modal.confirm({
    title: `Xóa vật tư ${r.ma_vt}?`,
    content: "Thao tác này không thể hoàn tác.",
    okText: "Xóa",
    cancelText: "Hủy",
    okType: "danger",
    centered: true,
    async onOk() {
      try {
        console.log('[VT][DELETE] try delete id=', id, r);
        await vtItemDelete(id);                        // gọi API
        message.success(`Đã xóa vật tư ${r.ma_vt}`);

        // ✅ Xóa ngay trên UI
        setRows(prev => prev.filter((x:any) => Number(x.id) !== id));

        // ✅ Đồng bộ lại từ server
        await fetchData();
      } catch (e:any) {
        const msg = (typeof e?.message === 'string' && e.message.trim())
          ? e.message : 'Xóa vật tư thất bại';
        console.error('[VT][DELETE] error:', e);
        message.error(msg);
      }
    },
  });
}, [fetchData]);




  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await vtItemUpdate(editing.id, values);
        message.success("Đã cập nhật vật tư");
      } else {
        await vtItemCreate(values);
        message.success("Đã tạo vật tư");
      }
      setOpen(false);
      fetchData();
    } catch {
      /* no-op */
    }
  };

const columns: ColumnsType<any> = [
  { title: "Mã VT", dataIndex: "ma_vt", width: 130, fixed: "left" },
  { title: "Tên VT", dataIndex: "ten_vt", width: 260 },
  { title: "Danh mục", dataIndex: "danh_muc_vt", width: 180 },
  { title: "Nhóm", dataIndex: "nhom_vt", width: 180 },
  { title: "ĐVT", dataIndex: "don_vi_tinh", width: 90 },
  {
    title: "Loại", dataIndex: "loai", width: 120,
    render: (v: VtItem["loai"]) => (v === "ASSET" ? <Tag color="blue">Tài sản</Tag> : <Tag>Tiêu hao</Tag>),
  },
  {
    title: "Trạng thái", dataIndex: "trang_thai", width: 120,
    render: (v: number) => (v ? <Tag color="green">Đang dùng</Tag> : <Tag color="red">Ngưng</Tag>),
  },
  {
    title: "Cập nhật", dataIndex: "updated_at", width: 160,
    render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : ""),
  },
  {
  title: "Thao tác",
  key: "actions",
  fixed: "right",
  width: 220,
  render: (_: any, r: VtItem) => (
    <Space>
      <Button size="small" onClick={() => onEdit(r)}>Sửa</Button>
      <Button size="small" onClick={() => onClone(r)}>Thêm bản sao</Button>

      <Popconfirm
        title={`Xóa vật tư ${r.ma_vt}?`}
        okText="Xóa"
        cancelText="Hủy"
        okType="danger"
        placement="left"
        onConfirm={() => doDelete(r)}
      >
        <Button size="small" danger>Xóa</Button>
      </Popconfirm>
    </Space>
  ),
},
];


  return (
    <Card
      title="Danh mục vật tư"
      extra={
        <Space>
          <Input.Search
            placeholder="Tìm mã/tên VT…"
            allowClear
            onSearch={onSearch}
            style={{ width: 260 }}
          />
          <Select
            value={query.loai}
            placeholder="Lọc loại"
            style={{ width: 160 }}
            allowClear
            onChange={(v) =>
              setQuery((s) => ({ ...s, loai: v as any, page: 1 }))
            }
            options={[
              { label: "Tài sản (ASSET)", value: "ASSET" },
              { label: "Tiêu hao (CONSUMABLE)", value: "CONSUMABLE" },
            ]}
          />
          <Button type="primary" onClick={onCreate}>
            Thêm vật tư
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 1100 }}
        pagination={{
          current: query.page,
          pageSize: query.per_page,
          total,
          onChange: (page, per_page) => setQuery({ ...query, page, per_page }),
          showSizeChanger: true,
        }}
      />

      <Modal
        title={editing ? `Sửa vật tư: ${editing.ma_vt}` : "Thêm vật tư"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? "Lưu" : "Tạo mới"}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          {/* Mã VT: disabled, tự sinh ở BE */}
          <Form.Item name="ma_vt" label="Mã VT">
            <Input maxLength={50} placeholder="(tự sinh)" disabled />
          </Form.Item>

          <Form.Item
            name="ten_vt"
            label="Tên vật tư"
            rules={[{ required: true, message: "Nhập tên vật tư" }]}
          >
            <Input maxLength={255} />
          </Form.Item>

          <Space.Compact style={{ width: "100%" }}>
            {/* Danh mục */}
            <Form.Item
              name="danh_muc_vt"
              label="Danh mục"
              style={{ flex: 1 }}
              tooltip="Chọn từ danh sách sẵn có hoặc nhập nhanh giá trị mới"
            >
              <Select
                loading={optLoading}
                showSearch
                allowClear
            
                placeholder="Chọn/nhập danh mục"
                options={catOpts.map((x) => ({ label: x, value: x }))}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase()?.includes(input.toLowerCase())
                }
              />
            </Form.Item>

            {/* Nhóm */}
            <Form.Item
              name="nhom_vt"
              label="Nhóm"
              style={{ flex: 1 }}
              tooltip="Chọn từ danh sách sẵn có hoặc nhập nhanh giá trị mới"
            >
              <Select
                loading={optLoading}
                showSearch
                allowClear
               
                placeholder="Chọn/nhập nhóm"
                options={groupOpts.map((x) => ({ label: x, value: x }))}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase()?.includes(input.toLowerCase())
                }
              />
            </Form.Item>

            {/* Đơn vị tính */}
            <Form.Item
              name="don_vi_tinh"
              label="Đơn vị tính"
              style={{ width: 200 }}
              tooltip="Chọn từ danh sách sẵn có hoặc nhập nhanh giá trị mới"
            >
              <Select
                loading={optLoading}
                showSearch
                allowClear
            
                placeholder="Chọn/nhập ĐVT"
                options={unitOpts.map((x) => ({ label: x, value: x }))}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase()?.includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Space.Compact>

          <Form.Item
            name="loai"
            label="Loại vật tư"
            rules={[{ required: true, message: "Chọn loại" }]}
          >
            <Radio.Group>
              <Radio value="ASSET">Tài sản</Radio>
              <Radio value="CONSUMABLE">Tiêu hao</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="trang_thai" label="Trạng thái">
            <Radio.Group>
              <Radio value={1}>Đang dùng</Radio>
              <Radio value={0}>Ngưng</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="ghi_chu" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
