import { useEffect, useState } from "react";
import { Button, Dialog, List, Popup, Segmented, SpinLoading, Tag } from "antd-mobile";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";

type ThreadLite = {
  id: number | string;
  name?: string;
  last_message?: string;
  updated_at?: string;
  status?: string | number;
  assignee_name?: string | null;
  [k: string]: any;
};

type SourceKey = "fb" | "zl";

const FB = {
  HEALTH: "/utilities/fb/health",
  LIST: "/utilities/fb/conversations",
  SHOW: (id: number | string) => `/utilities/fb/conversations/${id}`,
};

const ZL = {
  HEALTH: API_ROUTE_CONFIG.ZL_HEALTH,
  LIST: API_ROUTE_CONFIG.ZL_CONVERSATIONS,
  SHOW: (id: number | string) => API_ROUTE_CONFIG.ZL_CONVERSATION_ID(id),
};

/** Helper: chuẩn hoá list từ nhiều shape trả về khác nhau */
function normalizeList(resp: any): ThreadLite[] {
  if (!resp) return [];
  // Interceptor đã flatten -> BE có thể trả: {data: []} | {items: []} | []
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  return [];
}

export default function UtilitiesPage() {
  const [src, setSrc] = useState<SourceKey>("fb");

  const [rows, setRows] = useState<ThreadLite[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const endpoints = src === "fb" ? FB : ZL;

  // ===== LOAD LIST =====
  const loadList = async () => {
    setLoading(true);
    try {
      // Health có thể trả {success:boolean,...} hoặc 200 kèm data khác
      const health: any = await axios.get(endpoints.HEALTH).catch(() => null);
      if (health && typeof health === "object" && "success" in health && health.success === false) {
        Dialog.alert({ content: `Module ${src.toUpperCase()} chưa sẵn sàng.` });
      }

      const resp: any = await axios.get(endpoints.LIST, { params: { page: 1, per_page: 20 } });
      setRows(normalizeList(resp));
    } catch (e) {
      console.error(`${src} list error`, e);
      Dialog.alert({ content: `Không tải được danh sách hội thoại ${src.toUpperCase()}.` });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOAD DETAIL =====
  const openDetail = async (th: ThreadLite) => {
    setOpen(true);
    setDetailLoading(true);
    try {
      const resp: any = await axios.get(endpoints.SHOW(th.id));
      // Một số API trả {data:{thread, messages}}; số khác trả thẳng object
      const d = resp?.data ?? resp ?? th;
      setDetail(d);
    } catch (e) {
      console.error(`${src} show error`, e);
      Dialog.alert({ content: "Không tải được chi tiết hội thoại." });
      setOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div style={{ padding: 12 }}>
      <Segmented
        block
        value={src}
        onChange={(v) => setSrc(v as SourceKey)}
        options={[
          { label: "Facebook", value: "fb" },
          { label: "Zalo", value: "zl" },
        ]}
      />

      <List header={`Hộp thư ${src.toUpperCase()}`} style={{ marginTop: 8 }}>
        {rows.map((r) => (
          <List.Item
            key={String(r.id)}
            description={
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {r.last_message && <span style={{ opacity: 0.8 }}>{r.last_message}</span>}
                {r.assignee_name && <Tag color="primary">{r.assignee_name}</Tag>}
              </div>
            }
            extra={
              <Button size="small" onClick={() => openDetail(r)}>
                Xem
              </Button>
            }
          >
            {r.name || `#${r.id}`}
          </List.Item>
        ))}
      </List>

      <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
        {loading ? <SpinLoading /> : <Button size="small" onClick={loadList}>Tải lại</Button>}
      </div>

      <Popup
        visible={open}
        onMaskClick={() => setOpen(false)}
        onClose={() => setOpen(false)}
        position="bottom"
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, minHeight: 120 }}
      >
        <div style={{ padding: 16 }}>
          {detailLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
              <SpinLoading />
            </div>
          ) : detail ? (
            <>
              <h3 style={{ marginBottom: 6 }}>
                {(detail?.thread?.name || detail?.name) ?? "Chi tiết hội thoại"}
              </h3>
              <div style={{ lineHeight: 1.6 }}>
                {/* lấy tối đa 5 dòng gần nhất từ nhiều shape khác nhau */}
                {(detail?.messages ||
                  detail?.data ||
                  detail?.thread?.messages ||
                  []
                )
                  .slice(-5)
                  .map((m: any, i: number) => (
                    <div key={i} style={{ opacity: 0.9 }}>
                      • {m?.text || m?.content || m?.message || JSON.stringify(m)}
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div style={{ opacity: 0.7 }}>Không có dữ liệu.</div>
          )}
        </div>
      </Popup>
    </div>
  );
}
