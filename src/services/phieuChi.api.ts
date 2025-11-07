// src/services/phieuChi.api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";
import { API_ROUTE_CONFIG } from "../configs/api-route-config";

/** ===================== Types ===================== **/
export type LoaiPhieuChi = 1 | 2 | 3 | 4; // 1=PNK, 2=Công nợ NCC, 3=Chi khác, 4=Nhiều PNK
export type PhuongThucThanhToan = 1 | 2; // 1=Tiền mặt, 2=Chuyển khoản

export interface PhieuNhapKhoThanhToanItem {
  id: number;
  so_tien_thanh_toan: number;
}

export interface PhieuChiModel {
  id: number;
  ma_phieu_chi: string;
  ngay_chi: string; // ISO yyyy-mm-dd
  loai_phieu_chi: LoaiPhieuChi;
  nha_cung_cap_id?: number | null;
  phieu_nhap_kho_id?: number | null;
  so_tien: number;
  nguoi_nhan?: string | null;
  phuong_thuc_thanh_toan: PhuongThucThanhToan;
  so_tai_khoan?: string | null;
  ngan_hang?: string | null;
  ly_do_chi?: string | null;
  ghi_chu?: string | null;
  category_id?: number | null;
  created_at?: string;
  updated_at?: string;
  // server có thể trả thêm 'images' và các field khác
  [k: string]: any;
}

export interface CreatePhieuChiPayload {
  ma_phieu_chi: string;
  ngay_chi: string; // yyyy-mm-dd
  loai_phieu_chi: LoaiPhieuChi;

  // Tùy loại:
  nha_cung_cap_id?: number | null; // (2)
  phieu_nhap_kho_id?: number | null; // (1)
  phieu_nhap_kho_ids?: PhieuNhapKhoThanhToanItem[]; // (4)

  so_tien: number; // required 1/2/3; (4) tính theo list
  nguoi_nhan?: string | null;

  phuong_thuc_thanh_toan: PhuongThucThanhToan;
  so_tai_khoan?: string | null;
  ngan_hang?: string | null;
  ly_do_chi?: string | null;
  ghi_chu?: string | null;

  // Mức A: bắt buộc khi loai_phieu_chi = 3, còn lại optional
  category_id?: number | null;
}

export interface Option {
  value: string | number;
  label: string;
  code?: string; // với danh mục chi, BE có trả kèm code
}

export interface ListParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  search?: string;
  [key: string]: any;
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

/** ===================== Helpers ===================== **/
const PATH = API_ROUTE_CONFIG.PHIEU_CHI;

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

/** ===================== API Phiếu chi ===================== **/
export async function listPhieuChi(
  params?: ListParams
): Promise<ListResponse<PhieuChiModel>> {
  const url = `${PATH}${buildQuery(params)}`;
  return axios.get(url);
}

export async function getPhieuChiOptions(): Promise<SingleResponse<Option[]>> {
  return axios.get(`${PATH}/options`);
}

export async function showPhieuChi(
  id: number
): Promise<SingleResponse<PhieuChiModel>> {
  return axios.get(`${PATH}/${id}`);
}

export async function postPhieuChi(id: number): Promise<SingleResponse<PhieuChiModel>> {
  return axios.post(`${PATH}/${id}/post`);
}

export async function unpostPhieuChi(id: number): Promise<SingleResponse<PhieuChiModel>> {
  return axios.post(`${PATH}/${id}/unpost`);
}


export async function createPhieuChi(
  payload: CreatePhieuChiPayload
): Promise<SingleResponse<PhieuChiModel>> {
  return axios.post(PATH, payload);
}

export async function deletePhieuChi(id: number): Promise<BasicResponse> {
  return axios.delete(`${PATH}/${id}`);
}

export async function downloadTemplatePhieuChi(): Promise<Blob> {
  // Server trả file download
  const res = await axios.get(`${PATH}/download-template-excel`, {
    responseType: "blob",
  });
  return res as unknown as Blob;
}

export async function importPhieuChi(formData: FormData): Promise<BasicResponse> {
  return axios.post(`${PATH}/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** ===================== API Danh mục chi (CHA → CON) ===================== **/
export async function getExpenseCategoryParents(): Promise<
  SingleResponse<Option[]>
> {
  return axios.get(API_ROUTE_CONFIG.EXPENSE_CATEGORIES_PARENTS);
}

export async function getExpenseCategoryOptions(
  parent: string | number
): Promise<SingleResponse<Option[]>> {
  const key = /^\d+$/.test(String(parent)) ? "parent_id" : "parent_code";
  const url = `${API_ROUTE_CONFIG.EXPENSE_CATEGORIES_PARENTS.replace("/parents","/options")}?${key}=${parent}`;
  return axios.get(url);
}


/** ===================== Export tiện dụng ===================== **/
export default {
  listPhieuChi,
  getPhieuChiOptions,
  showPhieuChi,
  createPhieuChi,
  deletePhieuChi,
  downloadTemplatePhieuChi,
  importPhieuChi,
  getExpenseCategoryParents,
  getExpenseCategoryOptions,
};
