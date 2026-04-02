/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";
import { API_ROUTE_CONFIG } from "../configs/api-route-config";
import { handleAxiosError } from "../helpers/axiosHelper";
import type { ApiResponseSuccess } from "../types/index.type";

export type CompanyNoticeStatus = "draft" | "published" | "archived";

export type CompanyNoticeItem = {
  id: number;
  tieu_de: string;
  tom_tat?: string | null;
  noi_dung?: string | null;
  trang_thai: CompanyNoticeStatus;
  ghim_dau: boolean;
  publish_at?: string | null;
  expires_at?: string | null;
  has_attachment: boolean;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  attachment_endpoint?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CompanyNoticeListResponse = {
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    has_more: boolean;
  };
  items: CompanyNoticeItem[];
};

export type CompanyNoticeUpsertPayload = {
  tieu_de: string;
  tom_tat?: string;
  noi_dung?: string;
  trang_thai: CompanyNoticeStatus;
  ghim_dau?: boolean;
  publish_at?: string;
  expires_at?: string;
  attachment?: File | null;
};

const buildFormData = (payload: CompanyNoticeUpsertPayload) => {
  const fd = new FormData();
  fd.append("tieu_de", payload.tieu_de);
  fd.append("trang_thai", payload.trang_thai);
  fd.append("ghim_dau", payload.ghim_dau ? "1" : "0");

  if (payload.tom_tat !== undefined) fd.append("tom_tat", payload.tom_tat || "");
  if (payload.noi_dung !== undefined) fd.append("noi_dung", payload.noi_dung || "");
  if (payload.publish_at) fd.append("publish_at", payload.publish_at);
  if (payload.expires_at) fd.append("expires_at", payload.expires_at);
  if (payload.attachment) fd.append("attachment", payload.attachment);

  return fd;
};

export const companyNoticeList = async (params?: {
  q?: string;
  page?: number;
  per_page?: number;
}) => {
  try {
    const resp: ApiResponseSuccess<CompanyNoticeListResponse> = await axios.get(
      API_ROUTE_CONFIG.NHAN_SU_THONG_BAO,
      { params }
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const companyNoticeShow = async (id: number | string) => {
  try {
    const resp: ApiResponseSuccess<{ item: CompanyNoticeItem }> = await axios.get(
      API_ROUTE_CONFIG.NHAN_SU_THONG_BAO_ID(id)
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const companyNoticeDownload = async (id: number | string) => {
  try {
    const blob: any = await axios.get(API_ROUTE_CONFIG.NHAN_SU_THONG_BAO_FILE(id), {
      responseType: "blob" as any,
    });
    return blob instanceof Blob ? blob : new Blob([blob]);
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const companyNoticeAdminList = async (params?: {
  q?: string;
  trang_thai?: string;
  page?: number;
  per_page?: number;
}) => {
  try {
    const resp: ApiResponseSuccess<CompanyNoticeListResponse> = await axios.get(
      API_ROUTE_CONFIG.NHAN_SU_THONG_BAO_ADMIN,
      { params }
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const companyNoticeAdminShow = async (id: number | string) => {
  try {
    const resp: ApiResponseSuccess<{ item: CompanyNoticeItem }> = await axios.get(
      API_ROUTE_CONFIG.NHAN_SU_THONG_BAO_ADMIN_ID(id)
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const companyNoticeAdminCreate = async (payload: CompanyNoticeUpsertPayload) => {
  try {
    const resp: ApiResponseSuccess<{ item: CompanyNoticeItem }> = await axios.post(
      API_ROUTE_CONFIG.NHAN_SU_THONG_BAO_ADMIN,
      buildFormData(payload),
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const companyNoticeAdminUpdate = async (
  id: number | string,
  payload: CompanyNoticeUpsertPayload
) => {
  try {
    const resp: ApiResponseSuccess<{ item: CompanyNoticeItem }> = await axios.patch(
      API_ROUTE_CONFIG.NHAN_SU_THONG_BAO_ADMIN_ID(id),
      buildFormData(payload),
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const companyNoticeAdminDelete = async (id: number | string) => {
  try {
    const resp: ApiResponseSuccess<any> = await axios.delete(
      API_ROUTE_CONFIG.NHAN_SU_THONG_BAO_ADMIN_ID(id)
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const companyNoticeAdminDownload = async (id: number | string) => {
  try {
    const blob: any = await axios.get(API_ROUTE_CONFIG.NHAN_SU_THONG_BAO_ADMIN_FILE(id), {
      responseType: "blob" as any,
    });
    return blob instanceof Blob ? blob : new Blob([blob]);
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};
