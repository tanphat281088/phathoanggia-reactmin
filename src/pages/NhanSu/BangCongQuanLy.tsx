/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Button, Card, Descriptions, Flex, Select, Space, Typography, DatePicker, Tag, Modal, message
} from "antd";
//            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ dùng static message

import dayjs from "dayjs";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { timesheetAdmin, timesheetRecompute, type BangCongItem } from "../../services/bangCong.api";

/* ====== MỚI: dùng service chung để tải dropdown Users qua axios instance ====== */
import { userOptions, type UserOption as UserOptionSvc } from "../../services/user.api";

const { Title, Text } = Typography;

type UserOption = { label: string; value: number };

export default function BangCongQuanLy() {

  const [thang, setThang] = useState<string>(dayjs().format("YYYY-MM")); // nhãn kỳ = tháng bắt đầu kỳ 6→5
  const [userId, setUserId] = useState<number | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [item, setItem] = useState<BangCongItem | null>(null);

  // Modal xác nhận (controlled)
  const [confirmOpen, setConfirmOpen] = useState(false);

  const params = useMemo(() => ({ user_id: userId!, thang }), [userId, thang]);

  // ===== Helper: chuẩn hoá response (wrapper | direct) =====
  const unwrap = <T,>(res: any): T => (res && "data" in res ? (res.data as T) : (res as T));

  // ===== Init: tải me + users, auto-chọn userId =====
  useEffect(() => {
    const init = async () => {
      setLoadingUsers(true);
      try {
        // Call me để giữ behavior cũ (không dùng làm fallback)
        await axios.post("/auth/me").catch(() => null);

        // MỚI: Tải danh sách users qua service chung (đi qua axios + token)
        const optsSvc: UserOptionSvc[] = await userOptions({ q: "", page: 1, per_page: 200 });
        const mapped: UserOption[] = (optsSvc || []).map((o) => ({ value: o.value, label: o.label }));
        setUsers(mapped);

        // Auto chọn: nếu chưa có userId và có danh sách
        if (!userId) {
          const first = mapped.length > 0 ? mapped[0] : undefined;
          const defaultId: number | undefined = first?.value;
          if (defaultId !== undefined) setUserId(defaultId);
        }

        if (!mapped.length) {
          message.warning("Không có nhân viên để hiển thị. Vui lòng kiểm tra quyền hoặc dữ liệu.");
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[BangCongQuanLy] init error =", e);
        message.error("Không tải được danh sách nhân viên.");
      } finally {
        setLoadingUsers(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Tải bảng công theo user/tháng =====
  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const resp = await timesheetAdmin(params);

      // resp: { success, data:{...} } | { ...trực tiếp... }
      const payload = unwrap<{ user_id: number; thang: string; item: BangCongItem | null; debug?: any }>(resp);
      console.log("[timesheetAdmin] normalized =", payload);

      // Đồng bộ lại kỳ từ server (kỳ 6→5)
      if (payload?.thang && payload.thang !== thang) setThang(payload.thang);

      setItem(payload?.item ?? null);
    } catch (e: any) {
      console.error("[timesheetAdmin] error =", e);
      message.error(e?.message || "Không tải được bảng công.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto fetch khi user/tháng thay đổi
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // ===== Gọi recompute (tách riêng để dùng trong Modal controlled) =====
  const doRecompute = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      await timesheetRecompute({ thang, user_id: userId });
      message.success("Đã tổng hợp lại.");
      await fetchData();
    } catch (e: any) {
      console.error("[recompute] error =", e);
      message.error(e?.message || "Không tổng hợp lại được.");
    } finally {
      setLoading(false);
    }
  };

  // ===== Render =====
  return (
    <Flex vertical gap={16}>
      <Title level={3} style={{ margin: 0 }}>Bảng công (Quản lý)</Title>

      <Card>
        <Space wrap>
          <Space direction="vertical" size={4}>
            <Text>Nhân viên</Text>
            <Select
              allowClear
              loading={loadingUsers}
              style={{ width: 260 }}
              options={users}
              value={userId}
              onChange={(v) => {
                setUserId(v);
                setItem(null);
              }}
              showSearch
              optionFilterProp="label"
              placeholder="-- Chọn nhân viên --"
              filterOption={false}
              onDropdownVisibleChange={async (open) => {
                if (open && !loadingUsers) {
                  setLoadingUsers(true);
                  try {
                    const optsSvc = await userOptions({ q: "", page: 1, per_page: 200 });
                    setUsers(optsSvc.map((o) => ({ value: o.value, label: o.label })));
                  } finally {
                    setLoadingUsers(false);
                  }
                }
              }}
              onSearch={async (kw) => {
                setLoadingUsers(true);
                try {
                  const optsSvc = await userOptions({ q: kw, page: 1, per_page: 200 });
                  setUsers(optsSvc.map((o) => ({ value: o.value, label: o.label })));
                } finally {
                  setLoadingUsers(false);
                }
              }}
            />
          </Space>

          <Space direction="vertical" size={4}>
            <Text>Tháng</Text>
            <DatePicker
              picker="month"
              value={dayjs(`${thang}-01`)} // ép ngày = 01 để parse chắc
              onChange={(d) => {
                if (d) {
                  setThang(d.format("YYYY-MM"));
                  setItem(null);
                }
              }}
              format="MM/YYYY"
            />
          </Space>

          {/* Chỉ loading khi thật sự gọi API; disable nếu chưa chọn user */}
          <Button type="primary" onClick={fetchData} loading={loading} disabled={!userId}>
            Tải dữ liệu
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={!userId}>
            Tổng hợp lại
          </Button>
        </Space>
      </Card>

      <Card loading={loading}>
        {item ? (
          <Descriptions
            bordered
            size="small"
            column={2}
            title={`Kỳ công: ${item.thang} — ${item.user_name ?? `#${item.user_id}`}`}
          >
            <Descriptions.Item label="Số ngày công">{item.so_ngay_cong}</Descriptions.Item>
     <Descriptions.Item label="Số phút công">{item.so_gio_cong}</Descriptions.Item>
            <Descriptions.Item label="Đi trễ (phút)">{item.di_tre_phut}</Descriptions.Item>
            <Descriptions.Item label="Về sớm (phút)">{item.ve_som_phut}</Descriptions.Item>
            <Descriptions.Item label="Nghỉ phép (ngày / giờ)">
              {item.nghi_phep_ngay} ngày / {item.nghi_phep_gio} giờ
            </Descriptions.Item>
            <Descriptions.Item label="Nghỉ không lương (ngày / giờ)">
              {item.nghi_khong_luong_ngay} ngày / {item.nghi_khong_luong_gio} giờ
            </Descriptions.Item>
<Descriptions.Item label="Làm thêm (phút)">{item.lam_them_gio}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {item.locked ? <Tag color="red">Đã khóa</Tag> : <Tag color="green">Chưa khóa</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng hợp lúc" span={2}>
              {item.computed_at || "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">{userId ? "Chưa có dữ liệu kỳ này." : "Chọn nhân viên để xem bảng công."}</Text>
        )}
      </Card>

      {/* Modal controlled: không warning, hoạt động tốt trên React 19 */}
      <Modal
        title="Tổng hợp lại bảng công?"
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        okText="Tổng hợp"
        cancelText="Hủy"
        onOk={async () => {
          await doRecompute();
          setConfirmOpen(false);
        }}
      >
        <div>
          Kỳ <b>{thang}</b> — người dùng <b>#{userId}</b>. (Không ảnh hưởng dữ liệu đã khóa)
        </div>
      </Modal>
    </Flex>
  );
}
