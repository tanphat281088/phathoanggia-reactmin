/* eslint-disable @typescript-eslint/no-explicit-any */
import { CalculatorOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG, URL_CONSTANTS } from "../../configs/api-route-config";

type Props = {
  donHangId: number;
  maBaoGia?: string;
};

const ChiPhiDeXuatButton = ({ donHangId, maBaoGia }: Props) => {
  const handleClick = async () => {
    if (!donHangId) return;

    try {
      // 1) Gọi BE tạo (hoặc lấy lại) bảng chi phí ĐỀ XUẤT từ báo giá
      const url = API_ROUTE_CONFIG.QLCP_DE_XUAT_FROM_QUOTE(donHangId);
      const res: any = await axios.post(url);

      const ok = res?.data?.success ?? true;
      if (ok) {
        message.success(
          maBaoGia
            ? `Đã tạo / mở bảng chi phí ĐỀ XUẤT cho báo giá ${maBaoGia}`
            : "Đã tạo / mở bảng chi phí ĐỀ XUẤT"
        );
      }
    } catch (e: any) {
      console.error("[QLCP Đề xuất] lỗi khi khởi tạo từ báo giá", e);
      message.error("Không khởi tạo được bảng chi phí ĐỀ XUẤT");
      return;
    }

    // 2) Nhảy qua module QLCP Đề xuất để sửa chi phí
    window.location.href = URL_CONSTANTS.QLCP_DE_XUAT;
  };

  return (
    <Button
      size="small"
      type="link"
      icon={<CalculatorOutlined />}
      onClick={handleClick}
    >
      CP đề xuất
    </Button>
  );
};

export default ChiPhiDeXuatButton;
