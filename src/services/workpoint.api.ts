/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";
import type { ApiResponseSuccess } from "../types/index.type";
import { handleAxiosError } from "../helpers/axiosHelper";

export type WorkpointType = "fixed" | "event";
export type WorkpointSource = "system" | "manual" | "mobile";

/**
 * WorkpointItem:
 * - Dùng cho cả địa điểm cố định và địa điểm event phát sinh
 */
export type WorkpointItem = {
  id: number;
  ma_dia_diem?: string | null;

  ten: string;
  dia_chi?: string | null;
  ghi_chu?: string | null;

  lat: number;
  lng: number;
  ban_kinh_m: number;
  trang_thai: number;

  loai_dia_diem?: WorkpointType | null;
  loai_label?: string | null;
  nguon_tao?: WorkpointSource | null;
  created_by?: number | null;

  hieu_luc_tu?: string | null;
  hieu_luc_den?: string | null;

  available_now?: boolean;
  expired?: boolean;

  /** khoảng cách từ vị trí hiện tại tới địa điểm, nếu BE có trả */
  distance_m?: number | null;
};

export type WorkpointListParams = {
  lat?: number;
  lng?: number;
  q?: string;
  type?: WorkpointType;
  only_available?: boolean;
  limit?: number;
};

export type WorkpointListResponse = {
  filter?: {
    lat?: number | null;
    lng?: number | null;
    q?: string | null;
    type?: WorkpointType | null;
    only_available?: boolean;
    limit?: number;
  };
  items: WorkpointItem[];
};

export type WorkpointCreatePayload = {
  ten: string;
  lat: number;
  lng: number;
  ban_kinh_m?: number;
  dia_chi?: string;
  ghi_chu?: string;
};

const WORKPOINT_PATH = "/nhan-su/workpoints";

/**
 * Lấy danh sách địa điểm chấm công
 * - Có thể truyền lat/lng để BE sort theo khoảng cách
 * - Có thể filter fixed/event
 * - Mặc định chỉ lấy điểm còn hiệu lực
 */
export const workpointList = async (params?: WorkpointListParams) => {
  try {
    const resp: ApiResponseSuccess<WorkpointListResponse> = await axios.get(
      WORKPOINT_PATH,
      { params }
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

/**
 * Tạo địa điểm chấm công mới (event site)
 * - Nếu gần một điểm đã có, BE có thể trả reused=true và item hiện có
 */
export const workpointCreate = async (payload: WorkpointCreatePayload) => {
  try {
    const resp: ApiResponseSuccess<{
      item: WorkpointItem;
      notice: string;
      reused?: boolean;
    }> = await axios.post(WORKPOINT_PATH, payload);

    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};