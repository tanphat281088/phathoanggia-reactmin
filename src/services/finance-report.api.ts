/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";

/**
 * Base path cho Báo cáo Tài chính (không đụng API_ROUTE_CONFIG lúc này).
 * Nếu sau muốn gom vào API_ROUTE_CONFIG, chỉ cần thay FIN_BASE.
 */
const FIN_BASE = "/bao-cao-quan-tri/tai-chinh";

/* =============== Types =============== */
export type FinanceSummary = {
  params: { from: string; to: string };
  kpi: {
    tong_cong_no_kh: number;
    tong_doanh_thu: number;
    tong_thu: number;
    tong_doanh_thu_don_hang: number;
    tong_chi: number;
    tong_tien_tat_ca_tai_khoan: number;
     so_du_tien_toi_hien_tai_khong_ttp: number; 
  };
  insights: {
    dong_tien_thuan: number;
    ty_le_thu_chi: number; // 0..1
    aging: {
      age_0_30: number;
      age_31_60: number;
      age_61_90: number;
      age_91_plus: number;
    };
    dso: number | null;
    cash_by_type: {
      cash: number;
      bank: number;
      ewallet: number;
    };

    /** Khả năng sinh lời (0..1) */
    profitability?: {
      gross_margin_pct: number | null;
      operating_margin_pct: number | null;
      net_margin_pct: number | null;
      ebitda_margin_pct?: number | null; // NEW
    };

    /** Vận hành (Operations) */
    ops?: {
      aov: number;                 // average order value (VND)
      purchase_frequency: number;  // orders/customers in period
      orders: number;
      customers: number;
      cac?: number | null;         // NEW: chi phí thu hút KH
      ltv?: number | null;         // NEW: lifetime value (ước lượng)
      ltv_cac?: number | null;     // NEW: tỷ lệ LTV/CAC
    };

    /** Tăng trưởng (kỳ này vs kỳ trước) */
    growth?: {
      period: { cur: string; prev: string }; // "YYYY-MM-DD→YYYY-MM-DD"
      revenue_growth_pct: number | null;     // (DT N − N-1)/N-1
      gross_profit_growth_pct: number | null;// (GP N − N-1)/N-1
      net_income_growth_pct: number | null;  // (LNST N − N-1)/N-1 (nếu có dữ liệu thuế)
    };
  };


};

export type PageResp<T = any> = {
  collection: T[];
  total: number;
  page: number;
  per_page: number;
};

export type LedgerSummary = {
  from: string;
  to: string;
  opening: number;
  in: number;
  out: number;
  ending: number;
};

export type LedgerResp = PageResp<{
  id: number;
  tai_khoan_id: number;
  tai_khoan_ten?: string | null;
  ngay_ct: string; // ISO
  amount: number;
  ref_type?: string | null;
  ref_id?: number | null;
  ref_code?: string | null;
  mo_ta?: string | null;
}> & { summary: LedgerSummary };

/* =============== API calls =============== */

/** GET /summary */
export const getFinanceSummary = async (params: { from?: string; to?: string }) => {
  const r = await axios.get(`${FIN_BASE}/summary`, { params });
  // server bọc CustomResponse: { success, data }
  const data: FinanceSummary = r?.data?.data ?? r?.data;
  return { data };
};

/** GET /receivables (tổng hợp công nợ theo KH) */
export const listReceivables = async (params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}) => {
  const r = await axios.get(`${FIN_BASE}/receivables`, { params });
  const data: PageResp = r?.data?.data ?? r?.data;
  return { data };
};

/** GET /orders (đơn hàng trong kỳ) */
export const listOrders = async (params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}) => {
  const r = await axios.get(`${FIN_BASE}/orders`, { params });
  const data: PageResp = r?.data?.data ?? r?.data;
  return { data };
};

/** GET /receipts (phiếu thu) */
export const listReceipts = async (params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}) => {
  const r = await axios.get(`${FIN_BASE}/receipts`, { params });
  const data: PageResp = r?.data?.data ?? r?.data;
  return { data };
};

/** GET /payments (phiếu chi) */
export const listPayments = async (params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}) => {
  const r = await axios.get(`${FIN_BASE}/payments`, { params });
  const data: PageResp = r?.data?.data ?? r?.data;
  return { data };
};

/** GET /ledger (sổ quỹ theo tài khoản) */
export const listLedger = async (params: {
  tai_khoan_id?: number | string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}) => {
  const r = await axios.get(`${FIN_BASE}/ledger`, { params });
  const data: LedgerResp = r?.data?.data ?? r?.data;
  return { data };
};

/* =============== Convenience presets (tuỳ chọn) =============== */

/** Helper build param with YYYY-MM-DD strings */
export const buildRange = (from?: string, to?: string) => {
  const p: { from?: string; to?: string } = {};
  if (from) p.from = from;
  if (to) p.to = to;
  return p;
};
