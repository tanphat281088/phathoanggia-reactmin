/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { App, Button, Card, Descriptions, Flex, Space, Typography, DatePicker, Tag } from "antd";
import dayjs from "dayjs";
import { timesheetMy, type BangCongItem } from "../../services/bangCong.api";

const { Title, Text } = Typography;

export default function BangCongCuaToi() {
  const { message } = App.useApp();
  const [thang, setThang] = useState<string>(dayjs().format("YYYY-MM"));
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<BangCongItem | null>(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const resp = await timesheetMy(thang);
    // resp có thể là:
    // 1) { success, data: { thang, item } }  (kiểu cũ)
    // 2) { thang, item, debug? }             (kiểu hiện tại bạn đang nhận)

    // Chuẩn hoá:
    const payload =
      resp && "data" in resp
        ? (resp as any).data                            // kiểu cũ
        : resp;                                         // kiểu mới

    console.log("[timesheetMy] normalized =", payload);

    // Đồng bộ lại tháng từ server (kỳ 6→5)
    if (payload?.thang && payload.thang !== thang) {
      setThang(payload.thang);
    }

    setItem(payload?.item ?? null);
  } catch (e: any) {
    console.error("[timesheetMy] error =", e);
    message.error(e?.message || "Không tải được bảng công.");
    setItem(null);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [thang]);

  return (
    <Flex vertical gap={16}>
      <Title level={3} style={{ margin: 0 }}>Bảng công của tôi</Title>

      <Card>
        <Space align="end" wrap>
          <Space direction="vertical" size={4}>
            <Text>Tháng</Text>
            <DatePicker
              picker="month"
              // ép ngày = 01 để parse chắc chắn
              value={dayjs(`${thang}-01`)}
              onChange={(d) => d && setThang(d.format("YYYY-MM"))}
              format="MM/YYYY"
            />
          </Space>
          <Button onClick={fetchData} loading={loading}>Làm mới</Button>
        </Space>
      </Card>

      <Card loading={loading}>
        {item ? (
          <Descriptions bordered size="small" column={1} title={`Kỳ công: ${item.thang}`}>
            <Descriptions.Item label="Số ngày công">{item.so_ngay_cong}</Descriptions.Item>
       <Descriptions.Item label="Số phút công">{item.so_gio_cong}</Descriptions.Item>

            <Descriptions.Item label="Đi trễ (phút)">{item.di_tre_phut}</Descriptions.Item>
            <Descriptions.Item label="Về sớm (phút)">{item.ve_som_phut}</Descriptions.Item>
            <Descriptions.Item label="Nghỉ phép (ngày / giờ)">
              {item.nghi_phep_ngay} ngày / {item.nghi_phep_gio} giờ
            </Descriptions.Item>
            <Descriptions.Item label="Nghỉ không lương (ngày / giờ)">
              {item.nghi_khong_luong_ngay} ngày / {item.nghi_khong_luong_gio} giờ
            </Descriptions.Item>
            <Descriptions.Item label="Làm thêm (giờ)">{item.lam_them_gio}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {item.locked ? <Tag color="red">Đã khóa</Tag> : <Tag color="green">Chưa khóa</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng hợp lúc">{item.computed_at || "-"}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">Chưa có dữ liệu bảng công cho tháng này.</Text>
        )}
      </Card>
    </Flex>
  );
}
