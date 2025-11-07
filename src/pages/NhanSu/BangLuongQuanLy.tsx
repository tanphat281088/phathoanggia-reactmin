import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Dialog, Form, Input, List, Modal, Space, SpinLoading, Toast } from "antd-mobile";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

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
  // YYYY-MM mặc định theo ngày hiện tại, không dùng dayjs để tránh minify issues
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

            {/* Native month picker: ổn định, không phụ thuộc rc-picker */}
            <input
              type="month"
              className="border rounded px-2 py-1 text-sm"
              value={thang}
              onChange={(e) =>
                setThang(e.target.value || new Date().toISOString().slice(0, 7))
              }
            />

            {/* Chọn nhanh nhân viên (native select) */}
            <select
              className="border rounded px-2 py-1 text-sm"
              onChange={(e) => {
                const val = e.target.value;
                if (val) onShowDetail(Number(val));
              }}
              defaultValue=""
            >
              <option value="" disabled>
                — Chọn nhân viên —
              </option>
              {userOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cụm phải: action buttons (tự wrap khi hẹp) */}
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
                if (!items.length) {
                  Toast.show({
                    content: "Chưa có snapshot lương trong tháng để chọn",
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
    [thang, items, userOptions]
  );

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_LIST, {
        params: { thang, page: 1, per_page: 200 },
      });
      if (data?.success) {
        setItems(data.data?.items || []);
        setTotal(data.data?.pagination?.total || 0);
      } else {
        Toast.show({
          content: data?.message || "Không lấy được dữ liệu",
          position: "bottom",
        });
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

  const onShowDetail = async (user_id: number) => {
    try {
      const { data } = await axios.get(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG, {
        params: { thang, user_id },
      });
      if (data?.success) {
        setDetail(data.data?.item || null);
        setDetailOpen(true);
      } else {
        Toast.show({
          content: data?.message || "Không lấy được chi tiết",
          position: "bottom",
        });
      }
    } catch (e: any) {
      Toast.show({ content: e?.message || "Lỗi chi tiết", position: "bottom" });
    }
  };

  const onRecompute = async (user_id?: number) => {
    const ok = await Dialog.confirm({
      title: "Tính lại bảng lương",
      content: user_id
        ? `Chạy lại cho user #${user_id} ${thang}?`
        : `Chạy lại toàn bộ tháng ${thang}? (bỏ qua các dòng đã khóa)`,
    });
    if (!ok) return;

    try {
      await axios.post(API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_RECOMPUTE, null, {
        params: { thang, user_id },
      });
      Toast.show({ content: "Đã chạy tính lại", position: "bottom" });
      fetchList();
      if (user_id && detail?.user_id === user_id) onShowDetail(user_id);
    } catch (e: any) {
      Toast.show({ content: e?.message || "Lỗi tính lại", position: "bottom" });
    }
  };

  const onLockToggle = async (lockState: boolean, user_id?: number) => {
    const ok = await Dialog.confirm({
      title: lockState ? "Khóa bảng lương" : "Mở khóa bảng lương",
      content: user_id
        ? `${lockState ? "Khóa" : "Mở khóa"} user #${user_id} tháng ${thang}?`
        : `${lockState ? "Khóa" : "Mở khóa"} toàn bộ tháng ${thang}?`,
    });
    if (!ok) return;

    try {
      await axios.patch(
        lockState
          ? API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_LOCK
          : API_ROUTE_CONFIG.NHAN_SU_BANG_LUONG_UNLOCK,
        null,
        { params: { thang, user_id } }
      );
      Toast.show({ content: lockState ? "Đã khóa" : "Đã mở khóa", position: "bottom" });
      fetchList();
      if (user_id && detail?.user_id === user_id) onShowDetail(user_id);
    } catch (e: any) {
      Toast.show({ content: e?.message || "Lỗi khóa/mở khóa", position: "bottom" });
    }
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
                        Recompute
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
            {items.length === 0 ? (
              <div className="text-sm text-gray-500">Không có dòng lương trong tháng {thang}.</div>
            ) : (
              <List>
                {items.map((u) => (
                  <List.Item
                    key={u.user_id}
                    onClick={() => {
                      setPickOpen(false);
                      onShowDetail(u.user_id);
                    }}
                  >
                    {u.user_name || `#${u.user_id}`}
                  </List.Item>
                ))}
              </List>
            )}
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
              <Space style={{ marginTop: 12 }} wrap>
                <Button size="small" onClick={() => onRecompute(detail.user_id)}>
                  Recompute
                </Button>
                <Button size="small" onClick={() => onLockToggle(!detail.locked, detail.user_id)}>
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
              <Form.Item name="phu_cap" label="Phụ cấp" rules={[{ required: true }]}>
                <Input type="number" inputMode="numeric" placeholder="0" />
              </Form.Item>
              <Form.Item name="thuong" label="Thưởng" rules={[{ required: true }]}>
                <Input type="number" inputMode="numeric" placeholder="0" />
              </Form.Item>
              <Form.Item name="phat" label="Phạt" rules={[{ required: true }]}>
                <Input type="number" inputMode="numeric" placeholder="0" />
              </Form.Item>
              <Form.Item name="tam_ung" label="Tạm ứng" rules={[{ required: true }]}>
                <Input type="number" inputMode="numeric" placeholder="0" />
              </Form.Item>
              <Form.Item name="khau_tru_khac" label="Khấu trừ khác" rules={[{ required: true }]}>
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
