import { PlusOutlined } from "@ant-design/icons";
import { postData } from "../../services/postData.api";
import { useState } from "react";
import { Button, Form, Modal, Row, message } from "antd";
import FormQuanLyBanHang from "./FormQuanLyBanHang";
import { useDispatch } from "react-redux";
import { clearImageSingle, setReload } from "../../redux/slices/main.slice";
import dayjs from "dayjs";

/* Responsive hook để biết khi nào là mobile */
import { useResponsive } from "../../hooks/useReponsive";
/* Thanh hành động cố định đáy cho mobile (hiện đang không dùng ở màn Thêm) */
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

      // ===== Chuẩn hoá loai_khach_hang cho BE =====
      // UI: 0 = Hệ thống, 1 = Vãng lai, 2 = Agency
      // BE: 0 = có khach_hang_id (hệ thống + agency), 1 = vãng lai
      const loaiKhRaw = rest?.loai_khach_hang;
      let loaiKhForPayload: number | undefined;

      if (loaiKhRaw === 1) {
        // Khách vãng lai
        loaiKhForPayload = 1;
      } else {
        // 0 hoặc 2 (Agency) → đều map về 0 = khách hệ thống (có khach_hang_id)
        loaiKhForPayload = 0;
      }

      // ===== Thuế: chỉ gửi khi chọn "Có thuế" =====
      const taxModeNum = Number(values?.tax_mode ?? 0);
      const taxPatch =
        taxModeNum === 1
          ? {
              tax_mode: 1,
              vat_rate:
                values?.vat_rate !== undefined && values?.vat_rate !== null
                  ? Number(values.vat_rate)
                  : 8,
            }
          : {};

      const payload = {
        ...rest,
        loai_khach_hang: loaiKhForPayload,
        ...taxPatch,
        // Chuẩn hoá ngày, tránh dùng toISOString (không lệch UTC)
        ngay_tao_don_hang: values?.ngay_tao_don_hang
          ? dayjs(values.ngay_tao_don_hang).format("YYYY-MM-DD")
          : null,
        nguoi_nhan_thoi_gian: values?.nguoi_nhan_thoi_gian
          ? dayjs(values.nguoi_nhan_thoi_gian).format("YYYY-MM-DD HH:mm:ss")
          : null,
        so_tien_da_thanh_toan: values?.so_tien_da_thanh_toan
          ? values.so_tien_da_thanh_toan
          : 0,
      };

      const closeModel = () => {
        handleCancel();
        dispatch(setReload());
      };

      const resp: any = await postData(path, payload, closeModel);

      // Hiển thị mã báo giá do BE tự sinh (nếu có)
      const code = resp?.data?.ma_don_hang ?? resp?.ma_don_hang;
      if (code) {
        message.success(`Tạo báo giá thành công: ${code}`);
      } else {
        message.success(`Tạo báo giá thành công`);
      }
    } catch (_e) {
      // postData đã xử lý lỗi; ở đây chỉ đảm bảo tắt loading
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
        width={isMobile ? "100%" : 1200}
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
        <Form
          id="formQuanLyBanHang"
          form={form}
          layout="vertical"
          onFinish={onCreate}
        >
          <FormQuanLyBanHang form={form} />
        </Form>

        {/* Nếu sau này muốn có thanh action cố định cho mobile thì bật lại block này */}
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
