/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  InputNumber,
   Popconfirm,
  Modal,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import cashApi, {
  type BalanceRow,
  type CashAccountOption,
  type LedgerEntry,
  type Transfer,
} from "../../services/cash.api";
import AuditTab from "./components/AuditTab";
import usePermission from "../../hooks/usePermission";
import { useLocation } from "react-router-dom";



const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function CashflowPage() {
const [active, setActive] = useState<"overview" | "ledger" | "transfer" | "accounts" | "audit">("overview");

const permAudit = usePermission("/kiem-toan");    // module RBAC “Kiểm toán”
const canViewAudit = !!permAudit?.index;


const loc = useLocation();

const isAuditPath = loc.pathname.includes("/cashflow/audit");

useEffect(() => {
  if (isAuditPath) setActive("audit");
}, [isAuditPath]);



  return (
    <Card title="Quản lý dòng tiền">
      <Tabs
        activeKey={active}
        onChange={(k) => setActive(k as any)}
        items={[
          { key: "overview", label: "Tổng quan", children: <OverviewTab /> },
          { key: "ledger", label: "Giao dịch", children: <LedgerTab /> },
          { key: "transfer", label: "Chuyển nội bộ", children: <TransferTab /> },
          { key: "accounts", label: "Thông tin tài khoản", children: <AccountsTab /> },
          // ⬇️ Thêm tab Tra soát lỗi — chỉ render khi có quyền
...((isAuditPath || canViewAudit)
  ? [{ key: "audit", label: "Kiểm toán", children: <AuditTab /> }]
  : []),

        ]}
      />
    </Card>
  );
}

