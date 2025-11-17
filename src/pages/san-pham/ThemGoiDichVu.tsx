import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Form, Modal, Row } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { postData } from "../../services/postData.api";
import FormGoiDichVu from "./FormGoiDichVu";
import {
    clearImageSingle,
    setReload,
} from "../../redux/slices/main.slice";
import type { RootState } from "../../redux/store";

const ThemGoiDichVu = ({
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

    const { imageSingle } = useSelector((state: RootState) => state.main);

    const showModal = () => {
        // Mỗi lần mở form gói mới: reset tất cả + xoá ảnh cũ
        form.resetFields();
        dispatch(clearImageSingle());
        // set mặc định is_package = 1 (gói dịch vụ)
        form.setFieldsValue({ is_package: 1 });
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
        dispatch(clearImageSingle());
    };

    const onCreate = async (values: any) => {
        setIsLoading(true);

        const closeModel = () => {
            handleCancel();
            dispatch(setReload());
        };

        await postData(
            path,
            {
                ...values,
                // đảm bảo is_package = 1
                is_package: 1,
                // ảnh nếu có
                image: imageSingle || undefined,
            },
            closeModel
        );

        setIsLoading(false);
    };

    return (
        <>
            <Button
                onClick={showModal}
                type="default"
                title={`Thêm gói dịch vụ`}
                icon={<PlusOutlined />}
            >
                Thêm gói dịch vụ
            </Button>
            <Modal
                title={`Thêm gói dịch vụ`}
                open={isModalOpen}
                width={1000}
                onCancel={handleCancel}
                maskClosable={false}
                centered
                footer={[
                    <Row justify="end" key="footer">
                        <Button
                            key="submit"
                            form="formGoiDichVu"
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
                    id="formGoiDichVu"
                    form={form}
                    layout="vertical"
                    onFinish={onCreate}
                >
                    <FormGoiDichVu form={form} />
                </Form>
            </Modal>
        </>
    );
};

export default ThemGoiDichVu;
