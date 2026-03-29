/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";
import type { ApiResponseSuccess } from "../types/index.type";
import { API_ROUTE_CONFIG } from "../configs/api-route-config";
import { handleAxiosError } from "../helpers/axiosHelper";

export type WorkpointManageItem = {
  id: number;
  ma_dia_diem?: string | null;
  ten: string;
  loai_dia_diem?: "fixed" | "event" | null;
  loai_label?: string | null;
  nguon_tao?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  dia_chi?: string | null;
  ghi_chu?: string | null;
  lat: number;
  lng: number;
  ban_kinh_m: number;
  trang_thai: number;
  trang_thai_label?: string | null;
  hieu_luc_tu?: string | null;
  hieu_luc_den?: string | null;
  available_now?: boolean;
  expired?: boolean;
  cham_congs_count?: number;
  can_delete?: boolean;
  delete_mode?: "delete" | "archive";
};

export type WorkpointManageListResponse = {
  filter?: {
    q?: string | null;
    type?: "fixed" | "event" | null;
    status?: number | null;
    expired?: number | null;
    page?: number;
    per_page?: number;
  };
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    has_more: boolean;
  };
  items: WorkpointManageItem[];
  role?: {
    admin?: boolean;
    manager?: boolean;
  };
};

export const workpointManageList = async (params?: any) => {
  try {
    const resp: ApiResponseSuccess<WorkpointManageListResponse> = await axios.get(
      API_ROUTE_CONFIG.NHAN_SU_WORKPOINT_MANAGE,
      { params }
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const workpointManageCreate = async (payload: any) => {
  try {
    const resp: ApiResponseSuccess<{ item: WorkpointManageItem }> = await axios.post(
      API_ROUTE_CONFIG.NHAN_SU_WORKPOINT_MANAGE,
      payload
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const workpointManageUpdate = async (id: number | string, payload: any) => {
  try {
    const resp: ApiResponseSuccess<{ item: WorkpointManageItem }> = await axios.put(
      API_ROUTE_CONFIG.NHAN_SU_WORKPOINT_MANAGE_ID(id),
      payload
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

export const workpointManageDelete = async (id: number | string) => {
  try {
    const resp: ApiResponseSuccess<{ mode: "delete" | "archive"; message?: string }> = await axios.delete(
      API_ROUTE_CONFIG.NHAN_SU_WORKPOINT_MANAGE_ID(id)
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};
