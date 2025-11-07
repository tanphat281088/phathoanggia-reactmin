/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { attendanceGetAdmin, type AttendanceItem, type AttendanceListResponse } from "../../services/attendance.api";
import axios from "../../configs/axios"; // dùng để load danh sách user nhanh (tái sử dụng axios đã có)
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

// --- tiện ích debounce dùng cho onSearch của Select ---
function debounce<T extends (...args: any[]) => void>(fn: T, ms = 400) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// --- hàm gọi API /nguoi-dung cho ô tìm kiếm (dùng axios & API_ROUTE_CONFIG sẵn có) ---
const fetchUserOptions = async (kw: string) => {
  try {
    // ✅ Đổi sang axios instance để tự gắn Authorization qua interceptor
    const resp: any = await axios.get(API_ROUTE_CONFIG.NGUOI_DUNG, {
      params: { page: 1, per_page: 50, q: kw || "" }, // ✅ dùng per_page (không dùng limit)
      headers: { Accept: "application/json" },
    });

    // axios interceptor đã "flatten": resp là payload (có thể là {success, data:{collection:[]}} hoặc biến thể)
    const payload =
      resp?.data?.collection ??
      resp?.collection ??
      resp?.data?.items ??
      resp?.items ??
      resp?.data ??
      resp ??
      [];

    const list = Array.isArray(payload) ? payload : (payload?.collection ?? []);
    const mapped = (list || []).map((u: any) => ({
      value: Number(u.id),
      label: u.ho_ten || u.name || u.email || `#${u.id}`,
    })) as { value: number; label: string }[];

    console.log("[users] count:", mapped.length, "q=", kw);
    return mapped;
  } catch (err) {
    console.error("fetchUserOptions fatal:", err);
    return [];
  }
};

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type UserOption = { label: string; value: number };

// THÊM SAU DÒNG: type UserOption = { label: string; value: number };
const ALL_OPTION: UserOption = { value: -1, label: "— Tất cả —" };



export default function ChamCongQuanLy() {
  const { message } = App.useApp();

  // === state filter ===
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, "day"),
    dayjs(),
  ]);

  // === data ===
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AttendanceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // user options for filter
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const columns: ColumnsType<AttendanceItem> = [
    {
      title: "Nhân viên",
      dataIndex: "user_name",
      key: "user_name",
      render: (v, r) => v || `#${r.user_id}`,
      width: 220,
      ellipsis: true,
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (v: AttendanceItem["type"]) =>
        v === "checkin" ? <Tag color="green">Chấm công vào</Tag> : <Tag color="volcano">Chấm công ra</Tag>,
    },
    {
      title: "Ngày",
      dataIndex: "ngay",
      key: "ngay",
      width: 120,
      render: (v, r) => v || (r.checked_at ? dayjs(r.checked_at).format("YYYY-MM-DD") : ""),
    },
{
  title: "Giờ",
  key: "gio",
  width: 100,
  render: (_: any, r) => r.gio_phut || (r.checked_at ? dayjs(r.checked_at).format("HH:mm") : ""),
},

{
  title: "Trong vùng",
  dataIndex: "within",
  key: "within",
  width: 120,
  render: (v: boolean) => (v ? <Tag color="blue">Hợp lệ</Tag> : <Tag color="red">Ngoài vùng</Tag>),
},

    {
      title: "Khoảng cách (m)",
      dataIndex: "distance_m",
      key: "distance_m",
      width: 140,
    },
    {
      title: "Thiết bị",
      dataIndex: "device_id",
      key: "device_id",
      width: 160,
      ellipsis: true,
    },
    {
      title: "Mô tả",
      dataIndex: "short_desc",
      key: "short_desc",
      ellipsis: true,
    },
  ];

  const params = useMemo(() => {
    const from = range[0].format("YYYY-MM-DD");
    const to = range[1].format("YYYY-MM-DD");
    return { user_id: userId, from, to, page, per_page: perPage };
  }, [userId, range, page, perPage]);

