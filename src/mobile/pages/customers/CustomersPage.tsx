import { useEffect, useRef, useState } from "react";

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
import { createFilterQueryFromArray } from "../../../utils/utils";


/** ===== Helpers: normalize các shape list khác nhau ===== */
function normalizeList(resp: any): any[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  if (Array.isArray(resp?.collection)) return resp.collection;
  if (Array.isArray(resp?.data?.collection)) return resp.data.collection;
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
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
  kenh_lien_he?: string | null;
  [k: string]: any;
    customer_mode?: number;

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
  // Debounce cho ô tìm kiếm
const debounceRef = useRef<number | undefined>(undefined);
const [typing, setTyping] = useState(false);


  // view helpers
  const viewName  = (c: Customer) => c.ten_khach_hang || c.ten || `#${c.id}`;
  const viewPhone = (c: Customer) => c.so_dien_thoai || c.sdt || "";
  const viewAddr  = (c: Customer) => c.dia_chi || c.address || "";

  // *** Click helpers — đảm bảo onClick trả về void
  const openSelf  = (url: string) => { window.open(url, "_self");  };
  const openBlank = (url: string) => { window.open(url, "_blank"); };

  // ====== fetch ======
const fetchPage = async (nextPage = 1, keyword = q) => {
  setLoading(true);
  try {
    const kw = (keyword || "").trim();

    // ---- Không có từ khóa: dùng paging chuẩn của BE ----
    if (!kw) {
      const params = {
        page: nextPage,
        limit: perPage,
        sort_column: "id",
        sort_direction: "desc",
      };
      const resp: any = await axios.get(API_ROUTE_CONFIG.KHACH_HANG, { params });
      const items = normalizeList(resp);

      const r: any = resp;
      const meta =
        r?.pagination || r?.data?.pagination || r?.meta || r?.data?.meta || undefined;

      let newHasMore = true;
      if (
        meta &&
        typeof meta.current_page !== "undefined" &&
        typeof meta.last_page !== "undefined"
      ) {
        newHasMore = (meta.current_page ?? nextPage) < (meta.last_page ?? nextPage);
      } else {
        newHasMore = items.length >= perPage;
      }

      if (nextPage === 1) setRows(items);
      else setRows((prev: any) => [...(Array.isArray(prev) ? prev : []), ...items]);

      setPage(nextPage);
      setHasMore(newHasMore);
      return;
    }

    // ---- Có từ khóa: OR theo 3 trường (union kết quả) ----
    const buildParams = (field: string) => ({
      page: 1,
      limit: perPage * 3, // lấy rộng để đủ union
      sort_column: "id",
      sort_direction: "desc",
      ...createFilterQueryFromArray([{ field, operator: "contain", value: kw }]),
      // Nếu BE cần 'contains', đổi 'contain' -> 'contains' ở dòng trên.
    });

    const [byCode, byName, byPhone] = await Promise.all([
      axios.get(API_ROUTE_CONFIG.KHACH_HANG, { params: buildParams("ma_kh") }),
      axios.get(API_ROUTE_CONFIG.KHACH_HANG, { params: buildParams("ten_khach_hang") }),
      axios.get(API_ROUTE_CONFIG.KHACH_HANG, { params: buildParams("so_dien_thoai") }),
    ]);

    const seen: Record<string, 1> = {};
    const merged = [
      ...normalizeList(byCode),
      ...normalizeList(byName),
      ...normalizeList(byPhone),
    ].filter((row: any) => {
      const k = String(row?.id ?? "");
      if (!k || seen[k]) return false;
      seen[k] = 1;
      return true;
    });

    // Phân trang trên FE cho chế độ OR
    const start = (nextPage - 1) * perPage;
    const pageItems = merged.slice(start, start + perPage);
    const newHasMore = start + perPage < merged.length;

    if (nextPage === 1) setRows(pageItems);
    else setRows((prev: any) => [...(Array.isArray(prev) ? prev : []), ...pageItems]);

    setPage(nextPage);
    setHasMore(newHasMore);
  } catch (err) {
    console.error("KH list error", err);
    Dialog.alert({ content: "Không tải được danh sách khách hàng." });
    setRows([]);
  } finally {
    setLoading(false);
  }
};

// Gọi API sau 350ms kể từ lần gõ cuối
const onChangeQ = (val: string) => {
  setQ(val);
  setTyping(true);
  if (debounceRef.current) window.clearTimeout(debounceRef.current);
  debounceRef.current = window.setTimeout(async () => {
    await fetchPage(1, val);
    setTyping(false);
  }, 350);
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
    const d = (resp as any)?.data ?? resp;
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

  const ellipsis: React.CSSProperties = {
    opacity: 0.85,
    maxWidth: "60vw",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div style={{ padding: 12 }}>
     <SearchBar
  value={q}
  placeholder="Tìm theo tên / SĐT"
  onChange={onChangeQ}         // ⬅️ dùng debounce
  onSearch={onSearch}          // Enter vẫn chạy ngay
  onClear={() => onSearch("")} // Clear trả về full list
/>
{(typing || loading) && (
  <div style={{ opacity: .6, fontSize: 12, marginTop: 4 }}>Đang tìm…</div>
)}


      {/* Nút Thêm KH */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <Button size="small" color="primary" onClick={() => nav("/admin/m/customers/new")}>
          + Thêm khách hàng
        </Button>
      </div>

      <PullToRefresh onRefresh={onRefresh}>
        <List header="Danh sách khách hàng" style={{ marginTop: 8 }}>
          {safeRows.map((c: Customer) => (
            <List.Item
              key={String(c.id)}
              description={
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {viewPhone(c) && <span style={ellipsis}>{viewPhone(c)}</span>}
                  {c.email && <span style={ellipsis}>{c.email}</span>}
                  {"trang_thai" in c && <StatusTag v={c.trang_thai} />}
                </div>
              }
              onClick={() => openCustomer(c)}
              arrow
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{viewName(c)}</span>
                {c.kenh_lien_he ? (
                  <span className="chip" style={{ maxWidth: "40vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.kenh_lien_he}
                  </span>
                ) : null}
                {Number((c as any).customer_mode ?? 0) === 1 && (
                  <span
                    className="chip"
                    style={{
                      backgroundColor: "#fff7e6",
                      color: "#ad6800",
                      maxWidth: "40vw",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Pass/CTV
                  </span>
                )}
              </div>

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
              <h3 style={{ marginBottom: 6, fontWeight: 800 }}>{viewName(detail)}</h3>
              <div style={{ lineHeight: 1.7 }}>
                {viewPhone(detail) && <div>📞 {viewPhone(detail)}</div>}
                {detail.email && <div>✉️ {detail.email}</div>}
                {viewAddr(detail) && <div>📍 {viewAddr(detail)}</div>}
                {"trang_thai" in detail && (
                  <div style={{ marginTop: 6 }}>
                    Trạng thái: <StatusTag v={detail.trang_thai} />
                  </div>
                )}
                {detail.kenh_lien_he && (
                  <div style={{ marginTop: 6 }}>
                    Kênh: <span className="chip">{detail.kenh_lien_he}</span>
                  </div>
                )}
                                {Number((detail as any).customer_mode ?? 0) === 1 && (
                  <div style={{ marginTop: 6 }}>
                    Nhóm: <span className="chip">Khách hàng Pass đơn & CTV</span>
                  </div>
                )}

              </div>

              {/* Hành động nhanh */}
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {viewPhone(detail) && (
                  <>
                    <Button
                      size="small"
                      onClick={() => { openSelf(`tel:${viewPhone(detail)}`); }}
                    >
                      📞 Gọi
                    </Button>
                    <Button
                      size="small"
                      onClick={() => { openSelf(`sms:${viewPhone(detail)}`); }}
                    >
                      ✉️ SMS
                    </Button>
                    <Button
                      size="small"
                      onClick={() => { openBlank(`https://zalo.me/${viewPhone(detail)}`); }}
                    >
                      🟦 Zalo
                    </Button>
                  </>
                )}
                {viewAddr(detail) && (
                  <Button
                    size="small"
                    onClick={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        viewAddr(detail)
                      )}`;
                      openBlank(url);
                    }}
                  >
                    🗺️ Bản đồ
                  </Button>
                )}
                <Button
                  size="small"
                  color="primary"
                  onClick={() => {
                    setOpenDetail(false);
                    nav(`/admin/m/customers/${detail.id}/edit`);
                  }}
                >
                  ✏️ Sửa
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
