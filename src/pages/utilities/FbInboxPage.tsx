/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Layout,
  List,
  Segmented,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { MessageCircle, Send, User as UserIcon, RefreshCcw } from "lucide-react";
import {
  fbHealth,
  fbConversations,
  fbConversationShow,
  fbReply,
  type FbConversation,
  type FbMessage,
  type FbHealth,
} from "../../services/utilities.fb.api";
import type { JSX } from "react/jsx-runtime";

import usePermission from "../../hooks/usePermission";



const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function FbInboxPage(): JSX.Element {
  // ===== UI state =====
  const [health, setHealth] = useState<FbHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);

  const [filter, setFilter] = useState<"all" | "mine" | "unassigned" | "expired">("all");
  const [q, setQ] = useState<string>("");
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [list, setList] = useState<FbConversation[]>([]);
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [loadingThread, setLoadingThread] = useState<boolean>(false);
  const [messages, setMessages] = useState<FbMessage[]>([]);

  const [draft, setDraft] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  const [isTyping, setIsTyping] = useState<boolean>(false);

  const [lastTypeAt, setLastTypeAt] = useState<number>(0);

  // ===== permissions (RBAC) =====
  const permFb = usePermission("/utilities/fb");
  const canReply  = (permFb as any).send   === true;   // quyền gửi trả lời
  const canAssign = (permFb as any).assign === true;   // quyền gán phụ trách (để dùng khi bạn thêm nút)
  const canStatus = (permFb as any).status === true;   // quyền đổi trạng thái (để dùng khi bạn thêm nút)


  // ===== polling config =====
