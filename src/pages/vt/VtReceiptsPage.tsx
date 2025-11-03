/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Space, Table, Tag, message, Select, InputNumber, Row, Col } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { vtReceiptList, vtReceiptCreate, vtReceiptUpdate, vtReceiptDelete, vtItemOptions, vtRefOptions } from "../../services/vt.api";
import type { JSX } from "react";

type ItemRow = { vt_item_id: number; so_luong: number; don_gia?: number | null; ghi_chu?: string | null; _key?: string };
type Receipt = {
  id: number; so_ct: string; ngay_ct: string; tham_chieu?: string|null; ghi_chu?: string|null; tong_so_luong: number; tong_gia_tri?: number|null;
  items: Array<{ vt_item_id:number; so_luong:number; don_gia?:number|null; item?: { ma_vt:string; ten_vt:string; don_vi_tinh?:string; loai:"ASSET"|"CONSUMABLE" } }>;
};

export default function VtReceiptsPage(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Receipt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [q, setQ] = useState<string | undefined>();
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);
  const [form] = Form.useForm();
  const [items, setItems] = useState<ItemRow[]>([]);

  // --- Tham chiếu dropdown state ---
  const [refOpts, setRefOpts] = useState<Array<{ value: string; label: string }>>([]);
  const [refQuery, setRefQuery] = useState<string>("");
  const [refLoading, setRefLoading] = useState(false);

  const fetchList = async () => {
    try {
      setLoading(true);
      const qs: any = { page, per_page: perPage };
      if (q) qs.q = q;
      if (from) qs.from = from;
      if (to) qs.to = to;
      const res = await vtReceiptList(qs);
      const data = res?.data || {};
      setRows(data.collection || []);
      setTotal(data.total || 0);
    } catch (e:any) { message.error(e.message || "Lỗi tải danh sách"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [page, perPage, from, to]);

  const resetModal = () => {
    setEditing(null);
    setItems([]);
    form.resetFields();
    form.setFieldsValue({ ngay_ct: dayjs(), items: [] });
    setRefQuery("");
    setRefOpts([]);
  };

  const openCreate = () => { resetModal(); setOpen(true); };
  const openEdit = (r: Receipt) => {
    setEditing(r);
    form.setFieldsValue({
      so_ct: r.so_ct,
      ngay_ct: dayjs(r.ngay_ct),
      tham_chieu: r.tham_chieu || undefined,
      ghi_chu: r.ghi_chu,
    });
    setItems(r.items.map((it, idx) => ({
      vt_item_id: it.vt_item_id, so_luong: it.so_luong, don_gia: it.don_gia ?? null, _key: `e${idx}`
    })));
    // đảm bảo option hiện hữu để hiển thị giá trị cũ
    if (r.tham_chieu) {
      setRefOpts((prev) => {
        const exists = prev.some(o => o.value === r.tham_chieu);
        return exists ? prev : [{ value: r.tham_chieu!, label: r.tham_chieu! }, ...prev];
      });
    }
    setOpen(true);
  };

const openClone = (r: Receipt) => {
  // MỞ MODAL TẠO MỚI nhưng prefill từ phiếu gốc
  setEditing(null);               // rất quan trọng: submit đi nhánh CREATE
  form.resetFields();

  form.setFieldsValue({
    // KHÔNG set so_ct → BE tự sinh PNVT-...
    ngay_ct: dayjs(r.ngay_ct),    // nếu muốn ngày hiện tại thay bằng dayjs()
    tham_chieu: r.tham_chieu || undefined,
    ghi_chu: r.ghi_chu || undefined,
  } as any);

  setItems((r.items || []).map((it, idx) => ({
    vt_item_id: it.vt_item_id,
    so_luong: it.so_luong,
    don_gia:  (typeof it.don_gia === "number" ? it.don_gia : null),
    ghi_chu:  undefined,
    _key:     `clone-${idx}-${Date.now()}`,
  })));

  // bảo đảm Select “Tham chiếu” hiển thị được nhãn cũ nếu có
  if (r.tham_chieu) {
    setRefOpts(prev => {
      const exists = prev.some(o => o.value === r.tham_chieu);
      return exists ? prev : [{ value: r.tham_chieu!, label: r.tham_chieu! }, ...prev];
    });
  }

  setOpen(true);
};



  const removeRow = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));
  const addRow = () => setItems((arr) => [...arr, { vt_item_id: 0, so_luong: 1, don_gia: null, _key: Math.random().toString(36).slice(2) }]);

  const submit = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        so_ct: v.so_ct || undefined, // service sẽ tự omit khi create
        ngay_ct: v.ngay_ct?.format("YYYY-MM-DD"),
        tham_chieu: v.tham_chieu || undefined,
        ghi_chu: v.ghi_chu || undefined,
        items: items.map(r => ({
          vt_item_id: Number(r.vt_item_id),
          so_luong: Number(r.so_luong),
          don_gia: r.don_gia === null || r.don_gia === undefined ? null : Number(r.don_gia),
          ghi_chu: r.ghi_chu || undefined,
        })),
      };
      if (!payload.items.length) { message.warning("Thêm ít nhất 1 dòng vật tư"); return; }
      if (editing) await vtReceiptUpdate(editing.id, payload);
      else await vtReceiptCreate(payload);
      message.success(editing ? "Đã cập nhật phiếu nhập" : "Đã tạo phiếu nhập");
      setOpen(false);
      fetchList();
    } catch { /* ignore */ }
  };

