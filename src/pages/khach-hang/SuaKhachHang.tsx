import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import FormKhachHang from "./FormKhachHang";
import { Button, Form, Modal } from "antd";
import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { setReload } from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import dayjs from "dayjs";

const SuaKhachHang = ({
  path,
  id,
  title,
}: {
  path: string;
  id: number;
  title: string;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const showModal = async () => {
    setIsModalOpen(true);
    setIsLoading(true);
    try {
      const data = await getDataById(id, path);

      // 🔹 Chuẩn hoá wedding_date -> dayjs cho DatePicker (nếu có)
      const patch: any = { ...data };

      if (patch.wedding_date) {
        const d = dayjs(patch.wedding_date);
        patch.wedding_date = d.isValid() ? d : undefined;
      }

      // customer_type, company_name, ... đã được BE trả về → set thẳng
      form.setFieldsValue({
        ...patch,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  const onUpdate = async (values: any) => {
    setIsSubmitting(true);
    const closeModel = () => {
      handleCancel();
      dispatch(setReload());
    };
    try {
      // Chuẩn hoá wedding_date trước khi gửi lên (DatePicker → string)
      const payload = {
        ...values,
        wedding_date: values?.wedding_date
          ? dayjs(values.wedding_date).format("YYYY-MM-DD")
          : null,
      };

      await putData(path, id, payload, closeModel);
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
        title={`Sửa ${title}`}
        icon={<EditOutlined />}
      />
      <Modal
        title={`Sửa ${title}`}
        open={isModalOpen}
        onCancel={handleCancel}
        maskClosable={false}
        loading={isLoading}
        centered
        width={1000}
        footer={[
          <Button
            key="submit"
            form={`formSuaKhachHang-${id}`}
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
          id={`formSuaKhachHang-${id}`}
          form={form}
          layout="vertical"
          onFinish={onUpdate}
        >
          <FormKhachHang form={form} />
        </Form>
      </Modal>
    </>
  );
};

export default SuaKhachHang;
