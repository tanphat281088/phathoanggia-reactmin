/* eslint-disable @typescript-eslint/no-explicit-any */
import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Form, Modal } from "antd";
import { useDispatch } from "react-redux";

import { getDataById } from "../../services/getData.api";
import { putData } from "../../services/updateData";
import { setReload } from "../../redux/slices/main.slice";

import FormQuanLyChiPhi from "./FormQuanLyChiPhi";

type Props = {
  path: string;
  id: number;
  title: string;
};

const SuaQuanLyChiPhiThucTe = ({ path, id, title }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const showModal = async () => {
    setIsModalOpen(true);
    setIsLoading(true);

    try {
      const data: any = await getDataById(id, path); // path = "/quan-ly-chi-phi/thuc-te"

      const cost = data?.data ?? data ?? {};
      const donHang = cost.don_hang ?? cost.donHang ?? null;
      const items = Array.isArray(cost.items) ? cost.items : [];

      form.setFieldsValue({
        ...cost,
        don_hang: donHang,
        items,
      });
    } catch (_e) {
      setIsModalOpen(false);
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

    const closeModal = () => {
      handleCancel();
      dispatch(setReload());
    };

    try {
      await putData(path, id, values, closeModal);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={showModal}
        type="link"
        size="small"
        title={`Sửa ${title}`}
        icon={<EditOutlined />}
      />

      <Modal
        title={`Sửa ${title} (Thực tế)`}
        open={isModalOpen}
        onCancel={handleCancel}
        maskClosable={false}
        centered
        width={1100}
        footer={null}
        confirmLoading={isLoading}
      >
        <Form form={form} layout="vertical" onFinish={onUpdate}>
          <FormQuanLyChiPhi form={form} isDetail={false} mode="thuc-te" />

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <Button onClick={handleCancel}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              Lưu chi phí thực tế
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default SuaQuanLyChiPhiThucTe;