/* ---------------- Tổng quan (Balances Summary) ---------------- */
function OverviewTab() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  const params = useMemo(
    () => ({
      from: range?.[0]?.format("YYYY-MM-DD"),
      to: range?.[1]?.format("YYYY-MM-DD"),
    }),
    [range]
  );

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await cashApi.getCashBalanceSummary(params);
      setRows((res.data as any) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.from, params.to]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space wrap>
        <RangePicker value={range} onChange={(v) => v && setRange([v[0]!, v[1]!])} />
        <Button onClick={fetch} loading={loading}>
          Làm mới
        </Button>
      </Space>

      <Row gutter={[12, 12]}>
        {rows.map((r) => (
          <Col key={r.tai_khoan_id} xs={24} sm={12} lg={8} xl={6}>
            <Card size="small" title={r.label || r.ten_tk}>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", rowGap: 6 }}>
                <Text type="secondary">Đầu kỳ</Text>
                <Text>{fmt(r.opening)}</Text>
                <Text type="secondary">Vào</Text>
                <Text>{fmt(r.in)}</Text>
                <Text type="secondary">Ra</Text>
                <Text>{fmt(r.out)}</Text>
                <Text strong>Cuối kỳ</Text>
                <Text strong>{fmt(r.ending)}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}

/* ---------------- Giao dịch (Ledger) ---------------- */
function LedgerTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(25);
  const [options, setOptions] = useState<CashAccountOption[]>([]);

  const loadOptions = async () => {
    const r = await cashApi.getCashAccountOptions({ active: 1 });
    setOptions(r.data || []);
  };

  const fetch = async (p = page, size = per) => {
    setLoading(true);
    try {
      const v = form.getFieldsValue();
      const range = v.range as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
      const res = await cashApi.listCashLedger({
        tai_khoan_id: v.tai_khoan_id,
        keyword: v.keyword,
        ref_type: v.ref_type,
        from: range?.[0]?.format("YYYY-MM-DD"),
        to: range?.[1]?.format("YYYY-MM-DD"),
        page: p,
        per_page: size,
      });
      setRows(res.data.collection || []);
      setTotal(res.data.total || 0);
      setPage(p);
      setPer(size);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
    fetch(1, per);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<LedgerEntry> = [
    { title: "Thời điểm", dataIndex: "ngay_ct", key: "ngay_ct", render: (v) => dayjs(v).format("DD/MM/YYYY HH:mm") },
    {
      title: "Tài khoản",
      dataIndex: ["tai_khoan", "ten_tk"],
      key: "tk",
      render: (_, r) => r.tai_khoan?.ten_tk ?? r.tai_khoan_id,
    },
{
  title: "Loại",
  dataIndex: "ref_type",
  key: "ref_type",
  render: (v) => {
    const mapLabel: Record<string, { text: string; color: string }> = {
      phieu_thu:     { text: "phiếu thu",     color: "green"  },
      phieu_chi:     { text: "phiếu chi",     color: "red"    },
      chuyen_noi_bo: { text: "chuyển nội bộ", color: "blue"   },
      phi_chuyen:    { text: "phí chuyển",    color: "gold"   },
    };
    const m = mapLabel[v] ?? { text: v, color: "default" };
    return <Tag color={m.color as any}>{m.text}</Tag>;
  },
},

    { title: "Mã tham chiếu", dataIndex: "ref_code", key: "ref_code" },
    { title: "Mô tả", dataIndex: "mo_ta", key: "mo_ta" },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (v) => <Text type={v >= 0 ? "success" : "danger"}>{fmt(v)}</Text>,
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Form form={form} layout="inline" onFinish={() => fetch(1, per)} initialValues={{}}>
        <Form.Item name="tai_khoan_id" label="Tài khoản">
          <Select style={{ minWidth: 220 }} allowClear options={options} placeholder="Chọn tài khoản" />
        </Form.Item>
        <Form.Item name="ref_type" label="Loại">
          <Select
            style={{ minWidth: 160 }}
            allowClear
            options={[
              { value: "phieu_thu", label: "Phiếu thu" },
              { value: "phieu_chi", label: "Phiếu chi" },
              { value: "chuyen_noi_bo", label: "Chuyển nội bộ" },
              { value: "phi_chuyen", label: "Phí chuyển" },
            ]}
          />
        </Form.Item>
        <Form.Item name="keyword" label="Từ khóa">
          <Input placeholder="Mã tham chiếu / mô tả" allowClear />
        </Form.Item>
        <Form.Item name="range" label="Khoảng ngày">
          <RangePicker />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Lọc
          </Button>
        </Form.Item>
        <Button
          onClick={() => {
            form.resetFields();
            fetch(1, per);
          }}
        >
          Xóa lọc
        </Button>
      </Form>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize: per,
          total,
          onChange: (p, s) => fetch(p, s),
          showSizeChanger: true,
        }}
      />
    </Space>
  );
}

/* ---------------- Chuyển nội bộ (list + Tạo/POST) ---------------- */
function TransferTab() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Transfer[]>([]);
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(25);
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  // ⬇️ State + form cho Modal Tạo chuyển (ĐÚNG CHỖ)
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [accOpts, setAccOpts] = useState<CashAccountOption[]>([]);
  const [formCreate] = Form.useForm();

  // Watch realtime các field của modal (để điều khiển nút OK)
const wTu   = Form.useWatch("tu_tai_khoan_id", formCreate);
const wDen  = Form.useWatch("den_tai_khoan_id", formCreate);
const wNgay = Form.useWatch("ngay_ct", formCreate);
const wSo   = Form.useWatch("so_tien", formCreate);


  // Loading theo từng phiếu khi Post/Unpost
const [posting, setPosting] = useState<Set<number>>(new Set());
const [unposting, setUnposting] = useState<Set<number>>(new Set());



// Loading theo từng phiếu khi Delete
const [deleting, setDeleting] = useState<Set<number>>(new Set());

const handleDelete = async (id: number) => {
  setDeleting(prev => new Set(prev).add(id));
  try {
    await cashApi.deleteTransfer(id);
    await fetch(1, per);
  } finally {
    setDeleting(prev => { const nxt = new Set(prev); nxt.delete(id); return nxt; });
  }
};


// Helper chống treo mạng (timeout 15s)
const withTimeout = <T,>(p: Promise<T>, ms = 15000): Promise<T> =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("Timeout quá 15s")), ms);
    p.then((v) => { clearTimeout(t); res(v); })
     .catch((e) => { clearTimeout(t); rej(e); });
  });




  const fetch = async (p = page, size = per) => {
    setLoading(true);
    try {
      const res = await cashApi.listTransfers({
        from: range?.[0]?.format("YYYY-MM-DD"),
        to: range?.[1]?.format("YYYY-MM-DD"),
        page: p,
        per_page: size,
      });
      setRows(res.data.collection || []);
      setPage(p);
      setPer(size);
    } finally {
      setLoading(false);
    }
  };

