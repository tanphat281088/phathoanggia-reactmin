/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dialog, List, Popup, Segmented, SpinLoading, Tag, Input } from "antd-mobile";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";

/** ========= Types ========= */
type SourceKey = "fb" | "zl";

type ThreadLite = {
  id: number | string;
  name?: string;
  customer_name?: string;
  customer?: { name?: string; ten_khach_hang?: string; sdt?: string } | null;
  khach_hang?: { ten_khach_hang?: string; so_dien_thoai?: string } | null;
  profile_name?: string;
  last_message?: string;
  latest_message_vi?: string;
  updated_at?: string;
  status?: string | number;
  assignee_name?: string | null;
  [k: string]: any;
};

type Msg = {
  id?: number | string;
  direction?: "in" | "out";
  text_raw?: string | null;
  text_translated?: string | null;
  created_at?: string | null;
  attachments?: any[];
};

type ThreadDetail = {
  thread?: ThreadLite | null;
  messages?: Msg[];
};

/** ========= Endpoints ========= */
const FB = {
  HEALTH: "/utilities/fb/health",
  LIST: "/utilities/fb/conversations",
  SHOW: (id: number | string) => `/utilities/fb/conversations/${id}`,
  REPLY: (id: number | string) => `/utilities/fb/conversations/${id}/reply`,
};

const ZL = {
  HEALTH: API_ROUTE_CONFIG.ZL_HEALTH,
  LIST: API_ROUTE_CONFIG.ZL_CONVERSATIONS,
  SHOW: (id: number | string) => API_ROUTE_CONFIG.ZL_CONVERSATION_ID(id),
  REPLY: (id: number | string) => `${API_ROUTE_CONFIG.ZL_CONVERSATION_ID(id)}/reply`,
};

/** ========= Helpers ========= */
function normalizeList(resp: any): ThreadLite[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  return [];
}
function normalizeDetail(resp: any): ThreadDetail {
  if (!resp) return { thread: null, messages: [] };
  const d = resp?.data ?? resp;
  const thread = d?.thread || {
    id: d?.id,
    name: d?.name,
    customer_name: d?.customer_name,
    customer: d?.customer,
    khach_hang: d?.khach_hang,
    profile_name: d?.profile_name,
  };
  const messages: Msg[] =
    Array.isArray(d?.messages) ? d.messages : Array.isArray(d?.data) ? d.data : [];
  return { thread, messages };
}
const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { hour12: false }) : "";

// Thời gian rút gọn cho danh sách:  DD/MM HH:mm
const fmtListTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        hour12: false,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";


/** Lấy tên hiển thị chắc chắn có */
const resolveName = (r?: ThreadLite | null): string => {
  if (!r) return "";
  return (
    r.customer_name ||
    r.name ||
    r.profile_name ||
    r.customer?.name ||
    r.customer?.ten_khach_hang ||
    r.khach_hang?.ten_khach_hang ||
    `#${r.id}`
  );
};
/** Lấy SĐT nếu có (để hiển thị phụ) */
const resolvePhone = (r?: ThreadLite | null): string | undefined => {
  return (
    (r?.customer as any)?.phone ||
    (r?.customer as any)?.sdt ||
    (r?.khach_hang as any)?.so_dien_thoai ||
    undefined
  );
};
/** Lấy preview message */
const resolvePreview = (r?: ThreadLite | null): string | undefined => {
  return r?.latest_message_vi || r?.last_message || undefined;
};

/** ========= UI Bubbles ========= */
const Bubble = ({ m }: { m: Msg }) => {
  const isOut = m.direction === "out";
  const bg = isOut ? "#fef0f5" : "#fff";
  const br = isOut ? "12px 12px 4px 12px" : "12px 12px 12px 4px";
  const border = isOut ? "1px solid #f7d4e1" : "1px solid #eee";
  return (
    <div style={{ display: "flex", justifyContent: isOut ? "flex-end" : "flex-start", width: "100%" }}>
      <div
        style={{
          maxWidth: "85%",
          background: bg,
          border,
          borderRadius: br as any,
          padding: "8px 10px",
          margin: "4px 0",
          boxShadow: "0 4px 12px rgba(0,0,0,.04)",
        }}
      >
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {m.text_translated || m.text_raw || "— (no content) —"}
        </div>
        <div style={{ textAlign: "right", opacity: 0.6, fontSize: 11, marginTop: 4 }}>{fmtTime(m.created_at)}</div>
      </div>
    </div>
  );
};

