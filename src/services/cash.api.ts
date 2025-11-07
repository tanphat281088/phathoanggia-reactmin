/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";
import { API_ROUTE_CONFIG } from "../configs/api-route-config";

/**
 * Yêu cầu trong API_ROUTE_CONFIG đã có các key:
 *  - CASH_ACCOUNTS: "/cash/accounts"
 *  - CASH_ACCOUNTS_OPTIONS: "/cash/accounts/options"
 *  - CASH_ALIASES: "/cash/aliases"
 *  - CASH_LEDGER: "/cash/ledger"
 *  - CASH_BALANCES: "/cash/balances"
 *  - CASH_BALANCES_SUMMARY: "/cash/balances/summary"
 *  - CASH_TRANSFERS: "/cash/internal-transfers"
 */

export type Id = number;

export type CashAccountType = "cash" | "bank" | "ewallet";

export interface CashAccount {
  id: Id;
  ma_tk: string;
  ten_tk: string;
  loai: CashAccountType;
  so_tai_khoan?: string | null;
  ngan_hang?: string | null;
  is_default_cash: boolean;
  is_active: boolean;
  opening_balance: number;
  opening_date?: string | null;
  ghi_chu?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CashAccountOption {
  value: Id;
  label: string;
  extra?: {
    loai?: CashAccountType;
    ngan_hang?: string | null;
    so_tai_khoan?: string | null;
    is_default_cash?: boolean;
  };
}

export interface CashAlias {
  id: Id;
  tai_khoan_id: Id;
  pattern_bank?: string | null;
  pattern_account?: string | null;
  pattern_note?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LedgerEntry {
  id: Id;
  tai_khoan_id: Id;
  ngay_ct: string;             // ISO datetime
  amount: number;              // dương = vào, âm = ra
  ref_type: string;            // 'phieu_thu' | 'phieu_chi' | 'chuyen_noi_bo' | 'phi_chuyen' ...
  ref_id?: Id | null;
  ref_code?: string | null;
  mo_ta?: string | null;
  reconciled_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // join
  tai_khoan?: {
    id: Id;
    ten_tk: string;
    loai: CashAccountType;
    ngan_hang?: string | null;
    so_tai_khoan?: string | null;
  };
}

export interface BalanceRow {
  tai_khoan_id: Id;
  ten_tk: string;
  label?: string;
  loai: CashAccountType;
  ngan_hang?: string | null;
  so_tai_khoan?: string | null;
  opening: number;
  in: number;
  out: number;
  net: number;
  ending: number;
}

export interface Transfer {
  id: Id;
  ma_phieu: string;
  ngay_ct: string;            // yyyy-mm-dd hoặc ISO datetime
  tu_tai_khoan_id: Id;
  den_tai_khoan_id: Id;
  so_tien: number;
  phi_chuyen?: number;
  noi_dung?: string | null;
  trang_thai: "draft" | "posted" | "locked";
  created_at?: string;
  updated_at?: string;
  // join (index)
  tu_tk_ten?: string;
  den_tk_ten?: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  from: number;
  to: number;
  total_current: number;
}

export interface ListResponse<T> {
  success: boolean;
  data: {
    collection: T[];
    total: number;
    pagination?: PaginationMeta;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface BasicResponse {
  success: boolean;
  data: any;
  message?: string;
}

/* ===================== Helpers ===================== */
const buildQuery = (params?: Record<string, any>) => {
  const q = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      if (Array.isArray(v)) {
        v.forEach((item) => q.append(`${k}[]`, String(item)));
      } else {
        q.append(k, String(v));
      }
    });
  }
  const s = q.toString();
  return s ? `?${s}` : "";
};

/* ===================== Accounts ===================== */
export async function listCashAccounts(params?: {
  active?: 0 | 1;
  loai?: CashAccountType;
}): Promise<BasicResponse> {
  const url = `${API_ROUTE_CONFIG.CASH_ACCOUNTS}${buildQuery(params)}`;
  return axios.get(url);
}

export async function getCashAccountOptions(params?: {
  active?: 0 | 1;
}): Promise<SingleResponse<CashAccountOption[]>> {
  const url = `${API_ROUTE_CONFIG.CASH_ACCOUNTS_OPTIONS}${buildQuery(params)}`;
  return axios.get(url);
}

export async function createCashAccount(payload: Partial<CashAccount>): Promise<SingleResponse<CashAccount>> {
  return axios.post(API_ROUTE_CONFIG.CASH_ACCOUNTS, payload);
}

export async function updateCashAccount(id: Id, payload: Partial<CashAccount>): Promise<SingleResponse<CashAccount>> {
  return axios.put(`${API_ROUTE_CONFIG.CASH_ACCOUNTS}/${id}`, payload);
}

export async function deleteCashAccount(id: Id): Promise<BasicResponse> {
  return axios.delete(`${API_ROUTE_CONFIG.CASH_ACCOUNTS}/${id}`);
}

/* ===================== Aliases ===================== */
export async function listCashAliases(params?: {
  tai_khoan_id?: Id;
  active?: 0 | 1;
}): Promise<BasicResponse> {
  const url = `${API_ROUTE_CONFIG.CASH_ALIASES}${buildQuery(params)}`;
  return axios.get(url);
}

export async function createCashAlias(payload: Partial<CashAlias>): Promise<SingleResponse<CashAlias>> {
  return axios.post(API_ROUTE_CONFIG.CASH_ALIASES, payload);
}

export async function updateCashAlias(id: Id, payload: Partial<CashAlias>): Promise<SingleResponse<CashAlias>> {
  return axios.put(`${API_ROUTE_CONFIG.CASH_ALIASES}/${id}`, payload);
}

export async function deleteCashAlias(id: Id): Promise<BasicResponse> {
  return axios.delete(`${API_ROUTE_CONFIG.CASH_ALIASES}/${id}`);
}

/* ===================== Ledger & Balances ===================== */
export async function listCashLedger(params?: {
  tai_khoan_id?: Id;
  from?: string;     // "YYYY-MM-DD" hoặc ISO
  to?: string;       // "YYYY-MM-DD" hoặc ISO
  ref_type?: string;
  keyword?: string;
  reconciled?: 0 | 1;
  page?: number;
  per_page?: number;
}): Promise<ListResponse<LedgerEntry>> {
  const url = `${API_ROUTE_CONFIG.CASH_LEDGER}${buildQuery(params)}`;
  return axios.get(url);
}

export async function getCashBalances(params?: {
  from?: string;
  to?: string;
  all?: 0 | 1;       // =1 để lấy cả inactive
}): Promise<BasicResponse> {
  const url = `${API_ROUTE_CONFIG.CASH_BALANCES}${buildQuery(params)}`;
  return axios.get(url);
}

export async function getCashBalanceSummary(params?: {
  from?: string;
  to?: string;
  all?: 0 | 1;
}): Promise<BasicResponse> {
  const url = `${API_ROUTE_CONFIG.CASH_BALANCES_SUMMARY}${buildQuery(params)}`;
  return axios.get(url);
}


/* ===================== Audit Delta (Receipts) ===================== */
/**
 * Tra soát lệch (delta) giữa PHIẾU THU CK và SỔ QUỸ theo alias bank/account của tài khoản nhận.
 * Params:
 *  - tai_khoan_id (bắt buộc)
 *  - alias_bank, alias_account (tuỳ chọn – nếu bỏ trống sẽ lấy từ tài khoản)
 *  - from, to (YYYY-MM-DD – tuỳ chọn)
 */
export async function auditReceiptsDelta(params: {
  tai_khoan_id: Id;
  alias_bank?: string;
  alias_account?: string;
  from?: string;
  to?: string;
}): Promise<BasicResponse> {
  const url = `${API_ROUTE_CONFIG.CASH_AUDIT_DELTA}${buildQuery(params)}`;
  return axios.get(url);
}

/**
 * Áp dụng sửa delta (idempotent)
 * Body:
 *  - tai_khoan_id (bắt buộc)
 *  - alias_bank, alias_account (tuỳ chọn)
 *  - from, to (tuỳ chọn)
 *  - scope: "missing" | "over" | "both" (mặc định "both")
 *  - dry_run: 0|1 (mặc định 1)
 */
export async function fixReceiptsDelta(payload: {
  tai_khoan_id: Id;
  alias_bank?: string;
  alias_account?: string;
  from?: string;
  to?: string;
  scope?: "missing" | "over" | "both";
  dry_run?: 0 | 1;
}): Promise<BasicResponse> {
  return axios.post(API_ROUTE_CONFIG.CASH_AUDIT_DELTA_FIX, payload);
}



/* ===================== Internal Transfers ===================== */
export async function listTransfers(params?: {
  from?: string;
  to?: string;
  status?: "draft" | "posted" | "locked";
  keyword?: string;
  page?: number;
  per_page?: number;
}): Promise<ListResponse<Transfer>> {
  const url = `${API_ROUTE_CONFIG.CASH_TRANSFERS}${buildQuery(params)}`;
  return axios.get(url);
}

export interface CreateTransferPayload {
  ma_phieu?: string;
  ngay_ct: string;                // "YYYY-MM-DD" hoặc ISO
  tu_tai_khoan_id: Id;
  den_tai_khoan_id: Id;
  so_tien: number;
  phi_chuyen?: number;
  noi_dung?: string;
}

export async function createTransfer(payload: CreateTransferPayload): Promise<SingleResponse<Transfer>> {
  return axios.post(API_ROUTE_CONFIG.CASH_TRANSFERS, payload);
}

export async function showTransfer(id: Id): Promise<SingleResponse<Transfer>> {
  return axios.get(`${API_ROUTE_CONFIG.CASH_TRANSFERS}/${id}`);
}

export async function postTransfer(id: Id): Promise<SingleResponse<Transfer>> {
  return axios.post(`${API_ROUTE_CONFIG.CASH_TRANSFERS}/${id}/post`);
}

export async function unpostTransfer(id: Id): Promise<SingleResponse<Transfer>> {
  return axios.post(`${API_ROUTE_CONFIG.CASH_TRANSFERS}/${id}/unpost`);
}

export async function deleteTransfer(id: Id): Promise<BasicResponse> {
  return axios.delete(`${API_ROUTE_CONFIG.CASH_TRANSFERS}/${id}`);
}

/* ===================== Export tiện dụng ===================== */
const cashApi = {
  // accounts
  listCashAccounts,
  getCashAccountOptions,
  createCashAccount,
  updateCashAccount,
  deleteCashAccount,
  // aliases
  listCashAliases,
  createCashAlias,
  updateCashAlias,
  deleteCashAlias,
  // ledger/balances
  listCashLedger,
  getCashBalances,
  getCashBalanceSummary,

    // audit delta
  auditReceiptsDelta,
  fixReceiptsDelta,

  // internal transfers
  listTransfers,
  createTransfer,
  showTransfer,
  postTransfer,
  unpostTransfer,
  deleteTransfer,
};

export default cashApi;
