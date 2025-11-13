/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Input,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Select,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/vi";
dayjs.locale("vi");

import {
  getFinanceSummary,
  listReceivables,
  listOrders,
  listReceipts,
  listPayments,
  listLedger,
  type FinanceSummary,
  type PageResp,
  type LedgerResp,
} from "../../services/finance-report.api";
import { toCSV, downloadCSV, type CsvCol } from "../../utils/csv";


import { vnd } from "../../utils/money";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
dayjs.extend(quarterOfYear);



const { RangePicker } = DatePicker;
const { Title, Paragraph, Text } = Typography;

type DrawerKey = "receivables" | "orders" | "receipts" | "payments" | "ledger" | null;

export default function BaoCaoTaiChinh() {
  /* ======= Range controls ======= */
const [preset, setPreset] = useState<"today" | "week" | "month" | "quarter" | "year" | "custom">("month");

  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

useEffect(() => {
  if (preset === "today") {
    const d = dayjs();
    setRange([d.startOf("day"), d.endOf("day")]);
  } else if (preset === "week") {
    setRange([dayjs().startOf("week"), dayjs().endOf("week")]);
  } else if (preset === "month") {
    setRange([dayjs().startOf("month"), dayjs().endOf("month")]);
  } else if (preset === "quarter") {
    setRange([dayjs().startOf("quarter"), dayjs().endOf("quarter")]);
  } else if (preset === "year") {
    setRange([dayjs().startOf("year"), dayjs().endOf("year")]);
  }
}, [preset]);


  const params = useMemo(() => {
    const from = range?.[0]?.format("YYYY-MM-DD");
    const to = range?.[1]?.format("YYYY-MM-DD");
    return { from, to };
  }, [range]);

  /* ======= Summary (KPI) ======= */
  const [loading, setLoading] = useState(false);
  const [sum, setSum] = useState<FinanceSummary | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const r = await getFinanceSummary(params);
      setSum(r.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.from && params.to) fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.from, params.to]);

  /* ======= Drawer + Lists (drill-down) ======= */
  const [drawer, setDrawer] = useState<DrawerKey>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(25);

  // ledger extras
  const [ledgerAccountId, setLedgerAccountId] = useState<number | undefined>(undefined);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerResp["summary"] | null>(null);

  const [accOpts, setAccOpts] = useState<{ value: number; label: string }[]>([]);


  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [exporting, setExporting] = useState(false);

// ===== Explain Drawer state =====
const [expOpen, setExpOpen] = useState(false);
const [expKey, setExpKey] = useState<string | null>(null);
const openExplain = (k: string) => { setExpKey(k); setExpOpen(true); };

  const resetListState = () => {
    setRows([]);
    setTotal(0);
    setPage(1);
    setPer(25);
    setQ("");
    setLedgerAccountId(undefined);
    setLedgerSummary(null);
  };

  const openDrawer = (k: DrawerKey) => {
    resetListState();
    setDrawer(k);
  };

  const fetchList = async (_page = page, _per = per) => {
    if (!drawer) return;
    setLoadingList(true);
    try {
      if (drawer === "receivables") {
        const r = await listReceivables({ q: q.trim(), page: _page, per_page: _per, ...params });
        const d: PageResp = r.data;
        setRows(d.collection || []);
        setTotal(Number(d.total || 0));
      } else if (drawer === "orders") {
        const r = await listOrders({ q: q.trim(), page: _page, per_page: _per, ...params });
        const d: PageResp = r.data;
        setRows(d.collection || []);
        setTotal(Number(d.total || 0));
      } else if (drawer === "receipts") {
        const r = await listReceipts({ q: q.trim(), page: _page, per_page: _per, ...params });
        const d: PageResp = r.data;
        setRows(d.collection || []);
        setTotal(Number(d.total || 0));
      } else if (drawer === "payments") {
        const r = await listPayments({ q: q.trim(), page: _page, per_page: _per, ...params });
        const d: PageResp = r.data;
        setRows(d.collection || []);
        setTotal(Number(d.total || 0));
      } else if (drawer === "ledger") {
        const r = await listLedger({
          q: q.trim(),
          tai_khoan_id: ledgerAccountId,
          page: _page,
          per_page: _per,
          ...params,
        });
        const d: LedgerResp = r.data as any;
        setRows(d.collection || []);
        setTotal(Number(d.total || 0));
        setLedgerSummary(d.summary || null);
      }
      setPage(_page);
      setPer(_per);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (drawer) fetchList(1, per);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawer, params.from, params.to]);


  // Khi mở Drawer Ledger lần đầu → nạp options tài khoản thật
