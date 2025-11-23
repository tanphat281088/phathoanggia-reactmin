import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Form, Modal, Row } from "antd";
import { useDispatch } from "react-redux";
import { postData } from "../../services/postData.api";
import { setReload } from "../../redux/slices/main.slice";
import FormGoiDichVuPackage from "./FormGoiDichVuPackage";

const ThemGoiDichVuPackage = ({
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
        form.resetFields();
        // mặc định: Trọn gói
        form.setFieldsValue({ package_mode: 0 });
        setIsModalOpen(true);
    };


    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    const onCreate = async (values: any) => {
        setIsLoading(true);
        console.log("[GoiDV] onCreate package_mode =", values.package_mode, typeof values.package_mode);

        const closeModal = () => {
            handleCancel();
            dispatch(setReload());
        };

        await postData(
            path,
            {
                ...values,
                // items sẽ được gửi nguyên vẹn cho BE
                // trang_thai nếu không gửi -> BE default = 1
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
                width={1000}
                onCancel={handleCancel}
                maskClosable={false}
                centered
                footer={[
                    <Row justify="end" key="footer">
                        <Button
                            key="submit"
                            form="formGoiDichVuPackage"
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
                    id="formGoiDichVuPackage"
                    form={form}
                    layout="vertical"
                    onFinish={onCreate}
                >
                    <FormGoiDichVuPackage form={form} />
                </Form>
            </Modal>
        </>
    );
};

export default ThemGoiDichVuPackage;
