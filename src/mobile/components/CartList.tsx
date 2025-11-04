// src/mobile/components/CartList.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button, List, Space, Stepper, Toast, Tag, Picker } from "antd-mobile";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

export type DvtOption = { value: number | string; label: string };

export type DraftItem = {
  san_pham_id: number | string;
  ten_sp: string;
  so_luong: number;
  don_vi_tinh_id?: number | string;
  don_vi_tinh_label?: string;
  loai_gia?: 1 | 2;   // 1=Đặt ngay, 2=Đặt trước 3N
  don_gia?: number;   // hiển thị; BE vẫn tính lại khi POST
};

type Props = {
  items: DraftItem[];
  onItemsChange: (next: DraftItem[]) => void;
};

const fmt = (n: number = 0) => Number(n || 0).toLocaleString("vi-VN");

async function fetchDvtOptions(san_pham_id: number | string): Promise<DvtOption[]> {
  try {
    const resp: any = await axios.get(
      `${API_ROUTE_CONFIG.DON_VI_TINH}/options-by-san-pham/${san_pham_id}`
    );
    const arr = resp?.data ?? resp ?? [];
    return arr.map((r: any) => ({ value: r.value ?? r.id, label: r.label ?? r.ten_don_vi ?? r.ten })) as DvtOption[];
  } catch {
    return [];
  }
}

const LOAI_GIA_COLUMNS = [[
  { label: "Đặt ngay", value: 1 },
  { label: "Đặt trước 3 ngày", value: 2 },
]];

