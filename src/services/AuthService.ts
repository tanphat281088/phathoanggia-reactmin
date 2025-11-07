import axios from "../configs/axios";
import type {
    ForgotPasswordForm,
    LoginData,
    LoginForm,
    ResetPasswordForm,
    VerifyOTPForm,
    VerifyOTPResponse,
} from "../types/auth.type";
import { handleAxiosError } from "../helpers/axiosHelper";
import type { UserResponse } from "../types/user.type";
import { toast } from "../utils/toast";
import { API_ROUTE_CONFIG } from "../configs/api-route-config";
import type { ApiResponseSuccess } from "../types/index.type";

export const AuthService = {
    login: async (
        payload: LoginForm
    ): Promise<ApiResponseSuccess<LoginData> | undefined> => {
        try {
            const res: ApiResponseSuccess<LoginData> = await axios.post(
                API_ROUTE_CONFIG.LOGIN,
                payload
            );
            if (res.success) {
                toast.success(res.message);
                localStorage.setItem("token", res.data.access_token);
                if (res.data.refresh_token) {
                    localStorage.setItem(
                        "refresh_token",
                        res.data.refresh_token
                    );
                }
                if (res.data.device_id) {
                    localStorage.setItem("device_id", res.data.device_id);
                }
                return res;
            }
        } catch (error) {
            return handleAxiosError(error);
        }
    },
    logout: async (): Promise<ApiResponseSuccess<[]> | undefined> => {
        try {
            const res: ApiResponseSuccess<[]> = await axios.post(
                API_ROUTE_CONFIG.LOGOUT
            );
            if (res.success) {
                toast.success(res.message);
                localStorage.removeItem("token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("device_id");
                return res;
            }
        } catch (error) {
            return handleAxiosError(error);
        }
    },
    fetchUser: async (): Promise<UserResponse | undefined> => {
        try {
            // Interceptor đã "flatten" nên res là payload trực tiếp
            const res: any = await axios.post(API_ROUTE_CONFIG.ME);

            // Trường hợp OK chuẩn
            if (res && (res.success === true || res.code === "OK")) {
                return res.data as UserResponse;
            }

            // Trường hợp interceptor đã suppress 403 và trả success rỗng
            if (res && res.suppressed === true) {
                return { user: null } as unknown as UserResponse;
            }

            // Fallback: nếu BE trả shape {data: ...}
            return (res?.data ?? null) as UserResponse;
        } catch (e: any) {
            const status = e?.response?.status;
            const onProfile =
                typeof window !== "undefined" &&
                window.location.pathname.startsWith("/admin/profile");

            // ✅ NUỐT 403 khi đang ở /admin/profile để không hiện banner/log
            if (status === 403 && onProfile) {
                return { user: null } as unknown as UserResponse;
            }

            // Các lỗi khác giữ nguyên cách xử lý cũ
            return handleAxiosError(e);
        }
    },

    forgotPassword: async (
        payload: ForgotPasswordForm
    ): Promise<ApiResponseSuccess<[]> | undefined> => {
        try {
            const res: ApiResponseSuccess<[]> = await axios.post(
                API_ROUTE_CONFIG.FORGOT_PASSWORD,
                payload
            );
            if (res.success) {
                toast.success(res.message);
                return res;
            }
        } catch (error) {
            return handleAxiosError(error);
        }
    },
    resetPassword: async (
        payload: ResetPasswordForm
    ): Promise<ApiResponseSuccess<[]> | undefined> => {
        try {
            const res: ApiResponseSuccess<[]> = await axios.post(
                API_ROUTE_CONFIG.RESET_PASSWORD,
                payload
            );
            if (res.success) {
                toast.success(res.message);
                return res;
            }
        } catch (error) {
            return handleAxiosError(error);
        }
    },
    verifyOTP: async (
        payload: VerifyOTPForm
    ): Promise<VerifyOTPResponse | undefined> => {
        try {
            const res: VerifyOTPResponse = await axios.post(
                API_ROUTE_CONFIG.VERIFY_OTP,
                payload
            );
            if (res.success) {
                toast.success(res.message);
                if (res?.data?.access_token) {
                    localStorage.setItem("token", res.data.access_token);
                }
                if (res?.data?.refresh_token) {
                    localStorage.setItem(
                        "refresh_token",
                        res?.data?.refresh_token
                    );
                }
                if (res?.data?.device_id) {
                    localStorage.setItem("device_id", res?.data?.device_id);
                }
                return res;
            }
        } catch (error) {
            return handleAxiosError(error);
        }
    },
};