/** ========= Page ========= */
export default function UtilitiesPage() {
  const [src, setSrc] = useState<SourceKey>("fb");
  const endpoints = useMemo(() => (src === "fb" ? FB : ZL), [src]);

  /* list */
  const [rows, setRows] = useState<ThreadLite[]>([]);
  const [loading, setLoading] = useState(false);

  /* chat-popup */
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ThreadLite | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  /* composer */
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  /* polling */
  const pollRef = useRef<number | null>(null);

  // ===== LOAD LIST =====
  const loadList = async () => {
    setLoading(true);
    try {
      await axios.get(endpoints.HEALTH).catch(() => null);
      const resp: any = await axios.get(endpoints.LIST, { params: { page: 1, per_page: 20 } });
      const list = normalizeList(resp);

      // Chuẩn hoá lại 1 chút để đảm bảo có tên khi render
const normalized: ThreadLite[] = list.map((r: any) => {
  const timeIso = r.latest_message_at || r.last_message_at || r.updated_at || null;
  return {
    ...r,
    _display_name: resolveName(r),
    _preview: resolvePreview(r),
    _phone: resolvePhone(r),
    _timeIso: timeIso,
    _timeText: fmtListTime(timeIso),
  } as any;
});

      setRows(normalized);
    } catch (e) {
      console.error(`${src} list error`, e);
      Dialog.alert({ content: `Không tải được danh sách hội thoại ${src.toUpperCase()}.` });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOAD THREAD =====
  const loadThread = async (id: number | string, { silent = false } = {}) => {
    try {
      if (!silent) setLoadingThread(true);
      const resp: any = await axios.get(endpoints.SHOW(id));
      const { thread, messages } = normalizeDetail(resp);
      setActive(thread || { id } as any);
      setMsgs(Array.isArray(messages) ? messages : []);
    } catch (e) {
      console.error(`${src} show error`, e);
      Dialog.alert({ content: "Không tải được chi tiết hội thoại." });
    } finally {
      if (!silent) setLoadingThread(false);
    }
  };

  // ===== OPEN DETAIL =====
  const openDetail = async (th: ThreadLite) => {
    setOpen(true);
    await loadThread(th.id);
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      if (active?.id) loadThread(active.id, { silent: true });
    }, 5000);
  };

  const closeDetail = () => {
    setOpen(false);
    setActive(null);
    setMsgs([]);
    setText("");
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // ===== SEND =====
  const onSend = async () => {
    const t = text.trim();
    if (!t || !active?.id) return;
    try {
      setSending(true);
      // optimistic
      setMsgs((prev) => [
        ...prev,
        { id: Math.random(), direction: "out", text_raw: t, created_at: new Date().toISOString() },
      ]);
      setText("");

      if (src === "fb") await axios.post(FB.REPLY(active.id), { text_vi: t });
      else await axios.post(ZL.REPLY(active.id), { text_vi: t });

      setTimeout(() => active?.id && loadThread(active.id, { silent: true }), 800);
    } catch (e: any) {
      Dialog.alert({ content: `Gửi thất bại: ${e?.response?.data?.message || e?.message || "Lỗi không xác định"}` });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <Segmented
        block
        value={src}
        onChange={(v) => setSrc(v as SourceKey)}
        options={[{ label: "Facebook", value: "fb" }, { label: "Zalo", value: "zl" }]}
      />

      {/* Danh sách hội thoại — luôn hiển thị TÊN KHÁCH nếu có */}
      <List header={`Hộp thư ${src.toUpperCase()}`} style={{ marginTop: 8 }}>
        {rows.map((r) => {
          const title = (r as any)._display_name || resolveName(r);
          const preview = (r as any)._preview || "";
          const phone = (r as any)._phone;
          return (
            <List.Item
              key={String(r.id)}
              description={
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {phone && <span style={{ opacity: 0.8 }}>📞 {phone}</span>}
                  {preview && <span style={{ opacity: 0.8, maxWidth: "60vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview}</span>}
                  {r.assignee_name && <Tag color="primary">{r.assignee_name}</Tag>}
                </div>
              }
extra={
  <div style={{ textAlign: "right" }}>
    {(r as any)._timeText && (
      <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>
        {(r as any)._timeText}
      </div>
    )}
    <Button size="small" onClick={() => openDetail(r)}>Xem</Button>
  </div>
}

            >
              {title}
            </List.Item>
          );
        })}
      </List>

      <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
        {loading ? <SpinLoading /> : <Button size="small" onClick={loadList}>Tải lại</Button>}
      </div>

      {/* Popup chat */}
      <Popup
        visible={open}
        onMaskClick={closeDetail}
        onClose={closeDetail}
        position="bottom"
        bodyStyle={{
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          minHeight: "55vh",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header tên khách */}
<div style={{ padding: "10px 16px", borderBottom: "1px solid #f3e6eb", background: "#fff" }}>
  <div style={{ fontWeight: 800 }}>
    {(active && resolveName(active)) || ""}
  </div>
  <div className="phg-muted" style={{ fontSize: 12 }}>
    Cập nhật: {fmtListTime((active as any)?._timeIso || (active as any)?.latest_message_at || (active as any)?.updated_at)}
  </div>
</div>


        {/* Chat content */}
        <div style={{ flex: 1, overflow: "auto", padding: "10px 12px", background: "#fff" }}>
          {loadingThread ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
              <SpinLoading />
            </div>
          ) : msgs.length === 0 ? (
            <div style={{ opacity: 0.6, textAlign: "center", padding: 16 }}>Chưa có tin nhắn.</div>
          ) : (
            msgs.map((m) => <Bubble key={String(m.id ?? Math.random())} m={m} />)
          )}
        </div>

        {/* Composer */}
        <div style={{ borderTop: "1px solid #f3e6eb", padding: 10, background: "#fff" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={text} onChange={setText} placeholder="Nhập bằng tiếng Việt..." clearable style={{ flex: 1 }} />
            <Button color="primary" onClick={onSend} loading={sending} disabled={!text.trim()}>
              Gửi
            </Button>
          </div>
        </div>
      </Popup>
    </div>
  );
}
