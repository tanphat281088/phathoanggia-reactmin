import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Form, Modal, Spin } from "antd";
import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { putData } from "../../services/updateData";
import { setReload } from "../../redux/slices/main.slice";
import FormGoiDichVuGroup from "./FormGoiDichVuGroup";

const SuaGoiDichVuGroup = ({
    path,
    id,
    title,
}: {
    path: string;
    id: number;
    title: string;
}) => {
    const dispatch = useDispatch();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form] = Form.useForm();

    const showModal = async () => {
        setIsModalOpen(true);
        setIsLoading(true);

        try {
            const data = await getDataById(id, path);

            // set toàn bộ field từ BE
            form.setFieldsValue({
                ...data,
            });
        } catch (e) {
            // axios helper sẽ tự toast lỗi
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

        await putData(path, id, { ...values }, closeModal);

        setIsSubmitting(false);
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
                centered
                width={800}
                destroyOnClose
                footer={[
                    <Button
                        key="submit"
                        form={`formSuaGoiDichVuGroup-${id}`}
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={isSubmitting}
                    >
                        Lưu
                    </Button>,
                ]}
            >
                <Spin spinning={isLoading}>
                    <Form
                        id={`formSuaGoiDichVuGroup-${id}`}
                        form={form}
                        layout="vertical"
                        onFinish={onUpdate}
                    >
                        <FormGoiDichVuGroup form={form} />
                    </Form>
                </Spin>
            </Modal>
        </>
    );
};

export default SuaGoiDichVuGroup;