// VtReceiptsPage.tsx
// VtReceiptsPage.tsx
const del = (r: Receipt) => {
  Modal.confirm({
    title: `Xóa phiếu nhập ${r.so_ct}?`,
    content: "Thao tác này không thể hoàn tác.",
    okText: "Xóa",
    cancelText: "Hủy",
    okType: "danger",
    centered: true,
    async onOk() {
      try {
        await vtReceiptDelete(r.id);   // DELETE (200/204 đều OK qua http())
        message.success(`Đã xóa phiếu nhập ${r.so_ct}`);

        // ✅ Xóa khỏi UI ngay lập tức
        setRows(prev => prev.filter(x => x.id !== r.id));

        // ✅ Rồi nạp lại danh sách từ server để đồng bộ
        await fetchList();
      } catch (e: any) {
        const msg = (typeof e?.message === "string" && e.message.trim())
          ? e.message
          : "Xóa phiếu nhập thất bại";
        message.error(msg);
        // KHÔNG throw để Modal không bị kẹt loading
      }
    },
  });
};



  // Tải options “Tham chiếu”
  const reloadRefOptions = async () => {
    try {
      setRefLoading(true);
      const res = await vtRefOptions({ q: refQuery, limit: 50 }); // không cần ly_do cho phiếu nhập
      const data = res?.data || [];
      setRefOpts(data.map((d:any) => ({ value: d.value, label: d.label })));
    } catch (e:any) {
      message.error(e.message || "Lỗi tải tham chiếu");
    } finally {
      setRefLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { reloadRefOptions(); }, 250); // debounce
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refQuery]);

  const columns: ColumnsType<Receipt> = useMemo(() => [
    { title: "Số chứng từ", dataIndex: "so_ct", width: 150, fixed: "left" },
    { title: "Ngày", dataIndex: "ngay_ct", width: 120, render: (v) => dayjs(v).format("DD/MM/YYYY") },
    { title: "SL", dataIndex: "tong_so_luong", width: 90 },
    {
  title: "Giá trị",
  dataIndex: "tong_gia_tri",
  width: 140,
  render: (v: any) =>
    v !== null && v !== undefined
      ? `${new Intl.NumberFormat("vi-VN").format(Number(v))} ₫`
      : "-",
},

    { title: "Ghi chú", dataIndex: "ghi_chu" },
{
  title: "Thao tác",
  key: "x",
  width: 220,                   // tăng chút để đủ 3 nút
  fixed: "right",
  render: (_, r) => (
    <Space>
      <Button size="small" onClick={() => openEdit(r)}>Sửa</Button>
      <Button size="small" onClick={() => openClone(r)}>Thêm bản sao</Button>
      <Button size="small" danger onClick={() => del(r)}>Xóa</Button>
    </Space>
  )
}

  ], []);

  return (
    <Card
      title="Phiếu nhập vật tư"
      extra={
        <Space>
          <Input.Search placeholder="Tìm số chứng từ/ghi chú…" allowClear onSearch={setQ as any} style={{ width: 260 }} />
          <DatePicker.RangePicker
            onChange={(v) => { setFrom(v?.[0]?.format("YYYY-MM-DD")); setTo(v?.[1]?.format("YYYY-MM-DD")); setPage(1); }}
            allowEmpty={[true, true]}
          />
          <Button type="primary" onClick={openCreate}>Thêm phiếu</Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 900 }}
        pagination={{
          current: page, pageSize: perPage, total,
          onChange: (p, s) => { setPage(p); setPerPage(s); }
        }}
      />

      <Modal
        title={editing ? `Sửa phiếu: ${editing.so_ct}` : "Thêm phiếu nhập VT"}
        open={open} onCancel={() => setOpen(false)} onOk={submit} width={900} destroyOnClose
      >
