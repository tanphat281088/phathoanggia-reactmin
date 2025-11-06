import { EyeOutlined } from "@ant-design/icons";
import { useState } from "react";
import FormPhieuChi from "./FormPhieuChi";
import { Button, Form, Modal } from "antd";
import { useDispatch } from "react-redux";
import { getDataById } from "../../services/getData.api";
import { setReload } from "../../redux/slices/main.slice";
import { putData } from "../../services/updateData";
import dayjs from "dayjs";

import { EditOutlined } from "@ant-design/icons";

import axios from "../../configs/axios";



const ChiTietPhieuChi = ({
    path,
    id,
    title,
    editable = false,   // NEW: cho phép bật chế độ sửa
}: {
    path: string;
    id: number;
    title: string;
    editable?: boolean;
}) => {

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form] = Form.useForm();

    const formId = editable ? `formSuaPhieuChi-${id}` : `formXemPhieuChi-${id}`;

    const dispatch = useDispatch();

    const [chiTietPhieuChi, setChiTietPhieuChi] = useState<any>([]);

    const normalizeDates = (obj: Record<string, any>) => {
        Object.keys(obj).forEach((key) => {
            if (obj[key]) {
                if (
                    /ngay_|_ngay/.test(key) ||
                    /ngay/.test(key) ||
                    /thoi_gian|_thoi/.test(key) ||
                    /birthday/.test(key)
                ) {
                    obj[key] = (typeof obj[key] === "string" && obj[key].includes("T"))
  ? dayjs(obj[key])                       // ISO datetime
  : dayjs(obj[key], "YYYY-MM-DD");        // yyyy-mm-dd

                }
            }
        });
        return obj;
    };

    const inferCategoryParentCode = (data: any) => {
        // Nếu API chưa trả category_parent_code mà có category_id,
        // ta gợi ý CHA theo Mức A để Select danh mục con còn có dữ liệu hiển thị.
        if (!data?.category_parent_code && data?.category_id) {
            if (data?.loai_phieu_chi === 1 || data?.loai_phieu_chi === 2 || data?.loai_phieu_chi === 4) {
                data.category_parent_code = "COGS"; // chi NVL trực tiếp
            }
            // Loại 3 (Chi khác): không suy đoán để tránh sai — user đã chọn ở lúc tạo.
        }
        return data;
    };

    const showModal = async () => {
        setIsModalOpen(true);
        setIsLoading(true);

      const resp = await getDataById(id, path);             // resp có thể là {success, data:{...}} hoặc {...}
const data = resp?.data ?? resp?.item ?? resp ?? {};  // ✅ unwrap .data nếu có, còn không thì dùng resp


        // ÉP KIỂU số cho các field select/number (API có thể trả string)
// ÉP KIỂU số cho Select/InputNumber
const coerced = {
  ...data,
  loai_phieu_chi: data?.loai_phieu_chi != null ? Number(data.loai_phieu_chi) : undefined,
  phuong_thuc_thanh_toan: data?.phuong_thuc_thanh_toan != null ? Number(data.phuong_thuc_thanh_toan) : undefined,
  category_id: data?.category_id != null ? Number(data.category_id) : undefined,
  so_tien: data?.so_tien != null ? Number(data.so_tien) : 0,
};


// Nếu thiếu category_parent_code mà đã có category_id → suy ra CHA từ /expense-categories/tree
if (!coerced?.category_parent_code && coerced?.category_id) {
  try {
    const res = await axios.get("/expense-categories/tree");
    const parents: any[] = res?.data?.data ?? [];
    let parentCode: string | undefined;
    parents.forEach((p: any) => {
      (p.children || []).forEach((c: any) => {
        if (Number(c.id) === Number(coerced.category_id)) parentCode = p.code;
      });
    });
    if (parentCode) coerced.category_parent_code = parentCode;
  } catch { /* ignore */ }
}
const normalized = normalizeDates({ ...coerced });
const withParent = inferCategoryParentCode(normalized);

        form.setFieldsValue({
            ...withParent,
        });

        setIsLoading(false);

        if (withParent.loai_phieu_chi == 2 || withParent.loai_phieu_chi == 4) {
            setChiTietPhieuChi(withParent.chi_tiet_phieu_chi);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setIsModalOpen(false);
    };

const onUpdate = async (values: any) => {
  if (!editable) return; // an toàn: chế độ xem không submit
  setIsSubmitting(true);
  const payload = {
    ...values,
    ngay_chi: values?.ngay_chi ? dayjs(values.ngay_chi).format("YYYY-MM-DD") : undefined,
  };
  const closeModel = () => {
    handleCancel();
    dispatch(setReload());
  };
  await putData(path, id, payload, closeModel);
  setIsSubmitting(false);
};


   return (
  <>
    <Button
      onClick={showModal}
      type={editable ? "primary" : "default"}
      size="small"
      title={editable ? `Sửa ${title}` : `Chi tiết ${title}`}
      icon={editable ? <EditOutlined /> : <EyeOutlined />}
    />
    <Modal
      title={editable ? `Sửa ${title}` : `Chi tiết ${title}`}
      open={isModalOpen}
      onCancel={handleCancel}
      maskClosable={false}
      centered
      width={1000}
      loading={isLoading}
      footer={
        editable
          ? [
              <Button
                key="submit"
                 form={formId}          
                type="primary"
                htmlType="submit"
                size="large"
                loading={isSubmitting}
              >
                Lưu
              </Button>,
            ]
          : null
      }
    >
      <Form
        id={formId}  
         form={form}   
        layout="vertical"
        onFinish={onUpdate}
      >
        <FormPhieuChi
          form={form}
          isDetail={!editable}
          chiTietPhieuChi={chiTietPhieuChi}
        />
      </Form>
    </Modal>
  </>
);

};

export default ChiTietPhieuChi;
