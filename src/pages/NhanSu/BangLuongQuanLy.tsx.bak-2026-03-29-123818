import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Dialog, Form, Input, List, Modal, Space, SpinLoading, Toast } from "antd-mobile";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { DatePicker, Select } from "antd";
import dayjs from "dayjs";

type RowItem = {
  id: number;
  user_id: number;
  user_name?: string | null;
  thang: string;
  luong_co_ban: number;
  cong_chuan: number;
  he_so: number;
  so_ngay_cong: number;
  so_gio_cong: number;
  phu_cap: number;
  thuong: number;
  phat: number;
  luong_theo_cong: number;
  bhxh: number;
  bhyt: number;
  bhtn: number;
  khau_tru_khac: number;
  tam_ung: number;
  thuc_nhan: number;
  locked: boolean;
  computed_at?: string | null;
  ghi_chu?: string | null;
  metrics?: any; // NEW: std_minutes, actual_minutes, ot_minutes, unit_base_min, ot_rate_per_min, ot_amount, ...
};

function fmtMoney(v?: number | null) {
  if (v == null) return "0";
  try {
    return (v as number).toLocaleString("vi-VN");
  } catch {
    return String(v);
  }
}

export default function BangLuongQuanLy() {
  // YYYY-MM mặc định theo ngày hiện tại
  const [thang, setThang] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState<boolean>(false);
  const [items, setItems] = useState<RowItem[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [detail, setDetail] = useState<RowItem | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);

  const [updOpen, setUpdOpen] = useState<boolean>(false);
  const [updForm] = Form.useForm();

  // Modal chọn nhân viên
  const [pickOpen, setPickOpen] = useState<boolean>(false);
  const [usersFallback, setUsersFallback] = useState<{ value: number; label: string }[]>([]);

  const userOptions = useMemo(
    () =>
      items.map((i) => ({
        label: i.user_name || `#${i.user_id}`,
        value: i.user_id,
      })),
    [items]
  );

  const header = useMemo(
    () => (
      <div className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Cụm trái: tiêu đề + chọn tháng */}
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold">Bảng lương (Quản lý)</div>

            {/* Chọn tháng */}
            <DatePicker
              picker="month"
              format="MM/YYYY"
              value={dayjs(thang + "-01")}
              onChange={(d) => {
                const v = d ? d.format("YYYY-MM") : dayjs().format("YYYY-MM");
                setThang(v);
              }}
              allowClear={false}
              size="small"
            />

            {/* Chọn nhanh nhân viên (Select + fallback) */}
            <Select
              key={`sel-${thang}-${items.length}-${usersFallback.length}`}
              style={{ minWidth: 220 }}
              placeholder="Chọn nhân viên"
              size="small"
              showSearch
              optionFilterProp="label"
              options={
                items.length
                  ? items.map((i) => ({ label: i.user_name || `#${i.user_id}`, value: i.user_id }))
                  : usersFallback
              }
              onChange={(val) => {
                if (val) onShowDetail(Number(val));
              }}
            />
          </div>

          {/* Cụm phải: action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="small" color="primary" onClick={() => onRecompute()}>
              Tính lại tháng
            </Button>
            <Button size="small" color="warning" onClick={() => onLockToggle(true)}>
              Khóa tháng
            </Button>
            <Button size="small" color="success" onClick={() => onLockToggle(false)}>
              Mở khóa tháng
            </Button>
            <Button
              size="small"
              onClick={() => {
                const hasSnapshot = items.length > 0;
                const hasFallback = usersFallback.length > 0;
                if (!hasSnapshot && !hasFallback) {
                  Toast.show({
                    content: `Chưa có danh sách nhân viên cho kỳ ${thang}. Bấm "Tính lại tháng" hoặc kiểm tra quyền truy cập.`,
                    position: "bottom",
                  });
                  return;
                }
                setPickOpen(true);
              }}
            >
              Chọn nhân viên…
            </Button>
          </div>
        </div>
      </div>
    ),
    [thang, items, userOptions, usersFallback]
  );

  const fetchList = async () => {
    setLoading(true);
    try {
      const res: any = await axios.get(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_LIST, {
        params: { thang, page: 1, per_page: 200 },
      });

      const ok = res?.success === true;
      const list = ok ? (res?.data?.items ?? []) : [];
      setItems(Array.isArray(list) ? list : []);
      const ttl = ok ? (res?.data?.pagination?.total ?? list.length) : 0;
      setTotal(ttl);

      if (!list || list.length === 0) {
        await fetchUsersFallback();
      } else {
        setUsersFallback([]);
      }

      if (!ok) {
        Toast.show({ content: res?.message || "Không lấy được dữ liệu", position: "bottom" });
      }
    } catch (e: any) {
      Toast.show({ content: e?.message || "Lỗi tải dữ liệu", position: "bottom" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thang]);

  useEffect(() => {
    fetchUsersFallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsersFallback = async () => {
    try {
      const res1: any = await axios.get(API_ROUTE_CONFIG.NGUOI_DUNG, { params: { page: 1, per_page: 200 } });
      const list1 =
        (Array.isArray(res1?.data?.collection) && res1.data.collection) ||
        (Array.isArray(res1?.data?.items) && res1.data.items) ||
        (Array.isArray(res1?.data?.data) && res1.data.data) ||
        (Array.isArray(res1?.collection) && res1.collection) ||
        (Array.isArray(res1?.items) && res1.items) ||
        (Array.isArray(res1?.data) && res1.data) ||
        [];
      if (list1.length) {
        setUsersFallback(
          list1.map((u: any) => ({
            value: u.id,
            label: u.name || u.email || `#${u.id}`,
          }))
        );
        return;
      }
    } catch (e) {
      console.warn("[fallback] /nguoi-dung fail -> thử payroll list", e);
    }
    try {
      const res2: any = await axios.get(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_LIST, {
        params: { thang, page: 1, per_page: 200 },
      });
      const list2 = (res2?.data?.items ?? []) as any[];
      setUsersFallback(
        list2.map((it: any) => ({
          value: it.user_id,
          label: it.user_name || `#${it.user_id}`,
        }))
      );
    } catch (e) {
      console.error("[fallback] payroll list fail", e);
      setUsersFallback([]);
    }
  };

  const onShowDetail = async (user_id: number) => {
    try {
      const res: any = await axios.get(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG, {
        params: { thang, user_id },
      });
      if (res?.success) {
        setDetail(res.data?.item || null);
        setDetailOpen(true);
      } else {
        Toast.show({ content: res?.message || "Không lấy được chi tiết", position: "bottom" });
      }
    } catch (e: any) {
      Toast.show({ content: e?.message || "Lỗi chi tiết", position: "bottom" });
    }
  };

  // ===== Tính lại bảng lương (KHÔNG dùng Dialog.confirm) =====
  const onRecompute = async (user_id?: number) => {
    console.log("[BangLuongQuanLy] onRecompute CLICK", { thang, user_id });
    try {
      await axios.post(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_RECOMPUTE, null, {
        params: { thang, user_id },
      });
      Toast.show({ content: "Đã chạy tính lại", position: "bottom" });
      fetchList();
      if (user_id && detail?.user_id === user_id) {
        onShowDetail(user_id);
      }
    } catch (e: any) {
      console.error("[BangLuongQuanLy] onRecompute ERROR", e);
      Toast.show({ content: e?.message || "Lỗi tính lại", position: "bottom" });
    }
  };

  // ===== Khóa / Mở khóa bảng lương (KHÔNG dùng Dialog.confirm) =====
  const onLockToggle = async (lockState: boolean, user_id?: number) => {
    console.log("[BangLuongQuanLy] onLockToggle CLICK", { thang, user_id, lockState });
    try {
      await axios.patch(
        lockState
          ? API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_LOCK
          : API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_UNLOCK,
        null,
        { params: { thang, user_id } }
      );
      Toast.show({
        content: lockState ? "Đã khóa bảng lương" : "Đã mở khóa bảng lương",
        position: "bottom",
      });
      fetchList();
      if (user_id && detail?.user_id === user_id) {
        onShowDetail(user_id);
      }
    } catch (e: any) {
      console.error("[BangLuongQuanLy] onLockToggle ERROR", e);
      Toast.show({ content: e?.message || "Lỗi khóa/mở khóa", position: "bottom" });
    }
  };

// ===== Export Excel / PDF =====
const exportPayroll = (format: "csv" | "html" | "pdf", userId: number) => {
  // Lấy baseURL đang dùng cho axios (vd: https://api.phgfloral.com/api)
  const base = (axios.defaults.baseURL || "").replace(/\/$/, ""); // bỏ dấu / cuối nếu có

  // Gọi đúng vào API backend: {base}/reports/payroll/export
  const url = `${base}/reports/payroll/export?user_id=${userId}&thang=${thang}&format=${format}`;

  window.open(url, "_blank");
};


  const openUpdate = (r: RowItem) => {
    setDetail(r);
    updForm.setFieldsValue({
      phu_cap: r.phu_cap,
      thuong: r.thuong,
      phat: r.phat,
      tam_ung: r.tam_ung,
      khau_tru_khac: r.khau_tru_khac,
      ghi_chu: r.ghi_chu || "",
    });
    setUpdOpen(true);
  };

  const submitUpdate = async () => {
    const v = await updForm.validateFields();
    try {
      await axios.patch(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_UPDATE_MANUAL, {
        id: detail?.id,
        ...v,
      });
      setUpdOpen(false);
      Toast.show({ content: "Đã cập nhật", position: "bottom" });
      fetchList();
      if (detail?.user_id) onShowDetail(detail.user_id);
    } catch (e: any) {
      Toast.show({ content: e?.message || "Lỗi cập nhật", position: "bottom" });
    }
  };

  const totalThucNhan = useMemo(
    () => items.reduce((s, x) => s + (x.thuc_nhan || 0), 0),
    [items]
  );

  return (
    <div className="p-4">
      {header}

      <Card>
        <div className="text-[13px] text-gray-500 mb-2">
          Tháng {thang} • Tổng nhân viên: <b>{total}</b> • Tổng thực nhận:{" "}
          <b>{fmtMoney(totalThucNhan)} đ</b>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <SpinLoading /> Đang tải…
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500 px-2 py-3">
            Chưa có snapshot lương trong tháng {thang}. Bấm <b>Tính lại tháng</b> để tổng hợp.
          </div>
        ) : (
          <List>
            {items.map((r) => {
              const tongBH = (r.bhxh || 0) + (r.bhyt || 0) + (r.bhtn || 0);
              return (
                <List.Item
                  key={r.id}
                  description={
                    <div className="text-[12px] text-gray-500">
                      Công {r.so_ngay_cong}/{r.cong_chuan} • Lương công {fmtMoney(r.luong_theo_cong)} •
                      BH {fmtMoney(tongBH)} • Thực nhận <b>{fmtMoney(r.thuc_nhan)}</b> đ
                    </div>
                  }
                  extra={
                    <Space wrap>
                      <Button size="mini" onClick={() => onShowDetail(r.user_id)}>
                        Xem
                      </Button>
                      <Button size="mini" onClick={() => onRecompute(r.user_id)}>
                        Tính lại
                      </Button>
                      <Button
                        size="mini"
                        color={r.locked ? "success" : "warning"}
                        onClick={() => onLockToggle(!r.locked, r.user_id)}
                      >
                        {r.locked ? "Mở khóa" : "Khóa"}
                      </Button>
                      <Button
                        size="mini"
                        color="primary"
                        disabled={r.locked}
                        onClick={() => openUpdate(r)}
                      >
                        Update
                      </Button>
                    </Space>
                  }
                >
                  <div className="font-medium">{r.user_name || `#${r.user_id}`}</div>
                </List.Item>
              );
            })}
          </List>
        )}
      </Card>

      {/* Modal: Chọn nhân viên */}
      <Modal
        visible={pickOpen}
        onClose={() => setPickOpen(false)}
        content={
          <div>
            <div className="text-[14px] font-semibold mb-2">Chọn nhân viên</div>
            {(() => {
              const pickOptions =
                items.length
                  ? items.map((u) => ({ value: u.user_id, label: u.user_name || `#${u.user_id}` }))
                  : usersFallback;

              if (!pickOptions.length) {
                return (
                  <div className="text-sm text-gray-500">
                    Không có dữ liệu người dùng cho kỳ {thang}. Bấm <b>Tính lại tháng</b> hoặc kiểm tra quyền.
                  </div>
                );
              }

              return (
                <List>
                  {pickOptions.map((opt) => (
                    <List.Item
                      key={opt.value}
                      onClick={() => {
                        setPickOpen(false);
                        onShowDetail(Number(opt.value));
                      }}
                    >
                      {opt.label}
                    </List.Item>
                  ))}
                </List>
              );
            })()}
          </div>
        }
      />

      {/* Modal: Chi tiết 1 người */}
      <Modal
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        content={
          detail ? (
            <div>
              <div className="text-[14px] font-semibold mb-2">
                {detail.user_name || `#${detail.user_id}`} — {detail.thang}{" "}
                {detail.locked ? "(Đã khóa)" : ""}
              </div>

              {/* Tổng hợp */}
              <List header="Tổng hợp">
                <List.Item extra={fmtMoney(detail.luong_co_ban)}>Lương cơ bản</List.Item>
                <List.Item extra={detail.cong_chuan}>Công chuẩn</List.Item>
                <List.Item extra={detail.so_ngay_cong}>Ngày công</List.Item>
                <List.Item extra={fmtMoney(detail.luong_theo_cong)}>Lương theo công</List.Item>
                <List.Item extra={fmtMoney(detail.phu_cap)}>Phụ cấp</List.Item>
                <List.Item extra={fmtMoney(detail.thuong)}>Thưởng</List.Item>
                <List.Item extra={fmtMoney(detail.phat)}>Phạt</List.Item>
                <List.Item extra={fmtMoney(detail.bhxh + detail.bhyt + detail.bhtn)}>BH tổng</List.Item>
                <List.Item extra={fmtMoney(detail.khau_tru_khac)}>Khấu trừ khác</List.Item>
                <List.Item extra={fmtMoney(detail.tam_ung)}>Tạm ứng</List.Item>
                <List.Item extra={<b>{fmtMoney(detail.thuc_nhan)} đ</b>}>
                  <b>Thực nhận</b>
                </List.Item>
              </List>

              {/* Chi tiết theo phút công */}
              {(() => {
                const m = detail.metrics || {};
                const stdMinutes: number | null = m.std_minutes ?? null;
                const actualMinutes: number | null = m.actual_minutes ?? null;
                const baseMinutes: number | null = m.base_minutes ?? null;
                const otMinutes: number | null = m.ot_minutes ?? null;
                const unitBaseMin: number | null = m.unit_base_min ?? null;
                const otRatePerMin: number | null = m.ot_rate_per_min ?? null;
                const otAmount: number | null = m.ot_amount ?? null;

                const actualEff =
                  typeof actualMinutes === "number" ? actualMinutes : detail.so_gio_cong || 0;

                if (
                  stdMinutes === null &&
                  actualMinutes === null &&
                  baseMinutes === null &&
                  otMinutes === null &&
                  unitBaseMin === null &&
                  otRatePerMin === null &&
                  otAmount === null
                ) {
                  return null;
                }

                return (
                  <List header="Chi tiết theo phút công" style={{ marginTop: 8 }}>
                    <List.Item extra={stdMinutes !== null ? stdMinutes : "-"}>
                      Số phút công tiêu chuẩn (28 ngày x 8h x 60p)
                    </List.Item>
                    <List.Item extra={actualEff}>Số phút công thực tế</List.Item>
                    <List.Item
                      extra={
                        otMinutes !== null
                          ? otMinutes
                          : Math.max(0, actualEff - (stdMinutes || 0))
                      }
                    >
                      Số phút tăng ca (tính lương)
                    </List.Item>
                    <List.Item
                      extra={
                        unitBaseMin !== null ? `${fmtMoney(unitBaseMin)} đ/phút` : "-"
                      }
                    >
                      Đơn giá lương cơ bản / phút
                    </List.Item>
                    <List.Item
                      extra={
                        otRatePerMin !== null
                          ? `${fmtMoney(otRatePerMin)} đ/phút`
                          : "-"
                      }
                    >
                      Đơn giá tăng ca / phút
                    </List.Item>
                    <List.Item
                      extra={
                        otAmount !== null ? `${fmtMoney(otAmount)} đ` : "-"
                      }
                    >
                      Lương tăng ca (từ phút tăng ca)
                    </List.Item>
                  </List>
                );
              })()}

              <Space style={{ marginTop: 12 }} wrap>
                <Button size="small" onClick={() => onRecompute(detail.user_id)}>
                  Tính lại
                </Button>
                <Button
                  size="small"
                  onClick={() => onLockToggle(!detail.locked, detail.user_id)}
                >
                  {detail.locked ? "Mở khóa" : "Khóa"}
                </Button>
                <Button
                  size="small"
                  color="primary"
                  disabled={detail.locked}
                  onClick={() => {
                    setUpdOpen(true);
                  }}
                >
                  Update thủ công
                </Button>

                {/* NEW: xuất Excel & PDF */}
                <Button
  size="small"
  onClick={() => exportPayroll("csv", detail.user_id)}
>
  Xuất Excel
</Button>
<Button
  size="small"
  onClick={() => exportPayroll("pdf", detail.user_id)}
>
  Xuất PDF
</Button>


                <Button size="small" onClick={() => setDetailOpen(false)}>
                  Đóng
                </Button>
              </Space>
            </div>
          ) : null
        }
      />

      {/* Modal: Update thủ công */}
      <Modal
        visible={updOpen}
        onClose={() => setUpdOpen(false)}
        content={
          <div>
            <div className="text-[14px] font-semibold mb-2">Cập nhật thủ công</div>
            <Form
              form={updForm}
              layout="horizontal"
              footer={
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button onClick={() => setUpdOpen(false)}>Hủy</Button>
                  <Button color="primary" onClick={submitUpdate}>
                    Lưu
                  </Button>
                </Space>
              }
            >
              {/* SỬA RULE: message tiếng Việt, tránh mặc định tiếng Trung */}
              <Form.Item
                name="phu_cap"
                label="Phụ cấp"
                rules={[{ required: true, message: "Vui lòng nhập Phụ cấp" }]}
              >
                <Input type="number" inputMode="numeric" placeholder="0" />
              </Form.Item>
              <Form.Item
                name="thuong"
                label="Thưởng"
                rules={[{ required: true, message: "Vui lòng nhập Thưởng" }]}
              >
                <Input type="number" inputMode="numeric" placeholder="0" />
              </Form.Item>
              <Form.Item
                name="phat"
                label="Phạt"
                rules={[{ required: true, message: "Vui lòng nhập Phạt" }]}
              >
                <Input type="number" inputMode="numeric" placeholder="0" />
              </Form.Item>
              <Form.Item
                name="tam_ung"
                label="Tạm ứng"
                rules={[{ required: true, message: "Vui lòng nhập Tạm ứng" }]}
              >
                <Input type="number" inputMode="numeric" placeholder="0" />
              </Form.Item>
              <Form.Item
                name="khau_tru_khac"
                label="Khấu trừ khác"
                rules={[{ required: true, message: "Vui lòng nhập Khấu trừ khác" }]}
              >
                <Input type="number" inputMode="numeric" placeholder="0" />
              </Form.Item>
              <Form.Item name="ghi_chu" label="Ghi chú">
                <Input placeholder="Ghi chú nội bộ…" />
              </Form.Item>
            </Form>
          </div>
        }
      />
    </div>
  );
}
