/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Space, Table, Tag, message, Select, InputNumber, Row, Col, Popconfirm } from "antd";
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
      vt_item_id: it.vt_item_id,
      so_luong:  it.so_luong,
      // don_gia có thể là string từ API → ép về number; nếu null/undefined thì để null
      don_gia:   (it.don_gia === null || it.don_gia === undefined) ? null : Number(it.don_gia),
      _key:      `e${idx}`,
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

// làm sạch số an toàn (bỏ mọi ký tự không phải 0-9.-)
const toNum = (val: any) => {
  if (val === null || val === undefined) return undefined;
  const n = Number(String(val).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const payload = {
  so_ct: v.so_ct || undefined, // service sẽ tự omit khi create
  ngay_ct: v.ngay_ct?.format("YYYY-MM-DD"),
  tham_chieu: v.tham_chieu || undefined,
  ghi_chu: v.ghi_chu || undefined,
  items: items.map(r => {
    const id = toNum(r.vt_item_id);
    const sl = toNum(r.so_luong);
    const dg = r.don_gia === null || r.don_gia === undefined ? null : toNum(r.don_gia);
    return {
      vt_item_id: id as number,
      so_luong:   sl as number,
      don_gia:    dg === undefined ? null : (dg as number),
      ghi_chu:    r.ghi_chu || undefined,
    };
  }),
};

// Guard: bắt lỗi thiếu VT/SL trước khi gọi API
const bad = payload.items.find(it => !Number.isFinite(it.vt_item_id) || !Number.isFinite(it.so_luong));
if (bad) { message.error("Dòng vật tư không hợp lệ: thiếu Vật tư hoặc Số lượng"); return; }

      if (!payload.items.length) { message.warning("Thêm ít nhất 1 dòng vật tư"); return; }
      if (editing) await vtReceiptUpdate(editing.id, payload);
      else await vtReceiptCreate(payload);
      message.success(editing ? "Đã cập nhật phiếu nhập" : "Đã tạo phiếu nhập");
      setOpen(false);
      fetchList();
} catch (e: any) {
  const msg = e?.response?.data?.message || e?.message || "Không thể lưu phiếu nhập";
  const errs = e?.response?.data?.errors;
  console.error("[VT Receipts][PUT/POST] error", { msg, errs });
  message.error(msg);
}

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
    // ⚠️ PHẢI return Promise để AntD chờ và hiển thị loading
    onOk: () => (async () => {
      try {
        await vtReceiptDelete(r.id);                 // DELETE
        message.success(`Đã xóa phiếu nhập ${r.so_ct}`);
      } catch (e: any) {
        const status = e?.status ?? e?.response?.status; // http() đã gắn .status
        if (status === 404) {
          // Idempotent: coi như đã xóa
          message.info(`Phiếu ${r.so_ct} đã bị xóa trước đó`);
        } else {
          message.error(e?.message || "Xóa phiếu nhập thất bại");
          throw e; // rethrow để modal dừng loading, tránh “đơ”
        }
      }
      // Cập nhật UI cho cả 200 và 404
      setRows(prev => prev.filter(x => x.id !== r.id));
      await fetchList();
    })(),
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

  // ==== helpers cho cột giá trị (tính tại FE để hiển thị) ====
  const fmtVND = (n: number | null | undefined) =>
    n !== null && n !== undefined ? `${new Intl.NumberFormat("vi-VN").format(Number(n))} ₫` : "-";

  const calcAssetValue = (r: Receipt) =>
    (r.items || []).reduce((sum, it) => {
      if (it?.item?.loai === "ASSET") {
        const sl = Number(it.so_luong || 0);
        const dg = it.don_gia == null ? 0 : Number(it.don_gia);
        return sum + sl * dg;
      }
      return sum;
    }, 0);

  const calcConsumableValue = (r: Receipt) =>
    (r.items || []).reduce((sum, it) => {
      if (it?.item?.loai === "CONSUMABLE") {
        const sl = Number(it.so_luong || 0);
        const dg = it.don_gia == null ? 0 : Number(it.don_gia);
        return sum + sl * dg;
      }
      return sum;
    }, 0);

  const columns: ColumnsType<Receipt> = useMemo(() => [
    { title: "Số chứng từ", dataIndex: "so_ct", width: 150, fixed: "left" },
    { title: "Ngày", dataIndex: "ngay_ct", width: 120, render: (v) => dayjs(v).format("DD/MM/YYYY") },
    { title: "SL", dataIndex: "tong_so_luong", width: 90 },

    // Giá trị Tài sản = ∑ (SL * đơn_giá) của các dòng ASSET (tính tại FE, chỉ để hiển thị)
    {
      title: "Giá trị Tài sản",
      key: "gia_tri_asset",
      width: 160,
      render: (_: any, r: Receipt) => fmtVND(calcAssetValue(r)),
    },
    // Giá trị Tiêu hao = ∑ (SL * đơn_giá) của các dòng CONSUMABLE (tính tại FE, chỉ để hiển thị)
    {
      title: "Giá trị Tiêu hao",
      key: "gia_tri_tieuhao",
      width: 160,
      render: (_: any, r: Receipt) => fmtVND(calcConsumableValue(r)),
    },

    { title: "Ghi chú", dataIndex: "ghi_chu" },
{
  title: "Thao tác",
  key: "x",
  width: 280,
  fixed: "right",
  render: (_: any, r) => (
    <Space>
      <Button size="small" onClick={() => openEdit(r)}>Sửa</Button>
      <Button size="small" onClick={() => openClone(r)}>Thêm bản sao</Button>

      {/* ❌ BỎ Modal.confirm —> ✅ Dùng Popconfirm gọn & chắc */}
      <Popconfirm
        title={`Xóa phiếu nhập ${r.so_ct}?`}
        description="Thao tác này không thể hoàn tác."
        okText="Xóa"
        cancelText="Hủy"
        okType="danger"
        placement="left"
        onConfirm={async () => {
          try {
            await vtReceiptDelete(r.id);                     // DELETE
            message.success(`Đã xóa phiếu nhập ${r.so_ct}`);
          } catch (e: any) {
            const status = e?.status ?? e?.response?.status; // http() đã gắn .status
            if (status === 404) {
              // Idempotent: coi như đã xóa
              message.info(`Phiếu ${r.so_ct} đã bị xóa trước đó`);
            } else {
              message.error(e?.message || "Xóa phiếu nhập thất bại");
              return; // đừng dọn UI nếu lỗi khác
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


  ], []); // eslint-disable-line react-hooks/exhaustive-deps

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
        scroll={{ x: 1100 }}
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
  const raw = (await vtItemOptions())?.data || [];
  // Chuẩn hoá: value = number; loại option không parse được
  const opts = raw
    .map((o: any) => ({ value: Number(o.value), label: String(o.label ?? o.text ?? "") }))
    .filter((o: any) => Number.isFinite(o.value));
  setOpts(opts);
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
               optionFilterProp="label"
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
          {/* Việt hoá label */}
          <Form.Item label="Đơn giá (Tài sản)" style={{ marginBottom: 8 }}>
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              placeholder="Nhập đơn giá"
              // hiển thị rỗng nếu null/undefined
              value={row.don_gia === null || row.don_gia === undefined ? undefined : Number(row.don_gia)}
              onChange={(v) => onChange({ ...row, don_gia: v === null || v === undefined ? null : Number(v) })}
              formatter={(value) =>
                value === null || value === undefined
                  ? ""
                  : new Intl.NumberFormat("vi-VN").format(Number(value))
              }
              // ⬇️ Quan trọng: trả về undefined nếu người dùng xóa sạch, tránh bị thành 0
              parser={(displayValue) => {
                const s = (displayValue ?? "").replace(/[^\d]/g, "");
                return s ? Number(s) : (undefined as any);
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
