/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Modal,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SelectProps } from "antd";
import dayjs from "dayjs";
import cashApi, { type CashAccountOption } from "../../../services/cash.api";
import usePermission from "../../../hooks/usePermission";

const { RangePicker } = DatePicker;
const { Text } = Typography;

/* ===== Types ===== */
type DeltaRow = {
  id: number;
  ma_phieu_thu: string;
  ngay_thu: string;       // YYYY-MM-DD
  expected: number;       // số tiền trên phiếu
  ledger_sum: number;     // số tiền đang có trong sổ quỹ (mọi TK)
  delta: number;          // expected - ledger_sum
};

type AuditResp = {
  missing: DeltaRow[];
  over: DeltaRow[];
  totals: {
    tong_thieu: number;   // >0
    tong_du: number;      // <0 (âm)
    net: number;          // tong_thieu + tong_du
    meta?: {
      tai_khoan_id: number;
      alias_bank?: string | null;
      alias_acc?: string | null;
      from?: string | null;
      to?: string | null;
      matched_count?: number;
      expected_sum?: number;
      ledger_sum?: number;
      debug?: {
        include_ok: 0 | 1;
        top10: DeltaRow[];
      };
    };
  };
};

/* ===== Component ===== */
export default function AuditTab() {
  // ====== PHÂN QUYỀN (READ/WRITE) ======
  const permission = usePermission("/kiem-toan");
  const canView = !!permission?.index;
  const canFix  = !!permission?.edit;

  // ====== STATE ======
  const [form] = Form.useForm();
  const [accOpts, setAccOpts] = useState<CashAccountOption[]>([]);

  // ====== OPTIONS ALIAS (theo tài khoản nhận) ======
  type Opt = { label: string; value: string };
  const [aliasBankOpts, setAliasBankOpts] = useState<Opt[]>([]);
  const [aliasAccOpts,  setAliasAccOpts ] = useState<Opt[]>([]);
  const watchTaiKhoanId = Form.useWatch("tai_khoan_id", form);

  const [auditing, setAuditing] = useState(false);
  const [fixing, setFixing] = useState<"missing" | "over" | "both" | null>(null);
  const [data, setData] = useState<AuditResp | null>(null);

  // Tính “không có lệch” trực tiếp từ dữ liệu (không cần state trung gian)
  const isNoDelta = useMemo(() => {
    const m = data?.missing?.length ?? 0;
    const o = data?.over?.length ?? 0;
    return !!data && (m + o === 0);
  }, [data]);

  // ====== LOAD ACCOUNT OPTIONS ======
  useEffect(() => {
    cashApi.getCashAccountOptions({ active: 1 }).then((r) => setAccOpts(r.data || []));
  }, []);

  // ====== LOAD ALIAS OPTIONS THEO TÀI KHOẢN ======
  useEffect(() => {
    const tk = watchTaiKhoanId as number | undefined;
    if (!tk) {
      setAliasBankOpts([]);
      setAliasAccOpts([]);
      form.setFieldsValue({ alias_bank: undefined, alias_account: undefined });
      return;
    }
    cashApi
      .listCashAliases({ tai_khoan_id: tk, active: 1 } as any)
      .then((r: any) => {
        const rows: any[] = r?.data?.collection || [];
        const banks: Opt[] = Array.from(
          new Set(rows.map((x) => x?.pattern_bank).filter((s: string) => !!s))
        ).map((s: string) => ({ label: s, value: s }));
        const accs: Opt[] = Array.from(
          new Set(rows.map((x) => x?.pattern_account).filter((s: string) => !!s))
        ).map((s: string) => ({ label: s, value: s }));
        setAliasBankOpts(banks);
        setAliasAccOpts(accs);
      })
      .catch(() => {
        setAliasBankOpts([]);
        setAliasAccOpts([]);
      });
  }, [watchTaiKhoanId, form]);

  // ====== DEFAULT FORM ======
  useEffect(() => {
    form.setFieldsValue({
      range: [dayjs().startOf("month"), dayjs().endOf("month")],
      debug: 0,
      include_ok: 0,
    });
  }, [form]);

  // ====== PARAMS ======
  const params = useMemo(() => {
    const v = form.getFieldsValue();
    const range = v.range as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
    return {
      tai_khoan_id: v.tai_khoan_id as number | undefined,
      alias_bank: (v.alias_bank ?? "") as string,
      alias_account: (v.alias_account ?? "") as string,
      from: range?.[0]?.format("YYYY-MM-DD"),
      to: range?.[1]?.format("YYYY-MM-DD"),
      // Debug flags
      debug: Number(v.debug ?? 0),
      include_ok: Number(v.include_ok ?? 0),
    };
  }, [form]);

  // ====== API CALLERS ======
  const callAudit = async () => {
    if (!canView) {
      message.warning("Bạn không có quyền xem tra soát.");
      return;
    }
    const v = form.getFieldsValue();
    if (!v.tai_khoan_id) {
      message.warning("Vui lòng chọn Tài khoản nhận (CK).");
      return;
    }
    setAuditing(true);
    try {
      const res = await cashApi.auditReceiptsDelta(params as any);
      const payload = res?.data?.data || { missing: [], over: [], totals: { tong_thieu: 0, tong_du: 0, net: 0 } };
      setData(payload);

      // Tính & thông báo bằng toast
      const totalRows = (payload?.missing?.length ?? 0) + (payload?.over?.length ?? 0);
      const hasDelta = totalRows > 0;

      message.open({
        key: "cash-audit-toast",
        type: hasDelta ? "info" : "success",
        content: hasDelta
          ? `Phát hiện ${payload.missing.length} dòng thiếu và ${payload.over.length} dòng dư.`
          : "✅ Không phát hiện lệch trong phạm vi lọc hiện tại.",
        duration: 3,
      });
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Lỗi tra soát");
    } finally {
      setAuditing(false);
    }
  };

  const callFix = async (scope: "missing" | "over" | "both", dryRun: boolean) => {
    if (!canFix) {
      message.warning("Bạn không có quyền ghi điều chỉnh.");
      return;
    }
    const v = form.getFieldsValue();
    if (!v.tai_khoan_id) {
      message.warning("Vui lòng chọn Tài khoản nhận (CK).");
      return;
    }
    setFixing(scope);
    try {
      const payload = { ...params, scope, dry_run: dryRun ? 1 : 0 };
      const res = await cashApi.fixReceiptsDelta(payload as any);
      const out = res.data?.data || {};

      if (dryRun) {
        Modal.info({
          title: "Thử nghiệm (không ghi)",
          content: (
            <div>
              <div>Số dòng thiếu (sẽ bù): <b>{out.rows_missing ?? 0}</b></div>
              <div>Tổng cần bù: <b>{fmt(out.sum_missing)}</b></div>
              <div>Số dòng dư (sẽ điều chỉnh âm): <b>{out.rows_over ?? 0}</b></div>
              <div>Tổng điều chỉnh âm: <b>{fmt(out.sum_over)}</b></div>
              <div>Chênh lệch ròng: <b>{fmt(out.net)}</b></div>
            </div>
          ),
        });
      } else {
        message.success(res.data?.message || "Đã áp dụng điều chỉnh.");
        await callAudit(); // làm mới ngay để xem Δ về 0
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Lỗi áp dụng điều chỉnh");
    } finally {
      setFixing(null);
    }
  };

  // ====== TABLE CỘT CHUNG ======
  const colDelta: ColumnsType<DeltaRow> = [
    { title: "Mã phiếu", dataIndex: "ma_phieu_thu", key: "code" },
    { title: "Ngày", dataIndex: "ngay_thu", key: "date", render: (v) => dayjs(v).format("DD/MM/YYYY") },
    { title: "Số tiền phiếu", dataIndex: "expected", key: "expected", align: "right", render: fmt },
    { title: "Đang trong sổ quỹ", dataIndex: "ledger_sum", key: "ledger", align: "right", render: fmt },
    { title: "Δ (phiếu - sổ quỹ)", dataIndex: "delta", key: "delta", align: "right",
      render: (v: number) => <Text type={v > 0 ? "danger" : (v === 0 ? "secondary" : "warning")}>{fmt(v)}</Text> },
  ];

  /* ====== RENDER ====== */
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {!canView && (
        <Card>
          <Text type="danger">Bạn không có quyền xem trang Tra soát lỗi.</Text>
        </Card>
      )}

      <Card title="Bộ lọc" size="small">
        <Form form={form} layout="inline" initialValues={{}}>
          {/* TK nhận chuyển khoản */}
          <Form.Item name="tai_khoan_id" label="Tài khoản nhận (CK)" rules={[{ required: true }]}>
            <Select style={{ minWidth: 300 }} allowClear options={accOpts} placeholder="Chọn tài khoản" />
          </Form.Item>

          {/* Alias theo TK */}
          <Form.Item name="alias_bank" label="Ngân hàng (alias)">
            <Select
              allowClear
              options={aliasBankOpts as SelectProps["options"]}
              placeholder="Chọn ngân hàng"
              style={{ width: 160 }}
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="alias_account" label="Số TK (alias)">
            <Select
              allowClear
              options={aliasAccOpts as SelectProps["options"]}
              placeholder="Chọn số tài khoản"
              style={{ width: 200 }}
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {/* Khoảng ngày */}
          <Form.Item name="range" label="Khoảng ngày">
            <RangePicker />
          </Form.Item>

          {/* Chế độ / Dòng OK */}
          <Form.Item name="debug" label="Chế độ">
            <Select
              style={{ width: 140 }}
              options={[
                { value: 0 as any, label: "Thường" },
                { value: 1 as any, label: "Debug" },
              ]}
              placeholder="Chọn chế độ"
            />
          </Form.Item>

          <Form.Item name="include_ok" label="Dòng OK">
            <Select
              style={{ width: 160 }}
              options={[
                { value: 0 as any, label: "Chỉ dòng lệch" },
                { value: 1 as any, label: "Gồm cả cân khớp" },
              ]}
              placeholder="Chọn phạm vi"
            />
          </Form.Item>

          <Form.Item>
            <Space wrap>
              <Button type="primary" onClick={callAudit} loading={auditing} disabled={!canView}>
                Tra soát
              </Button>
              <Button
                onClick={() => form.resetFields()}
                disabled={auditing || fixing !== null}
              >
                Xoá lọc
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Debug summary (nếu bật) */}
      {canView && data?.totals?.meta && (form.getFieldValue("debug") === 1) && (
        <Card size="small" title="Thông tin Debug">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Alert
              type="info"
              showIcon
              message="Tóm tắt dữ liệu đối soát"
              description={
                <div style={{ lineHeight: 1.9 }}>
                  <div>• Số phiếu thu CK khớp alias: <b>{data?.totals?.meta?.matched_count ?? 0}</b></div>
                  <div>• Tổng tiền trên phiếu: <b>{fmt(data?.totals?.meta?.expected_sum ?? 0)}</b></div>
                  <div>• Tổng tiền trong sổ quỹ (cùng mã tham chiếu): <b>{fmt(data?.totals?.meta?.ledger_sum ?? 0)}</b></div>
                  <div>• Top 10 theo |Δ| {data?.totals?.meta?.debug?.include_ok ? "(gồm cả dòng cân khớp)" : "(chỉ dòng lệch)"}:</div>
                </div>
              }
            />

            <Table
              size="small"
              rowKey={(r: any) => r.id}
              pagination={false}
              dataSource={data?.totals?.meta?.debug?.top10 || []}
              columns={colDelta}
              locale={{ emptyText: "Không có dữ liệu để hiển thị" }}
            />
          </Space>
        </Card>
      )}

      {/* Banner “không có lệch” ngay dưới Bộ lọc */}
      {canView && isNoDelta && (
        <Alert
          type="success"
          showIcon
          message="✅ Không phát hiện lệch trong phạm vi lọc hiện tại."
          style={{ marginTop: 8 }}
        />
      )}

      {/* Kết quả lệch thiếu/dư */}
      {canView && (
        <Row gutter={[12, 12]}>
          <Col xs={24} lg={12}>
            <Card
              title={<Space><Tag color="red">Thiếu ghi sổ</Tag><Text type="secondary">(Δ dương)</Text></Space>}
              extra={<Text strong>Tổng: {fmt(data?.totals?.tong_thieu || 0)}</Text>}
            >
              <Table
                rowKey="id"
                size="small"
                loading={auditing && !data}
                columns={colDelta}
                dataSource={data?.missing || []}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: "Không có dữ liệu" }}
              />
              <Space wrap>
                <Button
                  onClick={() => callFix("missing", true)}
                  disabled={!canFix || !data || (data.missing || []).length === 0}
                >
                  Thử nghiệm bù thiếu (không ghi)
                </Button>
                <Button
                  type="primary"
                  danger
                  onClick={() => callFix("missing", false)}
                  loading={fixing === "missing"}
                  disabled={!canFix || !data || (data.missing || []).length === 0}
                >
                  Áp dụng bù thiếu
                </Button>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={<Space><Tag color="orange">Dư ghi sổ</Tag><Text type="secondary">(Δ âm)</Text></Space>}
              extra={<Text strong>Tổng: {fmt(data?.totals?.tong_du || 0)}</Text>}
            >
              <Table
                rowKey="id"
                size="small"
                loading={auditing && !data}
                columns={colDelta}
                dataSource={data?.over || []}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: "Không có dữ liệu" }}
              />
              <Space wrap>
                <Button
                  onClick={() => callFix("over", true)}
                  disabled={!canFix || !data || (data.over || []).length === 0}
                >
                  Thử nghiệm điều chỉnh âm (không ghi)
                </Button>
                <Button
                  type="primary"
                  onClick={() => callFix("over", false)}
                  loading={fixing === "over"}
                  disabled={!canFix || !data || (data.over || []).length === 0}
                >
                  Áp dụng điều chỉnh âm
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tổng hợp ròng */}
      {canView && (
        <Card>
          <Space wrap>
            <Text strong>CHÊNH LỆCH RÒNG:</Text>
            <Text strong type={(data?.totals?.net || 0) === 0 ? "success" : "warning"}>
              {fmt(data?.totals?.net || 0)}
            </Text>
            <Text type="secondary">
              {data?.totals?.net === 0
                ? "Đã cân khớp theo phiếu."
                : "Chưa cân khớp — vui lòng bù/điều chỉnh."}
            </Text>
            <div style={{ flex: 1 }} />
            <Space>
              <Button
                onClick={() => callFix("both", true)}
                disabled={!canFix || !data || ((data.missing || []).length + (data.over || []).length) === 0}
              >
                Thử nghiệm tất cả (không ghi)
              </Button>
              <Button
                type="primary"
                onClick={() => callFix("both", false)}
                loading={fixing === "both"}
                disabled={!canFix || !data || ((data.missing || []).length + (data.over || []).length) === 0}
              >
                Áp dụng tất cả
              </Button>
            </Space>
          </Space>
        </Card>
      )}
    </Space>
  );
}

/* ===== Utils ===== */
function fmt(n?: number | null) {
  const x = Number(n ?? 0);
  return x.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
}