const fetchData = async () => {
  setLoading(true);
  try {
    // Ép kiểu để tránh TS phàn nàn resp.data (do interceptor flatten payload)
    const resp: any = await attendanceGetAdmin(params);

    // ✅ Normalize mọi biến thể payload
    const data =
      resp?.data?.data ??   // { success, data: { items, pagination } }
      resp?.data ??         // { items, pagination } | { collection, total }
      resp ?? {};           // đã flatten thành { items, ... }

    const items =
      (Array.isArray(data?.items) && data.items) ||
      (Array.isArray(data?.collection) && data.collection) ||
      (Array.isArray(data?.data?.items) && data.data.items) ||
      [];

    const total =
      data?.pagination?.total ??
      data?.data?.pagination?.total ??
      data?.total ??
      items.length;

    setRows(items);
    setTotal(Number(total) || 0);
  } catch (err: any) {
    const code = err?.response?.status;
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      (code === 401 ? "Hết phiên đăng nhập" : "Tải dữ liệu thất bại");
    message.error(msg);
    setRows([]);
    setTotal(0);
  } finally {
    setLoading(false);
  }
};



  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const opts = await fetchUserOptions(""); // 👈 giữ nguyên helper, nay đã dùng axios ở bên trong
setUsers([ALL_OPTION, ...opts]); // prepend “Tất cả”
if (!opts.length) {
  message.warning("Không tìm thấy nhân viên (data.collection rỗng hoặc 401).");
}

    } catch (err: any) {
      const code = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (code === 401 ? "Hết phiên đăng nhập" : "Tải danh sách nhân viên thất bại");
      message.error(msg);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <Flex vertical gap={16}>
      <Title level={3} style={{ margin: 0 }}>
        Chấm công (Quản lý)
      </Title>

      <Card>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8} lg={6}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text>Nhân viên</Text>
              <Select
                allowClear
                loading={loadingUsers}
                placeholder="-- Tất cả --"
                options={users}
value={userId ?? -1}  // hiển thị “Tất cả” khi userId chưa chọn
onChange={(v) => {
  setPage(1);
  setUserId(v === -1 ? undefined : v); // chọn “Tất cả” => bỏ user_id
}}

                showSearch
                filterOption={false}                 // 👈 tắt lọc client, dùng remote search
                optionFilterProp="label"
                getPopupContainer={(el) => (el && el.closest(".ant-card")) || document.body}
                dropdownMatchSelectWidth={false}
                notFoundContent={loadingUsers ? "Đang tải..." : "No data"}
                onDropdownVisibleChange={async (open) => {
                  if (open && !loadingUsers) {       // 👈 luôn nạp khi mở (khỏi lệ thuộc render trước đó)
                    setLoadingUsers(true);
                    try {
const opts = await fetchUserOptions("");
setUsers([ALL_OPTION, ...opts]);

                    } finally {
                      setLoadingUsers(false);
                    }
                  }
                }}
                onSearch={debounce(async (kw: string) => {
                  setLoadingUsers(true);
                  try {
const opts = await fetchUserOptions(kw);
setUsers([ALL_OPTION, ...opts]);

                  } finally {
                    setLoadingUsers(false);
                  }
                }, 400)}
              />
            </Space>
          </Col>
          <Col xs={24} md={10} lg={8}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text>Khoảng ngày</Text>
              <RangePicker
                value={range}
                onChange={(v) => {
                  if (!v || v.length !== 2) return;
                  setPage(1);
                  setRange([v[0]!, v[1]!]);
                }}
                allowClear={false}
                format="DD/MM/YYYY"
              />
            </Space>
          </Col>
          <Col xs={24} md={6} lg={10}>
            <Space style={{ marginTop: 22 }}>
              <Button onClick={() => setPage(1)} disabled={loading}>
                Làm mới
              </Button>
              <Button type="primary" onClick={fetchData} loading={loading} disabled={loading}>
                Tải dữ liệu
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table<AttendanceItem>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            total,
            current: page,
            pageSize: perPage,
            showSizeChanger: true,
            onChange: (p, s) => {
              setPage(p);
              setPerPage(s);
            },
          }}
        />
      </Card>
    </Flex>
  );
}
