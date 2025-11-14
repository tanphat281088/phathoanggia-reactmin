/* /src/mobile/pages/sales/OrderDetailPage.tsx */
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Dialog,
  List,
  Space,
  Tag,
  SpinLoading,
} from "antd-mobile";
import dayjs from "dayjs";
import axios from "../../../configs/axios";

/* ===== Helpers ===== */
const get = (o: any, ...ks: string[]) =>
  ks.reduce<any>((acc, k) => (acc == null ? acc : acc[k]), o);
const fmtDT = (iso?: string) =>
  iso && dayjs(iso).isValid() ? dayjs(iso).format("DD/MM/YYYY HH:mm") : "-";
const money = (n: any) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* Loại thanh toán trên FE (đồng bộ với desktop) */
const LOAI_TT = { CHUA: 0, MOT_PHAN: 1, TOAN_BO: 2 } as const;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Desktop đã có route: GET /api/quan-ly-ban-hang/{id}
      const resp = await axios.get(`/quan-ly-ban-hang/${id}`);
      const payload = (resp as any)?.data;
      setData(payload?.data ?? payload ?? null);
    } catch (e) {
      console.error("order detail error", e);
      Dialog.alert({ content: "Không tải được chi tiết đơn." });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ===== Map dữ liệu (chịu nhiều schema như desktop) ===== */
  const code =
    get(data, "ma_don_hang") ?? get(data, "so_dh") ?? get(data, "code") ?? (data?.id ? `#${data.id}` : "-");

  const customerName =
    get(data, "ten_khach_hang") ??
    get(data, "khach_hang", "ten_khach_hang") ??
    get(data, "customer", "name") ??
    "-";

  const receiverName =
    get(data, "nguoi_nhan_ten") ??
    get(data, "nguoi_nhan") ??
    get(data, "receiver_name") ??
    "-";

  const receiverPhone =
    get(data, "nguoi_nhan_sdt") ??
    get(data, "receiver_phone") ??
    "-";

  const address =
    get(data, "dia_chi_giao_hang") ??
    get(data, "dia_chi") ??
    "-";

  const receiveAt =
    get(data, "nguoi_nhan_thoi_gian") ??
    get(data, "thoi_gian_giao") ??
    get(data, "gio_giao") ??
    null;

  // Trạng thái giao
  const statusNum: 0 | 1 | 2 | 3 =
    Number(
      get(data, "trang_thai_don_hang") ??
      get(data, "trang_thai") ??
      get(data, "status") ??
      0
    ) as any;

  const STATUS_GIAO: Record<number, { text: string; color: any }> = {
    0: { text: "Chưa giao", color: "default" },
    1: { text: "Đang giao", color: "warning" },
    2: { text: "Đã giao", color: "success" },
    3: { text: "Đã hủy", color: "danger" },
  };

  // ======== Giá trị – theo đúng công thức ở FormQuanLyBanHang (desktop) ========
  const itemsRaw =
    get(data, "chi_tiet") ?? get(data, "chi_tiet_don_hang") ?? get(data, "items") ?? [];

  const items = useMemo(() => {
    const arr = Array.isArray(itemsRaw) ? itemsRaw : [];
    return arr.map((r: any) => {
      const name =
        r?.ten_san_pham ??
        r?.san_pham?.ten_san_pham ??
        r?.name ??
        "-";
      const unit =
        r?.don_vi_tinh?.ten_don_vi_tinh ??
        r?.unit_name ??
        "";
      const qty = Number(r?.so_luong ?? r?.quantity ?? 0);
      const price = Number(r?.don_gia ?? r?.price ?? 0);
      const amount = Number(
        r?.tong_tien ??
        r?.thanh_tien ??
        qty * price
      );
      return { id: r?.id ?? r?.san_pham_id, name, unit, qty, price, amount };
    });
  }, [itemsRaw]);

  // Tổng hàng: ưu tiên trường tổng từ DB; nếu không có thì cộng items
  const tongTienHangDB = Number(
    get(data, "tong_tien_hang") ??
    get(data, "tong_tien_truoc_thue") ??
    0
  );
  const tongHangFromItems = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const tongHang = Math.max(tongTienHangDB || 0, tongHangFromItems || 0);

  const giamGia = Number(get(data, "giam_gia") ?? 0);
  const chiPhi  = Number(get(data, "chi_phi") ?? get(data, "chi_phi_van_chuyen") ?? 0);

  // Giảm giá thành viên
  const memberPercent = Number(get(data, "member_discount_percent") ?? 0);
  const memberAmountDb = Number(get(data, "member_discount_amount") ?? 0);
  const memberAmountCalc =
    memberPercent > 0 ? Math.round(tongHang * memberPercent / 100) : 0;
  const memberAmount = memberAmountDb || memberAmountCalc;

  // Thuế
  const taxMode = Number(get(data, "tax_mode") ?? 0); // 0=Không thuế, 1=Có VAT
  const vatRate = Number(get(data, "vat_rate") ?? 0);

  // Subtotal: ưu tiên lấy từ DB nếu có; nếu không thì tự tính: hàng - giảm tay - giảm member + phí
  const subtotalFromDb = get(data, "subtotal");
  const subtotal =
    subtotalFromDb != null
      ? Number(subtotalFromDb)
      : Math.max(0, tongHang - giamGia - memberAmount + chiPhi);

  // VAT & tổng thanh toán
  const vatAmountFromDb = get(data, "vat_amount");
  const grandTotalFromDb = get(data, "grand_total");

  let vatAmount = 0;
  let grandTotal = 0;

  if (taxMode === 1) {
    vatAmount =
      vatAmountFromDb != null
        ? Number(vatAmountFromDb)
        : (vatRate > 0 ? Math.round(subtotal * vatRate / 100) : 0);
    grandTotal =
      grandTotalFromDb != null ? Number(grandTotalFromDb) : subtotal + vatAmount;
  } else {
    vatAmount = 0;
    grandTotal = subtotal;
  }

  // Tổng cần thanh toán: ưu tiên field legacy, fallback grandTotal
  const tongCanTT = Number(get(data, "tong_tien_can_thanh_toan") ?? grandTotal);


  // Thanh toán
  const loaiThanhToan = Number(get(data, "loai_thanh_toan") ?? LOAI_TT.CHUA);
  const soTienDaThanhToan = Number(
    get(data, "so_tien_da_thanh_toan") ??
    get(data, "da_thanh_toan") ??
    0
  );

  const conLai =
    loaiThanhToan === LOAI_TT.TOAN_BO
      ? 0
      : loaiThanhToan === LOAI_TT.CHUA
      ? Math.max(0, tongCanTT)
      : Math.max(0, tongCanTT - soTienDaThanhToan);

  // Trạng thái thanh toán tổng quát (giống cột desktop)
  const thanhToanStatus =
    conLai === 0 && tongCanTT > 0
      ? 2 // Đã hoàn thành
      : soTienDaThanhToan > 0
      ? 1 // Một phần
      : 0; // Chưa hoàn thành


  const TT_LABEL: Record<number, { text: string; color: any }> = {
    0: { text: "Chưa hoàn thành", color: "danger" },
    1: { text: "Thanh toán một phần", color: "warning" },
    2: { text: "Đã hoàn thành", color: "success" },
  };

  /* ===== Đổi trạng thái giao ===== */
  const updateStatus = async (newStatus: 0 | 1 | 2 | 3) => {
    const ok = await Dialog.confirm({
      content:
        newStatus === 2
          ? "Xác nhận cập nhật 'Đã giao'?"
          : newStatus === 3
          ? "Xác nhận cập nhật 'Đã hủy'?"
          : "Xác nhận cập nhật trạng thái?",
      cancelText: "Hủy",
      confirmText: "Đồng ý",
    });
    if (!ok) return;
    try {
      await axios.patch(`/giao-hang/${id}/trang-thai`, { trang_thai: newStatus });
      await fetchDetail();
    } catch (e) {
      console.error("update status error", e);
      Dialog.alert({ content: "Không cập nhật được trạng thái." });
    }
  };

  return (
    <div style={{ padding: 12 }} className="pb-safe">
      <Space block justify="between" style={{ marginBottom: 8 }}>
        <Button size="small" onClick={() => navigate(-1)}>
          ← Quay lại
        </Button>
        <Space>
          <Button size="small" onClick={() => updateStatus(1)}>
            Đang giao
          </Button>
          <Button size="small" color="success" onClick={() => updateStatus(2)}>
            Đã giao
          </Button>
          <Button size="small" color="danger" onClick={() => updateStatus(3)}>
            Hủy
          </Button>
        </Space>
      </Space>

      <Card title={`Đơn hàng ${String(code)}`}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
            <SpinLoading />
          </div>
        ) : (
          <>
            {/* Thông tin chung */}
            <List header="Thông tin chung">
              <List.Item prefix="Khách hàng">
                <b>{customerName}</b>
              </List.Item>
              <List.Item prefix="Người nhận">
                <b>{receiverName}</b> {receiverPhone ? <span>• {receiverPhone}</span> : null}
              </List.Item>
              <List.Item prefix="Địa chỉ">{address || "-"}</List.Item>
              <List.Item prefix="Ngày–giờ nhận">{fmtDT(receiveAt)}</List.Item>
              <List.Item prefix="Trạng thái giao">
                <Tag color={STATUS_GIAO[statusNum]?.color}>
                  {STATUS_GIAO[statusNum]?.text ?? "-"}
                </Tag>
              </List.Item>
            </List>

            {/* Tổng hợp tiền */}
            <List header="Tổng hợp">
              <List.Item prefix="Tổng hàng" extra={<b>{money(tongHang)}</b>} />
              <List.Item prefix="Giảm giá" extra={money(giamGia)} />

              {memberAmount > 0 && (
                <>
                  <List.Item
                    prefix="Giảm giá thành viên (%)"
                    extra={`${memberPercent} %`}
                  />
                  <List.Item
                    prefix="Giảm thành viên"
                    extra={`-${money(memberAmount)}đ`}
                  />
                </>
              )}

              <List.Item prefix="Chi phí vận chuyển" extra={money(chiPhi)} />
              <List.Item
                prefix="Thuế"
                extra={
                  taxMode === 1 ? (
                    <>
                      VAT {vatRate || 0}% • {money(vatAmount)}
                    </>
                  ) : (
                    "Không thuế"
                  )
                }
              />
              <List.Item
                prefix="Tổng cần thanh toán"
                extra={<b>{money(tongCanTT)}</b>}
              />
            </List>


            {/* Thanh toán */}
            <List header="Thanh toán">
              <List.Item prefix="Đã thanh toán" extra={money(soTienDaThanhToan)} />
              <List.Item prefix="Còn lại" extra={<b>{money(conLai)}</b>} />
              <List.Item prefix="Trạng thái">
                <Tag color={TT_LABEL[thanhToanStatus]?.color}>
                  {TT_LABEL[thanhToanStatus]?.text}
                </Tag>
              </List.Item>
            </List>

            {/* Sản phẩm */}
            <List header="Sản phẩm">
              {items.length === 0 && <List.Item>N/A</List.Item>}
              {items.map((it) => (
                <List.Item
                  key={String(it.id)}
                  description={
                    <>
                      SL: {it.qty ?? 0} {it.unit || ""} • Đơn giá: {money(it.price)} •{" "}
                      Thành tiền: <b>{money(it.amount)}</b>
                    </>
                  }
                >
                  {it.name}
                </List.Item>
              ))}
            </List>
          </>
        )}
      </Card>
    </div>
  );
}
