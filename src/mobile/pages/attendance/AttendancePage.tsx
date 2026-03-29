/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Dialog,
  DotLoading,
  Grid,
  List,
  Space,
  Tag,
  Tabs,
  Toast,
  Popup,
} from "antd-mobile";
import {
  EnvironmentOutline,
  CameraOutline,
  CheckCircleOutline,
  LeftOutline,
  RightOutline,
} from "antd-mobile-icons";
import dayjs from "dayjs";
import axios from "../../../configs/axios";
import {
  attendanceCheckin,
  attendanceCheckout,
  attendanceGetMy,
  type AttendanceItem,
} from "../../../services/attendance.api";
import {
  workpointCreate,
  workpointList,
  type WorkpointItem,
} from "../../../services/workpoint.api";

type GeoState = {
  lat: number | null;
  lng: number | null;
  accuracy?: number | null;
  error?: string | null;
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

// Helper: file -> base64 (chỉ phần base64, không prefix data:)
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

// Thêm optimistic log cho UI mượt
function optimisticPush(
  setRows: React.Dispatch<React.SetStateAction<AttendanceItem[]>>,
  type: AttendanceItem["type"],
  within = true,
  distance_m?: number
) {
  setRows((prev) => [
    {
      id: Math.floor(Math.random() * 1e9) * -1,
      type,
      checked_at: new Date().toISOString(),
      ngay: dayjs().format("YYYY-MM-DD"),
      gio_phut: dayjs().format("HH:mm"),

      within,
      distance_m: distance_m ?? 0,
      lat: 0,
      lng: 0,

      device_id: "MOBILE",
      short_desc: "Đang đồng bộ…",
    } as AttendanceItem,
    ...prev,
  ]);
}

const smoothDelay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

type WorkpointWithMeta = WorkpointItem & {
  distance_m?: number | null;
  is_fixed?: boolean;
};

// Haversine distance (m) giữa 2 toạ độ
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // m
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Helper format ngày
function formatDateLabel(dateStr: string): string {
  return dayjs(dateStr).format("DD/MM/YYYY");
}

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<"checkin" | "history" | "calendar">("checkin");

  const [geo, setGeo] = useState<GeoState>({ lat: null, lng: null, accuracy: null, error: null });
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [rows, setRows] = useState<AttendanceItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState<"in" | "out" | null>(null);

  // Ảnh selfie
  const [faceB64, setFaceB64] = useState<string | null>(null);
  const [facePreviewUrl, setFacePreviewUrl] = useState<string | null>(null);
  const [faceName, setFaceName] = useState<string | null>(null);

  // Workpoints (cố định + event)
  const [workpoints, setWorkpoints] = useState<WorkpointItem[]>([]);
  const [loadingWorkpoints, setLoadingWorkpoints] = useState(false);
  const [selectedWorkpointId, setSelectedWorkpointId] = useState<number | null>(null);
  const [creatingWP, setCreatingWP] = useState(false);
  const [lastWorkpoint, setLastWorkpoint] = useState<WorkpointItem | null>(null);

    const [workpointPickerVisible, setWorkpointPickerVisible] = useState(false);
  const [workpointKeyword, setWorkpointKeyword] = useState("");


  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Range lấy lịch sử: 30 ngày gần nhất (dùng chung cho Lịch sử + Lịch biểu)
  const range = useMemo(() => {
    const to = dayjs().format("YYYY-MM-DD");
    const from = dayjs().subtract(30, "day").format("YYYY-MM-DD");
    return { from, to };
  }, []);

  // Lịch biểu: tháng đang xem & ngày đang chọn
  const [calendarMonth, setCalendarMonth] = useState<string>(dayjs().format("YYYY-MM"));
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format("YYYY-MM-DD"));

  // ===== GEO =====
  const loadGeo = async () => {
    setLoadingGeo(true);
    try {
      const pos = await getCurrentPosition();
      setGeo({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Number.isFinite(pos.coords.accuracy)
          ? Math.round(pos.coords.accuracy)
          : null,
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
      Toast.show({ content: msg, position: "top" });
    } finally {
      setLoadingGeo(false);
    }
  };

  // ===== WORKPOINTS =====
  const loadWorkpoints = async () => {
    setLoadingWorkpoints(true);
    try {
      const resp = await workpointList();
      if (resp?.success) {
        setWorkpoints(resp.data.items || []);
      }
    } catch {
      /* handled global */
    } finally {
      setLoadingWorkpoints(false);
    }
  };

  // Tính workpoint + distance
  const workpointsWithMeta: WorkpointWithMeta[] = useMemo(() => {
    if (!workpoints.length) return [];
    return workpoints.map((wp) => {
      let distance_m: number | null = null;
      if (geo.lat != null && geo.lng != null) {
        distance_m = Math.round(haversineMeters(geo.lat, geo.lng, wp.lat, wp.lng));
      }

      const isFixed: boolean =
        wp.ten.startsWith("[DD") ||
        (!!wp.ban_kinh_m && wp.ban_kinh_m <= 200); // heuristic: seeder fixed radius nhỏ hơn

      return { ...wp, distance_m, is_fixed: isFixed };
    });
  }, [workpoints, geo.lat, geo.lng]);

  const sortedWorkpoints: WorkpointWithMeta[] = useMemo(() => {
    if (!workpointsWithMeta.length) return [];
    const list = [...workpointsWithMeta];
    list.sort((a, b) => {
      const da = a.distance_m ?? Number.POSITIVE_INFINITY;
      const db = b.distance_m ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (a.ten || "").localeCompare(b.ten || "");
    });
    return list;
  }, [workpointsWithMeta]);

    const filteredWorkpoints = useMemo(() => {
    if (!workpointKeyword.trim()) return sortedWorkpoints;
    const kw = workpointKeyword.trim().toLowerCase();
    return sortedWorkpoints.filter((wp) =>
      (wp.ten || "").toLowerCase().includes(kw)
    );
  }, [sortedWorkpoints, workpointKeyword]);


  // Chọn workpoint gần nhất (chỉ khi chưa có lựa chọn)
  useEffect(() => {
    if (!sortedWorkpoints.length) return;
    if (selectedWorkpointId != null) return;

    let candidateId = sortedWorkpoints[0].id;
    if (geo.lat != null && geo.lng != null) {
      let bestId = candidateId;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const wp of sortedWorkpoints) {
        if (wp.distance_m != null && wp.distance_m < bestDist) {
          bestDist = wp.distance_m;
          bestId = wp.id;
        }
      }
      candidateId = bestDist !== Number.POSITIVE_INFINITY ? bestId : candidateId;
    }
    setSelectedWorkpointId(candidateId);
  }, [sortedWorkpoints, selectedWorkpointId, geo.lat, geo.lng]);

  const selectedWorkpoint: WorkpointWithMeta | null = useMemo(() => {
    if (!sortedWorkpoints.length) return null;
    if (selectedWorkpointId == null) return sortedWorkpoints[0];
    return sortedWorkpoints.find((w) => w.id === selectedWorkpointId) || sortedWorkpoints[0];
  }, [sortedWorkpoints, selectedWorkpointId]);

  const withinSelected = useMemo(() => {
    if (!selectedWorkpoint) return null;
    if (selectedWorkpoint.distance_m == null) return null;
    if (!selectedWorkpoint.ban_kinh_m) return null;
    return selectedWorkpoint.distance_m <= selectedWorkpoint.ban_kinh_m;
  }, [selectedWorkpoint]);

  // ===== Lịch sử chấm công (me) =====
  const loadMyAttendance = async () => {
    setLoadingList(true);
    try {
      const resp = await attendanceGetMy({
        from: range.from,
        to: range.to,
        page: 1,
        per_page: 200,
      });
      if (resp?.success) {
        setRows(resp.data.items || []);
      }
    } catch {
      /* handled global */
    } finally {
      setLoadingList(false);
    }
  };

  // ===== INIT: kiểm tra phiên + load geo + workpoints + logs =====
  useEffect(() => {
    const init = async () => {
      try {
        await axios.post("/auth/me");
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401) {
          Toast.show({
            content: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
            position: "top",
          });
          window.location.href = "/login";
          return;
        }
      }

      await loadGeo();
      await loadWorkpoints();
      await loadMyAttendance();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Ảnh selfie =====
  const onPickImage = () => {
    fileInputRef.current?.click();
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      setFaceB64(b64);
      setFaceName(file.name);
      if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);
      setFacePreviewUrl(URL.createObjectURL(file));
      Toast.show({ content: "Đã chọn ảnh selfie", position: "bottom" });
    } catch (err: any) {
      Toast.show({ content: err?.message || "Không đọc được ảnh selfie.", position: "bottom" });
      setFaceB64(null);
      setFaceName(null);
      if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);
      setFacePreviewUrl(null);
    } finally {
      e.target.value = "";
    }
  };

  const clearFace = () => {
    setFaceB64(null);
    setFaceName(null);
    if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);
    setFacePreviewUrl(null);
  };

  // ===== Trạng thái hôm nay =====
  const todayStatus = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const ins = rows.find(
      (r) =>
        r.type === "checkin" &&
        (r.ngay || (r.checked_at ? dayjs(r.checked_at).format("YYYY-MM-DD") : "")) === today
    );
    const outs = rows.find(
      (r) =>
        r.type === "checkout" &&
        (r.ngay || (r.checked_at ? dayjs(r.checked_at).format("YYYY-MM-DD") : "")) === today
    );
    return { ins: !!ins, outs: !!outs };
  }, [rows]);

  // ===== Tạo workpoint mới tại vị trí hiện tại =====
  const createWorkpointHere = async () => {
    if (geo.lat == null || geo.lng == null) {
      Toast.show({ content: "Chưa có vị trí GPS, không thể tạo địa điểm.", position: "top" });
      return;
    }

    const acc = geo.accuracy ?? 9999;
    if (acc > 100) {
      const res = await Dialog.confirm({
        title: "Độ chính xác vị trí thấp",
        content: `Sai số định vị hiện tại khoảng ~${acc}m. Bạn vẫn muốn tạo địa điểm tại đây?`,
        confirmText: "Vẫn tạo",
        cancelText: "Hủy",
      });
      if (!res) return;
    }

    const nameDefault = `Sự kiện @ ${dayjs().format("DD/MM/YYYY HH:mm")}`;
    const name = window.prompt("Nhập tên địa điểm chấm công", nameDefault);
    if (!name || !name.trim()) {
      return;
    }

    try {
      setCreatingWP(true);
      const resp = await workpointCreate({
        ten: name.trim(),
        lat: geo.lat!,
        lng: geo.lng!,
        ban_kinh_m: 300, // bán kính hợp lệ 300m cho địa điểm event
      });
      if (resp?.success) {
        const item = resp.data.item;
        setLastWorkpoint(item);
        setSelectedWorkpointId(item.id);
        Toast.show({
          icon: <CheckCircleOutline />,
          content: resp.data.notice || "Đã tạo địa điểm chấm công mới.",
          position: "top",
        });
        await loadWorkpoints();
      } else {
        Toast.show({ content: resp?.message || "Không tạo được địa điểm.", position: "top" });
      }
    } catch (err: any) {
      Toast.show({
        content: err?.message || "Lỗi tạo địa điểm chấm công.",
        position: "top",
      });
    } finally {
      setCreatingWP(false);
    }
  };

  const disabledAction =
    loadingGeo ||
    submitting !== null ||
    geo.lat == null ||
    geo.lng == null ||
    !selectedWorkpoint;

  // ===== Checkin / Checkout =====
  const doCheckIn = async () => {
    if (geo.lat == null || geo.lng == null) {
      Toast.show({ content: "Chưa có vị trí, vui lòng thử lại.", position: "top" });
      return;
    }
    if (!faceB64) {
      Toast.show({
        content: "Vui lòng chụp/chọn ảnh selfie trước khi chấm công vào.",
        position: "top",
      });
      return;
    }
    if (selectedWorkpoint && withinSelected === false) {
      Toast.show({
        content:
          "Bạn đang ở ngoài bán kính chấm công của địa điểm này. Vui lòng đứng gần hơn hoặc chọn địa điểm phù hợp.",
        position: "top",
      });
      return;
    }

    setSubmitting("in");
    optimisticPush(setRows, "checkin", true, geo.accuracy ?? undefined);

    try {
      const resp = await attendanceCheckin({
        lat: geo.lat!,
        lng: geo.lng!,
        accuracy_m: geo.accuracy ?? undefined,
        device_id: "MOBILE",
        face_image_base64: faceB64,
        workpoint_id: selectedWorkpoint?.id,
      });

      await smoothDelay(250);

      if (resp?.success) {
        Toast.show({ content: "Chấm công vào thành công!", position: "bottom" });
        clearFace();
        await loadMyAttendance();
        return;
      }

      Toast.show({
        content: (resp as any)?.message || "Không thể chấm công vào.",
        position: "bottom",
      });
      await loadMyAttendance();
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (status === 409 && code === "ALREADY_CHECKED_IN"
          ? "Bạn đã chấm công vào hôm nay."
          : "Không thể chấm công vào.");

      Toast.show({ content: msg, position: "top" });
      await loadMyAttendance();
    } finally {
      setSubmitting(null);
    }
  };

  const doCheckOut = async () => {
    if (geo.lat == null || geo.lng == null) {
      Toast.show({ content: "Chưa có vị trí, vui lòng thử lại.", position: "top" });
      return;
    }
    if (!faceB64) {
      Toast.show({
        content: "Vui lòng chụp/chọn ảnh selfie trước khi chấm công ra.",
        position: "top",
      });
      return;
    }
    if (selectedWorkpoint && withinSelected === false) {
      Toast.show({
        content:
          "Bạn đang ở ngoài bán kính chấm công của địa điểm này. Vui lòng đứng gần hơn hoặc chọn địa điểm phù hợp.",
        position: "top",
      });
      return;
    }

    setSubmitting("out");
    optimisticPush(setRows, "checkout", true, geo.accuracy ?? undefined);

    try {
      const resp = await attendanceCheckout({
        lat: geo.lat!,
        lng: geo.lng!,
        accuracy_m: geo.accuracy ?? undefined,
        device_id: "MOBILE",
        face_image_base64: faceB64,
        workpoint_id: selectedWorkpoint?.id,
      });

      await smoothDelay(250);

      if (resp?.success) {
        Toast.show({ content: "Chấm công ra thành công!", position: "bottom" });
        clearFace();
        await loadMyAttendance();
        return;
      }

      Toast.show({
        content: (resp as any)?.message || "Không thể chấm công ra.",
        position: "bottom",
      });
      await loadMyAttendance();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (status === 409 ? "Không thể chấm công ra do xung đột." : "Không thể chấm công ra.");

      Toast.show({ content: msg, position: "top" });
      await loadMyAttendance();
    } finally {
      setSubmitting(null);
    }
  };

  // ===== Lịch sử: group theo ngày =====
  const historyGroups = useMemo(() => {
    const grouped: Record<string, AttendanceItem[]> = {};
    for (const r of rows) {
      const d =
        r.ngay ||
        (r.checked_at ? dayjs(r.checked_at).format("YYYY-MM-DD") : null);
      if (!d) continue;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(r);
    }
    const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1)); // mới nhất trước
    return dates.map((date) => ({
      date,
      items: grouped[date].slice().sort((a, b) => {
        const ta =
          a.checked_at ? dayjs(a.checked_at).valueOf() : dayjs(a.ngay || "").valueOf();
        const tb =
          b.checked_at ? dayjs(b.checked_at).valueOf() : dayjs(b.ngay || "").valueOf();
        return ta - tb;
      }),
    }));
  }, [rows]);

  // ===== Lịch biểu: map ngày -> trạng thái =====
  const dayStatusMap = useMemo(() => {
    const map: Record<string, { hasIn: boolean; hasOut: boolean }> = {};
    for (const r of rows) {
      const d =
        r.ngay ||
        (r.checked_at ? dayjs(r.checked_at).format("YYYY-MM-DD") : null);
      if (!d) continue;
      if (!map[d]) map[d] = { hasIn: false, hasOut: false };
      if (r.type === "checkin") map[d].hasIn = true;
      if (r.type === "checkout") map[d].hasOut = true;
    }
    return map;
  }, [rows]);

  const calendarMatrix: (dayjs.Dayjs | null)[][] = useMemo(() => {
    const first = dayjs(`${calendarMonth}-01`);
    if (!first.isValid()) return [];
    const daysInMonth = first.daysInMonth();
    const matrix: (dayjs.Dayjs | null)[][] = [];
    let week: (dayjs.Dayjs | null)[] = new Array(7).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const date = first.date(d);
      const weekday = (date.day() + 6) % 7; // 0=Mon..6=Sun

      week[weekday] = date;

      if (weekday === 6 || d === daysInMonth) {
        matrix.push(week);
        week = new Array(7).fill(null);
      }
    }

    return matrix;
  }, [calendarMonth]);

  const selectedDayLogs = useMemo(() => {
    return rows
      .filter((r) => {
        const d =
          r.ngay ||
          (r.checked_at ? dayjs(r.checked_at).format("YYYY-MM-DD") : null);
        return d === selectedDate;
      })
      .sort((a, b) => {
        const ta =
          a.checked_at ? dayjs(a.checked_at).valueOf() : dayjs(a.ngay || "").valueOf();
        const tb =
          b.checked_at ? dayjs(b.checked_at).valueOf() : dayjs(b.ngay || "").valueOf();
        return ta - tb;
      });
  }, [rows, selectedDate]);

  const goPrevMonth = () => {
    setCalendarMonth((prev) => dayjs(`${prev}-01`).subtract(1, "month").format("YYYY-MM"));
  };

  const goNextMonth = () => {
    setCalendarMonth((prev) => dayjs(`${prev}-01`).add(1, "month").format("YYYY-MM"));
  };

  // ===== Render =====
  return (
    <div className="pb-safe" style={{ padding: 12 }}>
      {/* File input ẩn cho camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as "checkin" | "history" | "calendar")}
      >
        {/* TAB 1: CHẤM CÔNG */}
        <Tabs.Tab title="Chấm công" key="checkin">
          {/* Card 1: Vị trí + trạng thái + địa điểm chấm công */}
          <Card className="phg-card" style={{ marginBottom: 12 }}>
            <Space direction="vertical" block>
              {/* Vị trí hiện tại */}
              <Space align="center">
                <EnvironmentOutline />
                <div>
                  <div style={{ fontWeight: 700 }}>Vị trí & địa điểm chấm công</div>
                  {loadingGeo ? (
                    <div className="phg-muted">
                      <DotLoading /> Đang lấy vị trí...
                    </div>
                  ) : geo.error ? (
                    <div style={{ color: "#cf1322" }}>{geo.error}</div>
                  ) : geo.lat && geo.lng ? (
                    <>
                      <div style={{ fontSize: 13 }}>
                        Lat: <code>{geo.lat.toFixed(6)}</code> • Lng:{" "}
                        <code>{geo.lng.toFixed(6)}</code>
                      </div>
                      {Number.isFinite(geo.accuracy) && (
                        <div className="phg-muted" style={{ fontSize: 12 }}>
                          Sai số ~ {geo.accuracy}m
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="phg-muted">Chưa có vị trí.</span>
                  )}
                </div>
              </Space>

              <Space wrap>
                <Button size="small" onClick={loadGeo} loading={loadingGeo}>
                  Lấy lại vị trí
                </Button>
                <Button
                  size="small"
                  color="primary"
                  loading={creatingWP}
                  disabled={geo.lat == null || geo.lng == null}
                  onClick={createWorkpointHere}
                >
                  Tạo địa điểm chấm công tại đây
                </Button>
              </Space>

              {/* Trạng thái hôm nay */}
              <div className="phg-sep" />
              <div className="phg-row">
                <span className="phg-muted" style={{ fontSize: 13 }}>
                  Trạng thái hôm nay:
                </span>
                <Space>
                  <Tag
                    color={todayStatus.ins ? "success" : "default"}
                    style={{ borderRadius: 999, padding: "0 10px" }}
                  >
                    {todayStatus.ins ? "ĐÃ chấm công vào" : "CHƯA chấm công vào"}
                  </Tag>
                  <Tag
                    color={todayStatus.outs ? "danger" : "default"}
                    style={{ borderRadius: 999, padding: "0 10px" }}
                  >
                    {todayStatus.outs ? "ĐÃ chấm công ra" : "CHƯA chấm công ra"}
                  </Tag>
                </Space>
              </div>

              {/* Địa điểm đang chọn */}
                 {/* Địa điểm đang chọn */}
              <div className="phg-sep" />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Địa điểm chấm công</div>
                {selectedWorkpoint ? (
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid #dde5f2",
                      padding: 8,
                      background:
                        withinSelected === false
                          ? "#fff1f0"
                          : withinSelected === true
                          ? "#f6ffed"
                          : "#ffffff",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{selectedWorkpoint.ten}</div>
                    <div className="phg-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {selectedWorkpoint.distance_m != null
                        ? `Cách khoảng ${selectedWorkpoint.distance_m}m`
                        : "Chưa xác định khoảng cách"}{" "}
                      {selectedWorkpoint.ban_kinh_m
                        ? `• Bán kính hợp lệ ${selectedWorkpoint.ban_kinh_m}m`
                        : ""}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {withinSelected === true ? (
                        <Tag color="success" style={{ borderRadius: 999 }}>
                          Trong vùng chấm công
                        </Tag>
                      ) : withinSelected === false ? (
                        <Tag color="danger" style={{ borderRadius: 999 }}>
                          Ngoài vùng chấm công
                        </Tag>
                      ) : (
                        <Tag color="default" style={{ borderRadius: 999 }}>
                          Đang tính khoảng cách...
                        </Tag>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="phg-muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    Chưa có địa điểm chấm công.
                  </div>
                )}

                <Space align="center" wrap style={{ marginTop: 4 }}>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => setWorkpointPickerVisible(true)}
                  >
                    Chọn / đổi địa điểm
                  </Button>
                  {lastWorkpoint && (
                    <span className="phg-muted" style={{ fontSize: 11 }}>
                      Gần đây: <b>{lastWorkpoint.ten}</b>
                    </span>
                  )}
                </Space>
              </div>

            </Space>
          </Card>

          {/* Card 2: Ảnh selfie + nút chấm công */}
          <Card className="phg-card" style={{ marginBottom: 12 }}>
            <Space direction="vertical" block>
              <Space align="center">
                <CameraOutline />
                <div>
                  <div style={{ fontWeight: 700 }}>Xác thực khuôn mặt (bắt buộc)</div>
                  <div className="phg-muted" style={{ fontSize: 12 }}>
                    Chụp trực tiếp bằng camera, không dùng ảnh cũ trong thư viện.
                  </div>
                </div>
              </Space>

              <Grid columns={2} gap={8}>
                <Grid.Item>
                  <Button block color="primary" onClick={onPickImage}>
                    Chọn / Chụp ảnh
                  </Button>
                </Grid.Item>
                <Grid.Item>
                  <Button block color="default" disabled={!faceB64} onClick={clearFace}>
                    Xoá ảnh
                  </Button>
                </Grid.Item>
              </Grid>

              {facePreviewUrl ? (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <img
                    src={facePreviewUrl}
                    alt="selfie-preview"
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12 }}
                  />
                  <div>
                    <div className="phg-muted" style={{ fontSize: 12 }}>
                      {faceName}
                    </div>
                    <div className="chip" style={{ marginTop: 4 }}>
                      <CameraOutline fontSize={14} /> Sẵn sàng chấm công
                    </div>
                  </div>
                </div>
              ) : (
                <div className="phg-muted" style={{ fontSize: 12 }}>
                  Chưa chọn ảnh.
                </div>
              )}

              <div className="phg-sep" />

              <Grid columns={2} gap={8}>
                <Grid.Item>
                  <Button
                    block
                    color="primary"
                    disabled={disabledAction || todayStatus.ins}
                    loading={submitting === "in"}
                    onClick={doCheckIn}
                  >
                    {todayStatus.ins ? "Đã chấm công vào" : "Chấm công vào"}
                  </Button>
                </Grid.Item>
                <Grid.Item>
                  <Button
                    block
                    color="danger"
                    disabled={disabledAction || !todayStatus.ins || todayStatus.outs}
                    loading={submitting === "out"}
                    onClick={doCheckOut}
                  >
                    {todayStatus.outs ? "Đã chấm công ra" : "Chấm công ra"}
                  </Button>
                </Grid.Item>
              </Grid>
            </Space>
          </Card>

          {/* Popup chọn địa điểm chấm công (full list) */}
          <Popup
            visible={workpointPickerVisible}
            onMaskClick={() => setWorkpointPickerVisible(false)}
            position="bottom"
            bodyStyle={{
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              minHeight: "60vh",
              maxHeight: "80vh",
              padding: 12,
              backgroundColor: "#ffffff",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center" }}>
                Danh sách địa điểm chấm công
              </div>
              <div className="phg-muted" style={{ fontSize: 11, textAlign: "center" }}>
                Chọn đúng địa điểm trước khi chấm công
              </div>
            </div>

            {/* Ô tìm kiếm đơn giản */}
            <div style={{ marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Tìm theo tên địa điểm..."
                value={workpointKeyword}
                onChange={(e) => setWorkpointKeyword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid #dde5f2",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                maxHeight: "55vh",
                overflowY: "auto",
                marginTop: 4,
              }}
            >
              {loadingWorkpoints && (
                <div className="phg-muted" style={{ fontSize: 12, padding: 6 }}>
                  <DotLoading /> Đang tải danh sách địa điểm...
                </div>
              )}

              {!loadingWorkpoints && !filteredWorkpoints.length && (
                <div className="phg-muted" style={{ fontSize: 12, padding: 6 }}>
                  Không tìm thấy địa điểm phù hợp. Vui lòng kiểm tra lại từ khoá hoặc tạo địa điểm mới.
                </div>
              )}

              {!loadingWorkpoints &&
                filteredWorkpoints.map((wp) => {
                  const selected = selectedWorkpoint && wp.id === selectedWorkpoint.id;
                  const badgeText = wp.is_fixed ? "Cố định" : "Sự kiện";
                  const badgeColor = wp.is_fixed ? "primary" : "warning";

                  return (
                    <div
                      key={wp.id}
                      onClick={() => {
                        setSelectedWorkpointId(wp.id);
                        setWorkpointPickerVisible(false);
                      }}
                      style={{
                        cursor: "pointer",
                        borderRadius: 10,
                        border: selected
                          ? "1px solid var(--adm-color-primary)"
                          : "1px solid #f0f0f0",
                        padding: 10,
                        marginBottom: 6,
                        background: selected ? "rgba(0,82,204,0.06)" : "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{wp.ten}</div>
                        <div className="phg-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {wp.distance_m != null
                            ? `Cách ~${wp.distance_m}m`
                            : "Chưa xác định khoảng cách"}{" "}
                          {wp.ban_kinh_m ? `• R=${wp.ban_kinh_m}m` : ""}
                        </div>
                      </div>
                      <Tag color={badgeColor} style={{ borderRadius: 999 }}>
                        {badgeText}
                      </Tag>
                    </div>
                  );
                })}
            </div>
          </Popup>



        </Tabs.Tab>

        {/* TAB 2: LỊCH SỬ */}
        <Tabs.Tab title="Lịch sử" key="history">
          <Card className="phg-card">
            <div className="phg-list-head">
              <span>Lịch sử chấm công (30 ngày)</span>
              <Button
                size="small"
                color="primary"
                onClick={loadMyAttendance}
                loading={loadingList}
              >
                Làm mới
              </Button>
            </div>

            {historyGroups.length === 0 && !loadingList && (
              <div className="phg-muted" style={{ fontSize: 13, padding: 8 }}>
                Chưa có dữ liệu chấm công trong 30 ngày gần nhất.
              </div>
            )}

            {historyGroups.map((group) => (
              <div key={group.date} style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 4,
                    paddingLeft: 4,
                  }}
                >
                  {formatDateLabel(group.date)}
                </div>
                <Card
                  style={{
                    borderRadius: 12,
                    border: "1px solid #f5f5f5",
                    boxShadow: "none",
                    marginBottom: 4,
                  }}
                >
                  <List>
        {group.items.map((r) => {
          const timeLabel = r.gio_phut
            ? r.gio_phut
            : r.checked_at
            ? dayjs(r.checked_at).format("HH:mm")
            : "";
          const placeLabel = r.workpoint_ten || "Địa điểm không xác định";

          return (
            <List.Item
              key={r.id}
              prefix={
                <Tag
                  color={r.type === "checkin" ? "success" : "warning"}
                  style={{ borderRadius: 999 }}
                >
                  {r.type === "checkin" ? "IN" : "OUT"}
                </Tag>
              }
              description={
                <span className="phg-muted" style={{ fontSize: 12 }}>
                  {r.short_desc || ""}
                </span>
              }
            >
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{timeLabel}</span>
                {placeLabel && (
                  <>
                    {" · "}
                    <span>{placeLabel}</span>
                  </>
                )}
              </div>
            </List.Item>
          );
        })}

                  </List>
                </Card>
              </div>
            ))}
          </Card>
        </Tabs.Tab>

        {/* TAB 3: LỊCH BIỂU */}
        <Tabs.Tab title="Lịch biểu" key="calendar">
          <Card className="phg-card">
            {/* Header tháng + điều hướng */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
    <Button
  size="small"
  fill="none"
  onClick={goPrevMonth}
>
  <LeftOutline />
</Button>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700 }}>
                  {dayjs(`${calendarMonth}-01`).format("MMMM YYYY")}
                </div>
                <div className="phg-muted" style={{ fontSize: 11 }}>
                  (Lịch biểu chấm công)
                </div>
              </div>
  <Button
  size="small"
  fill="none"
  onClick={goNextMonth}
>
  <RightOutline />
</Button>

            </div>

            {/* Header thứ trong tuần */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                textAlign: "center",
                fontSize: 11,
                marginBottom: 4,
              }}
            >
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <div key={d} className="phg-muted">
                  {d}
                </div>
              ))}
            </div>

            {/* Lưới lịch */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                rowGap: 4,
                columnGap: 4,
              }}
            >
              {calendarMatrix.map((week, i) =>
                week.map((date, j) => {
                  if (!date) {
                    return (
                      <div
                        key={`${i}-${j}`}
                        style={{ height: 40, borderRadius: 8 }}
                      ></div>
                    );
                  }

                  const dStr = date.format("YYYY-MM-DD");
                  const status = dayStatusMap[dStr];
                  let dotColor = "transparent";
                  if (status?.hasIn && status?.hasOut) dotColor = "#52c41a"; // full
                  else if (status?.hasIn || status?.hasOut) dotColor = "#faad14"; // partial

                  const isToday = dStr === dayjs().format("YYYY-MM-DD");
                  const isSelected = dStr === selectedDate;

                  return (
                    <div
                      key={`${i}-${j}`}
                      onClick={() => setSelectedDate(dStr)}
                      style={{
                        height: 40,
                        borderRadius: 8,
                        border: isSelected
                          ? "1px solid var(--adm-color-primary)"
                          : "1px solid #f5f5f5",
                        background: isSelected
                          ? "rgba(246,166,193,.12)"
                          : "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: isToday ? 700 : 500,
                          color: isToday ? "#1890ff" : "#333",
                        }}
                      >
                        {date.date()}
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: dotColor,
                        }}
                      ></div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chi tiết ngày được chọn */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Ngày {formatDateLabel(selectedDate)}
              </div>
              {selectedDayLogs.length === 0 ? (
                <div className="phg-muted" style={{ fontSize: 12 }}>
                  Không có chấm công cho ngày này.
                </div>
              ) : (
                <Card
                  style={{
                    borderRadius: 12,
                    border: "1px solid #f5f5f5",
                    boxShadow: "none",
                  }}
                >
                  <List>
      {selectedDayLogs.map((r) => {
        const timeLabel = r.gio_phut
          ? r.gio_phut
          : r.checked_at
          ? dayjs(r.checked_at).format("HH:mm")
          : "";
        const placeLabel = r.workpoint_ten || "Địa điểm không xác định";

        return (
          <List.Item
            key={r.id}
            prefix={
              <Tag
                color={r.type === "checkin" ? "success" : "warning"}
                style={{ borderRadius: 999 }}
              >
                {r.type === "checkin" ? "IN" : "OUT"}
              </Tag>
            }
            description={
              <span className="phg-muted" style={{ fontSize: 12 }}>
                {r.short_desc || ""}
              </span>
            }
          >
            <div style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{timeLabel}</span>
              {placeLabel && (
                <>
                  {" · "}
                  <span>{placeLabel}</span>
                </>
              )}
            </div>
          </List.Item>
        );
      })}

                  </List>
                </Card>
              )}
            </div>
          </Card>
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