useEffect(() => {
  const loadAcc = async () => {
    try {
      const r: any = await axios.get(API_ROUTE_CONFIG.CASH_ACCOUNTS_OPTIONS);
      const arr = (r?.data?.data ?? r?.data ?? []).map((x: any) => ({
        value: x.value ?? x.id ?? x?.tai_khoan_id,
        label: x.label ?? x.ten_tk ?? `TK #${x.id}`,
      }));
      setAccOpts(arr);
    } catch {
      setAccOpts([]);
    }
  };
  if (drawer === "ledger" && accOpts.length === 0) loadAcc();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [drawer]);



useEffect(() => {
  if (drawer === "ledger") fetchList(1, per);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ledgerAccountId]);


const exportCSV = async () => {
  if (!drawer) return;
  setExporting(true);
  try {
    const p = { q: q.trim(), ...params };
    const PAGE_SIZE = 1000;
    const CAP = 200_000; // chặn an toàn
    let pageNo = 1;
    let acc: any[] = [];

    const fetchPage = async () => {
      if (drawer === "receivables") {
        const r = await listReceivables({ ...p, page: pageNo, per_page: PAGE_SIZE });
        return r.data;
      }
      if (drawer === "orders") {
        const r = await listOrders({ ...p, page: pageNo, per_page: PAGE_SIZE });
        return r.data;
      }
      if (drawer === "receipts") {
        const r = await listReceipts({ ...p, page: pageNo, per_page: PAGE_SIZE });
        return r.data;
      }
      if (drawer === "payments") {
        const r = await listPayments({ ...p, page: pageNo, per_page: PAGE_SIZE });
        return r.data;
      }
      if (drawer === "ledger") {
        const r = await listLedger({ ...p, page: pageNo, per_page: PAGE_SIZE, tai_khoan_id: ledgerAccountId });
        return r.data;
      }
      return { collection: [], total: 0, page: 1, per_page: PAGE_SIZE } as any;
    };

    let totalFetched = 0;
    while (true) {
      const d: any = await fetchPage();
      const batch = d.collection || [];
      acc = acc.concat(batch);
      totalFetched += batch.length;
      if (batch.length < PAGE_SIZE || totalFetched >= CAP) break;
      pageNo += 1;
    }

    // Map cột theo từng Drawer
    let cols: CsvCol[] = [];
    let fname = "export.csv";

    if (drawer === "receivables") {
      cols = [
        { key: "khach_hang_id", title: "KH ID" },
        { key: "ten_khach_hang", title: "Khách hàng" },
        { key: "so_dien_thoai", title: "SĐT" },
        { key: "tong_phai_thu", title: "Tổng phải thu", map: r => vnd(r.tong_phai_thu) },
        { key: "da_thu", title: "Đã thu", map: r => vnd(r.da_thu) },
        { key: "con_lai", title: "Còn lại", map: r => vnd(r.con_lai) },
        { key: "so_don_con_no", title: "Số đơn còn nợ" },
        { key: "age_0_30", title: "Aging 0–30", map: r => vnd(r.age_0_30) },
        { key: "age_31_60", title: "Aging 31–60", map: r => vnd(r.age_31_60) },
        { key: "age_61_90", title: "Aging 61–90", map: r => vnd(r.age_61_90) },
        { key: "age_91_plus", title: "Aging >90", map: r => vnd(r.age_91_plus) },
      ];
      fname = `Receivables_${params.from || ""}_${params.to || ""}.csv`;
    } else if (drawer === "orders") {
      cols = [
        { key: "ma_don_hang", title: "Mã đơn" },
        { key: "ngay_tao_don_hang", title: "Ngày đơn" },
        { key: "ten_khach_hang", title: "Khách hàng" },
        { key: "so_dien_thoai", title: "SĐT" },
        { key: "tong_phai_thu", title: "Phải thu", map: r => vnd(r.tong_phai_thu) },
        { key: "da_thu", title: "Đã thu", map: r => vnd(r.da_thu) },
        { key: "con_lai", title: "Còn lại", map: r => vnd(r.con_lai) },
        { key: "trang_thai_thanh_toan", title: "TT thanh toán" },
        { key: "trang_thai_don_hang", title: "TT giao hàng" },
      ];
      fname = `Orders_${params.from || ""}_${params.to || ""}.csv`;
    } else if (drawer === "receipts") {
      cols = [
        { key: "ma_phieu_thu", title: "Mã PT" },
        { key: "ngay", title: "Ngày" },
        { key: "nguoi_tra", title: "Người trả" },
        { key: "so_tien", title: "Số tiền", map: r => vnd(r.so_tien) },
        { key: "ly_do_thu", title: "Lý do" },
        { key: "ma_don_hang", title: "Mã đơn" },
        { key: "tai_khoan_ten", title: "Tài khoản" },
      ];
      fname = `Receipts_${params.from || ""}_${params.to || ""}.csv`;
    } else if (drawer === "payments") {
      cols = [
        { key: "ma_phieu_chi", title: "Mã PC" },
        { key: "ngay_chi", title: "Ngày chi" },
        { key: "nguoi_nhan", title: "Người nhận" },
        { key: "so_tien", title: "Số tiền", map: r => vnd(r.so_tien) },
        { key: "parent_name", title: "Nhóm CHA" },
        { key: "category_name", title: "Danh mục" },
        { key: "ly_do_chi", title: "Lý do chi" },
      ];
      fname = `Payments_${params.from || ""}_${params.to || ""}.csv`;
    } else if (drawer === "ledger") {
      cols = [
        { key: "ngay_ct", title: "Ngày CT" },
        { key: "tai_khoan_ten", title: "Tài khoản" },
        { key: "amount", title: "Số tiền", map: r => r.amount },
        { key: "ref_type", title: "Nguồn" },
        { key: "ref_code", title: "Mã tham chiếu" },
        { key: "mo_ta", title: "Mô tả" },
      ];
      fname = `Ledger_${params.from || ""}_${params.to || ""}${ledgerAccountId ? `_TK${ledgerAccountId}` : ""}.csv`;
    }

    const csv = toCSV(acc, cols);
    downloadCSV(csv, fname);
  } finally {
    setExporting(false);
  }
};



  /* ======= Columns per list ======= */
const money = (v?: number) => vnd(v);


  const colsReceivables = [
    { title: "KH ID", dataIndex: "khach_hang_id", width: 100 },
    { title: "Khách hàng", dataIndex: "ten_khach_hang" },
    { title: "SĐT", dataIndex: "so_dien_thoai", width: 140 },
    { title: "Tổng phải thu", dataIndex: "tong_phai_thu", align: "right", render: money, width: 140 },
    { title: "Đã thu", dataIndex: "da_thu", align: "right", render: money, width: 120 },
    { title: "Còn lại", dataIndex: "con_lai", align: "right", render: (v: number) => <b>{money(v)}</b>, width: 120 },
    { title: "Số đơn còn nợ", dataIndex: "so_don_con_no", align: "center", width: 140 },
    {
      title: "Aging (0–30/31–60/61–90/>90)",
      key: "aging",
      render: (_: any, r: any) =>
        `${money(r.age_0_30)} / ${money(r.age_31_60)} / ${money(r.age_61_90)} / ${money(r.age_91_plus)}`,
    },
  ];

  const colsOrders = [
    { title: "Mã đơn", dataIndex: "ma_don_hang", width: 140 },
    { title: "Ngày đơn", dataIndex: "ngay_tao_don_hang", width: 120 },
    { title: "Khách hàng", dataIndex: "ten_khach_hang" },
    { title: "SĐT", dataIndex: "so_dien_thoai", width: 140 },
    { title: "Phải thu", dataIndex: "tong_phai_thu", align: "right", render: money, width: 130 },
    { title: "Đã thu", dataIndex: "da_thu", align: "right", render: money, width: 120 },
    { title: "Còn lại", dataIndex: "con_lai", align: "right", render: (v: number) => <b>{money(v)}</b>, width: 120 },
    {
      title: "TT thanh toán",
      dataIndex: "trang_thai_thanh_toan",
      width: 130,
      render: (v: number) => (v === 0 ? "Chưa TT" : v === 1 ? "Đã cọc" : "Hoàn tất"),
    },
    {
      title: "TT giao hàng",
      dataIndex: "trang_thai_don_hang",
      width: 130,
      render: (v: number) => {
        const map: Record<number, { t: string; c: string }> = {
          0: { t: "Chưa giao", c: "default" },
          1: { t: "Đang giao", c: "gold" },
          2: { t: "Đã giao", c: "green" },
          3: { t: "Đã hủy", c: "red" },
        };
        const m = map[v] || { t: `#${v}`, c: "default" };
        return <Tag color={m.c as any}>{m.t}</Tag>;
      },
    },
  ];

  const colsReceipts = [
    { title: "Mã phiếu thu", dataIndex: "ma_phieu_thu", width: 160 },
    { title: "Ngày", dataIndex: "ngay", width: 120 },
    { title: "Người trả", dataIndex: "nguoi_tra", width: 180 },
    { title: "Số tiền", dataIndex: "so_tien", align: "right", render: money, width: 130 },
    { title: "Lý do", dataIndex: "ly_do_thu" },
    { title: "Mã đơn", dataIndex: "ma_don_hang", width: 150 },
    { title: "Tài khoản", dataIndex: "tai_khoan_ten", width: 180 },
  ];

  const colsPayments = [
    { title: "Mã phiếu chi", dataIndex: "ma_phieu_chi", width: 160 },
    { title: "Ngày chi", dataIndex: "ngay_chi", width: 120 },
    { title: "Người nhận", dataIndex: "nguoi_nhan", width: 180 },
    { title: "Số tiền", dataIndex: "so_tien", align: "right", render: money, width: 130 },
    { title: "Danh mục", dataIndex: "category_name", width: 200 },
    { title: "Lý do chi", dataIndex: "ly_do_chi" },
  ];

  const colsLedger = [
    { title: "Ngày CT", dataIndex: "ngay_ct", width: 160 },
    { title: "Tài khoản", dataIndex: "tai_khoan_ten", width: 220 },
    {
      title: "Số tiền",
      dataIndex: "amount",
      align: "right",
      width: 130,
      render: (v: number) => (
        <Text type={v >= 0 ? "success" : "danger"}>{Number(v ?? 0).toLocaleString("vi-VN")}</Text>
      ),
    },
    { title: "Nguồn", dataIndex: "ref_type", width: 140 },
    { title: "Mã tham chiếu", dataIndex: "ref_code", width: 180 },
    { title: "Mô tả", dataIndex: "mo_ta" },
  ];




// Helper: định dạng % từ [0..1] (nhận cả null/undefined)
const pct = (x?: number | null) =>
  x == null ? "—" : (Math.round((x || 0) * 10000) / 100) + "%";

// Mini metric card (đẹp trên mobile/desktop)
// Mini metric card (đẹp trên mobile/desktop) + clickable
const StatBox = ({ title, children, onClick }: { title: string; children: any; onClick?: () => void }) => (
  <Card
    size="small"
    bordered
    hoverable={!!onClick}
    onClick={onClick}
    style={{ height: "100%", cursor: onClick ? "pointer" : "default" }}
  >
    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 20, fontWeight: 700 }}>{children}</div>
  </Card>
);

