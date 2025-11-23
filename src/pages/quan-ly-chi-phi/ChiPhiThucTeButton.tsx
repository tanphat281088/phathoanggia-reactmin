/* eslint-disable @typescript-eslint/no-explicit-any */
import { CalculatorOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG, URL_CONSTANTS } from "../../configs/api-route-config";

type Props = {
  donHangId: number;
  maBaoGia?: string;
};

const ChiPhiThucTeButton = ({ donHangId, maBaoGia }: Props) => {
  const handleClick = async () => {
    if (!donHangId) return;

    try {
      // 1) Gọi BE tạo (hoặc lấy lại) bảng chi phí THỰC TẾ từ báo giá
      const url = API_ROUTE_CONFIG.QLCP_THUC_TE_FROM_QUOTE(donHangId);
      const res: any = await axios.post(url);

      const ok = res?.data?.success ?? true;
      if (ok) {
        message.success(
          maBaoGia
            ? `Đã tạo / mở bảng chi phí THỰC TẾ cho báo giá ${maBaoGia}`
            : "Đã tạo / mở bảng chi phí THỰC TẾ"
        );
      }
    } catch (e: any) {
      console.error("[QLCP Thực tế] lỗi khi khởi tạo từ báo giá", e);
      message.error("Không khởi tạo được bảng chi phí THỰC TẾ");
      return;
    }

    // 2) Nhảy qua module QLCP Thực tế
    window.location.href = URL_CONSTANTS.QLCP_THUC_TE;
  };

  return (
    <Button
      size="small"
      type="link"
      icon={<CalculatorOutlined />}
      onClick={handleClick}
    >
      CP thực tế
    </Button>
  );
};

export default ChiPhiThucTeButton;
