/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";
import type { ApiResponseSuccess } from "../types/index.type";
import { handleAxiosError } from "../helpers/axiosHelper";

/** Thống kê theo 1 ngày cho 1 NV tại 1 địa điểm */
export type EventAttendanceDayStats = {
  minutes: number;
  checkin_at: string;   // "YYYY-MM-DD HH:mm:ss"
  checkout_at: string;  // "YYYY-MM-DD HH:mm:ss"
};

/** Tổng hợp theo (workpoint, user) trong khoảng from..to */
export type EventAttendanceItem = {
  workpoint: {
    id: number;
    ten: string | null;
    lat: number | null;
    lng: number | null;
    ban_kinh_m: number | null;
  };
  user: {
    id: number;
    name: string | null;
    email: string | null;
  };
  stats: {
    total_minutes: number;      // tổng phút làm việc
    total_days: number;         // tổng số ngày có đủ in-out
    first_checkin: string | null;
    last_checkout: string | null;
  };
  by_days: Record<string, EventAttendanceDayStats>; // key = "YYYY-MM-DD"
};

/** Payload report BE trả về */
export type EventAttendanceReport = {
  range: [string, string];  // [from, to] dạng YYYY-MM-DD
  workpoint: number | null; // workpoint_id filter (nếu có)
  user: number | null;      // user_id filter (nếu có)
  items: EventAttendanceItem[];
};

/** Wrapper BE trả về: { filter, data } */
export type EventAttendanceReportResponse = {
  filter: {
    from: string;
    to: string;
    workpoint_id: number | null;
    user_id: number | null;
  };
  data: EventAttendanceReport;
};

/**
 * Gọi API báo cáo chấm công event:
 * GET /api/bao-cao-quan-tri/cham-cong-event?from=&to=&workpoint_id=&user_id=
 */
export const fetchEventAttendanceReport = async (params?: {
  from?: string;         // YYYY-MM-DD
  to?: string;           // YYYY-MM-DD
  workpoint_id?: number; // optional
  user_id?: number;      // optional
}) => {
  try {
    const resp: ApiResponseSuccess<EventAttendanceReportResponse> = await axios.get(
      "/bao-cao-quan-tri/cham-cong-event",
      { params }
    );
    return resp;
  } catch (error: any) {
    handleAxiosError(error);
    throw error;
  }
};