// ===== Explain registry (nội dung hiển thị trong Drawer) =====
const EXPLAINS: Record<string, { title: string; define: string; formula: string; meaning: string }> = {
  "cashflow_net": {
    title: "Dòng tiền thuần (kỳ)",
    define: "Tiền vào trừ tiền ra trong kỳ báo cáo.",
    formula: "Dòng tiền thuần = Tổng thu (phiếu thu) − Tổng chi (phiếu chi).",
    meaning: "Số dương → đủ tiền vận hành/đầu tư. Số âm → cần xem lại chi hoặc đẩy mạnh thu."
  },
  "cash_ratio": {
    title: "Tỷ lệ thu/chi",
    define: "Tỷ lệ giữa tiền thu và tổng thu+chi trong kỳ.",
    formula: "Tỷ lệ thu/chi = Tổng thu / (Tổng thu + Tổng chi).",
    meaning: "Càng cao càng tốt (tiền thu chiếm ưu thế)."
  },
  "dso": {
    title: "Số ngày thu tiền bình quân (DSO)",
    define: "Trung bình mất bao ngày để thu tiền sau khi bán.",
    formula: "DSO ≈ Công nợ khách hàng cuối kỳ / (Doanh thu bình quân/ngày).",
    meaning: "Nhỏ → thu tiền nhanh. Lớn → tiền kẹt ở công nợ, cần siết điều khoản thanh toán."
  },
  "growth_rev": {
    title: "Tăng trưởng doanh thu (so với kỳ trước)",
    define: "Mức tăng/giảm doanh thu so với kỳ trước có cùng độ dài ngày.",
    formula: "Rev Growth = (Doanh thu kỳ này − kỳ trước) / kỳ trước.",
    meaning: "Dương → đang tăng trưởng. Âm → cần xem lại kênh bán, chương trình bán hàng."
  },
  "growth_gp": {
    title: "Tăng trưởng lợi nhuận gộp (so với kỳ trước)",
    define: "Mức tăng/giảm lợi nhuận gộp (Doanh thu − Giá vốn) so với kỳ trước.",
    formula: "GP Growth = (LN gộp kỳ này − kỳ trước) / kỳ trước.",
    meaning: "Dương → giá bán/giá vốn đang thuận lợi; Âm → xem lại định giá/đàm phán NCC."
  },
  "growth_ni": {
    title: "Tăng trưởng LNST (xấp xỉ) (so với kỳ trước)",
    define: "Mức tăng/giảm LNST xấp xỉ (LNTT − Thuế) so với kỳ trước.",
    formula: "NI Growth ≈ (LNST kỳ này − kỳ trước) / kỳ trước.",
    meaning: "Phản ánh tăng trưởng lợi nhuận ròng sau chi phí & thuế."
  },
  "gm": {
    title: "Biên lợi nhuận gộp",
    define: "Tỷ lệ LN gộp trên doanh thu.",
    formula: "GM = (Doanh thu − Giá vốn) / Doanh thu.",
    meaning: "Càng cao càng tốt — phản ánh sức mạnh giá bán và kiểm soát giá vốn."
  },
  "om": {
    title: "Biên lợi nhuận hoạt động (HĐKD)",
    define: "Tỷ lệ EBIT/Doanh thu theo KQKD rút gọn của hệ thống.",
    formula: "OM = EBIT / Doanh thu; EBIT = 03 + 04 − (05+06+07+08).",
    meaning: "Càng cao càng tốt — vận hành hiệu quả, chi phí bán/QL thấp."
  },
  "nm": {
    title: "Biên lợi nhuận ròng (xấp xỉ)",
    define: "Tỷ lệ LNTT (trừ chi khác) trên doanh thu (xấp xỉ LNST khi chưa bóc thuế TNDN).",
    formula: "Net Margin ≈ (LNTT − Chi khác) / Doanh thu.",
    meaning: "Cho biết sau mọi chi phí còn lại bao nhiêu trên 1 đồng doanh thu."
  },
  "ebitda": {
    title: "EBITDA Margin",
    define: "Tỷ lệ (EBIT + Khấu hao/Phân bổ) trên Doanh thu.",
    formula: "EBITDA Margin = (EBIT + Depreciation) / Doanh thu.",
    meaning: "Đo sức tạo dòng tiền từ hoạt động cốt lõi, hữu ích so sánh theo thời gian."
  },
  "aov": {
    title: "Giá trị đơn TB (AOV)",
    define: "Giá trị bình quân mỗi đơn đã giao.",
    formula: "AOV = Doanh thu đã giao / Số đơn đã giao.",
    meaning: "Càng cao càng tốt — team cố găng nâng chỉ số này bằng cách up sell, và tạo thêm các gói hoa cao cấp."
  },
  "pf": {
    title: "Tần suất mua",
    define: "Số đơn trên mỗi khách hàng trong kỳ.",
    formula: "Purchase Frequency = Tổng đơn / Số khách hàng.",
    meaning: "Cao → khách quay lại nhiều; tăng qua CRM, follow-up, membership, gợi ý dịp tặng."
  },
  "cac": {
    title: "Chi phí thu hút 1 khách hàng (CAC)",
    define: "Chi phí bình quân để có 1 KH mới.",
    formula: "CAC = Chi phí marketing / Số KH mới.",
    meaning: "Càng thấp càng tốt. So sánh với LTV để đánh giá hiệu quả tăng trưởng."
  },
  "ltv_cac": {
    title: "Hiệu quả tăng trưởng (LTV/CAC)",
    define: "Tỉ lệ giữa giá trị vòng đời ước lượng và chi phí mua khách.",
    formula: "LTV ≈ AOV × Tần suất × Biên gộp × Lifetime(tháng). LTV/CAC = LTV / CAC.",
    meaning: " >1 tốt, ~3 khỏe. Theo dõi theo kênh marketing để tối ưu ngân sách."
  },
};




  /* ======= KPI cards ======= */
  const kpi = sum?.kpi;
  const ins = sum?.insights;

  const headerDate = useMemo(() => {
    const f = sum?.params?.from ? dayjs(sum.params.from).format("DD/MM/YYYY") : "-";
    const t = sum?.params?.to ? dayjs(sum.params.to).format("DD/MM/YYYY") : "-";
    return `${f} → ${t}`;
  }, [sum]);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      {/* Filter bar */}
      <Card>
        <Row gutter={[12, 12]} align="middle">
          <Col flex="none">
