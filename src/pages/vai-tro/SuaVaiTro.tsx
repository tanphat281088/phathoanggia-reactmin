import { EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import FormVaiTro from "./FormVaiTro";
import { Button, Form, Modal } from "antd";
import { useDispatch } from "react-redux";
import {
    getDataById,
    getListPhanQuyenMacDinh,
} from "../../services/getData.api";
import { setReload } from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import type { IPhanQuyen, IVaiTro } from "../../types/main.type";
import { mergeArrays } from "../../helpers/funcHelper";

const SuaVaiTro = ({ path, id }: { path: string; id: number }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vaiTroMacDinh, setVaiTroMacDinh] = useState<IPhanQuyen[]>([]);
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const title = `Sửa Vai trò`;

 const showModal = async () => {
  setIsModalOpen(true);
  setIsLoading(true);
  try {
    // 1) Lấy registry (V1: {success,data:[...]}; V2: {version,items:[...]}; hoặc mảng)
    const reg = await getListPhanQuyenMacDinh();
    // Chuẩn hoá registry -> mảng IPhanQuyen { name, actions:boolean }
    const base = Array.isArray(reg)
      ? reg
      : Array.isArray((reg as any)?.items)
      ? (reg as any).items
      : Array.isArray((reg as any)?.data)
      ? (reg as any).data
      : [];

    const normalized: IPhanQuyen[] = base.map((it: any) => {
      const name = String(it?.name ?? "");
      const actionsObj = it?.actions && typeof it.actions === "object" ? it.actions : {};
      const actions: Record<string, boolean> = Object.fromEntries(
        Object.keys(actionsObj).map((k) => [k, Boolean(actionsObj[k])])
      );
      return { name, actions };
    });

    // 2) Lấy dữ liệu vai trò hiện tại
    const data = await getDataById(id, path);

    // Quyền đang lưu trong DB (có thể rỗng/không phải JSON hợp lệ)
    let saved: IPhanQuyen[] = [];
    try {
      const raw = String(data?.phan_quyen ?? "[]");
      const parsed = JSON.parse(raw);
      saved = Array.isArray(parsed) ? parsed : [];
    } catch {
      saved = [];
    }

    // 3) Merge registry (normalized) với quyền đã lưu (saved)
    const resultArray: IPhanQuyen[] = mergeArrays(normalized, saved);

    // 4) Đổ vào form
    setVaiTroMacDinh(resultArray);

    resultArray.forEach((item: IPhanQuyen) => {
      let allActionsChecked = true;
      Object.entries(item.actions).forEach(([key, value]) => {
        const v = Boolean(value);
        form.setFieldValue([`${item.name}_${key}`], v);
        if (!v) allActionsChecked = false;
      });
      form.setFieldValue(`checkall_${item.name}`, allActionsChecked);
    });

    form.setFieldsValue({ ...data });
  } finally {
    setIsLoading(false);
  }
};


    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    const onUpdate = async (values: IVaiTro) => {
        const phanQuyen: IPhanQuyen[] = Object.entries(values)
            .filter(
                ([key]) =>
                    key.includes("_index") ||
                    key.includes("_create") ||
                    key.includes("_show") ||
                    key.includes("_edit") ||
                    key.includes("_delete") ||
                    key.includes("_export") ||
                    key.includes("_showMenu")
            )
            .reduce((acc: IPhanQuyen[], [key, value]) => {
                const [name, action] = key.split("_");
                const permissionIndex = acc.findIndex(
                    (permission: IPhanQuyen) => permission.name === name
                );
                if (permissionIndex === -1) {
                    acc.push({ name, actions: { [action]: value } });
                } else {
                    acc[permissionIndex].actions[action] = value;
                }
                return acc;
            }, []);
        values = {
            ten_vai_tro: values.ten_vai_tro,
            ma_vai_tro: values.ma_vai_tro,
            phan_quyen: JSON.stringify(phanQuyen),
            trang_thai: values.trang_thai,
        };
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
                title={title}
                icon={<EditOutlined />}
            />
            <Modal
                title={title}
                open={isModalOpen}
                onCancel={handleCancel}
                maskClosable={false}
                loading={isLoading}
                centered
                width={1000}
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
                    <FormVaiTro
                        isEditing
                        form={form}
                        vaiTroMacDinh={vaiTroMacDinh}
                        setVaiTroMacDinh={setVaiTroMacDinh}
                    />
                </Form>
            </Modal>
        </>
    );
};

export default SuaVaiTro;
