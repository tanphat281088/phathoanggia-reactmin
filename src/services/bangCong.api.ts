/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";

const RECOMPUTE_TIMEOUT = 25_000; // 25s: tránh cảm giác "đơ" khi BE chạy lâu

// ✅ Chuẩn phút công/kỳ: 28 ngày * 8h * 60p = 13.440 phút
export const STANDARD_WORK_MINUTES = 28 * 8 * 60; // 13440

export type BangCongItem = {
  id: number;
  user_id: number;
  user_name?: string | null;
  thang: string; // 'YYYY-MM'
  so_ngay_cong: number;
  so_gio_cong: number; // ⚠️ đang là PHÚT công (không phải giờ)
  di_tre_phut: number;
  ve_som_phut: number;
  nghi_phep_ngay: number;
  nghi_phep_gio: number;
  nghi_khong_luong_ngay: number;
  nghi_khong_luong_gio: number;
  lam_them_gio: number; // ⚠️ cũng đang là PHÚT OT (rule timesheet), không phải giờ
  locked: boolean;
  computed_at?: string | null;
  ghi_chu?: any;
  created_at?: string | null;
  updated_at?: string | null;
};

/**
 * Helper: trả về thống kê phút công để UI hiển thị
 * - standard_minutes: số phút công tiêu chuẩn/kỳ (mặc định 13.440)
 * - actual_minutes:  số phút công thực tế từ bảng công
 * - ot_minutes:      số phút tăng ca = max(0, actual - standard)
 * - deficit_minutes: số phút thiếu = max(0, standard - actual)
 */
export function computeTimesheetMinuteStats(item: BangCongItem | null | undefined) {
  const standard_minutes = STANDARD_WORK_MINUTES;
  const actual_minutes = item ? Math.max(0, item.so_gio_cong || 0) : 0;

  const ot_minutes = Math.max(0, actual_minutes - standard_minutes);
  const deficit_minutes = Math.max(0, standard_minutes - actual_minutes);

  return {
    standard_minutes,
    actual_minutes,
    ot_minutes,
    deficit_minutes,
  };
}

export async function timesheetMy(thang?: string) {
  const { data } = await axios.get("/nhan-su/bang-cong/my", { params: { thang } });
  return data as { success: boolean; data: { thang: string; item: BangCongItem | null } };
}

export async function timesheetAdmin(params: { user_id: number; thang?: string }) {
  const { data } = await axios.get("/nhan-su/bang-cong", { params });
  return data as { success: boolean; data: { user_id: number; thang: string; item: BangCongItem | null } };
}

// Gửi JSON để BE parse đúng boolean also_payroll; có timeout để tránh "đơ" UI
export async function timesheetRecompute(params: {
  thang?: string;
  user_id?: number;
  also_payroll?: boolean; // true = sau khi tổng hợp công thì chạy luôn Payroll
}) {
  const payload = {
    thang: params.thang,
    user_id: params.user_id,
    also_payroll: params.also_payroll ?? false,
  };

  const { data } = await axios.post("/nhan-su/bang-cong/recompute", payload, {
    timeout: RECOMPUTE_TIMEOUT,
  });
  return data;
}