<Segmented
  value={preset}
  onChange={(v) => setPreset(v as any)}
  options={[
    { label: "Hôm nay", value: "today" },
    { label: "Tuần này", value: "week" },
    { label: "Tháng này", value: "month" },
    { label: "Quý này", value: "quarter" },
    { label: "Năm nay", value: "year" },
    { label: "Tùy chọn", value: "custom" },
  ]}
/>

          </Col>
          <Col flex="auto" />
          <Col flex="none">
            <Space>
              <RangePicker
                value={range as any}
                onChange={(val) => setRange(val as any)}
                format="DD/MM/YYYY"
                disabled={preset !== "custom"}
              />
              <Button type="primary" onClick={fetchSummary} loading={loading}>
                Xem báo cáo
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI area */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable loading={loading} onClick={() => openDrawer("receivables")}>
            <Statistic title="Tổng công nợ KH (đến hiện tại)" value={kpi ? kpi.tong_cong_no_kh.toLocaleString("vi-VN") : "—"} />
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {headerDate}
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable loading={loading} onClick={() => openDrawer("orders")}>
            <Statistic title="Tổng doanh thu (đơn hàng đã giao/ hủy)" value={kpi ? kpi.tong_doanh_thu.toLocaleString("vi-VN") : "—"} />
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {headerDate}
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable loading={loading} onClick={() => openDrawer("receipts")}>
            <Statistic title="Tổng thu (phiếu thu)" value={kpi ? kpi.tong_thu.toLocaleString("vi-VN") : "—"} />
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {headerDate}
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable loading={loading} onClick={() => openDrawer("payments")}>
            <Statistic title="Tổng chi (phiếu chi)" value={kpi ? kpi.tong_chi.toLocaleString("vi-VN") : "—"} />
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {headerDate}
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable loading={loading} onClick={() => openDrawer("orders")}>
            <Statistic title="Tổng doanh thu theo đơn hàng mới" value={kpi ? kpi.tong_doanh_thu_don_hang.toLocaleString("vi-VN") : "—"} />
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {headerDate}
            </Paragraph>
          </Card>
        </Col>

