/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";
import type { ApiResponseSuccess } from "../types/index.type";
import { API_ROUTE_CONFIG } from "../configs/api-route-config";
import { handleAxiosError } from "../helpers/axiosHelper";

/** Payload gửi khi checkin/checkout */
export type AttendanceCheckPayload = {
  lat: number;
  lng: number;
  accuracy_m?: number;
  device_id?: string;

  /**
   * Ảnh selfie dạng base64 (chỉ phần base64, KHÔNG kèm prefix data:image/...)
   */
  face_image_base64: string;

  /**
   * ID địa điểm chấm công đang chọn trên UI
   */
  workpoint_id?: number;

  /**
   * Sau khi checkin/checkout có recompute bảng công ngay không
   */
  also_timesheet?: boolean;

  /**
   * Sau khi checkout có recompute payroll không
   */
  also_payroll?: boolean;
};

/** Item chấm công trả về từ API list */
export type AttendanceItem = {
  id: number;
  user_id?: number;
  user_name?: string | null;

  type: "checkin" | "checkout";
  checked_at: string | null; // ISO

  lat: number;
  lng: number;
  distance_m: number;
  within: boolean;

  accuracy_m?: number | null;
  device_id?: string | null;
  ip?: string | null;
  ghi_chu?: string | null;
  short_desc?: string | null;

  ngay?: string | null;     // YYYY-MM-DD
  gio_phut?: string | null; // HH:mm
  weekday?: string | null;

  /** Địa điểm */
  workpoint_id?: number | null;
  workpoint_ten?: string | null;
};

/** Kết quả phân trang chung */
export type AttendancePagination = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  has_more: boolean;
};

/** Filter list */
export type AttendanceListFilter = {
  user_id?: number | null;
  from?: string;
  to?: string;
  type?: "checkin" | "checkout" | null;
  within?: 0 | 1 | null;
  order?: "asc" | "desc" | null;
};

/** Response lịch sử (me/admin) */
export type AttendanceListResponse = {
  filter?: AttendanceListFilter;
  pagination: AttendancePagination;
  items: AttendanceItem[];
};

/** Dữ liệu log sau khi checkin/checkout */
export type AttendanceActionLog = {
  id: number;
  desc: string;
  checked_at: string;
  distance_m: number;
  within: boolean;
  face_score?: number;
  face_ok?: boolean | null;
  face_error?: string | null;
};

/** Địa điểm trả kèm sau action */
export type AttendanceActionWorkpoint = {
  id: number;
  ten: string | null;
  ban_kinh_m: number;
};

/** Trạng thái session */
export type AttendanceActionSession = {
  open: boolean;
  existing: boolean;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  closed_checkin_id?: number;
};

/** Kết quả recompute */
export type AttendanceRecomputed = {
  cycle?: string | null;
  timesheet?: boolean;
  payroll?: boolean;
  requested_ts?: boolean;
  requested_pr?: boolean;
};

export type AttendanceCheckinResponse = {
  log: AttendanceActionLog;
  workpoint?: AttendanceActionWorkpoint;
  session?: AttendanceActionSession;
  debug?: any;
};

export type AttendanceCheckoutResponse = {
  log: AttendanceActionLog;
  workpoint?: AttendanceActionWorkpoint;
  session?: AttendanceActionSession;
  recomputed?: AttendanceRecomputed;
  debug?: any;
};

/** CHECK-IN: POST /nhan-su/cham-cong/checkin */
export const attendanceCheckin = async (payload: AttendanceCheckPayload) => {
  try {
    const resp: ApiResponseSuccess<AttendanceCheckinResponse> = await axios.post(
      API_ROUTE_CONFIG.NHAN_SU_CHAM_CONG_CHECKIN,
      payload
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

/** CHECK-OUT: POST /nhan-su/cham-cong/checkout */
export const attendanceCheckout = async (payload: AttendanceCheckPayload) => {
  try {
    const resp: ApiResponseSuccess<AttendanceCheckoutResponse> = await axios.post(
      API_ROUTE_CONFIG.NHAN_SU_CHAM_CONG_CHECKOUT,
      payload
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

/** ME: GET /nhan-su/cham-cong/me */
export const attendanceGetMy = async (params?: {
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
  type?: "checkin" | "checkout";
  within?: 0 | 1;
  order?: "asc" | "desc";
}) => {
  try {
    const resp: ApiResponseSuccess<AttendanceListResponse> = await axios.get(
      API_ROUTE_CONFIG.NHAN_SU_CHAM_CONG_ME,
      { params }
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};

/** ADMIN: GET /nhan-su/cham-cong */
export const attendanceGetAdmin = async (params?: {
  user_id?: number;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
  type?: "checkin" | "checkout";
  within?: 0 | 1;
  order?: "asc" | "desc";
}) => {
  try {
    const resp: ApiResponseSuccess<AttendanceListResponse> = await axios.get(
      API_ROUTE_CONFIG.NHAN_SU_CHAM_CONG_ADMIN,
      { params }
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};