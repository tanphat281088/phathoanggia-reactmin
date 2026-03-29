/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadChangeParam, UploadFile } from "antd/es/upload/interface";
import dayjs from "dayjs";
import {
  attendanceCheckin,
  attendanceCheckout,
  attendanceGetMy,
  type AttendanceItem,
} from "../../services/attendance.api";
import {
  workpointCreate,
  workpointList,
  type WorkpointItem,
} from "../../services/workpoint.api";

const { Title, Text } = Typography;

type GeoState = {
  lat: number | null;
  lng: number | null;
  accuracy?: number | null;
  error?: string | null;
};

type OpenSession = {
  checkin_id: number;
  checked_in_at: string | null;
  workpoint_id?: number | null;
  workpoint_ten?: string | null;
};

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Trình duyệt không hỗ trợ Geolocation."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      } else {
        reject(new Error("Không đọc được file ảnh."));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Lỗi đọc file ảnh."));
    reader.readAsDataURL(file);
  });
}

function getRespError(err: any) {
  const res = err?.response;
  if (res) {
    return (
      res.data?.message ||
      res.data?.data?.message ||
      res.data?.data ||
      res.data?.error ||
      res.data?.code ||
      res.statusText ||
      "Lỗi không xác định."
    );
  }
  return err?.message || err?.code || "Lỗi không xác định.";
}

function findOpenSessionFromRows(rows: AttendanceItem[]): OpenSession | null {
  const sorted = [...rows]
    .filter((r) => !!r.checked_at)
    .sort((a, b) => dayjs(a.checked_at || "").valueOf() - dayjs(b.checked_at || "").valueOf());

  let open: AttendanceItem | null = null;

  for (const row of sorted) {
    if (row.type === "checkin") {
      open = row;
    } else if (row.type === "checkout") {
      open = null;
    }
  }

  if (!open) return null;

  return {
    checkin_id: open.id,
    checked_in_at: open.checked_at,
    workpoint_id: open.workpoint_id ?? null,
    workpoint_ten: open.workpoint_ten ?? null,
  };
}

