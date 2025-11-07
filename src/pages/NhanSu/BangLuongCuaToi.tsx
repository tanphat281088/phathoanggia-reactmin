import React, { useEffect, useMemo, useState } from "react";
import { Card, Grid, List, SpinLoading, Toast, Button } from "antd-mobile";

import dayjs from "dayjs";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

const monthFormat = "YYYY-MM";
// YYYY-MM ↔ Date helpers (không phụ thuộc dayjs trong DatePicker)
const toYm = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;

const fromYm = (ym: string) => {
  const y = Number(ym.slice(0, 4)) || new Date().getFullYear();
  const m = Number(ym.slice(5, 7)) - 1;
  return new Date(y, isNaN(m) ? 0 : m, 1);
};


function fmtMoney(v?: number | null) {
  if (v == null) return "0";
  try {
    return (v as number).toLocaleString("vi-VN");
  } catch {
    return String(v);
  }
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between py-1">
    <div className="text-[13px] text-gray-500">{label}</div>
    <div className="text-[13px] font-medium">{value}</div>
  </div>
);

export default function BangLuongCuaToi() {
  const [thang, setThang] = useState<string>(dayjs().format(monthFormat));
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any | null>(null);

  const fetchData = async (ym: string) => {
    setLoading(true);
    try {
      const { data } = await axios.get(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_MY, {
        params: { thang: ym },
      });
      if (data?.success) {
        setData(data.data?.item || null);
      } else {
        Toast.show({ content: data?.message || "Không lấy được dữ liệu", position: "bottom" });
        setData(null);
      }
    } catch (e: any) {
      Toast.show({ content: e?.message || "Lỗi tải dữ liệu", position: "bottom" });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(thang);
  }, [thang]);
const header = useMemo(
  () => (
    <div className="mb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-base font-semibold">Bảng lương của tôi</div>
        <input
          type="month"
          className="border rounded px-2 py-1 text-sm"
          value={thang}
        onChange={(e) => setThang(e.target.value || new Date().toISOString().slice(0,7))}
        />
      </div>
    </div>
  ),
  [thang]
);


  if (loading) {
    return (
      <div className="p-4">
        {header}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SpinLoading /> Đang tải…
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        {header}
        <Card>
          <div className="text-sm text-gray-500">Chưa có dữ liệu lương cho kỳ {thang}.</div>
        </Card>
      </div>
    );
  }

  const tongBH = (data.bhxh || 0) + (data.bhyt || 0) + (data.bhtn || 0);

  return (
    <div className="p-4">
      {header}
      <Grid columns={2} gap={8}>
        <Grid.Item>
          <Card>
            <div className="text-[13px] text-gray-500 mb-2">Cấu hình & Công</div>
            <Row label="Tháng" value={data.thang} />
            <Row label="Công chuẩn" value={data.cong_chuan} />
            <Row label="Ngày công" value={data.so_ngay_cong} />
            <Row label="Giờ công" value={data.so_gio_cong} />
            <Row label="Lương cơ bản" value={fmtMoney(data.luong_co_ban)} />
            <Row label="Hệ số" value={Number(data.he_so).toFixed(2)} />
            <Row label="Khóa" value={data.locked ? "Đã khóa" : "Chưa khóa"} />
            <Row label="Tính lúc" value={data.computed_at || "-"} />
          </Card>
        </Grid.Item>
        <Grid.Item>
          <Card>
            <div className="text-[13px] text-gray-500 mb-2">Cộng/Trừ</div>
            <Row label="Phụ cấp" value={fmtMoney(data.phu_cap)} />
            <Row label="Thưởng" value={fmtMoney(data.thuong)} />
            <Row label="Phạt" value={fmtMoney(data.phat)} />
            <Row label="BHXH" value={fmtMoney(data.bhxh)} />
            <Row label="BHYT" value={fmtMoney(data.bhyt)} />
            <Row label="BHTN" value={fmtMoney(data.bhtn)} />
            <Row label="Khấu trừ khác" value={fmtMoney(data.khau_tru_khac)} />
            <Row label="Tạm ứng" value={fmtMoney(data.tam_ung)} />
          </Card>
        </Grid.Item>
      </Grid>

      <div className="mt-3">
        <Card>
          <List header="Kết quả">
            <List.Item extra={`${fmtMoney(data.luong_theo_cong)} đ`}>Lương theo công</List.Item>
            <List.Item extra={`${fmtMoney(tongBH)} đ`}>Tổng bảo hiểm</List.Item>
            <List.Item extra={<b className="text-base">{fmtMoney(data.thuc_nhan)} đ</b>}>
              <b>Thực nhận</b>
            </List.Item>
          </List>
        </Card>
      </div>
    </div>
  );
}
