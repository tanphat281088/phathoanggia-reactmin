/* eslint-disable @typescript-eslint/no-explicit-any */
import { FileTextOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG, URL_CONSTANTS } from "../../configs/api-route-config";

type Props = {
  donHangId: number;
  maBaoGia?: string;
};

/**
 * Nút "Chuyển HĐ"
 *
 * - Gọi API BE: POST /quan-ly-hop-dong/from-quote/{donHangId}
 *   -> BE sẽ:
 *      + Nếu đã có Hợp đồng cho báo giá này: trả về HĐ hiện có
 *      + Nếu chưa có: tạo HĐ mới từ báo giá
 *
 * - Sau đó chuyển sang trang Quản lý Hợp đồng: /admin/quan-ly-hop-dong
 */
const ChuyenHopDongButton = ({ donHangId, maBaoGia }: Props) => {
  const handleClick = async () => {
    if (!donHangId) return;

    try {
      // 1) Gọi BE tạo (hoặc lấy lại) Hợp đồng từ báo giá
      const url = API_ROUTE_CONFIG.HOP_DONG_FROM_QUOTE(donHangId);
      const res: any = await axios.post(url);

      const ok = res?.data?.success ?? true;
      if (ok) {
        message.success(
          maBaoGia
            ? `Đã tạo / mở Hợp đồng cho báo giá ${maBaoGia}`
            : "Đã tạo / mở Hợp đồng từ báo giá"
        );
      }
    } catch (e: any) {
      console.error("[HĐ] Lỗi khi khởi tạo Hợp đồng từ báo giá:", e);
      message.error("Không khởi tạo được Hợp đồng từ báo giá");
      return;
    }

    // 2) Nhảy sang module Quản lý Hợp đồng
    window.location.href = URL_CONSTANTS.HOP_DONG;
  };

  return (
    <Button
      size="small"
      type="link"
      icon={<FileTextOutlined />}
      onClick={handleClick}
    >
      Chuyển HĐ
    </Button>
  );
};

export default ChuyenHopDongButton;
