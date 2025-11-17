import { useState } from "react";
import { Modal, Form, Input, App, Button, Row, Col, Select } from "antd";
import { message as antdMessage } from "antd";
import baseAxios from "../../configs/axios";
import axios from "axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";
import { phoneNumberVNPattern } from "../../utils/patterns";

/** Danh sách cố định cho dropdown kênh liên hệ (ERP sự kiện) */
const KENH_LIEN_HE_OPTIONS = [
  "Facebook",
  "Zalo",
  "Hotline",
  "Website",
  "Khách cũ",
  "Khách quen giới thiệu",
  "Khác",
].map((v) => ({ label: v, value: v }));

type Props = {
  open: boolean;
  onClose: () => void;
  record: {
    ten: string;
    sdt: string;
    dia_chi_gan_nhat?: string;
  } | null;
  onConverted: () => void;
};

/** Chuẩn hoá số điện thoại VN: +84xxxx -> 0xxxx, loại space */
const normalizeVNPhone = (raw?: string) => {
  if (!raw) return "";
  let s = String(raw).replace(/\s+/g, "");
  s = s.replace(/^(\+?84)/, "0");
  if (!/^0/.test(s) && /^\d{9,10}$/.test(s)) s = "0" + s;
  return s;
};

/** Axios “sạch” để tránh interceptor toàn cục (GIỮ NGUYÊN – không dùng để đảm bảo token) */
const makePlainAxios = () => {
  const baseURL = (baseAxios as any)?.defaults?.baseURL || "";
  return axios.create({
    baseURL,
    timeout: 20000,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    validateStatus: () => true,
    transformResponse: [
      (data) => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      },
    ],
  });
};

/** Hỗ trợ cả trường hợp resp là AxiosResponse lẫn resp là response.data */
const isSuccess = (resp: any) => {
  if (resp && typeof resp === "object" && "success" in resp) {
    return !!resp.success;
  }
  if (resp && typeof resp === "object" && typeof resp.status === "string") {
    return resp.status.toLowerCase() === "success";
  }
  const statusOk =
    typeof resp?.status === "number" &&
    resp.status >= 200 &&
    resp.status < 300;
  const d = resp?.data;
  if (typeof d === "object" && d) {
    if (typeof d.success !== "undefined") return !!d.success;
    if (typeof d.status === "string")
      return d.status.toLowerCase() === "success";
  }
  return statusOk;
};

const successMessage = (
  resp: any,
  fallback = "Đã chuyển thành khách hàng hệ thống"
) => {
  if (resp?.message) return resp.message;
  if (resp?.msg) return resp.msg;
  if (resp?.data?.message) return resp.data.message;
  if (resp?.data?.msg) return resp.data.msg;
  return fallback;
};

const errorMessage = (resp: any, fallback = "Chuyển đổi thất bại") => {
  const d = resp?.data ?? resp;
  if (typeof d === "object" && d) return d?.message || d?.error || fallback;
  if (typeof d === "string" && d.trim())
    return d.length > 200 ? fallback : d;
  if (resp?.status && resp.status >= 400)
    return `${fallback} (HTTP ${resp.status})`;
  return fallback;
};

const ConvertVangLaiModal = ({
  open,
  onClose,
  record,
  onConverted,
}: Props) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const notify = {
    success: (msg: string) => {
      if (message && typeof (message as any).success === "function")
        return message.success(msg);
      return antdMessage.success(msg);
    },
    error: (msg: string) => {
      if (message && typeof (message as any).error === "function")
        return message.error(msg);
      return antdMessage.error(msg);
    },
  };

  const KH_VL_CONVERT =
    (API_ROUTE_CONFIG as any)?.KHACH_HANG_VANG_LAI_CONVERT ??
    "/khach-hang-vang-lai/convert";

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const so_dien_thoai = normalizeVNPhone(values.so_dien_thoai?.trim());
      const email =
        (values?.email?.trim() as string | undefined) ||
        (so_dien_thoai ? `${so_dien_thoai}@phgfloral.com` : undefined);

      const payload = {
        ten_khach_hang: values.ten_khach_hang?.trim(),
        so_dien_thoai: so_dien_thoai || null,
        email: email || null,
        dia_chi: values?.dia_chi?.trim() || null,
        kenh_lien_he: values?.kenh_lien_he || null,
      };

      // Dùng baseAxios để có Authorization + refresh token
      const resp: any = await baseAxios.post(KH_VL_CONVERT, payload);

      if (isSuccess(resp)) {
        notify.success(successMessage(resp));
        try {
          onClose?.();
        } catch (err) {
          console.error("[ConvertVangLaiModal] onClose error:", err);
        }
        try {
          onConverted?.();
        } catch (err) {
          console.error("[ConvertVangLaiModal] onConverted error:", err);
        }
      } else {
        notify.error(errorMessage(resp));
      }
    } catch (e: any) {
      if (e?.errorFields) return;
      const data = e?.response?.data ?? e;
      const msg =
        data?.message || data?.error || e?.message || "Lỗi chuyển đổi";
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Chuyển thành khách hàng hệ thống"
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>,
        <Button
          key="ok"
          type="primary"
          onClick={handleOk}
          loading={submitting}
        >
          Chuyển
        </Button>,
      ]}
      destroyOnClose
      maskClosable={!submitting}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ten_khach_hang: record?.ten,
          so_dien_thoai: normalizeVNPhone(record?.sdt),
          email: undefined,
          dia_chi: record?.dia_chi_gan_nhat,
          kenh_lien_he: undefined,
        }}
      >
        <Row gutter={[10, 10]}>
          <Col span={12}>
            <Form.Item
              name="ten_khach_hang"
              label="Tên khách hàng"
              rules={[{ required: true, message: "Vui lòng nhập tên" }]}
            >
              <Input placeholder="Nhập tên" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="so_dien_thoai"
              label="Số điện thoại"
              rules={[
                { required: true, message: "Vui lòng nhập số điện thoại" },
                {
                  pattern: phoneNumberVNPattern,
                  message: "Số điện thoại không hợp lệ",
                },
              ]}
            >
              <Input placeholder="0… hoặc +84…" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: "email", message: "Email không hợp lệ" }]}
              tooltip="Nếu để trống hệ thống sẽ tự tạo: SĐT@phgfloral.com"
            >
              <Input placeholder="Email (tuỳ chọn)" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="kenh_lien_he"
              label="Kênh liên hệ"
              tooltip="Danh sách cố định"
            >
              <Select
                allowClear
                placeholder="Chọn kênh liên hệ"
                options={KENH_LIEN_HE_OPTIONS}
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item name="dia_chi" label="Địa chỉ">
              <Input.TextArea placeholder="Địa chỉ" rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default ConvertVangLaiModal;
