import { PlusOutlined } from "@ant-design/icons";
import { postData } from "../../services/postData.api";
import { useState } from "react";
import { Button, Form, Modal, Row, message } from "antd";
import FormQuanLyBanHang from "./FormQuanLyBanHang";
import { useDispatch } from "react-redux";
import { clearImageSingle, setReload } from "../../redux/slices/main.slice";
import dayjs from "dayjs";
import { ConfigProvider } from "antd";

/* ✅ Responsive hook để biết khi nào là mobile */
import { useResponsive } from "../../hooks/useReponsive";
/* ✅ Thanh hành động cố định đáy cho mobile */
import MobileActionBar from "../../components/responsive/MobileActionBar";

const ThemQuanLyBanHang = ({
  path,
  title,
}: {
  path: string;
  title: string;
}) => {
  const dispatch = useDispatch();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();

  /* ✅ Lấy cờ isMobile để ẩn footer Modal trên mobile (tránh trùng nút) */
  const { isMobile } = useResponsive();

  const showModal = async () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    dispatch(clearImageSingle());
  };

  const onCreate = async (values: any) => {
    setIsLoading(true);
    try {
      // ⚠️ Không gửi ma_don_hang (BE tự sinh theo id)
      const {
        ma_don_hang, // eslint-disable-line @typescript-eslint/no-unused-vars
        ...rest
      } = values || {};

      // ===== NEW (an toàn): chỉ gửi thuế khi chọn "Có thuế" =====
      const taxModeNum = Number(values?.tax_mode ?? 0);
      const taxPatch =
        taxModeNum === 1
          ? {
              tax_mode: 1,
              // Nếu chưa điền, mặc định 8 cho tính nhất quán UI
              vat_rate:
                values?.vat_rate !== undefined && values?.vat_rate !== null
                  ? Number(values.vat_rate)
                  : 8,
            }
          : {};

      const payload = {
        ...rest,
        ...taxPatch, // ⬅️ chỉ có khi tax_mode=1
        ngay_tao_don_hang: dayjs(values.ngay_tao_don_hang).format("YYYY-MM-DD"),
        so_tien_da_thanh_toan: values.so_tien_da_thanh_toan
          ? values.so_tien_da_thanh_toan
          : 0,
      };

      // postData thường trả { success, data, message }
      const closeModel = () => {
        handleCancel();
        dispatch(setReload());
      };

      const resp: any = await postData(path, payload, closeModel);

      // Hiển thị mã đơn hàng do BE tự sinh (nếu có)
      // (Giữ tương thích: thử cả resp?.data?.ma_don_hang và resp?.ma_don_hang)
      const code = resp?.data?.ma_don_hang ?? resp?.ma_don_hang;
      if (code) {
        message.success(`Tạo đơn thành công: ${code}`);
      } else {
        message.success(`Tạo đơn thành công`);
      }
    } catch (_e) {
      // postData đã có handleAxiosError; ở đây chỉ đảm bảo loading được tắt
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={showModal}
        type="primary"
        title={`Thêm ${title}`}
        icon={<PlusOutlined />}
      >
        Thêm {title}
      </Button>

      <Modal
        title={`Thêm ${title}`}
        open={isModalOpen}
        /* ✅ Responsive: mobile full-width, desktop giữ 1200 như cũ */
        width={isMobile ? "100%" : 1200}
        /* ✅ Body cuộn mượt & padding gọn trên mobile (không ảnh hưởng desktop) */
        styles={{
          body: {
            maxHeight: isMobile ? "calc(100vh - 140px)" : undefined,
            overflow: "auto",
            padding: isMobile ? 12 : 24,
          },
        }}
        onCancel={handleCancel}
        maskClosable={false}
        centered
        /* ✅ Desktop/Tablet: giữ footer cũ; Mobile: ẩn footer để dùng MobileActionBar */
        footer={
          isMobile
            ? null
            : [
                <Row justify="end" key="footer">
                  <Button
                    key="submit"
                    form="formQuanLyBanHang"
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={isLoading}
                  >
                    Lưu
                  </Button>
                </Row>,
              ]
        }
      >
        {/* ✅ GÓI BẰNG ConfigProvider để Select/DatePicker vẽ dropdown TRONG modal */}
        {/* ✅ (Rollback) Render dropdown ra body như trước để không bị ăn click */}
        {/* ====== FORM ====== */}
        <Form
          id="formQuanLyBanHang"
          form={form}
          layout="vertical"
          onFinish={onCreate}
        >
          <FormQuanLyBanHang form={form} />
        </Form>

        {/* ✅ MobileActionBar chỉ cần cho modal SỬA; modal THÊM ban đầu bạn không dùng */}
        {false && isMobile && (
          <MobileActionBar
            primaryLabel="Lưu"
            onPrimary={() => form.submit()}
            primaryLoading={isLoading}
          />
        )}
      </Modal>
    </>
  );
};

export default ThemQuanLyBanHang;
