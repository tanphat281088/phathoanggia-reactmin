import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Form, Modal, Row } from "antd";
import { useDispatch } from "react-redux";
import { postData } from "../../services/postData.api";
import { setReload } from "../../redux/slices/main.slice";
import FormGoiDichVuGroup from "./FormGoiDichVuGroup";

const ThemGoiDichVuGroup = ({
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

    const showModal = () => {
        // Mỗi lần mở: reset form
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    const onCreate = async (values: any) => {
        setIsLoading(true);

        const closeModal = () => {
            handleCancel();
            dispatch(setReload());
        };

        await postData(
            path,
            {
                ...values,
                // nếu không chọn trạng thái thì BE sẽ default = 1
            },
            closeModal
        );

        setIsLoading(false);
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
                width={800}
                onCancel={handleCancel}
                maskClosable={false}
                centered
                footer={[
                    <Row justify="end" key="footer">
                        <Button
                            key="submit"
                            form="formGoiDichVuGroup"
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
                    id="formGoiDichVuGroup"
                    form={form}
                    layout="vertical"
                    onFinish={onCreate}
                >
                    <FormGoiDichVuGroup form={form} />
                </Form>
            </Modal>
        </>
    );
};

export default ThemGoiDichVuGroup;
