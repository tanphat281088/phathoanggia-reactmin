import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import FormDanhMucSanPham from "./FormDanhMucSanPham";
import { Button, Form, Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { getDataById } from "../../services/getData.api";
import {
    clearImageSingle,
    setImageSingle,
    setReload,
} from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import type { RootState } from "../../redux/store";

const SuaDanhMucSanPham = ({
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

    const { imageSingle } = useSelector((state: RootState) => state.main);

    const dispatch = useDispatch();

    const showModal = async () => {
        setIsModalOpen(true);
        setIsLoading(true);

        const data = await getDataById(id, path);

        // ✅ AN TOÀN HƠN: chỉ set imageSingle nếu có ảnh
        const firstImage =
            data?.images && Array.isArray(data.images) && data.images.length > 0
                ? data.images[0].path
                : null;

        if (firstImage) {
            dispatch(setImageSingle(firstImage));
        } else {
            dispatch(clearImageSingle());
        }

        form.setFieldsValue({
            ...data,
        });

        setIsLoading(false);
    };

    const handleCancel = () => {
        form.resetFields();
        setIsModalOpen(false);
        dispatch(clearImageSingle());
    };

    const onUpdate = async (values: any) => {
        setIsSubmitting(true);
        const closeModel = () => {
            handleCancel();
            dispatch(setReload());
        };

        await putData(
            path,
            id,
            {
                ...values,
                // ✅ Nếu không có ảnh mới, gửi undefined để BE tự xử lý
                image: imageSingle || undefined,
            },
            closeModel
        );

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
                loading={isLoading}
                centered
                width={1000}
                footer={[
                    <Button
                        key="submit"
                        form={`formSuaDanhMucSanPham-${id}`}
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
                    id={`formSuaDanhMucSanPham-${id}`}
                    form={form}
                    layout="vertical"
                    onFinish={onUpdate}
                >
                    <FormDanhMucSanPham form={form} />
                </Form>
            </Modal>
        </>
    );
};

export default SuaDanhMucSanPham;