const handlePost = async (id: number) => {
  setPosting(prev => new Set(prev).add(id));
  try {
    await cashApi.postTransfer(id);
    await fetch(1, per);
  } finally {
    setPosting(prev => {
      const nxt = new Set(prev); nxt.delete(id); return nxt;
    });
  }
};

const handleUnpost = async (id: number) => {
  setUnposting(prev => new Set(prev).add(id));
  try {
    await cashApi.unpostTransfer(id);
    await fetch(1, per);
  } finally {
    setUnposting(prev => {
      const nxt = new Set(prev); nxt.delete(id); return nxt;
    });
  }
};



  useEffect(() => {
    fetch(1, per);
    cashApi.getCashAccountOptions({ active: 1 }).then((r) => setAccOpts(r.data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);


const actionCol: ColumnsType<Transfer>[number] = {
  title: "Hành động",
  key: "actions",
  fixed: "right",
  width: 160,
  render: (_: any, r: Transfer) => {
    if (r.trang_thai === "draft") {
      const loadingPost = posting.has(r.id);
const loadingDel  = deleting.has(r.id);
return (
  <Space size={6}>
    <Button type="primary" size="small" loading={loadingPost} onClick={() => handlePost(r.id)}>
      Ghi sổ
    </Button>
    <Popconfirm
      title="Xóa phiếu chuyển nội bộ này?"
      description="Chỉ xóa được khi đang ở trạng thái NHÁP."
      okText="Xóa"
      cancelText="Đóng"
      onConfirm={() => handleDelete(r.id)}
    >
      <Button danger size="small" loading={loadingDel}>
        Xóa
      </Button>
    </Popconfirm>
  </Space>
);

    }
    if (r.trang_thai === "posted") {
      const loadingThis = unposting.has(r.id);
      return (
<Popconfirm
  title="Hủy ghi sổ phiếu này?"
  okText="Hủy ghi sổ"
  cancelText="Đóng"
  onConfirm={() => handleUnpost(r.id)}
>
  <Button danger size="small" loading={loadingThis}>
    Hủy ghi sổ
  </Button>
</Popconfirm>

      );
    }
    // locked hoặc trạng thái khác
    return <Button size="small" disabled>Đã khóa</Button>;
  },
};



  const columns: ColumnsType<Transfer> = [
    { title: "Ngày CT", dataIndex: "ngay_ct", key: "ngay_ct", render: (v) => dayjs(v).format("DD/MM/YYYY") },
    { title: "Mã phiếu", dataIndex: "ma_phieu", key: "ma_phieu" },
    { title: "Từ TK", dataIndex: "tu_tk_ten", key: "tu_tk_ten" },
    { title: "Đến TK", dataIndex: "den_tk_ten", key: "den_tk_ten" },
    { title: "Số tiền", dataIndex: "so_tien", key: "so_tien", align: "right", render: (v) => fmt(v) },
    { title: "Phí", dataIndex: "phi_chuyen", key: "phi_chuyen", align: "right", render: (v) => fmt(v) },
    {
  title: "Trạng thái",
  dataIndex: "trang_thai",
  key: "trang_thai",
  render: (v) => {
    const map: Record<string, { label: string; color: "default" | "blue" | "purple" | "gold" }> = {
      draft:  { label: "nháp",       color: "default" },
      posted: { label: "đã ghi sổ",  color: "blue" },
      locked: { label: "đã khóa",    color: "purple" },
    };
    const m = map[v] || { label: v, color: "default" as const };
    return <Tag color={m.color}>{m.label}</Tag>;
  },
},

    actionCol,
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space wrap>
        <RangePicker value={range} onChange={(v) => v && setRange([v[0]!, v[1]!])} />
        <Button onClick={() => fetch(1, per)} loading={loading}>
          Làm mới
        </Button>
        {/* Nút tạo chuyển */}
<Button
  type="primary"
  onClick={() => {
    formCreate.resetFields();
    const src = accOpts?.[0]?.value;
    const dest = (accOpts || []).find(o => o.value !== src)?.value;
    formCreate.setFieldsValue({
      ngay_ct: dayjs(),
      so_tien: 0,
      phi_chuyen: 0,
      tu_tai_khoan_id: src,
      den_tai_khoan_id: dest,
    });
    setOpenCreate(true);
  }}
>
  Tạo chuyển
</Button>

      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize: per,
          total: rows?.length || 0,
          onChange: (p, s) => fetch(p, s),
          showSizeChanger: true,
        }}
      />

      {/* Modal tạo chuyển nội bộ */}
<Modal
  title="Tạo chuyển nội bộ"
  open={openCreate}
  onCancel={() => setOpenCreate(false)}
  onOk={() => formCreate.submit()}
  okText="Lưu & Ghi sổ"
okButtonProps={{
  disabled:
    creating ||
    !wTu || !wDen || wTu === wDen ||
    !wNgay ||
    !wSo || Number(wSo) <= 0,
}}

  confirmLoading={creating}
  destroyOnClose
>
  <Form
    form={formCreate}
    layout="vertical"
    onFinish={async (vals) => {
      // Validate client trước
      if (!vals.tu_tai_khoan_id || !vals.den_tai_khoan_id) return;
      if (vals.tu_tai_khoan_id === vals.den_tai_khoan_id) {
        Modal.warning({ title: "Tài khoản nguồn/đích không được trùng nhau" });
        return;
      }
      if (!vals.so_tien || vals.so_tien <= 0) {
        Modal.warning({ title: "Số tiền phải > 0" });
        return;
      }

      setCreating(true);
      try {
        const payload = {
          ngay_ct: (vals.ngay_ct as dayjs.Dayjs).format("YYYY-MM-DD"),
          tu_tai_khoan_id: vals.tu_tai_khoan_id,
          den_tai_khoan_id: vals.den_tai_khoan_id,
          so_tien: Number(vals.so_tien),
          phi_chuyen: Number(vals.phi_chuyen || 0),
          noi_dung: vals.noi_dung || "",
        };

        const r1 = await withTimeout(cashApi.createTransfer(payload), 15000); // tạo draft
        const id = (r1.data as any)?.id;
        if (!id) throw new Error("Không lấy được ID phiếu chuyển");

        await withTimeout(cashApi.postTransfer(id), 15000);                  // ghi sổ

        setOpenCreate(false);
        await fetch(1, per);                                                 // refresh list
      } catch (e: any) {
        console.error("Create/Post transfer error:", e);
        const msg = e?.response?.data?.message || e?.message || "Lỗi không xác định";
        Modal.error({ title: "Không thể tạo/post phiếu", content: String(msg) });
      } finally {
        setCreating(false);                                                  // luôn trả nút về bình thường
      }
    }}
  >
    <Form.Item name="ngay_ct" label="Ngày chứng từ" rules={[{ required: true, message: "Chọn ngày chứng từ" }]}>
      <DatePicker style={{ width: "100%" }} />
    </Form.Item>

    <Row gutter={12}>
      <Col span={12}>
        <Form.Item name="tu_tai_khoan_id" label="Từ tài khoản" rules={[{ required: true }]}>
          <Select
            placeholder="Chọn tài khoản nguồn"
            options={accOpts}
            style={{ width: "100%" }}
            onChange={(v) => {
              const den = formCreate.getFieldValue("den_tai_khoan_id");
              if (den && den === v) formCreate.setFieldsValue({ den_tai_khoan_id: undefined });
            }}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="den_tai_khoan_id" label="Đến tài khoản" rules={[{ required: true }]}>
<Select
  placeholder="Chọn tài khoản đích"
  options={accOpts.filter(o => o.value !== wTu)}
  style={{ width: "100%" }}
  filterOption={(input, option) =>
    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
  }
/>

        </Form.Item>
      </Col>
    </Row>

    <Row gutter={12}>
      <Col span={12}>
        <Form.Item name="so_tien" label="Số tiền" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="phi_chuyen" label="Phí chuyển">
          <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ" />
        </Form.Item>
      </Col>
    </Row>

    <Form.Item name="noi_dung" label="Nội dung">
      <Input placeholder="Ghi chú (tuỳ chọn)" />
    </Form.Item>
  </Form>
</Modal>

    </Space>
  );
}