<Col xs={24} sm={12} md={8} lg={6}>
  <Card hoverable loading={loading} onClick={() => openDrawer("ledger")}>
    <Statistic
      title="Tổng số dư tiền (tới hiện tại)"
      value={kpi ? kpi.tong_tien_tat_ca_tai_khoan.toLocaleString("vi-VN") : "—"}
    />
    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
      Đến {sum?.params?.to ? dayjs(sum.params.to).format("DD/MM/YYYY") : "-"}
    </Paragraph>
  </Card>
</Col>

<Col xs={24} sm={12} md={8} lg={6}>
  <Card hoverable loading={loading} onClick={() => openDrawer("ledger")}>
    <Statistic
      title="Số dư tiền (tới hiện tại) – không gồm TTP"
      value={kpi ? kpi.so_du_tien_toi_hien_tai_khong_ttp.toLocaleString("vi-VN") : "—"}
    />
    <Paragraph type="secondary" style={{ margin: 0 }}>
      Đến {sum?.params?.to ? dayjs(sum.params.to).format("DD/MM/YYYY") : "-"}
    </Paragraph>
  </Card>
</Col>


      </Row>

      {/* Insights */}
<Card loading={loading} title="Chỉ số tài chính">
  {/* Hàng 1: 4 chỉ số gọn – đẹp cả mobile */}
  <Row gutter={[12, 12]}>
    <Col xs={12} md={6}>