const POLL_MS = 4000; // 4 giây/lần


  // ===== derived =====
  const active = useMemo(() => list.find((c) => c.id === activeId) || null, [list, activeId]);
  const within24h = active?.within24h ?? true;
  const enabled = health?.enabled ?? false;

  // ===== effects =====
  useEffect(() => {
    loadHealth();
  }, []);

  useEffect(() => {
    loadList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, q]);

  useEffect(() => {
    if (activeId != null) loadThread(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

// ===== POLLING danh sách hội thoại (dịu hơn khi đang gõ) =====
useEffect(() => {
  if (isTyping) return;                               // đừng poll khi đang gõ
  const t = setInterval(() => {
    if (!loadingList) {
      loadList(page);                                 // giữ trang hiện tại
    }
  }, 12000);                                          // 12 giây/lần
  return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [page, filter, q, enabled, loadingList, isTyping]);


// ===== POLLING thread đang mở mỗi 4s (nếu có activeId) =====
useEffect(() => {
  if (!activeId || sending) return;
  const t = setInterval(() => {
    const now = Date.now();
    // Nếu đang gõ và lần gõ cuối < 2500ms thì bỏ qua tick này; ngừng tay >2.5s là tự chạy
    if (isTyping && (now - lastTypeAt) < 2500) return;
    loadThread(activeId, { silent: true });
  }, POLL_MS);
  return () => clearInterval(t);
}, [activeId, sending, isTyping, lastTypeAt]);





    // ✅ Nếu chưa có hội thoại nào đang được chọn, tự động chọn dòng đầu tiên khi list có dữ liệu
  useEffect(() => {
    if ((activeId == null || !list.some(c => c.id === activeId)) && list.length > 0) {
      setActiveId(list[0].id);
    }
  }, [list]); // chỉ chạy khi list thay đổi


  // ===== loaders =====
  async function loadHealth() {
    try {
      setLoadingHealth(true);
      const h = await fbHealth();
      setHealth(h);
    } catch (err: any) {
      console.error(err);
      message.error(`Không đọc được trạng thái module: ${err?.message || err}`);
      setHealth({ enabled: false, provider: "google", ai_polish: false, ai_tone: "neutral" });
    } finally {
      setLoadingHealth(false);
    }
  }

async function loadList(nextPage: number) {
  try {
    setLoadingList(true);
    setPage(nextPage);

    const assigned =
      filter === "mine" ? "mine" : filter === "unassigned" ? "unassigned" : undefined;
    const status = filter === "expired" ? "open" : undefined; // expired chỉ là filter hiển thị

    const resp = await fbConversations({
      page: nextPage,
      per_page: perPage,
      q: q.trim() || undefined,
      assigned,
      status,
    });

    const rows = resp.data || [];
    setList(rows);
    setTotal(resp.pagination?.total || 0);

    // ✅ Giữ lựa chọn nếu còn trong list; nếu chưa có thì auto-chọn dòng đầu tiên.
    if (rows.length > 0) {
      const stillExists = rows.some((c) => c.id === activeId);
      if (!stillExists) {
        setActiveId(rows[0].id);
      }
    } else {
      setActiveId(null);
      setMessages([]);
    }
  } catch (err: any) {
    console.error(err);
    message.error(`Không tải được danh sách hội thoại: ${err?.message || err}`);
  } finally {
    setLoadingList(false);
  }
}


async function loadThread(id: number, opts?: { silent?: boolean }) {
  const silent = !!opts?.silent;
  try {
    if (!silent) setLoadingThread(true);
    const resp = await fbConversationShow(id);
    const serverMsgs: FbMessage[] = resp.messages || [];

    // Chỉ cập nhật khi có thay đổi để tránh nhấp nháy
    setMessages((prev) => {
      const prevLast = prev[prev.length - 1]?.id;
      const servLast = serverMsgs[serverMsgs.length - 1]?.id;
      if (prev.length === serverMsgs.length && prevLast === servLast) {
        return prev;                                   // không đổi -> không re-render
      }
      return serverMsgs;
    });

  } catch (err: any) {
    console.error(err);
    message.error(`Không tải được hội thoại #${id}: ${err?.message || err}`);
  } finally {
    if (!silent) setLoadingThread(false);
  }
}

  async function onSend() {
    if (!draft.trim()) return;
    if (!enabled) {
      message.warning("Module đang TẮT (FB_ENABLED=false) — chưa thể gửi.");
      return;
    }
    if (!within24h) {
      message.warning("ĐÃ QUÁ 24h — Messenger policy chặn gửi.");
      return;
    }
    if (!active) {
      message.warning("Chưa chọn hội thoại.");
      return;
    }
    try {
      setSending(true);

      // --- OPTIMISTIC: hiển thị ngay message mình gửi ---
const optimistic = {
  id: Math.random(),          // tạm thời
  conversation_id: active.id,
  direction: "out" as const,
  mid: undefined,
  text_raw: draft.trim(),
  text_translated: null,
  text_polished: null,
  src_lang: "vi",
  dst_lang: "en",
  attachments: [],
  delivered_at: null,
  read_at: null,
  created_at: new Date().toISOString(),
};
// append vào UI
setMessages(prev => [...prev, optimistic as any]);

      await fbReply(active.id, { text_vi: draft.trim() }); // BE hiện đang placeholder (echo)
      setDraft("");
      // Sau này khi BE lưu message out → loadThread(active.id) để refresh
      message.success("Đã gửi (demo placeholder).");

      // làm tươi thread sau khi hàng đợi xử lý
setTimeout(() => loadThread(active.id!), 1200);
setTimeout(() => loadThread(active.id!), 4000);
// làm tươi list để cập nhật preview bên trái
setTimeout(() => loadList(1), 1500);



    } catch (err: any) {
      console.error(err);
      message.error(`Gửi thất bại: ${err?.message || err}`);
    } finally {
      setSending(false);
    }
  }

  // ===== render =====
  return (
<Layout className="fb-inbox" style={{ minHeight: "calc(100vh - 120px)", background: "transparent" }}>



      {/* LEFT */}
      <Sider width={360} style={{ background: "transparent", paddingRight: 12 }}>
        <Card
          size="small"
          title={
            <Flex align="center" gap={8}>
              <MessageCircle size={18} />
              <span>Tư vấn Facebook</span>
            </Flex>
          }
          extra={
            <Flex align="center" gap={8}>
              <Button
                size="small"
                type="text"
                icon={<RefreshCcw size={16} />}
                onClick={() => loadList(1)}
                title="Tải lại"
              />
              <Segmented
                size="small"
                value={filter}
                onChange={(v) => setFilter(v as any)}
                options={[
                  { label: "Tất cả", value: "all" },
                  { label: "Của tôi", value: "mine" },
                  { label: "Chưa gán", value: "unassigned" },
                  { label: "Quá 24h", value: "expired" },
                ]}
              />
            </Flex>
          }
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ padding: 12 }}>
            <Input.Search
              allowClear
              placeholder="Tìm theo tên/ghi chú..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onSearch={() => loadList(1)}
            />
          </div>

          {loadingHealth ? (
            <div style={{ padding: 12 }}>
              <Skeleton active title={false} paragraph={{ rows: 1 }} />
            </div>
          ) : (
            <div style={{ padding: "0 12px 12px" }}>


{!enabled ? (
  <Alert
    type="warning"
    showIcon
    message="Module đang TẮT (FB_ENABLED=false)"
    description="Vào .env bật FB_ENABLED=true khi bạn sẵn sàng."
  />
) : (
  (() => {
    const providerRaw = (health?.provider || "google").toString().toLowerCase();
    const providerLabel =
      providerRaw === "google_apikey" || providerRaw === "google"
        ? "Google Translate kết hợp AI"   // <— bạn muốn hiển thị thế này
        : providerRaw === "openai"
        ? "OpenAI"
        : providerRaw === "hybrid"
        ? "Kết hợp (Google + OpenAI)"
        : providerRaw;

    const polishLabel = health?.ai_polish ? "BẬT" : "TẮT";
    const toneMap: Record<string, string> = {
      neutral: "Trung tính",
      formal: "Lịch sự",
      friendly: "Thân mật",
    };
    const toneLabel =
      toneMap[(health?.ai_tone || "neutral").toLowerCase()] ||
      (health?.ai_tone ?? "—");

    return (
      <Alert
        type="success"
        showIcon
        message="Tư vấn Facebook: ĐANG HOẠT ĐỘNG"
        description={`Dịch: ${providerLabel} | Trau chuốt: ${polishLabel} | Giọng điệu: ${toneLabel}`}
      />
    );
  })()
)}

           
           
            </div>
          )}

          {loadingList ? (
            <div style={{ padding: 12 }}>
              <Skeleton active />
              <Skeleton active />
              <Skeleton active />
            </div>
          ) : !list.length ? (
            <Empty style={{ margin: "24px 0" }} description="Chưa có hội thoại" />
          ) : (
            <List
              bordered
              dataSource={list}
              style={{ height: "calc(100vh - 320px)", overflow: "auto" }}
              renderItem={(item) => {
                const selected = item.id === activeId;
                return (
                  <List.Item
                    onClick={() => setActiveId(item.id)}
                    style={{
                      cursor: "pointer",
                      background: selected ? "#f0f5ff" : undefined,
                      borderLeft: selected ? "3px solid #1677ff" : "3px solid transparent",
                      paddingLeft: 9,
                    }}
                  >
                    <Space direction="vertical" size={0} style={{ width: "100%" }}>
                      <Flex align="center" justify="space-between">
                        <Space>
                          <UserIcon size={16} />
                          <Text strong>{item.customer_name || `#${item.id}`}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.latest_message_at || ""}
                        </Text>
                      </Flex>

                      <Flex align="center" gap={8} wrap>
                        <Tag color={item.within24h ? "green" : "red"}>
                          {item.within24h ? "Trong 24h" : "Quá 24h"}
                        </Tag>
                        {item.lang_primary && <Tag color="blue">{String(item.lang_primary).toUpperCase()}</Tag>}
                        {item.assigned_user_id ? <Tag>Đã gán</Tag> : <Tag>Chưa gán</Tag>}
                      </Flex>

                      <Text style={{ color: "#555" }} ellipsis>
                        {item.latest_message_vi || ""}
                      </Text>
                    </Space>
                  </List.Item>
                );
              }}
            />
          )}
        </Card>
      </Sider>

      {/* RIGHT */}
      <Content>
        {!active ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chọn một hội thoại ở danh sách bên trái để bắt đầu" />
        ) : (
          <Layout style={{ background: "transparent" }}>
            <Header
              style={{
                background: "#fff",
                marginBottom: 12,
                border: "1px solid #f0f0f0",
                borderRadius: 8,
              }}
            >
              <Flex align="center" justify="space-between">
                <Space direction="vertical" size={0}>
                  <Title level={4} style={{ margin: 0 }}>
                    {active.customer_name || `#${active.id}`}
                  </Title>
                  <Space size={8} wrap>
                    <Badge status={within24h ? "success" : "error"} />
                    <Text type="secondary">
                      {within24h ? "Còn trong 24h" : "ĐÃ QUÁ 24h – bị chặn gửi"}
                    </Text>
                  </Space>
                </Space>
                <Space wrap>
                  {active.lang_primary && <Tag color="blue">{String(active.lang_primary).toUpperCase()}</Tag>}
                  {active.assigned_user_id ? <Tag>Đã gán</Tag> : <Tag>Chưa gán</Tag>}
                </Space>
              </Flex>
            </Header>

            <Content>
              <Card size="small" style={{ marginBottom: 12 }}>
                {loadingThread ? (
                  <Skeleton active />
                ) : !messages.length ? (
                  <Empty description="Chưa có tin nhắn" />
                ) : (
                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    {messages.map((m) => (
                      <Card
                        key={m.id ?? Math.random()}
                        size="small"
                        style={{ background: m.direction === "in" ? "#fff" : "#f6ffed", borderColor: m.direction === "in" ? "#f0f0f0" : "#b7eb8f" }}
                      >
                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                          {m.text_raw && (
                            <>
                              <Text type="secondary">[Gốc]</Text>
                              <div>{m.text_raw}</div>
                            </>
                          )}
                          {m.text_translated && (
                            <>
                              <Text type="secondary">[Dịch]</Text>
                              <div>{m.text_translated}</div>
                            </>
                          )}
                          {!m.text_raw && !m.text_translated && <Text type="secondary">— (no content) —</Text>}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {m.created_at || ""}
                          </Text>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                )}
              </Card>

              <Card size="small">
                <Space direction="vertical" style={{ width: "100%" }}>
                  {!enabled && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Module đang TẮT — không thể gửi"
                      style={{ marginBottom: 8 }}
                    />
                  )}
                  {!within24h && (
                    <Alert
                      type="error"
                      showIcon
                      message="ĐÃ QUÁ 24h — Messenger chặn gửi"
                      style={{ marginBottom: 8 }}
                    />
                  )}

                  <Text type="secondary">Nhập bằng tiếng Việt:</Text>
                  <Input.TextArea
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); setLastTypeAt(Date.now()); }}


                    onFocus={() => setIsTyping(true)}      // + thêm
  onBlur={() => setIsTyping(false)}      // + thêm
                    placeholder="Nhập nội dung trả lời bằng tiếng Việt..."
                    autoSize={{ minRows: 3, maxRows: 6 }}
                  />
                  <Flex justify="space-between" align="center">
                    <Space wrap>
                      <Tag>Polish with AI: {health?.ai_polish ? "ON" : "OFF"}</Tag>
                      <Tag>Tone: {health?.ai_tone || "Neutral"}</Tag>
                    </Space>
{canReply && (
  <Button
    type="primary"
    icon={<Send size={16} />}
    disabled={!enabled || !within24h || !draft.trim()}
    loading={sending}
    onClick={onSend}
  >
    Gửi
  </Button>
)}

                  </Flex>
                </Space>
              </Card>
            </Content>
          </Layout>
        )}
      </Content>
    </Layout>
  );
}
