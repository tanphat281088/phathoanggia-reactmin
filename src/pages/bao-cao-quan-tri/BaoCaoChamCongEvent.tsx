/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

import {
  fetchEventAttendanceReport,
  type EventAttendanceItem,
  type EventAttendanceReportResponse,
} from "../../services/eventAttendanceReport.api";
import { workpointList, type WorkpointItem } from "../../services/workpoint.api";
import { userOptions, type UserOption as UserOptionSvc } from "../../services/user.api";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type TableRow = EventAttendanceItem & { key: string };

// Helper: chuyển phút → giờ (có thể làm tròn)
const minutesToHours = (min?: number | null, decimals = 2) => {
  if (!min) return 0;
  const h = min / 60;
  return Number(h.toFixed(decimals));
};

export default function BaoCaoChamCongEvent() {
  // ====== Filter state ======
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [workpointId, setWorkpointId] = useState<number | undefined>(undefined);
  const [userId, setUserId] = useState<number | undefined>(undefined);

  // ====== Data state ======
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [reportMeta, setReportMeta] = useState<EventAttendanceReportResponse | null>(null);

  // Địa điểm & nhân viên cho dropdown
  const [wpOptions, setWpOptions] = useState<{ value: number; label: string }[]>([]);
  const [loadingWp, setLoadingWp] = useState(false);

  const [userOptionsState, setUserOptionsState] = useState<{ value: number; label: string }[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);

  // Modal chi tiết 1 dòng
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<EventAttendanceItem | null>(null);

  // ====== Load workpoints khi mở trang ======
  const loadWorkpoints = async () => {
    setLoadingWp(true);
    try {
      const resp = await workpointList();
      if (resp?.success) {
        const items = resp.data.items || [];
        setWpOptions(
          items.map((w: WorkpointItem) => ({
            value: w.id,
            label: w.ten || `#${w.id}`,
          }))
        );
      }
    } catch (e: any) {
      message.error(e?.message || "Không tải được danh sách địa điểm.");
    } finally {
      setLoadingWp(false);
    }
  };

  // ====== Load user options (tên NV) ======
  const loadUsers = async (q = "") => {
    setLoadingUser(true);
    try {
      const optsSvc: UserOptionSvc[] = await userOptions({ q, page: 1, per_page: 200 });
      setUserOptionsState(
        (optsSvc || []).map((o) => ({
          value: o.value,
          label: o.label,
        }))
      );
    } catch (e: any) {
      message.error(e?.message || "Không tải được danh sách nhân viên.");
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    loadWorkpoints();
    loadUsers();
  }, []);

  // ====== Gọi report ======
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {
        from: range[0].format("YYYY-MM-DD"),
        to: range[1].format("YYYY-MM-DD"),
        workpoint_id: workpointId,
        user_id: userId,
      };

      const resp = await fetchEventAttendanceReport(params);
      if (resp?.success) {
        const data = resp.data;
        setReportMeta(data);

        const items = data.data.items || [];
        setRows(
          items.map((it, idx) => ({
            ...it,
            key: `${it.workpoint.id || 0}-${it.user.id || 0}-${idx}`,
          }))
        );
      } else {
        message.warning(resp?.message || "Không lấy được báo cáo.");
        setRows([]);
        setReportMeta(null);
      }
    } catch (e: any) {
      message.error(e?.message || "Lỗi khi tải báo cáo.");
      setRows([]);
      setReportMeta(null);
    } finally {
      setLoading(false);
    }
  };

  // ====== Tổng hợp cho summary ======
  const totalRows = rows.length;
  const totalMinutesAll = useMemo(
    () => rows.reduce((sum, r) => sum + (r.stats?.total_minutes || 0), 0),
    [rows]
  );
  const totalHoursAll = minutesToHours(totalMinutesAll, 2);

  // ====== Table columns ======
  const columns: ColumnsType<TableRow> = [
    {
      title: "#",
      dataIndex: "index",
      key: "index",
      width: 60,
      render: (_v, _r, idx) => idx + 1,
    },
    {
      title: "Địa điểm",
      key: "workpoint",
      render: (_v, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.workpoint.ten || `#${r.workpoint.id}`}</Text>
          {r.workpoint.lat != null && r.workpoint.lng != null && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              ({r.workpoint.lat.toFixed(6)}, {r.workpoint.lng.toFixed(6)}) • R ={" "}
              {r.workpoint.ban_kinh_m ?? "?"}m
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Nhân viên",
      key: "user",
      render: (_v, r) => (
        <Space direction="vertical" size={0}>
          <Text>{r.user.name || `#${r.user.id}`}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.user.email}
          </Text>
        </Space>
      ),
    },
    {
      title: "Số ngày đi làm",
      dataIndex: ["stats", "total_days"],
      key: "total_days",
      width: 130,
      align: "right",
      render: (v: number) => <Text>{v || 0}</Text>,
    },
    {
      title: "Tổng giờ làm (h)",
      dataIndex: ["stats", "total_minutes"],
      key: "total_minutes",
      width: 160,
      align: "right",
      render: (v: number) => (
        <Text>
          {minutesToHours(v, 2)}{" "}
          <Text type="secondary" style={{ fontSize: 11 }}>
            ({v || 0} phút)
          </Text>
        </Text>
      ),
    },
    {
      title: "Ca đầu tiên",
      dataIndex: ["stats", "first_checkin"],
      key: "first_checkin",
      width: 160,
      render: (v: string | null) =>
        v ? dayjs(v).format("DD/MM/YYYY HH:mm") : <Text type="secondary">-</Text>,
    },
    {
      title: "Ca cuối cùng",
      dataIndex: ["stats", "last_checkout"],
      key: "last_checkout",
      width: 160,
      render: (v: string | null) =>
        v ? dayjs(v).format("DD/MM/YYYY HH:mm") : <Text type="secondary">-</Text>,
    },
    {
      title: "Chi tiết",
      key: "actions",
      width: 120,
      render: (_v, r) => (
        <Button size="small" onClick={() => openDetail(r)}>
          Xem ngày
        </Button>
      ),
    },
  ];

  const openDetail = (row: EventAttendanceItem) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  // Table chi tiết by_days trong Modal
  const detailDaysColumns = [
    {
      title: "Ngày",
      dataIndex: "ngay",
      key: "ngay",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    {
      title: "Giờ công (h)",
      dataIndex: "minutes",
      key: "minutes",
      align: "right" as const,
      render: (v: number) => (
        <Text>
          {minutesToHours(v, 2)}{" "}
          <Text type="secondary" style={{ fontSize: 11 }}>
            ({v} phút)
          </Text>
        </Text>
      ),
    },
    {
      title: "Check-in",
      dataIndex: "checkin_at",
      key: "checkin_at",
      render: (v: string) => (v ? dayjs(v).format("HH:mm") : "-"),
    },
    {
      title: "Check-out",
      dataIndex: "checkout_at",
      key: "checkout_at",
      render: (v: string) => (v ? dayjs(v).format("HH:mm") : "-"),
    },
  ];

  const detailDaysData =
    detailRow?.by_days
      ? Object.entries(detailRow.by_days).map(([day, v]) => ({
          key: day,
          ngay: day,
          minutes: v.minutes,
          checkin_at: v.checkin_at,
          checkout_at: v.checkout_at,
        }))
      : [];

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      {/* Header + filter */}
      <Row gutter={[12, 12]} align="middle">
        <Col flex="auto">
          <Title level={3} style={{ margin: 0 }}>
            Báo cáo chấm công theo địa điểm (Event)
          </Title>
          <Text type="secondary">
            Tổng hợp giờ công của nhân viên tại từng địa điểm sự kiện trong khoảng thời gian chọn.
          </Text>
        </Col>
        <Col>
          <Badge
            count={totalRows}
            title="Số dòng trong báo cáo"
            style={{ backgroundColor: "#1677ff" }}
          />
        </Col>
      </Row>

      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
          {/* Khoảng ngày */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Text style={{ color: "#667085" }}>Khoảng ngày</Text>
            <RangePicker
              value={range}
              onChange={(v) => v && setRange([v[0]!, v[1]!])}
              allowClear={false}
              format="DD/MM/YYYY"
              style={{ minWidth: 260 }}
            />
          </div>

          {/* Địa điểm */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Text style={{ color: "#667085" }}>Địa điểm</Text>
            <Select
              allowClear
              loading={loadingWp}
              style={{ minWidth: 260 }}
              placeholder="-- Tất cả địa điểm --"
              options={wpOptions}
              value={workpointId}
              onChange={(v) => setWorkpointId(v)}
            />
          </div>

          {/* Nhân viên */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Text style={{ color: "#667085" }}>Nhân viên</Text>
            <Select
              allowClear
              showSearch
              style={{ minWidth: 260 }}
              placeholder="-- Tất cả nhân viên --"
              options={userOptionsState}
              value={userId}
              loading={loadingUser}
              onChange={(v) => setUserId(v)}
              onSearch={(kw) => loadUsers(kw)}
              optionFilterProp="label"
              filterOption={false}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              marginTop: 4,
            }}
          >
            <Button
              size="large"
              onClick={() => {
                setWorkpointId(undefined);
                setUserId(undefined);
                fetchReport();
              }}
            >
              Làm mới
            </Button>
            <Button type="primary" size="large" onClick={fetchReport} loading={loading}>
              Lấy báo cáo
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary + Table */}
      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 8 }}>
          <Col xs={24} md={8}>
            <Text strong>Tổng số dòng:</Text> <Text>{totalRows}</Text>
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Tổng giờ công:</Text>{" "}
            <Text>
              {totalHoursAll}{" "}
              <Text type="secondary" style={{ fontSize: 11 }}>
                ({totalMinutesAll} phút)
              </Text>
            </Text>
          </Col>
          <Col xs={24} md={8}>
            {reportMeta && (
              <Text type="secondary">
                Kỳ: {reportMeta.filter.from} → {reportMeta.filter.to}
              </Text>
            )}
          </Col>
        </Row>

        <Table<TableRow>
          rowKey="key"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
          }}
        />
      </Card>

      {/* Modal chi tiết từng ngày */}
      <Modal
        title={
          detailRow ? (
            <span>
              Chi tiết ngày công —{" "}
              <Text strong>{detailRow.user.name || `#${detailRow.user.id}`}</Text> tại{" "}
              <Text strong>{detailRow.workpoint.ten || `#${detailRow.workpoint.id}`}</Text>
            </span>
          ) : (
            "Chi tiết ngày công"
          )
        }
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailRow(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={720}
      >
        <Table
          rowKey="key"
          size="small"
          columns={detailDaysColumns}
          dataSource={detailDaysData}
          pagination={false}
        />
      </Modal>
    </Space>
  );
}
