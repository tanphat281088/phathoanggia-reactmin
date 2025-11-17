import { PlusOutlined } from "@ant-design/icons";
import { postData } from "../../services/postData.api";
import { useState } from "react";
import { Button, Form, Modal, Row } from "antd";
import FormKhachHang from "./FormKhachHang";
import { useDispatch } from "react-redux";
import { setReload } from "../../redux/slices/main.slice";

const ThemKhachHang = ({ path, title }: { path: string; title: string }) => {
  const dispatch = useDispatch();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();

  const showModal = async () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const onCreate = async (values: any) => {
    setIsLoading(true);
    const closeModel = () => {
      handleCancel();
      dispatch(setReload());
    };

    try {
      // FormKhachHang đã chuẩn: gửi thẳng values (có customer_type, kenh_lien_he, ...)
      await postData(path, values, closeModel);
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
        width={1000}
        onCancel={handleCancel}
        maskClosable={false}
        centered
        footer={[
          <Row justify="end" key="footer">
            <Button
              key="submit"
              form="formKhachHang"
              type="primary"
              htmlType="submit"
              size="large"
              loading={isLoading}
            >
              Lưu
            </Button>
          </Row>,
        ]}
      >
        <Form
          id="formKhachHang"
          form={form}
          layout="vertical"
          onFinish={onCreate}
        >
          <FormKhachHang form={form} />
        </Form>
      </Modal>
    </>
  );
};

export default ThemKhachHang;