/* ---------------- Tài khoản & Alias (đọc-only rút gọn) ---------------- */
function AccountsTab() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [aliases, setAliases] = useState<any[]>([]);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingL, setLoadingL] = useState(false);
  const [accId, setAccId] = useState<number | undefined>(undefined);

  const loadAccounts = async () => {
    setLoadingA(true);
    try {
      const res = await cashApi.listCashAccounts({ active: 1 });
      setAccounts(res.data.collection || []);
    } finally {
      setLoadingA(false);
    }
  };

  const loadAliases = async (tai_khoan_id?: number) => {
    setLoadingL(true);
    try {
      const res = await cashApi.listCashAliases({ tai_khoan_id, active: 1 });
      setAliases(res.data.collection || []);
    } finally {
      setLoadingL(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    loadAliases(accId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accId]);

  const colA: ColumnsType<any> = [
    { title: "Tên TK", dataIndex: "ten_tk", key: "ten_tk" },
    { title: "Loại", dataIndex: "loai", key: "loai" },
    { title: "Ngân hàng", dataIndex: "ngan_hang", key: "ngan_hang" },
    { title: "Số TK", dataIndex: "so_tai_khoan", key: "so_tai_khoan" },
    { title: "Hoạt động", dataIndex: "is_active", key: "is_active", render: (v) => <Tag color={v ? "green" : "red"}>{v ? "Active" : "Inactive"}</Tag> },
  ];
  const colL: ColumnsType<any> = [
    {
      title: "TK",
      dataIndex: ["tai_khoan", "ten_tk"],
      key: "tk",
      render: (_, r) => r?.tai_khoan?.ten_tk ?? r?.tai_khoan_id,
    },
    { title: "Tên ngân hàng", dataIndex: "pattern_bank", key: "pattern_bank" },
    { title: "Số tài khoản", dataIndex: "pattern_account", key: "pattern_account" },
    { title: "Tên tham chiếu", dataIndex: "pattern_note", key: "pattern_note" },
    { title: "Hoạt động", dataIndex: "is_active", key: "is_active", render: (v) => <Tag color={v ? "green" : "red"}>{v ? "Active" : "Inactive"}</Tag> },
  ];

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={10}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text strong>Tài khoản tiền</Text>
          <Table rowKey="id" loading={loadingA} columns={colA} dataSource={accounts} pagination={false} size="small" />
        </Space>
      </Col>
      <Col xs={24} lg={14}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space wrap>
            <Text strong> Tài khoản</Text>
            <Select
              allowClear
              placeholder="Lọc theo tài khoản"
              style={{ minWidth: 240 }}
              onChange={(v) => setAccId(v)}
              options={accounts.map((a: any) => ({ value: a.id, label: a.ten_tk }))}
            />
          </Space>
          <Table rowKey="id" loading={loadingL} columns={colL} dataSource={aliases} pagination={false} size="small" />
        </Space>
      </Col>
    </Row>
  );
}

/* ---------------- Utils ---------------- */
function fmt(n?: number | null) {
  const x = Number(n ?? 0);
  return x.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
}
