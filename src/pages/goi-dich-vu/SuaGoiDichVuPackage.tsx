import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Button, Form, Modal, Spin } from "antd";
import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { putData } from "../../services/updateData";
import { setReload } from "../../redux/slices/main.slice";
import FormGoiDichVuPackage from "./FormGoiDichVuPackage";

const SuaGoiDichVuPackage = ({
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
            const data: any = await getDataById(id, path);

            const rawItems: any[] = Array.isArray(data.items) ? data.items : [];

            const mappedItems = rawItems.map((it: any) => {
                const sanPham = it.san_pham || it.sanPham || {};
                return {
                    danh_muc_id: sanPham.danh_muc_id ?? null,
                    san_pham_id: it.san_pham_id ?? sanPham.id ?? null,
                    so_luong: it.so_luong ?? 0,
                    ghi_chu: it.ghi_chu ?? "",
                };
            });

            // Ép package_mode về 0|1 (kể cả khi BE trả string "0"/"1")
            const pkgMode =
                data?.package_mode !== undefined && data?.package_mode !== null
                    ? Number(data.package_mode)
                    : 0;

            form.setFieldsValue({
                ...data,
                package_mode: pkgMode,
                items: mappedItems,
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
console.log("[GoiDV] onUpdate package_mode =", values.package_mode, typeof values.package_mode);
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
                width={1000}
                destroyOnClose
                footer={[
                    <Button
                        key="submit"
                        form={`formSuaGoiDichVuPackage-${id}`}
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
                        id={`formSuaGoiDichVuPackage-${id}`}
                        form={form}
                        layout="vertical"
                        onFinish={onUpdate}
                    >
                        <FormGoiDichVuPackage form={form} />
                    </Form>
                </Spin>
            </Modal>
        </>
    );
};

export default SuaGoiDichVuPackage;