<StatBox title="Dòng tiền thuần (kỳ)" onClick={() => openExplain("cashflow_net")}>

        {(ins ? ins.dong_tien_thuan : 0).toLocaleString("vi-VN")}
      </StatBox>
    </Col>
    <Col xs={12} md={6}>
   <StatBox title="Tỷ lệ thu/chi" onClick={() => openExplain("cash_ratio")}>

        {ins ? Math.round((ins.ty_le_thu_chi || 0) * 10000) / 100 : 0}%
      </StatBox>
    </Col>
    <Col xs={12} md={6}>
<StatBox title="Số ngày thu tiền bình quân" onClick={() => openExplain("dso")}>
{ins && ins.dso !== null ? ins.dso : "—"}</StatBox>
    </Col>

  </Row>


  {/* Hàng 1.5: Tăng trưởng (so với kỳ trước) */}
  <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
    <Col xs={24} md={8}>
 <StatBox title="Tăng trưởng doanh thu (so với kỳ trước)" onClick={() => openExplain("growth_rev")}>

        {pct(sum?.insights?.growth?.revenue_growth_pct)}
      </StatBox>
    </Col>
    <Col xs={24} md={8}>
<StatBox title="Tăng trưởng LN gộp (so với kỳ trước)" onClick={() => openExplain("growth_gp")}>

        {pct(sum?.insights?.growth?.gross_profit_growth_pct)}
      </StatBox>
    </Col>
    <Col xs={24} md={8}>
  <StatBox title="Tăng trưởng LNST (so với kỳ trước)" onClick={() => openExplain("growth_ni")}>

        {pct(sum?.insights?.growth?.net_income_growth_pct)}
      </StatBox>
    </Col>
  </Row>

  {/* Hàng 2: 3 box nội dung + 1 box Aging full width */}
  <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
    {/* Khả năng sinh lời */}
    <Col xs={24} md={12} lg={8}>
      <Card size="small" bordered>
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Khả năng sinh lời</Title>
        <Space direction="vertical" size={4}>
<Text onClick={() => openExplain("gm")} style={{ cursor: "pointer" }}>
  Biên lợi nhuận gộp: <b>{pct(sum?.insights?.profitability?.gross_margin_pct)}</b>
</Text>

    <Text onClick={() => openExplain("om")} style={{ cursor: "pointer" }}>
  Biên LN hoạt động (HĐKD): <b>{pct(sum?.insights?.profitability?.operating_margin_pct)}</b>
</Text>

<Text onClick={() => openExplain("nm")} style={{ cursor: "pointer" }}>
  Biên lợi nhuận ròng (xấp xỉ): <b>{pct(sum?.insights?.profitability?.net_margin_pct)}</b>
</Text>

<Text onClick={() => openExplain("ebitda")} style={{ cursor: "pointer" }}>
  Tỷ lệ tạo dòng tiền hoạt động so với doanh thu (EBITDA Margin): <b>{pct(sum?.insights?.profitability?.ebitda_margin_pct)}</b>
