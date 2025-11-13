export interface ICauHinhChung {
    SO_LAN_DANG_NHAP_SAI_TOI_DA: number;
    THOI_GIAN_KHOA_TAI_KHOAN: number;
    XAC_THUC_2_YEU_TO: boolean;
    THOI_GIAN_HET_HAN_OTP: number;
    THOI_HAN_XAC_THUC_LAI_THIET_BI: number;
    CHECK_THOI_GIAN_LAM_VIEC: boolean;
}

export interface IThoiGianLamViec {
    id?: number;
    thu: string;
    gio_bat_dau: string;
    gio_ket_thuc: string;
    ghi_chu?: string;
    ten_nguoi_tao?: string;
    ten_nguoi_cap_nhat?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ILocationItem {
    name: string;
    code: number;
    codename: string;
    division_type: string;
    short_codename?: string;
}

export interface IDistrictItem extends ILocationItem {
    wards: ILocationItem[];
}

export interface IProvinceItem extends ILocationItem {
    districts: IDistrictItem[];
}

export interface IImage {
    id: number;
    path: string;
}

export interface IVaiTro {
    id?: number;
    ma_vai_tro: string;
    ten_vai_tro: string;
    phan_quyen: string;
    trang_thai: number;
}

export interface IPhanQuyen {
    name: string;
    actions: IActions;
}

export interface Actions {
    index: boolean;
    create: boolean;
    show: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
    showMenu: boolean;
}

export interface IActions {
    [key: string]: boolean;
}

export interface ILoaiKhachHang {
    id?: number;
    ten_loai_khach_hang: string;
    nguong_doanh_thu: number;   // Ngưỡng doanh thu (VNĐ)
    gia_tri_uu_dai: number;     // Giá trị ưu đãi (VNĐ) - anh nhập
    nguong_diem?: number;       // Ngưỡng điểm - backend tự tính, nên optional
    mo_ta?: string;
    trang_thai: number;
}