export default function ChamCongNhanVien() {
  const { message, notification } = App.useApp();

  const [geo, setGeo] = useState<GeoState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
  });
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [loadingTable, setLoadingTable] = useState(false);
  const [rows, setRows] = useState<AttendanceItem[]>([]);

  const [loadingWorkpoints, setLoadingWorkpoints] = useState(false);
  const [workpoints, setWorkpoints] = useState<WorkpointItem[]>([]);
  const [selectedWorkpointId, setSelectedWorkpointId] = useState<number | undefined>(undefined);

  const [submitting, setSubmitting] = useState<"in" | "out" | null>(null);

  const [faceB64, setFaceB64] = useState<string | null>(null);
  const [facePreviewUrl, setFacePreviewUrl] = useState<string | null>(null);
  const [faceName, setFaceName] = useState<string | null>(null);
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creatingWP, setCreatingWP] = useState(false);
  const [createForm] = Form.useForm();

  const range = useMemo(() => {
    const to = dayjs().format("YYYY-MM-DD");
    const from = dayjs().subtract(30, "day").format("YYYY-MM-DD");
    return { from, to };
  }, []);

  const currentSession = useMemo(() => findOpenSessionFromRows(rows), [rows]);

  const selectedWorkpoint = useMemo(
    () => workpoints.find((w) => w.id === selectedWorkpointId) || null,
    [workpoints, selectedWorkpointId]
  );

  const columns: ColumnsType<AttendanceItem> = [
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (v: AttendanceItem["type"]) =>
        v === "checkin" ? <Tag color="green">Chấm công vào</Tag> : <Tag color="volcano">Chấm công ra</Tag>,
    },
    {
      title: "Địa điểm",
      dataIndex: "workpoint_ten",
      key: "workpoint_ten",
      width: 220,
      ellipsis: true,
      render: (v) => v || <Text type="secondary">-</Text>,
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
      dataIndex: "gio_phut",
      key: "gio_phut",
      width: 100,
      render: (v, r) => v || (r.checked_at ? dayjs(r.checked_at).format("HH:mm") : ""),
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
      title: "Mô tả",
      dataIndex: "short_desc",
      key: "short_desc",
      ellipsis: true,
    },
  ];

  const fetchGeo = async () => {
    setLoadingGeo(true);
    try {
      const pos = await getCurrentPosition();
      setGeo({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null,
        error: null,
      });
    } catch (err: any) {
      const msg =
        err?.message ||
        (err?.code === 1
          ? "Bạn đã từ chối quyền vị trí."
          : err?.code === 2
          ? "Không lấy được vị trí."
          : "Lỗi vị trí không xác định.");
      setGeo((g) => ({ ...g, error: msg }));
      message.error(msg);
    } finally {
      setLoadingGeo(false);
    }
  };

  const fetchMy = async () => {
    setLoadingTable(true);
    try {
      const resp = await attendanceGetMy({
        from: range.from,
        to: range.to,
        page: 1,
        per_page: 100,
      });

      if (resp?.success) {
        setRows(resp.data.items || []);
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setLoadingTable(false);
    }
  };

  const fetchNearbyWorkpoints = async (keepSelectionId?: number) => {
    if (geo.lat == null || geo.lng == null) return;

    setLoadingWorkpoints(true);
    try {
      const resp = await workpointList({
        lat: geo.lat,
        lng: geo.lng,
        only_available: true,
        limit: 100,
      });

      const items = resp?.success ? resp.data.items || [] : [];
      setWorkpoints(items);

      // Ưu tiên:
      // 1) nếu đang có phiên mở -> auto lock theo điểm đang mở
      // 2) nếu caller muốn giữ selection -> giữ
      // 3) nếu chưa có gì -> chọn điểm đầu tiên
      if (currentSession?.workpoint_id) {
        setSelectedWorkpointId(currentSession.workpoint_id);
      } else if (keepSelectionId && items.some((x) => x.id === keepSelectionId)) {
        setSelectedWorkpointId(keepSelectionId);
      } else if (!selectedWorkpointId && items.length > 0) {
        setSelectedWorkpointId(items[0].id);
      }
    } catch (err: any) {
      message.error(err?.message || "Không tải được danh sách địa điểm.");
      setWorkpoints([]);
    } finally {
      setLoadingWorkpoints(false);
    }
  };

  useEffect(() => {
    fetchGeo();
    fetchMy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (geo.lat != null && geo.lng != null) {
      fetchNearbyWorkpoints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.lat, geo.lng]);

  useEffect(() => {
    if (currentSession?.workpoint_id) {
      setSelectedWorkpointId(currentSession.workpoint_id);
    }
  }, [currentSession?.workpoint_id]);

  useEffect(() => {
    return () => {
      if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);
    };
  }, [facePreviewUrl]);

  const onFaceChange = async (info: UploadChangeParam<UploadFile<any>>) => {
    const file = info.file.originFileObj as File | undefined;
    setUploadFileList(info.fileList.slice(-1));

    if (!file) return;

    try {
      const b64 = await fileToBase64(file);
      if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);

      setFaceB64(b64);
      setFaceName(file.name);
      setFacePreviewUrl(URL.createObjectURL(file));
      message.success("Đã chọn ảnh selfie");
    } catch (err: any) {
      message.error(err?.message || "Không đọc được ảnh selfie.");
      clearFace();
    }
  };

  const clearFace = () => {
    setFaceB64(null);
    setFaceName(null);
    setUploadFileList([]);
    if (facePreviewUrl) {
      URL.revokeObjectURL(facePreviewUrl);
    }
    setFacePreviewUrl(null);
  };

  const openCreateModal = () => {
    if (geo.lat == null || geo.lng == null) {
      message.warning("Chưa có vị trí GPS, không thể tạo địa điểm.");
      return;
    }

    createForm.setFieldsValue({
      ten: `Sự kiện ${dayjs().format("DD/MM/YYYY HH:mm")}`,
      dia_chi: "",
      ban_kinh_m: 150,
      ghi_chu: "",
    });
    setCreateOpen(true);
  };

  const handleCreateWorkpoint = async () => {
    if (geo.lat == null || geo.lng == null) {
      message.warning("Chưa có vị trí GPS.");
      return;
    }

    try {
      const v = await createForm.validateFields();

      setCreatingWP(true);
      const res = await workpointCreate({
        ten: v.ten,
        dia_chi: v.dia_chi || undefined,
        ban_kinh_m: Number(v.ban_kinh_m || 150),
        ghi_chu: v.ghi_chu || undefined,
        lat: geo.lat,
        lng: geo.lng,
      });

      if (res?.success) {
        const item = res.data.item;
        setCreateOpen(false);
        message.success(res.data.notice || "Đã xử lý địa điểm.");

        await fetchNearbyWorkpoints(item.id);
        setSelectedWorkpointId(item.id);
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || "Không tạo được địa điểm.");
    } finally {
      setCreatingWP(false);
    }
  };

  const onCheckIn = async () => {
    if (geo.lat == null || geo.lng == null) {
      message.warning("Chưa có vị trí, vui lòng thử lại.");
      return;
    }

    if (currentSession) {
      message.warning("Bạn đang có phiên làm việc chưa chấm công ra. Vui lòng chấm công ra trước.");
      return;
    }

    if (!selectedWorkpointId) {
      message.warning("Vui lòng chọn địa điểm chấm công.");
      return;
    }

    if (!faceB64) {
      message.warning("Vui lòng chụp/chọn ảnh selfie trước khi chấm công vào.");
      return;
    }

    setSubmitting("in");

    try {
      const payload: any = {
        lat: geo.lat,
        lng: geo.lng,
        accuracy_m: geo.accuracy ?? undefined,
        device_id: "MOBILE",
        face_image_base64: faceB64,
        workpoint_id: selectedWorkpointId,
        also_timesheet: true,
      };

      const resp = await attendanceCheckin(payload);

      if (resp?.success) {
        message.success("Chấm công vào thành công!");
        clearFace();
        await fetchMy();
        await fetchNearbyWorkpoints(selectedWorkpointId);
        return;
      }

      message.warning("Không thể chấm công vào.");
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = getRespError(err);

      if (status === 409) {
        message.warning(msg || "Không thể chấm công vào.");
      } else if (status === 401) {
        notification.error({
          message: "Phiên đăng nhập hết hạn",
          description: "Vui lòng đăng nhập lại.",
        });
      } else {
        notification.error({
          message: "Không thể chấm công vào",
          description: msg,
        });
      }
    } finally {
      setSubmitting(null);
    }
  };

  const onCheckOut = async () => {
    if (geo.lat == null || geo.lng == null) {
      message.warning("Chưa có vị trí, vui lòng thử lại.");
      return;
    }

    if (!currentSession) {
      message.warning("Bạn không có phiên làm việc đang mở để chấm công ra.");
      return;
    }

    if (!faceB64) {
      message.warning("Vui lòng chụp/chọn ảnh selfie trước khi chấm công ra.");
      return;
    }

    setSubmitting("out");

    try {
      const payload: any = {
        lat: geo.lat,
        lng: geo.lng,
        accuracy_m: geo.accuracy ?? undefined,
        device_id: "MOBILE",
        face_image_base64: faceB64,
        also_timesheet: true,
        also_payroll: false,
      };

      if (currentSession.workpoint_id) {
        payload.workpoint_id = currentSession.workpoint_id;
      }

      const resp = await attendanceCheckout(payload);

      if (resp?.success) {
        message.success("Chấm công ra thành công!");
        clearFace();
        await fetchMy();
        await fetchNearbyWorkpoints(currentSession.workpoint_id || selectedWorkpointId);
        return;
      }

      message.warning("Không thể chấm công ra.");
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = getRespError(err);

      if (status === 409) {
        message.warning(msg || "Không thể chấm công ra.");
      } else if (status === 401) {
        notification.error({
          message: "Phiên đăng nhập hết hạn",
          description: "Vui lòng đăng nhập lại.",
        });
      } else {
        notification.error({
          message: "Không thể chấm công ra",
          description: msg,
        });
      }
    } finally {
      setSubmitting(null);
    }
  };

  const workpointOptions = useMemo(() => {
    return workpoints.map((w) => ({
      value: w.id,
      label: `${w.ten} • ${w.loai_label || w.loai_dia_diem || "-"}${
        typeof w.distance_m === "number" ? ` • ${w.distance_m}m` : ""
      }`,
    }));
  }, [workpoints]);

  const disabledCheckin =
    loadingGeo ||
    submitting !== null ||
    geo.lat === null ||
    geo.lng === null ||
    !!currentSession;

  const disabledCheckout =
    loadingGeo ||
    submitting !== null ||
    geo.lat === null ||
    geo.lng === null ||
    !currentSession;

  return (
    <Flex vertical gap={16}>
      <Title level={3} style={{ margin: 0 }}>
        Chấm công (Nhân viên)
      </Title>

      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Vị trí hiện tại">
                {loadingGeo ? (
                  <Text>Đang lấy vị trí…</Text>
                ) : geo.error ? (
                  <Text type="danger">{geo.error}</Text>
                ) : geo.lat && geo.lng ? (
                  <Space direction="vertical" size={2}>
                    <Text>
                      Lat: <Text code>{geo.lat.toFixed(6)}</Text> • Lng: <Text code>{geo.lng.toFixed(6)}</Text>
                    </Text>
                    <Text type="secondary">
                      Độ chính xác ~ {geo.accuracy ?? "-"} m
                    </Text>
                  </Space>
                ) : (
                  <Text type="secondary">Chưa có vị trí.</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Khoảng dữ liệu">
                {dayjs(range.from).format("DD/MM/YYYY")} → {dayjs(range.to).format("DD/MM/YYYY")}
              </Descriptions.Item>

              <Descriptions.Item label="Phiên hiện tại">
                {currentSession ? (
                  <Space direction="vertical" size={2}>
                    <Tag color="gold">Đang mở</Tag>
                    <Text>
                      {currentSession.workpoint_ten || "Không rõ địa điểm"} •{" "}
                      {currentSession.checked_in_at
                        ? dayjs(currentSession.checked_in_at).format("DD/MM/YYYY HH:mm")
                        : "-"}
                    </Text>
                  </Space>
                ) : (
                  <Tag color="default">Không có phiên mở</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Col>

          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Space wrap>
                <Button onClick={fetchGeo} loading={loadingGeo}>
                  Lấy lại vị trí
                </Button>
                <Button onClick={() => fetchNearbyWorkpoints(selectedWorkpointId)} loading={loadingWorkpoints}>
                  Nạp địa điểm gần đây
                </Button>
                <Button onClick={openCreateModal} disabled={geo.lat == null || geo.lng == null}>
                  Tạo điểm sự kiện mới
                </Button>
              </Space>

              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text>Chọn địa điểm chấm công</Text>
                <Select
                  style={{ width: "100%" }}
                  placeholder="-- Chọn địa điểm --"
                  loading={loadingWorkpoints}
                  options={workpointOptions}
                  value={selectedWorkpointId}
                  onChange={(v) => setSelectedWorkpointId(v)}
                  showSearch
                  optionFilterProp="label"
                />
              </Space>

              {selectedWorkpoint && (
                <Descriptions size="small" bordered column={1}>
                  <Descriptions.Item label="Tên">{selectedWorkpoint.ten}</Descriptions.Item>
                  <Descriptions.Item label="Mã">{selectedWorkpoint.ma_dia_diem || "-"}</Descriptions.Item>
                  <Descriptions.Item label="Loại">
                    <Tag color={selectedWorkpoint.loai_dia_diem === "fixed" ? "blue" : "purple"}>
                      {selectedWorkpoint.loai_label || selectedWorkpoint.loai_dia_diem || "-"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Bán kính">
                    {selectedWorkpoint.ban_kinh_m} m
                  </Descriptions.Item>
                  <Descriptions.Item label="Khoảng cách hiện tại">
                    {typeof selectedWorkpoint.distance_m === "number"
                      ? `${selectedWorkpoint.distance_m} m`
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ">
                    {selectedWorkpoint.dia_chi || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Hiệu lực">
                    {selectedWorkpoint.hieu_luc_den
                      ? `Đến ${dayjs(selectedWorkpoint.hieu_luc_den).format("DD/MM/YYYY HH:mm")}`
                      : "Không giới hạn"}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {currentSession ? (
        <Alert
          type="info"
          showIcon
          message="Bạn đang có phiên làm việc đang mở"
          description={`Checkout sẽ được thực hiện theo đúng địa điểm đã check-in: ${currentSession.workpoint_ten || "Không rõ địa điểm"}.`}
        />
      ) : (
        <Alert
          type="success"
          showIcon
          message="Bạn có thể mở phiên làm việc mới"
          description="Hãy chọn đúng địa điểm rồi chấm công vào bằng khuôn mặt."
        />
      )}

      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              <Text strong>Ảnh selfie hiện tại</Text>

              <Upload
                accept="image/*"
                listType="picture-card"
                maxCount={1}
                beforeUpload={() => false}
                onChange={onFaceChange}
                fileList={uploadFileList}
              >
                {uploadFileList.length >= 1 ? null : "Chọn ảnh"}
              </Upload>

              {faceName ? (
                <Space direction="vertical" size={2}>
                  <Text>{faceName}</Text>
                  {facePreviewUrl && (
                    <img
                      src={facePreviewUrl}
                      alt="selfie-preview"
                      style={{
                        width: 120,
                        height: 120,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid #f0f0f0",
                      }}
                    />
                  )}
                </Space>
              ) : (
                <Text type="secondary">Chưa có ảnh selfie.</Text>
              )}

              <Space>
                <Button onClick={clearFace} disabled={!faceB64}>
                  Xóa ảnh
                </Button>
              </Space>
            </Space>
          </Col>

          <Col xs={24} md={14}>
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Button
                type="primary"
                size="large"
                onClick={onCheckIn}
                loading={submitting === "in"}
                disabled={disabledCheckin}
              >
                Chấm công vào
              </Button>

              <Button
                danger
                size="large"
                onClick={onCheckOut}
                loading={submitting === "out"}
                disabled={disabledCheckout}
              >
                Chấm công ra
              </Button>

              <Text type="secondary">
                Lưu ý:
                <br />- Chấm công vào: phải chọn đúng địa điểm trước khi mở phiên.
                <br />- Chấm công ra: hệ thống tự khóa theo địa điểm của phiên đang mở.
                <br />- Tạo địa điểm mới chỉ dùng khi không có điểm phù hợp gần vị trí hiện tại.
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Flex justify="space-between" align="center">
          <Title level={4} style={{ margin: 0 }}>
            Lịch sử 30 ngày gần nhất
          </Title>
          <Button onClick={fetchMy} loading={loadingTable}>
            Làm mới
          </Button>
        </Flex>

        <Divider style={{ margin: "12px 0" }} />

        <Table<AttendanceItem>
          rowKey="id"
          size="middle"
          loading={loadingTable}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Tạo địa điểm sự kiện mới"
        open={createOpen}
        onOk={handleCreateWorkpoint}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={creatingWP}
        okText="Tạo địa điểm"
        cancelText="Hủy"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="Tên địa điểm"
            name="ten"
            rules={[{ required: true, message: "Vui lòng nhập tên địa điểm" }]}
          >
            <Input placeholder="VD: Sự kiện Khách A - Queen Tân Bình" />
          </Form.Item>

          <Form.Item label="Địa chỉ (nếu có)" name="dia_chi">
            <Input placeholder="VD: 91B2 Phạm Văn Hai, P.3, Q. Tân Bình" />
          </Form.Item>

          <Form.Item
            label="Bán kính hợp lệ (m)"
            name="ban_kinh_m"
            rules={[{ required: true, message: "Nhập bán kính hợp lệ" }]}
          >
            <InputNumber min={30} max={5000} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Ghi chú" name="ghi_chu">
            <Input.TextArea rows={3} placeholder="VD: Điểm event phát sinh, hết hiệu lực sau sự kiện" />
          </Form.Item>

          <Alert
            type="warning"
            showIcon
            message="Địa điểm mới sẽ được tạo tại đúng GPS hiện tại"
            description={
              geo.lat && geo.lng
                ? `Lat ${geo.lat.toFixed(6)} • Lng ${geo.lng.toFixed(6)} • Sai số ~ ${geo.accuracy ?? "-"}m`
                : "Chưa có GPS hiện tại"
            }
          />
        </Form>
      </Modal>
    </Flex>
  );
}