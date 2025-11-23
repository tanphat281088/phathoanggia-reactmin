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

const DEFAULT_QUOTE_FOOTER_NOTE =
  "- Giá trên đã bao gồm toàn bộ chi phí nhân sự và trang thiết bị theo mô tả trong bảng báo giá.\n" +
  "- Giá chưa bao gồm thuế VAT (nếu có thỏa thuận khác sẽ ghi rõ trong hợp đồng).\n" +
  "- Báo giá có hiệu lực đến ngày ...";

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

  // 🔹 STEP: 1..7 cho wizard Báo giá
  // 1 = Thông tin KH & sự kiện
  // 2 = NS, 3 = CSVC, 4 = TIEC, 5 = TD, 6 = CPK, 7 = Giảm giá + Chi phí quản lý + Thuế + Thanh toán
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);


  const showModal = async () => {
    form.resetFields();
    dispatch(clearImageSingle());
    setStep(1);
    setIsModalOpen(true);

    // 🔹 Step 8: ghi chú báo giá mặc định cho báo giá mới
    form.setFieldsValue({
      quote_footer_note: DEFAULT_QUOTE_FOOTER_NOTE,
    });
  };


  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    dispatch(clearImageSingle());
    setStep(1);
  };

  // 🔹 Map step -> tiêu đề modal cho dễ hiểu
  const stepTitle = (() => {
    switch (step) {
      case 1:
        return `Thêm ${title} - Thông tin khách hàng & sự kiện`;
      case 2:
        return `Thêm ${title} - Báo giá Nhân sự (NS)`;
      case 3:
        return `Thêm ${title} - Báo giá Cơ sở vật chất (CSVC)`;
      case 4:
        return `Thêm ${title} - Báo giá Tiệc (TIEC)`;
      case 5:
        return `Thêm ${title} - Báo giá Địa điểm / Thuê địa điểm (TD)`;
      case 6:
        return `Thêm ${title} - Báo giá Chi phí khác (CPK)`;
      case 7:
        return `Thêm ${title} - Giảm giá, Chi phí quản lý, Thuế & Thanh toán`;
      case 8:
        return `Thêm ${title} - Tuỳ biến Hạng mục & Ghi chú báo giá`;
      default:
        return `Thêm ${title}`;
    }
  })();

  // 🔹 Validate & Next: chỉ STEP 1 cần validate field; các step 2–6 cho phép bỏ trống
  const handleNextStep = async () => {
    try {
      if (step === 1) {
        const values = form.getFieldsValue();
        const fieldsToValidate: (string | (string | number)[])[] = [
          "ngay_tao_don_hang",
          "loai_khach_hang",
          "dia_chi_giao_hang",
          "nguoi_nhan_thoi_gian",
        ];

        if (values.loai_khach_hang === 0) {
          // KH hệ thống
          fieldsToValidate.push("khach_hang_id");
        } else if (values.loai_khach_hang === 1) {
          // KH vãng lai
          fieldsToValidate.push("ten_khach_hang", "so_dien_thoai");
        } else if (values.loai_khach_hang === 2) {
          // Agency
          fieldsToValidate.push("khach_hang_id");
        }

        await form.validateFields(fieldsToValidate);
      }

      // Step 2..6 không ép validate gì đặc biệt
      if (step < 8) {
        setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
      }

    } catch (_e) {
      // AntD tự highlight lỗi
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }
  };

  const onCreate = async (_values: any) => {
    setIsLoading(true);
    try {
      // 🔹 Lấy toàn bộ dữ liệu đang có trong form (cả bước 1..7)
      const allValues = form.getFieldsValue(true);
      // console.log("[ThemQLBH] allValues trước khi map", allValues);

      // ⚠️ Không gửi ma_don_hang (BE tự sinh theo id)
      const {
        ma_don_hang, // eslint-disable-line @typescript-eslint/no-unused-vars
        ...rest
      } = allValues || {};

      // ===== Chuẩn hoá loai_khach_hang cho BE =====
      const loaiKhRaw = rest?.loai_khach_hang;
      let loaiKhForPayload: number | undefined;

      if (loaiKhRaw === 1) {
        loaiKhForPayload = 1; // Khách vãng lai
      } else {
        loaiKhForPayload = 0; // Hệ thống + Agency
      }

      const taxModeNum = Number(allValues?.tax_mode ?? 0);
      const taxPatch =
        taxModeNum === 1
          ? {
              tax_mode: 1,
              vat_rate:
                allValues?.vat_rate !== undefined &&
                allValues?.vat_rate !== null
                  ? Number(allValues.vat_rate)
                  : 8,
            }
          : {};

      let khachHangIdForPayload = rest.khach_hang_id ?? null;
      if (loaiKhForPayload === 1) {
        khachHangIdForPayload = null;
      }

      const payload = {
        ...rest,
        loai_khach_hang: loaiKhForPayload,
        khach_hang_id: khachHangIdForPayload,
        ...taxPatch,
        ngay_tao_don_hang: allValues?.ngay_tao_don_hang
          ? dayjs(allValues.ngay_tao_don_hang).format("YYYY-MM-DD")
          : null,
        nguoi_nhan_thoi_gian: allValues?.nguoi_nhan_thoi_gian
          ? dayjs(allValues.nguoi_nhan_thoi_gian).format(
              "YYYY-MM-DD HH:mm:ss"
            )
          : null,
        so_tien_da_thanh_toan: allValues?.so_tien_da_thanh_toan
          ? allValues.so_tien_da_thanh_toan
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

  // ===== FOOTER CHO DESKTOP =====
  const desktopFooter =
    step === 1
      ? [
          <Row justify="end" key="footer-step1">
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" onClick={handleNextStep}>
              Tiếp tục
            </Button>
          </Row>,
        ]
      : step > 1 && step < 8
      ? [
          <Row justify="end" key="footer-step-mid" style={{ gap: 8 }}>
            <Button onClick={handleCancel}>Hủy</Button>
            <Button onClick={handlePrevStep}>Quay lại</Button>
            <Button type="primary" onClick={handleNextStep}>
              Tiếp tục
            </Button>
          </Row>,
        ]
      : [
          <Row justify="end" key="footer-step8" style={{ gap: 8 }}>
            <Button onClick={handlePrevStep}>Quay lại</Button>
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
        ];

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
        title={stepTitle}
        open={isModalOpen}
        // 🔹 Desktop: modal to hơn & đồng nhất (1300px), Mobile: full width
        width={isMobile ? "100%" : 1300}
        // 🔹 Đẩy modal lên trên (giảm khoảng trắng, cao hơn)
        style={{ top: 24 }}
        // 🔹 Body modal cố định chiều cao, nội dung scroll, padding đồng nhất
        styles={{
          body: {
            maxHeight: isMobile
              ? "calc(100vh - 140px)"
              : "calc(100vh - 160px)",  // ăn thêm chiều cao so với 200px cũ
            overflow: "auto",
            padding: isMobile ? 12 : 24,
          },
        }}
        onCancel={handleCancel}
        maskClosable={false}
        footer={isMobile ? null : desktopFooter}
      >


        <Form
          id="formQuanLyBanHang"
          form={form}
          layout="vertical"
          onFinish={onCreate}
        >
          {/* stepMode điều khiển Form hiển thị phần nào, wizardMode bật chế độ 7 bước */}
          <FormQuanLyBanHang
            form={form}
            stepMode={step}
            wizardMode={true}
          />
        </Form>

        {/* Nếu sau này muốn có thanh action cố định cho mobile thì bật lại block này */}
        {false && isMobile && (
          <MobileActionBar
            primaryLabel={step === 7 ? "Lưu" : "Tiếp tục"}
            onPrimary={() =>
              step === 7 ? form.submit() : handleNextStep()
            }
            primaryLoading={isLoading}
            secondaryLabel={step > 1 ? "Quay lại" : undefined}
            onSecondary={step > 1 ? handlePrevStep : undefined}
          />
        )}
      </Modal>
    </>
  );
};

export default ThemQuanLyBanHang;