</Text>


        </Space>
      </Card>
    </Col>

    {/* Tiền theo loại tài khoản */}
    <Col xs={24} md={12} lg={8}>
      <Card size="small" bordered>
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Tiền theo loại tài khoản</Title>
        <Space size={8} wrap>
          <Tag color="blue">Tiền mặt: {ins ? ins.cash_by_type.cash.toLocaleString("vi-VN") : 0}</Tag>
          <Tag color="cyan">Ngân hàng: {ins ? ins.cash_by_type.bank.toLocaleString("vi-VN") : 0}</Tag>
          <Tag color="purple">Ví điện tử: {ins ? ins.cash_by_type.ewallet.toLocaleString("vi-VN") : 0}</Tag>
        </Space>
      </Card>
    </Col>

    {/* Vận hành */}
    <Col xs={24} lg={8}>
      <Card size="small" bordered>
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Vận hành</Title>
        <Space direction="vertical" size={4}>
         <Text onClick={() => openExplain("aov")} style={{ cursor: "pointer" }}>
  Giá trị đơn TB (AOV): <b>{vnd(sum?.insights?.ops?.aov || 0)}</b>
</Text>
<Text onClick={() => openExplain("pf")} style={{ cursor: "pointer" }}>
  Tần suất mua: <b>{sum?.insights?.ops?.purchase_frequency ?? 0}</b>
</Text>
<Text onClick={() => openExplain("cac")} style={{ cursor: "pointer" }}>
  Chi phí thu hút 1 khách hàng mới CAC: <b>{sum?.insights?.ops?.cac != null ? vnd(sum!.insights!.ops!.cac) : "—"}</b>
</Text>
<Text onClick={() => openExplain("ltv_cac")} style={{ cursor: "pointer" }}>
  Hiệu quả tăng trưởng (LTV / CAC): <b>{sum?.insights?.ops?.ltv_cac != null ? String(sum!.insights!.ops!.ltv_cac) : "—"}</b>
</Text>

          <Text>
            Đơn hàng: <b>{sum?.insights?.ops?.orders ?? 0}</b>
            &nbsp;•&nbsp;
            Khách hàng: <b>{sum?.insights?.ops?.customers ?? 0}</b>
          </Text>
        </Space>
      </Card>
    </Col>

    {/* Aging tổng quát – full width */}
    <Col xs={24}>
      <Card size="small" bordered>
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Tuổi nợ của khách hàng</Title>
        <Space wrap>
          <Tag color="green">0–30: {ins ? ins.aging.age_0_30.toLocaleString("vi-VN") : 0}</Tag>
          <Tag color="gold">31–60: {ins ? ins.aging.age_31_60.toLocaleString("vi-VN") : 0}</Tag>
          <Tag color="orange">61–90: {ins ? ins.aging.age_61_90.toLocaleString("vi-VN") : 0}</Tag>
          <Tag color="red">&gt;90: {ins ? ins.aging.age_91_plus.toLocaleString("vi-VN") : 0}</Tag>
        </Space>
      </Card>
    </Col>
  </Row>
</Card>


      {/* Drawer */}
      <Drawer
        title={
          drawer === "receivables"
            ? "Công nợ khách hàng (tổng hợp)"
            : drawer === "orders"
            ? "Đơn hàng (kỳ lọc)"
            : drawer === "receipts"
            ? "Phiếu thu (kỳ lọc)"
            : drawer === "payments"
            ? "Phiếu chi (kỳ lọc)"
            : drawer === "ledger"
            ? "Sổ quỹ theo tài khoản"
            : ""
        }
        open={!!drawer}
        onClose={() => setDrawer(null)}
        width={1100}
      >
        {/* Filter in drawer */}
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Row gutter={[12, 12]} align="middle">
            <Col flex="auto">
              <Input
                placeholder={
                  drawer === "orders"
                    ? "Tìm mã đơn / KH / SĐT"
                    : drawer === "receivables"
                    ? "Tìm tên KH / SĐT"
                    : drawer === "receipts"
                    ? "Tìm mã PT / người trả / lý do / STK / NH"
                    : drawer === "payments"
                    ? "Tìm mã PC / người nhận / lý do / danh mục"
                    : "Tìm ref_code / type / mô tả"
                }
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onPressEnter={() => fetchList(1, per)}
              />
            </Col>
            {drawer === "ledger" && (
              <Col flex="none">
<Select
  allowClear
  style={{ minWidth: 260 }}
  placeholder="Lọc theo tài khoản"
  value={ledgerAccountId}
  onChange={(v) => {
    setLedgerAccountId(v);
    // đổi TK → load lại danh sách trang 1
    setTimeout(() => fetchList(1, per), 0);
  }}
  options={accOpts}
/>

              </Col>
            )}
            <Col flex="none">
