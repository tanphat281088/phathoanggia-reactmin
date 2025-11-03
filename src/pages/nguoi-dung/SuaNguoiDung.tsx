import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import FormNguoiDung from "./FormNguoiDung";
import dayjs from "dayjs";
import { Button, Form, Modal, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { getDataById } from "../../services/getData.api";
import {
  clearImageSingle,
  setImageSingle,
  setModalReload,
  setReload,
} from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import type { INguoiDungFormValues } from "../../types/user.type";
import type { RootState } from "../../redux/store";

const SuaNguoiDung = ({ path, id }: { path: string; id: number }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const title = `Sửa Người dùng`;

  const { imageSingle } = useSelector((state: RootState) => state.main);

  const showModal = async () => {
    setIsModalOpen(true);
    dispatch(setModalReload());
    setIsLoading(true);
    try {
      // Tải dữ liệu chi tiết
      const data: any = await getDataById(id, path);
      if (!data) {
        throw new Error("Không tải được dữ liệu người dùng.");
      }

      // Chuẩn hoá ngày sinh (nếu có)
      if (data.birthday) {
        // hỗ trợ cả "YYYY-MM-DD" hoặc ISO
        const d = dayjs(data.birthday);
        data.birthday = d.isValid() ? d : undefined;
      }

      // Lấy avatar an toàn
      const avatar =
        (Array.isArray(data?.images) && data.images.length > 0 && data.images[0]?.path)
          ? String(data.images[0].path)
          : (typeof data?.image === "string" ? data.image : null);

      // Set ảnh đại diện vào redux (Upload dùng)
      dispatch(setImageSingle(avatar));

      // Ép kiểu số cho các id nếu có
      const province_id = data?.province_id != null ? Number(data.province_id) : undefined;
      const district_id = data?.district_id != null ? Number(data.district_id) : undefined;
      const ward_id     = data?.ward_id != null ? Number(data.ward_id) : undefined;

      // Đổ form – KHÔNG truy cập images[0].path trực tiếp
      form.setFieldsValue({
        ...data,
        province_id,
        district_id,
        ward_id,
        image: avatar ?? undefined,
      });
    } catch (err: any) {
      message.error(err?.message || "Không mở được form Sửa người dùng.");
      // Đóng modal để tránh treo skeleton
      setIsModalOpen(false);
      dispatch(clearImageSingle());
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    dispatch(setModalReload());
    dispatch(clearImageSingle());
  };

  const onUpdate = async (values: INguoiDungFormValues) => {
    setIsSubmitting(true);
    try {
      const closeModel = () => {
        handleCancel();
        dispatch(setReload());
      };

      // Chuẩn hoá birthday
      const birthday =
        values?.birthday ? dayjs(values.birthday).format("YYYY-MM-DD") : undefined;

      await putData(
        path,
        id,
        {
          ...values,
          birthday,
          image: imageSingle ?? null, // gửi URL ảnh phẳng; BE sẽ tự update
        },
        closeModel
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={showModal}
        type="primary"
        size="small"
        title={title}
        icon={<EditOutlined />}
      />
      <Modal
        title={title}
        open={isModalOpen}
        onCancel={handleCancel}
        maskClosable={false}
        centered
        width={1000}
        confirmLoading={isLoading}
        footer={[
          <Button
            key="submit"
            form={`formSuaNguoiDung-${id}`}
            type="primary"
            htmlType="submit"
            size="large"
            loading={isSubmitting}
          >
            Lưu
          </Button>,
        ]}
      >
        <Form
          id={`formSuaNguoiDung-${id}`}
          form={form}
          layout="vertical"
          onFinish={onUpdate}
        >
          <FormNguoiDung isEditing form={form} />
        </Form>
      </Modal>
    </>
  );
};

export default SuaNguoiDung;
