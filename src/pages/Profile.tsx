import { Button, Form, Row, Modal, Input, message } from "antd";

import Heading from "../components/heading";
import FormNguoiDung from "./nguoi-dung/FormNguoiDung";
import { useState, useEffect } from "react";
import {
    clearImageSingle,
    setImageSingle,
    setReload,
} from "../redux/slices/main.slice";
import { postData } from "../services/postData.api";
import type { INguoiDungFormValues } from "../types/user.type";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { API_ROUTE_CONFIG } from "../configs/api-route-config";
import { AuthService } from "../services/AuthService";

const Profile = () => {
    const dispatch = useDispatch();

    const { imageSingle } = useSelector((state: RootState) => state.main);

    const [isLoading, setIsLoading] = useState(false);

    const [form] = Form.useForm();

    // ===== Modal đổi mật khẩu =====
const [pwOpen, setPwOpen] = useState(false);
const [pwLoading, setPwLoading] = useState(false);
const [pwForm] = Form.useForm();

const openChangePw = () => {
  pwForm.resetFields();
  setPwOpen(true);
};
const closeChangePw = () => setPwOpen(false);


    const fetchProfile = async () => {
        setIsLoading(true);
        const response = await AuthService.fetchUser();
        if (response && response.user) {
            const userData = response.user;

            // Xử lý các trường ngày tháng
            Object.entries(userData).forEach(([key, value]) => {
                if (value && typeof value === "string") {
                    if (
                        /ngay_|_ngay/.test(key) ||
                        /ngay/.test(key) ||
                        /thoi_gian|_thoi/.test(key) ||
                        /birthday/.test(key)
                    ) {
                        // Sử dụng cách type-safe để gán giá trị
                        const dateValue = dayjs(value, "YYYY-MM-DD");
                        (userData as unknown as Record<string, unknown>)[key] =
                            dateValue;
                    }
                }
            });

            // Kiểm tra images trước khi truy cập
            if (userData.images && userData.images.length > 0) {
                dispatch(setImageSingle(userData.images[0].path));
            }

            form.setFieldsValue({
                ...userData,
                province_id: +userData.province_id,
                district_id: +userData.district_id,
                ward_id: +userData.ward_id,
            });
        }
        setIsLoading(false);
    };

    // Gọi fetchProfile khi component mount
    useEffect(() => {
        fetchProfile();
    }, []);

    const onCreate = async (values: INguoiDungFormValues) => {
        setIsLoading(true);
        const closeModel = () => {
            dispatch(setReload());
        };
        await postData(
            API_ROUTE_CONFIG.PROFILE,
            {
                ...values,
                birthday: dayjs(values.birthday).format("YYYY-MM-DD"),
                image: imageSingle,
            },
            closeModel
        );
        setIsLoading(false);
        dispatch(clearImageSingle());
        fetchProfile();
    };
const onChangePassword = async (vals: { current_password: string; new_password: string; confirm_password: string; }) => {
  try {
    setPwLoading(true);
    const closeModel = () => {
      // đóng modal + refresh profile (không bắt buộc)
      setPwOpen(false);
    };
    await postData(
      API_ROUTE_CONFIG.AUTH_CHANGE_PASSWORD,
      {
        current_password: vals.current_password,
        new_password: vals.new_password,
        confirm_password: vals.confirm_password,
      },
      closeModel
    );
    message.success("Đổi mật khẩu thành công");
  } catch (e) {
    // postData đã toast lỗi theo BE; có thể bổ sung nếu muốn
  } finally {
    setPwLoading(false);
  }
};

    return (
        <div>
            <Heading title="Thông tin cá nhân" />

            <Row>
                <Form
                    id="formThemNguoiDung"
                    form={form}
                    layout="vertical"
                    onFinish={onCreate}
                >
                    <FormNguoiDung
                        form={form}
                        isEditing={false}
                        isUpdateProfile={true}
                    />
                </Form>
            </Row>
<Row justify="end" key="footer" style={{ gap: 8 }}>
  <Button onClick={openChangePw}>Đổi mật khẩu</Button>
  <Button
    key="submit"
    form="formThemNguoiDung"
    type="primary"
    htmlType="submit"
    size="large"
    loading={isLoading}
  >
    Lưu
  </Button>
</Row>

<Modal
  title="Đổi mật khẩu"
  open={pwOpen}
  onCancel={closeChangePw}
  footer={null}
  maskClosable={false}
  destroyOnClose
>
  <Form
    form={pwForm}
    layout="vertical"
    onFinish={onChangePassword}
  >
    <Form.Item
      name="current_password"
      label="Mật khẩu hiện tại"
      rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}
    >
      <Input.Password placeholder="Nhập mật khẩu hiện tại" />
    </Form.Item>

    <Form.Item
      name="new_password"
      label="Mật khẩu mới"
      rules={[
        { required: true, message: "Vui lòng nhập mật khẩu mới" },
        { min: 8, message: "Mật khẩu mới ít nhất 8 ký tự" },
      ]}
    >
      <Input.Password placeholder="Nhập mật khẩu mới" />
    </Form.Item>

    <Form.Item
      name="confirm_password"
      label="Xác nhận mật khẩu mới"
      dependencies={["new_password"]}
      rules={[
        { required: true, message: "Vui lòng xác nhận mật khẩu" },
        ({ getFieldValue }) => ({
          validator(_, value) {
            if (!value || getFieldValue("new_password") === value) {
              return Promise.resolve();
            }
            return Promise.reject(new Error("Xác nhận mật khẩu không khớp"));
          },
        }),
      ]}
    >
      <Input.Password placeholder="Nhập lại mật khẩu mới" />
    </Form.Item>

    <Row justify="end" style={{ gap: 8 }}>
      <Button onClick={closeChangePw}>Hủy</Button>
      <Button type="primary" htmlType="submit" loading={pwLoading}>
        Đổi mật khẩu
      </Button>
    </Row>
  </Form>
</Modal>

        </div>
    );

    
};

export default Profile;
