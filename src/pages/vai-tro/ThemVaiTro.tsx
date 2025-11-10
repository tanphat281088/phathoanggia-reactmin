import { PlusOutlined } from "@ant-design/icons";
import { postData } from "../../services/postData.api";
import { useState } from "react";
import { Button, Form, Modal, Row } from "antd";
import FormVaiTro from "./FormVaiTro";
import { useDispatch } from "react-redux";
import { setReload } from "../../redux/slices/main.slice";
import type { IPhanQuyen, IVaiTro } from "../../types/main.type";
import { getListPhanQuyenMacDinh } from "../../services/getData.api";

const ThemVaiTro = ({ path }: { path: string }) => {
    const dispatch = useDispatch();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [vaiTroMacDinh, setVaiTroMacDinh] = useState<IPhanQuyen[]>([]);
    const [form] = Form.useForm();
    const title = `Thêm Vai trò`;

  const showModal = async () => {
  setIsModalOpen(true);

  // Lấy registry (V1: {success,data:[...]}, V2: {version,items:[...]}, hoặc mảng)
  const reg = await getListPhanQuyenMacDinh();

  // Chuẩn hoá về mảng IPhanQuyen[]
  const base = Array.isArray(reg) ? reg : (Array.isArray((reg as any)?.items) ? (reg as any).items : (Array.isArray((reg as any)?.data) ? (reg as any).data : []));
  const normalized: IPhanQuyen[] = base.map((it: any) => {
    const name = String(it?.name ?? "");
    const actionsObj = it?.actions && typeof it.actions === "object" ? it.actions : {};
    const actions: Record<string, boolean> = Object.fromEntries(
      Object.keys(actionsObj).map((k) => [k, Boolean(actionsObj[k])])
    );
    return { name, actions };
  });

  setVaiTroMacDinh(normalized);

  // === Set giá trị cho TẤT CẢ checkbox theo registry (rất quan trọng) ===
normalized.forEach((item: IPhanQuyen) => {
  Object.entries(item.actions || {}).forEach(([key, value]) => {
    form.setFieldValue(`${item.name}_${key}`, Boolean(value));
  });
});

// Giữ lại logic "Tất cả"
normalized.forEach((item: IPhanQuyen) => {
  const allOn = Object.values(item.actions).every((v) => v === true);
  form.setFieldValue(`checkall_${item.name}`, allOn);
});


  // Set trạng thái "Tất cả" cho từng module
  normalized.forEach((item: IPhanQuyen) => {
    const allOn = Object.values(item.actions).every((v) => v === true);
    form.setFieldValue(`checkall_${item.name}`, allOn);
  });
};


    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

const onCreate = async (values: IVaiTro) => {
  // Lấy snapshot quyền THEO KEYS ĐỘNG từ registry đang hiển thị
  const phanQuyenFull: IPhanQuyen[] = vaiTroMacDinh.map((item: IPhanQuyen) => {
    const actions: Record<string, boolean> = {};
    Object.keys(item.actions || {}).forEach((k) => {
      actions[k] = Boolean(form.getFieldValue(`${item.name}_${k}`));
    });
    return { name: item.name, actions };
  });

  // Bỏ module mà tất cả action đều false
  const phanQuyen = phanQuyenFull.filter((it) =>
    Object.values(it.actions).some(Boolean)
  );

  const payload: IVaiTro = {
    ten_vai_tro: values.ten_vai_tro,
    ma_vai_tro: values.ma_vai_tro,
    phan_quyen: JSON.stringify(phanQuyen),
    trang_thai: values.trang_thai ?? 1,
  };

  setIsLoading(true);
  const closeModel = () => {
    handleCancel();
    dispatch(setReload());
  };
  await postData(path, payload, closeModel);
  setIsLoading(false);
};


    return (
        <>
            <Button
                onClick={showModal}
                type="primary"
                title={title}
                icon={<PlusOutlined />}
            >
                {title}
            </Button>
            <Modal
                title={title}
                open={isModalOpen}
                width={1000}
                onCancel={handleCancel}
                maskClosable={false}
                centered
                footer={[
                    <Row justify="end" key="footer">
                        <Button
                            key="submit"
                            form="formThemNguoiDung"
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
                    id="formThemNguoiDung"
                    form={form}
                    layout="vertical"
                    onFinish={onCreate}
                >
                    <FormVaiTro
                        form={form}
                        isEditing={false}
                        vaiTroMacDinh={vaiTroMacDinh}
                        setVaiTroMacDinh={setVaiTroMacDinh}
                    />
                </Form>
            </Modal>
        </>
    );
};

export default ThemVaiTro;