const CartList: React.FC<Props> = ({ items, onItemsChange }) => {
  const [dvtMap, setDvtMap] = useState<Record<string, DvtOption[]>>({});

  const ensureDvtFor = useCallback(async (row: DraftItem) => {
    const key = String(row.san_pham_id);
    if (dvtMap[key]) return dvtMap[key];
    const dvt = await fetchDvtOptions(row.san_pham_id);
    setDvtMap((m) => ({ ...m, [key]: dvt }));
    return dvt;
  }, [dvtMap]);

  useEffect(() => {
    const missing = items.filter(it => !dvtMap[String(it.san_pham_id)]);
    if (!missing.length) return;
    missing.forEach(it => {
      fetchDvtOptions(it.san_pham_id).then(dvt =>
        setDvtMap(m => ({ ...m, [String(it.san_pham_id)]: dvt }))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const setQty = (id: number | string, qty: number) =>
    onItemsChange(items.map(i => i.san_pham_id === id ? { ...i, so_luong: Math.max(1, qty || 1) } : i));

  const setLoaiGia = (row: DraftItem, v: 1 | 2) =>
    onItemsChange(items.map(i => i.san_pham_id === row.san_pham_id ? { ...i, loai_gia: v } : i));

  const setDvt = (row: DraftItem, dvtId: number | string) => {
    const opts = dvtMap[String(row.san_pham_id)] || [];
    const label = opts.find(o => String(o.value) === String(dvtId))?.label;
    onItemsChange(items.map(i =>
      i.san_pham_id === row.san_pham_id
        ? { ...i, don_vi_tinh_id: dvtId, don_vi_tinh_label: label, don_gia: undefined }
        : i
    ));
  };

  const removeItem = (id: number | string) =>
    onItemsChange(items.filter(i => i.san_pham_id !== id));

  const fetchGia = async (row: DraftItem) => {
    if (!row.don_vi_tinh_id || !row.loai_gia) {
      Toast.show({ content: "Chọn ĐVT & Loại giá trước khi lấy giá", icon: "fail" });
      return;
    }
    try {
      const resp: any = await axios.get(
        `${API_ROUTE_CONFIG.QUAN_LY_BAN_HANG}/get-gia-ban-san-pham`,
        { params: {
          san_pham_id: row.san_pham_id,
          don_vi_tinh_id: row.don_vi_tinh_id,
          loai_gia: row.loai_gia,
        } }
      );
      const price = Number(resp?.data ?? resp ?? 0);
      onItemsChange(items.map(i =>
        i.san_pham_id === row.san_pham_id ? { ...i, don_gia: price } : i
      ));
      Toast.show("Đã lấy giá");
    } catch {
      Toast.show({ content: "Không lấy được giá", icon: "fail" });
    }
  };

  const tongHang = useMemo(
    () => items.reduce((s, it) => s + (Number(it.so_luong || 0) * Number(it.don_gia || 0)), 0),
    [items]
  );

  // Picker state cho từng dòng
  const [dvtPicker, setDvtPicker] = useState<{ visible: boolean; row?: DraftItem }>({ visible: false });
  const [giaPicker, setGiaPicker] = useState<{ visible: boolean; row?: DraftItem }>({ visible: false });

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        Giỏ hàng <Tag color="primary">{items.length} dòng</Tag>{" "}
        <span className="phg-muted">• Tạm tính: {fmt(tongHang)}đ</span>
      </div>

      <List>
        {items.map((it) => {
          const needPrice = !(Number(it.don_gia) > 0);
          const dvtOpts = dvtMap[String(it.san_pham_id)] || [];

          return (
            <List.Item
              key={String(it.san_pham_id)}
              onClick={(e) => e.stopPropagation()}
              description={
                <div className="phg-col" style={{ gap: 10 }}>
                  {/* DVT */}
                  <div className="phg-col">
                    <div className="phg-muted" style={{ fontSize: 12, fontWeight: 700 }}>Đơn vị tính</div>
                    <Button
                      size="small"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await ensureDvtFor(it);
                        setDvtPicker({ visible: true, row: it });
                      }}
                    >
                      {it.don_vi_tinh_label || "Chọn đơn vị tính"}
                    </Button>
                  </div>

                  {/* Loại giá */}
                  <div className="phg-col">
                    <div className="phg-muted" style={{ fontSize: 12, fontWeight: 700 }}>Loại giá</div>
                    <Button
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setGiaPicker({ visible: true, row: it }); }}
                    >
                      {String(it.loai_gia ?? "") === "1" ? "Đặt ngay"
                       : String(it.loai_gia ?? "") === "2" ? "Đặt trước 3 ngày"
                       : "Chọn loại giá"}
                    </Button>
                  </div>

                  {/* SL + Giá */}
                  <div className="phg-row">
                    <div>SL:</div>
                    <Stepper min={1} value={it.so_luong} onChange={(v) => setQty(it.san_pham_id, Number(v))} />
                    <Button size="small" onClick={(e) => { e.stopPropagation(); fetchGia(it); }} style={{ marginLeft: 8 }}>
                      Lấy giá
                    </Button>
                    {Number(it.don_gia) > 0 && (
                      <div style={{ marginLeft: 8, opacity: 0.85 }}>
                        Giá: {fmt(Number(it.don_gia))}đ
                      </div>
                    )}
                  </div>

                  {/* Thành tiền dòng */}
                  {Number(it.don_gia) > 0 && (
                    <div className="phg-muted" style={{ fontSize: 12 }}>
                      Thành tiền: <b className="amount">{fmt(Number(it.so_luong) * Number(it.don_gia))}đ</b>
                    </div>
                  )}

                  {/* Cảnh báo */}
                  {needPrice && (
                    <div style={{ color: "#ef476f", fontSize: 12 }}>
                      * Chưa có đơn giá — vui lòng bấm “Lấy giá”.
                    </div>
                  )}

                  {/* Hành động */}
                  <Space>
                    <Button size="small" color="danger" onClick={(e) => { e.stopPropagation(); removeItem(it.san_pham_id); }}>
                      Xoá dòng
                    </Button>
                  </Space>
                </div>
              }
            >
              <div style={{ fontWeight: 700 }}>{it.ten_sp}</div>
            </List.Item>
          );
        })}

        {items.length === 0 && <div style={{ padding: 8, opacity: 0.6 }}>Chưa có sản phẩm.</div>}
      </List>

      {/* DVT Picker (dropdown modal) */}
      <Picker
        columns={[ (dvtMap[String(dvtPicker.row?.san_pham_id || "")] || []).map(o => ({ label: o.label, value: o.value })) ]}
        visible={dvtPicker.visible}
        onCancel={() => setDvtPicker({ visible: false })}
        onConfirm={(vals) => {
          const id = vals?.[0] as (string | number);
          if (dvtPicker.row) setDvt(dvtPicker.row, id);
          setDvtPicker({ visible: false });
        }}
      />

      {/* Loại giá Picker */}
      <Picker
        columns={LOAI_GIA_COLUMNS}
        visible={giaPicker.visible}
        onCancel={() => setGiaPicker({ visible: false })}
        onConfirm={(vals) => {
          const v = Number(vals?.[0]) as 1 | 2;
          if (giaPicker.row) setLoaiGia(giaPicker.row, v);
          setGiaPicker({ visible: false });
        }}
      />
    </div>
  );
};

export default CartList;
