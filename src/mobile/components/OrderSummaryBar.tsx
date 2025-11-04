// src/mobile/components/OrderSummaryBar.tsx
import React, { useRef } from "react";

type Props = {
  /** Tạm tính (sau giảm giá + phí, trước VAT) */
  subtotal: number;
  /** 0 = không thuế, 1 = VAT */
  taxMode?: 0 | 1;
  /** % VAT (khi taxMode=1), ví dụ 8 */
  vatRate?: number | null;

  /** Số tiền VAT (nếu đã tính sẵn). Nếu không truyền, component tự suy diễn từ subtotal * vatRate */
  vatAmount?: number | null;

  /** Tổng cần thanh toán (nếu đã tính sẵn). Nếu không truyền, component tự suy diễn: taxMode=1 ? subtotal+vat : subtotal */
  grandTotal?: number | null;

  /** Đã thanh toán (để hiện “Còn lại”) */
  paidAmount?: number;

  /** Disable nút gửi khi thiếu dữ liệu */
  disabled?: boolean;

  /** Nhãn nút chính */
  primaryLabel?: string;

  /** Hành động khi bấm nút chính (Gửi đơn) */
  onPrimary?: () => void;

  /** Nhãn & action phụ (ví dụ: Xoá nháp). Nếu không truyền sẽ ẩn. */
  secondaryLabel?: string;
  onSecondary?: () => void;

  /** (tuỳ chọn) trạng thái loading khi gửi đơn để chống double-click */
  primaryLoading?: boolean;
  /** (tuỳ chọn) disable nút phụ */
  secondaryDisabled?: boolean;
};

const fmt = (n: number = 0) => Number(n || 0).toLocaleString("vi-VN");

const OrderSummaryBar: React.FC<Props> = ({
  subtotal,
  taxMode = 0,
  vatRate = null,
  vatAmount = null,
  grandTotal = null,
  paidAmount = 0,
  disabled = false,
  primaryLabel = "Gửi đơn",
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryLoading = false,
  secondaryDisabled = false,
}) => {
  // Suy diễn VAT & grandTotal nếu không truyền
  const vat =
    taxMode === 1
      ? (vatAmount ?? Math.round(Number(subtotal || 0) * Number(vatRate ?? 0) / 100))
      : 0;

  const total =
    grandTotal ??
    (taxMode === 1 ? Number(subtotal || 0) + Number(vat || 0) : Number(subtotal || 0));

  const paid = Number(paidAmount || 0);
  const remain = Math.max(0, total - paid);

  // Chống double click gửi đơn
  const clickedRef = useRef(false);
  const handlePrimary = () => {
    if (primaryLoading) return;
    if (clickedRef.current) return;
    clickedRef.current = true;
    try {
      onPrimary?.();
    } finally {
      // cho phép bấm lại sau 600ms (đủ để Dialog confirm/Toast hiển thị)
      setTimeout(() => (clickedRef.current = false), 600);
    }
  };

  return (
    <div className="sticky-actions" role="region" aria-label="Tổng kết đơn hàng">
      <div className="summary" aria-live="polite">
        <div>
          {taxMode === 1 ? (
            <div style={{ fontSize: 12, lineHeight: 1.2 }}>
              <div>Tạm tính: <b className="amount">{fmt(subtotal)}đ</b></div>
              <div>VAT {vatRate ?? 0}%: <b className="amount">{fmt(vat)}đ</b></div>
              <div>Tổng thanh toán: <b className="amount">{fmt(total)}đ</b></div>
            </div>
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.2 }}>
              <div>Tổng thanh toán: <b className="amount">{fmt(total)}đ</b></div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="phg-muted" style={{ fontSize: 12 }}>Còn lại</div>
          <div className="amount amount-strong" aria-label={`Số tiền còn lại ${fmt(remain)} đồng`}>
            {fmt(remain)}đ
          </div>
        </div>
      </div>

      {secondaryLabel && onSecondary && (
        <button
          type="button"
          className="primary-btn danger-btn"
          style={{ marginBottom: 8 }}
          onClick={onSecondary}
          disabled={secondaryDisabled}
          aria-disabled={secondaryDisabled}
        >
          {secondaryLabel}
        </button>
      )}

      <button
        type="button"
        className="primary-btn"
        onClick={handlePrimary}
        disabled={disabled || primaryLoading}
        aria-disabled={disabled || primaryLoading}
      >
        {primaryLoading ? "Đang gửi…" : primaryLabel}
      </button>
    </div>
  );
};

export default OrderSummaryBar;