<Form layout="vertical" form={form} preserve={false}>
  <Row gutter={12}>
    <Col span={6}>
      <Form.Item name="so_ct" label="Số chứng từ">
        <Input placeholder="(tự sinh)" disabled />
      </Form.Item>
    </Col>

    <Col span={6}>
      <Form.Item
        name="ngay_ct"
        label="Ngày CT"
        rules={[{ required: true, message: "Chọn ngày" }]}
      >
        <DatePicker style={{ width: "100%" }} />
      </Form.Item>
    </Col>

    <Col span={12}>
      <Form.Item name="tham_chieu" label="Tham chiếu">
        <Select
          showSearch
          allowClear
          placeholder="Tìm & chọn tham chiếu"
          options={refOpts}
          loading={refLoading}
          onSearch={(val) => setRefQuery(val || "")}
          filterOption={false} // server search
          notFoundContent="Không có tham chiếu phù hợp"
        />
      </Form.Item>
    </Col>
  </Row>

  <Form.Item name="ghi_chu" label="Ghi chú">
    <Input.TextArea rows={3} />
  </Form.Item>

  <Card size="small" title="Danh sách vật tư" extra={<Button onClick={addRow}>+ Thêm dòng</Button>}>
    {items.map((it, idx) => (
      <ItemRowEditor
        key={it._key || idx.toString()}
        row={it}
        onChange={(r) => setItems((arr) => arr.map((x, i) => (i === idx ? r : x)))}
        onRemove={() => removeRow(idx)}
      />
    ))}
    {!items.length && <Tag>Chưa có dòng</Tag>}
  </Card>
</Form>

      </Modal>
    </Card>
  );
}

function ItemRowEditor({
  row, onChange, onRemove
}: { row: ItemRow; onChange: (r: ItemRow) => void; onRemove: () => void }) {
  const [opts, setOpts] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const res = await vtItemOptions(); setOpts(res?.data || []);
  })(); }, []);

  return (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Row gutter={12} align="middle">
        <Col span={12}>
          <Form.Item label="Vật tư" style={{ marginBottom: 8 }}>
            <Select
              style={{ width: "100%" }}
              placeholder="Chọn vật tư"
              showSearch
              value={row.vt_item_id || undefined}
              onChange={(v) => onChange({ ...row, vt_item_id: Number(v) })}
              options={opts}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase()?.includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Col>

        <Col span={4}>
          <Form.Item label="SL" style={{ marginBottom: 8 }}>
            <InputNumber
              min={1}
              style={{ width: "100%" }}
              value={row.so_luong}
              onChange={(v) => onChange({ ...row, so_luong: Number(v || 1) })}
            />
          </Form.Item>
        </Col>

        <Col span={6}>
          <Form.Item label="Đơn giá (ASSET)" style={{ marginBottom: 8 }}>
<InputNumber
  min={0}
  precision={0}
  style={{ width: "100%" }}
  placeholder="Nhập đơn giá"
  // ❗ Giá trị phải là number | undefined, KHÔNG so sánh với ''
  value={typeof row.don_gia === "number" ? row.don_gia : undefined}
  // AntD onChange: (value: number | null) => void
  onChange={(v) => onChange({ ...row, don_gia: v === null || v === undefined ? null : Number(v) })}
  // AntD formatter: (value: number|string|undefined) => string
  formatter={(value) =>
    value === null || value === undefined
      ? ""
      : new Intl.NumberFormat("vi-VN").format(Number(value))
  }
  // AntD parser: (displayValue: string | undefined) => number
  parser={(displayValue) => {
    const s = (displayValue ?? "").replace(/[^\d]/g, "");
    return s ? Number(s) : 0;
  }}
  addonAfter="₫"
/>


          </Form.Item>
        </Col>

        <Col span={2} style={{ textAlign: "right" }}>
          <Button danger onClick={onRemove} style={{ marginTop: 24 }}>Xóa</Button>
        </Col>

        <Col span={24}>
          <Form.Item label="Ghi chú" style={{ marginBottom: 0 }}>
            <Input
              placeholder="Ghi chú"
              value={row.ghi_chu || ""}
              onChange={(e) => onChange({ ...row, ghi_chu: e.target.value })}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}
