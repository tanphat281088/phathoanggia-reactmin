/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "../configs/axios";

/**
 * Base path cho Báo cáo Khách hàng.
 * (Tương tự như FIN_BASE trong finance-report.api.ts)
 */
const CUST_BASE = "/bao-cao-quan-tri/khach-hang";

/* =============== Types =============== */

export type CustomerKpi = {
  total_customers: number;
  active_customers: number;
  new_customers: number;
  customers_with_orders_period: number;
  first_time_buyers_period: number;
  returning_customers_period: number;
  repeat_rate_period: number;            // 0..1
  customers_with_points: number;
  avg_points_per_customer: number;
  total_revenue_lifetime: number;
  revenue_period: number;
  avg_revenue_per_customer: number;
  avg_orders_per_customer: number;
};

export type CustomerSegmentTier = {
  tier_id: number;
  tier_name: string;
  tier_group: "bronze" | "silver" | "gold" | "platinum" | string;
  gia_tri_uu_dai_pct: number;
  threshold_revenue: number;
  threshold_points: number;
  customer_count: number;
  active_customer_count: number;
  revenue_lifetime: number;
  avg_revenue_lifetime: number;
  revenue_period: number;
  orders_period: number;
  avg_order_value_period: number;
};

export type CustomerSegmentMode = {
  mode: 0 | 1;
  label: string;
  customer_count: number;
  revenue_lifetime: number;
  revenue_period: number;
  orders_period: number;
  avg_order_value_period: number;
};

export type CustomerSegmentChannel = {
  kenh: string;
  customer_count: number;
  new_customers_period: number;
  revenue_lifetime: number;
  revenue_period: number;
  orders_period: number;
  avg_order_value_period: number;
  customers_with_orders_period: number;
  repeat_customers_period: number;
  repeat_rate_period_by_channel: number; // 0..1
};

export type CustomerSegments = {
  by_tier: CustomerSegmentTier[];
  by_mode: CustomerSegmentMode[];
  by_channel: CustomerSegmentChannel[];
};

export type CustomerTopItem = {
  khach_hang_id: number;
  ma_kh: string | null;
  ten_khach_hang: string | null;
  so_dien_thoai: string | null;
  kenh_lien_he: string | null;
  customer_mode: number;
  loai_khach_hang: string | null;
  tier_group: string;
  total_revenue: number;
  total_orders: number;
  aov: number;
  last_order_date: string | null;
  current_points: number;
};

export type CustomerTopCustomers = {
  lifetime: CustomerTopItem[];
  period: CustomerTopItem[];
};

export type PointsZnsStats = {
  total_events_lifetime: number;
  total_events_period: number;
  events_sent_lifetime: number;
  events_failed_lifetime: number;
  events_pending_lifetime: number;
  events_sent_period: number;
  events_failed_period: number;
  events_pending_period: number;
  customers_with_events_lifetime: number;
  customers_with_events_period: number;
  customers_with_sent_period: number;
  coverage_rate_period: number;   // 0..1
  points_added_period: number;
  points_reversed_period: number; // thường âm
};

export type ReviewZnsStats = {
  invites_total_lifetime: number;
  invites_total_period: number;
  invites_pending_period: number;
  invites_sent_period: number;
  invites_failed_period: number;
  invites_cancelled_period: number;
  unique_customers_period: number;
  orders_with_invite_period: number;
  eligible_orders_period: number;
  coverage_rate_period: number; // 0..1
  success_rate_period: number;  // 0..1
};

export type MessagingStats = {
  points_zns: PointsZnsStats;
  review_zns: ReviewZnsStats;
};

export type BehaviorStats = {
  first_time_buyers_period: number;
  returning_customers_period: number;
  repeat_rate_period: number; // 0..1
  avg_days_between_orders: number | null;
  orders_per_customer_distribution: {
    one_time_buyers: number;
    two_to_three_orders: number;
    more_than_three_orders: number;
  };
  recency_segments: {
    active_0_30: number;
    warm_31_90: number;
    cold_91_plus: number;
  };
};

export type LoyaltyOverview = {
  total_points_all_customers: number;
  avg_points_per_customer: number;
  max_points_customer: {
    khach_hang_id: number;
    ma_kh: string | null;
    ten_khach_hang: string | null;
    so_dien_thoai: string | null;
    points: number;
  } | null;
};

export type LoyaltyStats = {
  overview: LoyaltyOverview;
  tier_summary: CustomerSegmentTier[]; // dùng lại by_tier
};

export type CustomerSummary = {
  params: {
    from: string;
    to: string;
  };
  kpi: CustomerKpi;
  segments: CustomerSegments;
  top_customers: CustomerTopCustomers;
  messaging: MessagingStats;
  behavior: BehaviorStats;
  loyalty: LoyaltyStats;
};

/* =============== API call =============== */

/**
 * GET /bao-cao-quan-tri/khach-hang/summary
 * - params: { from?: YYYY-MM-DD, to?: YYYY-MM-DD }
 * - BE bọc CustomResponse: { success, data }
 */
export const getCustomerSummary = async (params: { from?: string; to?: string }) => {
  const r = await axios.get(`${CUST_BASE}/summary`, { params });
  const data: CustomerSummary = r?.data?.data ?? r?.data;
  return { data };
};
