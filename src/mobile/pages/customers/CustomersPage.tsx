import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  List,
  PullToRefresh,
  SearchBar,
  SpinLoading,
  Tag,
  Popup,
} from "antd-mobile";
import axios from "../../../configs/axios";
import { API_ROUTE_CONFIG } from "../../../configs/api-route-config";
import { useNavigate } from "react-router-dom";

/** ===== Helpers: normalize các shape list khác nhau ===== */
function normalizeList(resp: any): any[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  if (Array.isArray(resp?.collection)) return resp.collection;
  if (Array.isArray(resp?.data?.collection)) return resp.data.collection;
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
  // có thể backend bọc thêm {data: {items: []}}
  if (Array.isArray(resp?.data?.items)) return resp.data.items;
  return [];
}

type Customer = {
  id: number | string;
  ten_khach_hang?: string;
  ten?: string;
  sdt?: string;
  so_dien_thoai?: string;
  email?: string | null;
  dia_chi?: string | null;
  address?: string | null;
  trang_thai?: number | boolean | null;
  [k: string]: any;
};

export default function CustomersPage() {
  const nav = useNavigate();

  // ====== state ======
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [rows, setRows] = useState<any>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const [openDetail, setOpenDetail] = useState(false);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // view helpers
  const viewName = (c: Customer) => c.ten_khach_hang || c.ten || `#${c.id}`;
  const viewPhone = (c: Customer) => c.so_dien_thoai || c.sdt || "";

  // ====== fetch ======
// ====== fetch ======
const fetchPage = async (nextPage = 1, keyword = q) => {
  setLoading(true);
  try {
    // ✅ ép kiểu any để TS không coi là AxiosResponse
    const resp: any = await axios.get(API_ROUTE_CONFIG.KHACH_HANG, {
      params: { page: nextPage, per_page: perPage, q: keyword || undefined },
    });

    const items = normalizeList(resp);

    // ✅ meta có thể nằm ở nhiều nơi → xử lý lỏng tay qua biến any
    const r: any = resp;
    const meta =
      r?.meta ||
      r?.data?.meta ||
      r?.pagination ||
      r?.data?.pagination ||
      r?.pager ||
      r?.data?.pager ||
      undefined;

    const newHasMore = meta
      ? (meta.current_page ?? nextPage) < (meta.last_page ?? nextPage)
      : items.length >= perPage;

    if (nextPage === 1) {
      setRows(items);
    } else {
      setRows((prev: any) => [...(Array.isArray(prev) ? prev : []), ...items]);
    }
    setPage(nextPage);
    setHasMore(newHasMore);
  } catch (err) {
    console.error("KH list error", err);
    Dialog.alert({ content: "Không tải được danh sách khách hàng." });
    setRows([]); // đảm bảo là array để .map không lỗi
  } finally {
    setLoading(false);
  }
};


  const onSearch = async (keyword: string) => {
    setQ(keyword);
    await fetchPage(1, keyword);
  };

  const onRefresh = async () => {
    await fetchPage(1, q);
  };

  const loadMore = async () => {
    if (loading || !hasMore) return;
    await fetchPage(page + 1, q);
  };

  const openCustomer = async (c: Customer) => {
    setOpenDetail(true);
    setDetailLoading(true);
    try {
      const resp = await axios.get(`${API_ROUTE_CONFIG.KHACH_HANG}/${c.id}`);
      const d = resp?.data ?? resp;
      setDetail(d);
    } catch (err) {
      console.error("KH show error", err);
      Dialog.alert({ content: "Không tải được chi tiết khách hàng." });
      setOpenDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const StatusTag = ({ v }: { v: any }) => {
    const on = v === 1 || v === true || v === "1" || v === "true";
    return <Tag color={on ? "success" : "default"}>{on ? "Kích hoạt" : "Không kích hoạt"}</Tag>;
  };

  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div style={{ padding: 12 }}>
      <SearchBar
        value={q}
        placeholder="Tìm theo tên / SĐT"
        onChange={setQ}
        onSearch={onSearch}
        onClear={() => onSearch("")}
      />

      {/* Nút Thêm KH */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <Button size="small" color="primary" onClick={() => nav("/admin/m/customers/new")}>
          + Thêm khách hàng
        </Button>
      </div>

      <PullToRefresh onRefresh={onRefresh}>
        <List header={`Danh sách khách hàng`} style={{ marginTop: 8 }}>
          {safeRows.map((c: Customer) => (
            <List.Item
              key={String(c.id)}
              description={
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {viewPhone(c) && <span style={{ opacity: 0.8 }}>{viewPhone(c)}</span>}
                  {c.email && <span style={{ opacity: 0.8 }}>{c.email}</span>}
                  {"trang_thai" in c && <StatusTag v={c.trang_thai} />}
                </div>
              }
              onClick={() => openCustomer(c)}
              arrow
            >
              {viewName(c)}
            </List.Item>
          ))}
        </List>

        <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
          {loading ? (
            <SpinLoading />
          ) : hasMore ? (
            <Button size="small" onClick={loadMore}>
              Tải thêm
            </Button>
          ) : (
            <span style={{ opacity: 0.6 }}>Đã hết</span>
          )}
        </div>
      </PullToRefresh>

      {/* Popup chi tiết */}
      <Popup
        visible={openDetail}
        onMaskClick={() => setOpenDetail(false)}
        onClose={() => setOpenDetail(false)}
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
              <h3 style={{ marginBottom: 6 }}>{viewName(detail)}</h3>
              <div style={{ lineHeight: 1.7 }}>
                {viewPhone(detail) && <div>📞 {viewPhone(detail)}</div>}
                {detail.email && <div>✉️ {detail.email}</div>}
                {(detail.dia_chi || detail.address) && (
                  <div>📍 {detail.dia_chi || detail.address}</div>
                )}
                {"trang_thai" in detail && (
                  <div style={{ marginTop: 6 }}>
                    Trạng thái: <StatusTag v={detail.trang_thai} />
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => {
                    setOpenDetail(false);
                    nav(`/admin/m/customers/${detail.id}/edit`);
                  }}
                >
                  Sửa
                </Button>
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
