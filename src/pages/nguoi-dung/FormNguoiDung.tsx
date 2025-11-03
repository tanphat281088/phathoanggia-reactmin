import { gioiTinhSelect, trangThaiSelect } from "../../configs/select-config";
import type { FormInstance } from "antd";
import { Row, Col, Form, Input, DatePicker, Select } from "antd";
import { useState, useEffect } from "react";
import location from "../../utils/location.json";
import type {
  IProvinceItem,
  IDistrictItem,
  ILocationItem,
} from "../../types/main.type";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import ImageUploadSingle from "../../components/upload/ImageUploadSingle";
import SelectFormApi from "../../components/select/SelectFormApi";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

// Nếu muốn tiếp tục dùng patterns cũ, có thể import lại:
// import { passwordPattern, phonePattern } from "../../utils/patterns";

const FormNguoiDung = ({
  isEditing,
  form,
  isUpdateProfile = false,
}: {
  isEditing: boolean;
  form: FormInstance;
  isUpdateProfile?: boolean;
}) => {
  const [provinces, setProvinces] = useState<IProvinceItem[]>([]);
  const [districts, setDistricts] = useState<IDistrictItem[]>([]);
  const [wards, setWards] = useState<ILocationItem[]>([]);
  const [isDisabled, setIsDisabled] = useState(true);

  const { isModalReload } = useSelector((state: RootState) => state.main);

  // Khởi tạo danh sách Tỉnh/Quận/Xã
  useEffect(() => {
    setIsDisabled(true);
    setDistricts([]);
    setWards([]);
    if (location && Array.isArray(location)) {
      setProvinces(location);
      const allDistricts = location.flatMap((province) => province.districts);
      setDistricts(allDistricts);
      const allWards = allDistricts.flatMap((district) => district.wards);
      setWards(allWards);
    }
  }, [isModalReload]);

  const handleProvinceChange = (value: number) => {
    setIsDisabled(false);
    const selectedProvince = provinces.find((p) => p.code === value);
    setDistricts(selectedProvince ? selectedProvince.districts : []);
    setWards([]);
    form.resetFields(["district_id", "ward_id"]);
  };

  const handleDistrictChange = (value: number) => {
    const selectedDistrict = districts.find((d) => d.code === value);
    setWards(selectedDistrict ? selectedDistrict.wards : []);
    form.resetFields(["ward_id"]);
  };

  // ===== Validators an toàn =====
  const phoneRegex = /^(0|\+?84)\d{9,10}$/;

  const passwordValidator = (_: any, value: string) => {
    // Trong case tạo mới (isEditing=false), bắt buộc có password
    if (!isEditing && !isUpdateProfile) {
      if (!value || value.trim().length === 0) {
        return Promise.reject(new Error("Mật khẩu không được bỏ trống!"));
      }
      if (value.length < 8) {
        return Promise.reject(new Error("Mật khẩu tối thiểu 8 ký tự!"));
      }
      // Ít nhất 1 chữ cái & 1 số
      if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
        return Promise.reject(
          new Error("Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số!")
        );
      }
    }
    // Khi sửa (isEditing=true) & không đổi mật khẩu, cho phép bỏ trống
    if ((isEditing || isUpdateProfile) && (!value || value.trim() === "")) {
      return Promise.resolve();
    }
    // Nếu có nhập khi sửa thì áp lại rule như trên
    if (value && value.length < 8) {
      return Promise.reject(new Error("Mật khẩu tối thiểu 8 ký tự!"));
    }
    if (value && (!/[A-Za-z]/.test(value) || !/\d/.test(value))) {
      return Promise.reject(
        new Error("Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số!")
      );
    }
    return Promise.resolve();
  };

  return (
    <Row gutter={[10, 10]}>
      {/* Ảnh đại diện (Upload) */}
      <Col span={8} xs={24} lg={8}>
        <Form.Item name="avatar" label="Ảnh đại diện">
          <ImageUploadSingle />
        </Form.Item>
      </Col>

      {/* Vai trò */}
      <Col span={16} xs={24} lg={16}>
        <SelectFormApi
          name="ma_vai_tro"
          label="Vai trò"
          rules={[{ required: true, message: "Vai trò không được bỏ trống!" }]}
          path={API_ROUTE_CONFIG.VAI_TRO_OPTIONS}
          placeholder="Chọn vai trò"
          disabled={isUpdateProfile}
        />
      </Col>

      {/* Họ tên */}
      <Col span={8} xs={24} lg={8}>
        <Form.Item
          name="name"
          label="Họ và tên"
          rules={[{ required: true, message: "Họ và tên không được bỏ trống!" }]}
        >
          <Input placeholder="Nhập họ và tên" autoComplete="name" />
        </Form.Item>
      </Col>

      {/* Email */}
      <Col span={8} xs={24} lg={8}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { type: "email", message: "Vui lòng nhập đúng định dạng email" },
            { required: true, message: "Email không được bỏ trống!" },
          ]}
        >
          <Input
            placeholder="Nhập email"
            disabled={isUpdateProfile || isEditing}
            type="email"
            autoComplete="email"
            inputMode="email"
          />
        </Form.Item>
      </Col>

      {/* Số điện thoại */}
      <Col span={8} xs={24} lg={8}>
        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[
            { required: true, message: "Số điện thoại không được bỏ trống!" },
            {
              validator: (_, v) => {
                if (!v || phoneRegex.test(String(v).trim())) return Promise.resolve();
                return Promise.reject(new Error("Số điện thoại không hợp lệ!"));
              },
            },
          ]}
        >
          <Input
            placeholder="Nhập số điện thoại"
            inputMode="tel"
            autoComplete="tel"
          />
        </Form.Item>
      </Col>

      {/* Mật khẩu + Xác nhận (chỉ khi tạo mới / không phải update profile) */}
      {!isEditing && !isUpdateProfile ? (
        <>
          <Col span={8} xs={24} lg={8}>
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ validator: passwordValidator }]}
              hasFeedback
            >
              <Input.Password
                placeholder="Nhập mật khẩu"
                autoComplete="new-password"
              />
            </Form.Item>
          </Col>

          <Col span={8} xs={24} lg={8}>
            <Form.Item
              name="confirm_password"
              label="Xác nhận mật khẩu"
              dependencies={["password"]}
              rules={[
                { validator: passwordValidator },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const pw = getFieldValue("password");
                    if (!pw && !value) return Promise.resolve(); // cả 2 trống trong edit/profile đã xử lý trên
                    if (pw === value) return Promise.resolve();
                    return Promise.reject(new Error("Hai mật khẩu không khớp!"));
                  },
                }),
              ]}
              hasFeedback
            >
              <Input.Password
                placeholder="Nhập xác nhận mật khẩu"
                autoComplete="new-password"
              />
            </Form.Item>
          </Col>
        </>
      ) : null}

      {/* Ngày sinh */}
      <Col span={8} xs={24} lg={8}>
        <Form.Item
          name="birthday"
          label="Ngày sinh"
          rules={[{ required: true, message: "Ngày sinh không được bỏ trống" }]}
        >
          <DatePicker
            placeholder="Chọn ngày sinh"
            format={"DD/MM/YYYY"}
            style={{ width: "100%" }}
            inputReadOnly
            autoComplete="bday"
          />
        </Form.Item>
      </Col>

      {/* Giới tính */}
      <Col span={8} xs={24} lg={8}>
        <Form.Item
          name="gender"
          label="Giới tính"
          rules={[{ required: true, message: "Giới tính không được bỏ trống" }]}
        >
          <Select options={gioiTinhSelect} placeholder="Chọn giới tính" />
        </Form.Item>
      </Col>

      {/* Tỉnh/Thành - Quận/Huyện - Xã/Phường */}
      <Col span={8} xs={24} lg={8}>
        <Form.Item
          name="province_id"
          label="Tỉnh/Thành phố"
          rules={[{ required: true, message: "Tỉnh/Thành phố không được bỏ trống!" }]}
        >
          <Select
            placeholder="Chọn tỉnh/thành phố"
            onChange={handleProvinceChange}
            options={provinces.map((province) => ({
              label: province.name,
              value: province.code,
            }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
      </Col>

      <Col span={8} xs={24} lg={8}>
        <Form.Item
          name="district_id"
          label="Quận/Huyện"
          rules={[{ required: true, message: "Quận/Huyện không được bỏ trống!" }]}
        >
          <Select
            placeholder="Chọn quận/huyện"
            onChange={handleDistrictChange}
            options={districts.map((district) => ({
              label: district.name,
              value: district.code,
            }))}
            disabled={isDisabled}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
      </Col>

      <Col span={8} xs={24} lg={8}>
        <Form.Item
          name="ward_id"
          label="Xã/Phường"
          rules={[{ required: true, message: "Xã/Phường không được bỏ trống!" }]}
        >
          <Select
            placeholder="Chọn xã/phường"
            options={wards.map((ward) => ({
              label: ward.name,
              value: ward.code,
            }))}
            disabled={isDisabled}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
      </Col>

      {/* Địa chỉ */}
      <Col span={24} xs={24} lg={24}>
        <Form.Item
          name="address"
          label="Địa chỉ"
          rules={[{ required: true, message: "Địa chỉ không được bỏ trống!" }]}
        >
          <Input.TextArea
            placeholder="Nhập số nhà, đường"
            autoComplete="street-address"
          />
        </Form.Item>
      </Col>

      {/* Trạng thái */}
      {!isUpdateProfile && (
        <Col span={24} xs={24} lg={24}>
          <Form.Item name="status" label="Trạng thái" initialValue={1}>
            <Select options={trangThaiSelect} />
          </Form.Item>
        </Col>
      )}
    </Row>
  );
};

export default FormNguoiDung;