<Space>
  <Button type="primary" onClick={() => fetchList(1, per)} loading={loadingList}>
    Lọc
  </Button>
  <Button
    onClick={() => {
      setQ("");
      if (drawer === "ledger") setLedgerAccountId(undefined);
      fetchList(1, per);
    }}
  >
    Xóa lọc
  </Button>
  <Button onClick={exportCSV} loading={exporting}>
    Xuất CSV
  </Button>
</Space>

            </Col>
          </Row>

          {drawer === "ledger" && ledgerSummary && (
            <Card size="small" style={{ border: "1px dashed #ddd" }}>
              <Space size={24} wrap>
                <Text strong>Opening:</Text>
                <Text>{ledgerSummary.opening.toLocaleString("vi-VN")}</Text>
                <Text strong>In:</Text>
                <Text>{ledgerSummary.in.toLocaleString("vi-VN")}</Text>
                <Text strong>Out:</Text>
                <Text>{ledgerSummary.out.toLocaleString("vi-VN")}</Text>
                <Text strong>Ending:</Text>
                <Text>{ledgerSummary.ending.toLocaleString("vi-VN")}</Text>
              </Space>
            </Card>
          )}

          <Table
            rowKey={(r) =>
              String(
                r.id ??
                  r.khach_hang_id ??
                  r.ma_don_hang ??
                  r.ma_phieu_thu ??
                  r.ma_phieu_chi ??
                  Math.random()
              )
            }
            loading={loadingList}
            columns={
              drawer === "receivables"
                ? (colsReceivables as any)
                : drawer === "orders"
                ? (colsOrders as any)
                : drawer === "receipts"
                ? (colsReceipts as any)
                : drawer === "payments"
                ? (colsPayments as any)
                : (colsLedger as any)
            }
            dataSource={rows}
            pagination={{
              current: page,
              pageSize: per,
              total,
              showSizeChanger: true,
              onChange: (p, s) => fetchList(p, s),
            }}
            scroll={{ x: 1000 }}
          />
        </Space>
      </Drawer>
            {/* Explain Drawer (Giải thích chỉ số) */}
      <Drawer
        title={expKey ? EXPLAINS[expKey]?.title || "Giải thích chỉ số" : ""}
        open={expOpen}
        onClose={() => setExpOpen(false)}
        width={720}
      >
        {expKey && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Card size="small">
              <Title level={5} style={{ margin: 0 }}>Định nghĩa</Title>
              <Paragraph style={{ margin: 0 }}>{EXPLAINS[expKey]?.define}</Paragraph>
            </Card>

            <Card size="small">
              <Title level={5} style={{ margin: 0 }}>Công thức</Title>
              <Paragraph style={{ margin: 0 }}>{EXPLAINS[expKey]?.formula}</Paragraph>
            </Card>

            <Card size="small">
              <Title level={5} style={{ margin: 0 }}>Giá trị hiện tại</Title>
              <Paragraph style={{ margin: 0 }}>
                {/* hiện giá trị tùy theo key */}
                {expKey === "cashflow_net" && (ins ? vnd(ins.dong_tien_thuan) : "—")}
                {expKey === "cash_ratio"   && (ins ? `${Math.round((ins.ty_le_thu_chi || 0)*10000)/100}%` : "—")}
                {expKey === "dso"          && (ins && ins.dso != null ? ins.dso : "—")}

                {expKey === "growth_rev" && pct(sum?.insights?.growth?.revenue_growth_pct)}
                {expKey === "growth_gp"  && pct(sum?.insights?.growth?.gross_profit_growth_pct)}
                {expKey === "growth_ni"  && pct(sum?.insights?.growth?.net_income_growth_pct)}

                {expKey === "gm"     && pct(sum?.insights?.profitability?.gross_margin_pct)}
                {expKey === "om"     && pct(sum?.insights?.profitability?.operating_margin_pct)}
                {expKey === "nm"     && pct(sum?.insights?.profitability?.net_margin_pct)}
                {expKey === "ebitda" && pct(sum?.insights?.profitability?.ebitda_margin_pct)}

                {expKey === "aov"     && vnd(sum?.insights?.ops?.aov || 0)}
                {expKey === "pf"      && (sum?.insights?.ops?.purchase_frequency ?? "—")}
                {expKey === "cac"     && (sum?.insights?.ops?.cac != null ? vnd(sum!.insights!.ops!.cac) : "—")}
                {expKey === "ltv_cac" && (sum?.insights?.ops?.ltv_cac != null ? String(sum!.insights!.ops!.ltv_cac) : "—")}
              </Paragraph>
            </Card>

            <Card size="small">
              <Title level={5} style={{ margin: 0 }}>Ý nghĩa đối với PHG Floral & Decor</Title>
              <Paragraph style={{ margin: 0 }}>{EXPLAINS[expKey]?.meaning}</Paragraph>
            </Card>
          </Space>
        )}
      </Drawer>

    </Space>
  );
}
