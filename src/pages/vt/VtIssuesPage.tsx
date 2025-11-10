/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Space, Table, Tag, message, Select, InputNumber, Popconfirm } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { vtIssueList, vtIssueCreate, vtIssueUpdate, vtIssueDelete, vtItemOptions, vtRefOptions } from "../../services/vt.api";
import type { JSX } from "react";

type ItemRow = { vt_item_id: number; so_luong: number; ghi_chu?: string | null; _key?: string };
type Issue = {
  id:number; so_ct:string; ngay_ct:string; ly_do:"BAN"|"HUY"|"CHUYEN"|"KHAC"; tham_chieu?:string|null; ghi_chu?:string|null; tong_so_luong:number; tong_gia_tri?:number|null;
  items: Array<{ vt_item_id:number; so_luong:number; item?:{ ma_vt:string; ten_vt:string; don_vi_tinh?:string; loai:"ASSET"|"CONSUMABLE" } }>;
};

export default function VtIssuesPage(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [q, setQ] = useState<string | undefined>();
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [lyDo, setLyDo] = useState<Issue["ly_do"] | undefined>();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [form] = Form.useForm();
  const [items, setItems] = useState<ItemRow[]>([]);

  // --- Tham chiếu dropdown state ---
  const [refOpts, setRefOpts] = useState<Array<{ value: string; label: string }>>([]);
  const [refQuery, setRefQuery] = useState<string>("");
  const [refLoading, setRefLoading] = useState(false);

  const fetchList = async () => {
    try {
      setLoading(true);
      const qs:any = { page, per_page: perPage };
      if (q) qs.q = q;
      if (from) qs.from = from;
      if (to) qs.to = to;
      if (lyDo) qs.ly_do = lyDo;
      const res = await vtIssueList(qs);
      const data = res?.data || {};
      setRows(data.collection || []);
      setTotal(data.total || 0);
    } catch (e:any) { message.error(e.message || "Lỗi tải danh sách"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [page, perPage, from, to, lyDo]);

  const resetModal = () => {
    setEditing(null); setItems([]); form.resetFields();
    form.setFieldsValue({ ngay_ct: dayjs(), ly_do: "KHAC" });
    setRefQuery("");
    setRefOpts([]);
  };

  const openCreate = () => { resetModal(); setOpen(true); };
  const openEdit = (r: Issue) => {
    setEditing(r);
    form.setFieldsValue({
      so_ct: r.so_ct,
      ngay_ct: dayjs(r.ngay_ct),
      ly_do: r.ly_do,
      tham_chieu: r.tham_chieu || undefined,
      ghi_chu: r.ghi_chu
    });
    setItems(r.items.map((it, idx) => ({ vt_item_id: it.vt_item_id, so_luong: it.so_luong, _key: `e${idx}` })));
    // đảm bảo option hiện hữu để hiển thị giá trị cũ
    if (r.tham_chieu) {
      setRefOpts((prev) => {
        const exists = prev.some(o => o.value === r.tham_chieu);
        return exists ? prev : [{ value: r.tham_chieu!, label: r.tham_chieu! }, ...prev];
      });
    }
    setOpen(true);
  };

  const openClone = (r: Issue) => {
    // MỞ MODAL TẠO MỚI nhưng prefill từ phiếu gốc
    setEditing(null);            // quan trọng: submit sang nhánh CREATE
    form.resetFields();

    form.setFieldsValue({
      // KHÔNG set so_ct → BE tự sinh số CT mới
      ngay_ct: dayjs(r.ngay_ct),          // muốn ngày hiện tại thì dùng dayjs()
      ly_do: r.ly_do,
      tham_chieu: r.tham_chieu || undefined,
      ghi_chu: r.ghi_chu || undefined,
    } as any);

    setItems((r.items || []).map((it, idx) => ({
      vt_item_id: it.vt_item_id,
      so_luong: it.so_luong,
      ghi_chu: undefined,
      _key: `clone-${idx}-${Date.now()}`,
    })));

    // đảm bảo Select “Tham chiếu” hiển thị được nhãn cũ nếu có
    if (r.tham_chieu) {
      setRefOpts((prev) => {
        const exists = prev.some(o => o.value === r.tham_chieu);
        return exists ? prev : [{ value: r.tham_chieu!, label: r.tham_chieu! }, ...prev];
      });
    }

    setOpen(true);
  };

  const removeRow = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));
  const addRow = () => setItems((arr) => [...arr, { vt_item_id: 0, so_luong: 1, _key: Math.random().toString(36).slice(2) }]);

  const submit = async () => {
    try {
const v = await form.validateFields();

// làm sạch số an toàn (bỏ mọi ký tự không phải 0-9.-)
const toNum = (val: any) => {
  if (val === null || val === undefined) return undefined;
  const n = Number(String(val).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const payload = {
  so_ct: v.so_ct || undefined, // service sẽ tự omit khi create
  ngay_ct: v.ngay_ct?.format("YYYY-MM-DD"),
  ly_do: v.ly_do,
  tham_chieu: v.tham_chieu || undefined,
  ghi_chu: v.ghi_chu || undefined,
  items: items.map(r => {
    const id = toNum(r.vt_item_id);
    const sl = toNum(r.so_luong);
    return {
      vt_item_id: id as number,
      so_luong:   sl as number,
      ghi_chu:    r.ghi_chu || undefined,
    };
  }),
};

// Guard: bắt lỗi thiếu VT/SL trước khi gọi API
const bad = payload.items.find(it => !Number.isFinite(it.vt_item_id) || !Number.isFinite(it.so_luong));
if (bad) { message.error("Dòng vật tư không hợp lệ: thiếu Vật tư hoặc Số lượng"); return; }

      if (!payload.items.length) { message.warning("Thêm ít nhất 1 dòng"); return; }
      if (editing) await vtIssueUpdate(editing.id, payload);
      else await vtIssueCreate(payload);
      message.success(editing ? "Đã cập nhật phiếu xuất" : "Đã tạo phiếu xuất");
      setOpen(false); fetchList();
} catch (e: any) {
  const msg = e?.response?.data?.message || e?.message || "Không thể lưu phiếu xuất";
  const errs = e?.response?.data?.errors;
  console.error("[VT Issues][PUT/POST] error", { msg, errs });
  message.error(msg);
}

  };

  // VtIssuesPage.tsx
  // VtIssuesPage.tsx
const del = (r: Issue) => {
  Modal.confirm({
    title: `Xóa phiếu xuất ${r.so_ct}?`,
    content: "Thao tác này không thể hoàn tác.",
    okText: "Xóa",
    cancelText: "Hủy",
    okType: "danger",
    centered: true,
    onOk: () => (async () => {
      try {
        await vtIssueDelete(r.id);
        message.success(`Đã xóa phiếu xuất ${r.so_ct}`);
      } catch (e:any) {
        const status = e?.status ?? e?.response?.status;
        if (status === 404) message.info(`Phiếu ${r.so_ct} đã bị xóa trước đó`);
        else { message.error(e?.message || "Xóa phiếu xuất thất bại"); throw e; }
      }
      setRows(prev => prev.filter(x => x.id !== r.id));
      await fetchList();
    })(),
  });
};


  // Tải options “Tham chiếu” theo lý do & từ khóa
  const reloadRefOptions = async () => {
    try {
      setRefLoading(true);
      const res = await vtRefOptions({ ly_do: form.getFieldValue("ly_do"), q: refQuery, limit: 50 });
      const data = res?.data || [];
      setRefOpts(data.map((d:any) => ({ value: d.value, label: d.label })));
    } catch (e:any) {
      message.error(e.message || "Lỗi tải tham chiếu");
    } finally {
      setRefLoading(false);
    }
  };

  // Khi mở modal, đổi lý do, hoặc đổi từ khóa → reload options
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { reloadRefOptions(); }, 250); // debounce nhẹ khi gõ
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refQuery, form.getFieldValue("ly_do")]);

  // ===== helper format VND cho cột giá trị (hiển thị) =====
  const fmtVND = (n: number | null | undefined) =>
    n !== null && n !== undefined ? `${new Intl.NumberFormat("vi-VN").format(Number(n))} ₫` : "-";

  const columns: ColumnsType<Issue> = useMemo(() => [
    { title: "Số chứng từ", dataIndex: "so_ct", width: 150, fixed: "left" },
    { title: "Ngày", dataIndex: "ngay_ct", width: 120, render: (v) => dayjs(v).format("DD/MM/YYYY") },
    { title: "Lý do", dataIndex: "ly_do", width: 120, render: (v) => <Tag>{v}</Tag> },
    { title: "SL", dataIndex: "tong_so_luong", width: 90 },

    // ⬇️ Thay cột “Giá trị” cũ bằng 2 cột rõ ràng:
    {
      title: "Giá trị Tài sản",
      key: "gia_tri_asset",
      width: 160,
      // BE đã tính sẵn ở header: tong_gia_tri chỉ phản ánh ASSET
      render: (_: any, r: Issue) => fmtVND(r.tong_gia_tri),
    },
    {
      title: "Giá trị Tiêu hao",
      key: "gia_tri_tieuhao",
      width: 160,
      // Chưa có đơn giá theo dòng CONSUMABLE ở API xuất → hiển thị "-"
      render: () => "-",
    },

    { title: "Ghi chú", dataIndex: "ghi_chu" },
{
  title: "Thao tác",
  key: "x",
  width: 280,
  fixed: "right",
  render: (_: any, r: Issue) => (
    <Space>
      <Button size="small" onClick={() => openEdit(r)}>Sửa</Button>
      <Button size="small" onClick={() => openClone(r)}>Thêm bản sao</Button>

      <Popconfirm
        title={`Xóa phiếu xuất ${r.so_ct}?`}
        description="Thao tác này không thể hoàn tác."
        okText="Xóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        placement="left"
        onConfirm={async () => {
          try {
            await vtIssueDelete(r.id);                       // DELETE
            message.success(`Đã xóa phiếu xuất ${r.so_ct}`);
          } catch (e: any) {
            const status = e?.status ?? e?.response?.status; // http() đã gắn .status
            if (status === 404) {
              // Idempotent: coi như đã xóa
              message.info(`Phiếu ${r.so_ct} đã bị xóa trước đó`);
            } else {
              message.error(e?.message || "Xóa phiếu xuất thất bại");
              return; // không dọn UI nếu lỗi khác
            }
          }
          // Dọn UI cho cả 200 và 404
          setRows(prev => prev.filter((x:any) => x.id !== r.id));
          await fetchList();
        }}
      >
        <Button size="small" danger>Xóa</Button>
      </Popconfirm>
    </Space>
  ),
}

  ],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  return (
    <Card
      title="Phiếu xuất vật tư"
      extra={
        <Space>
          <Input.Search placeholder="Tìm số chứng từ/ghi chú…" allowClear onSearch={setQ as any} style={{ width: 260 }} />
          <Select
            placeholder="Lý do"
            allowClear
            style={{ width: 160 }}
            value={lyDo}
            onChange={(v) => { setLyDo(v as any); setPage(1); }}
            options={[
              { label: "Bán", value: "BAN" },
              { label: "Hủy", value: "HUY" },
              { label: "Chuyển", value: "CHUYEN" },
              { label: "Khác", value: "KHAC" }
            ]}
          />
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
        scroll={{ x: 1100 }}
        pagination={{ current: page, pageSize: perPage, total, onChange: (p, s) => { setPage(p); setPerPage(s); } }}
      />

      <Modal
        title={editing ? `Sửa phiếu: ${editing.so_ct}` : "Thêm phiếu xuất VT"}
        open={open} onCancel={() => setOpen(false)} onOk={submit} width={900} destroyOnClose
      >
        <Form layout="vertical" form={form} preserve={false}>
          <Space.Compact style={{ width: "100%", marginBottom: 12 }}>
            <Form.Item name="so_ct" label="Số chứng từ" style={{ width: 220 }}>
              <Input placeholder="(tự sinh)" disabled />
            </Form.Item>
            <Form.Item name="ngay_ct" label="Ngày CT" rules={[{ required: true, message: "Chọn ngày" }]} style={{ width: 200 }}>
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="ly_do" label="Lý do" rules={[{ required: true, message: "Chọn lý do" }]} style={{ width: 160 }}>
              <Select options={[
                { label: "Bán", value: "BAN" },
                { label: "Hủy", value: "HUY" },
                { label: "Chuyển", value: "CHUYEN" },
                { label: "Khác", value: "KHAC" }
              ]}/>
            </Form.Item>
            <Form.Item name="tham_chieu" label="Tham chiếu" style={{ flex: 1 }}>
              <Select
                showSearch
                allowClear
                placeholder="Tìm & chọn tham chiếu"
                options={refOpts}
                loading={refLoading}
                onSearch={(val) => setRefQuery(val || "")}
                filterOption={false} // server search
              />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="ghi_chu" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Card size="small" title="Danh sách vật tư" extra={<Button onClick={addRow}>+ Thêm dòng</Button>}>
            {items.map((it, idx) => (
              <IssueRowEditor key={it._key || idx.toString()} row={it} onChange={(r) => {
                setItems((arr) => arr.map((x, i) => (i === idx ? r : x)));
              }} onRemove={() => removeRow(idx)} />
            ))}
            {!items.length && <Tag>Chưa có dòng</Tag>}
          </Card>
        </Form>
      </Modal>
    </Card>
  );
}

function IssueRowEditor({ row, onChange, onRemove }: { row: ItemRow; onChange: (r: ItemRow) => void; onRemove: () => void; }) {
  const [opts, setOpts] = useState<any[]>([]);
useEffect(() => {
  (async () => {
    const raw = (await vtItemOptions())?.data || [];
    // Chuẩn hoá: value = number; loại option không parse được
    const opts = raw
      .map((o: any) => ({ value: Number(o.value), label: String(o.label ?? o.text ?? "") }))
      .filter((o: any) => Number.isFinite(o.value));
    setOpts(opts);
  })();
}, []);

  return (
    <Space align="start" style={{ display: "flex", marginBottom: 8 }}>
      <Select
        style={{ width: 360 }}
        placeholder="Chọn vật tư"
        showSearch
        value={row.vt_item_id || undefined}
        onChange={(v) => onChange({ ...row, vt_item_id: Number(v) })}
        options={opts}
          optionFilterProp="label"
        filterOption={(input, option) => (option?.label as string)?.toLowerCase()?.includes(input.toLowerCase())}
      />
      <InputNumber min={1} value={row.so_luong} onChange={(v) => onChange({ ...row, so_luong: Number(v || 1) })} addonAfter="SL" />
      <Input placeholder="Ghi chú" style={{ width: 240 }} value={row.ghi_chu || ""} onChange={(e) => onChange({ ...row, ghi_chu: e.target.value })} />
      <Button danger onClick={onRemove}>Xóa</Button>
    </Space>
  );
}
