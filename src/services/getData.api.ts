/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiResponseSuccess } from "../types/index.type";
import axios from "../configs/axios";
import { handleAxiosError } from "../helpers/axiosHelper";
import { toast } from "../utils/toast";
import { API_ROUTE_CONFIG } from "../configs/api-route-config";

export const getDataById = async (id: number | undefined, path: string) => {
  try {
    if (id === undefined) {
      return;
    }
    const resp: ApiResponseSuccess<any> = await axios.get(`${path}/${id}`);
    if ((resp as any)?.success) {
      return (resp as any).data;
    }
    // nếu interceptor không unwrap -> AxiosResponse
    const payload = (resp as any)?.data ?? resp;
    if (payload?.success) return payload.data;
  } catch (error: any) {
    handleAxiosError(error);
  }
};

export const getDataSelect = async (path: string, params: any = {}) => {
  try {
    const resp: any = await axios.get(path, { params });

    // Interceptor có thể đã unwrap; nếu không thì payload = resp.data
    const payload = resp?.data ?? resp;

    // ✅ NEW: nếu server trả VÔ HƯỚNG (number/string) => trả thẳng (dùng cho get-gia-ban-san-pham)
    if (typeof payload === "number" || typeof payload === "string") {
      return payload;
    }

    // MẢNG THUẦN [{value,label}] hoặc [{id,name}]
    if (Array.isArray(payload)) return payload;

    // Chuẩn CustomResponse { success, data }
    if (payload?.success) {
      if (Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(payload.data?.collection)) return payload.data.collection;
      return payload.data ?? [];
    }

    // Một số API trả { collection: [...] }
    if (Array.isArray(payload?.collection)) return payload.collection;

    // Không khớp định dạng — trả mảng rỗng (không toast lỗi dropdown)
    return [];
  } catch (error: any) {
    // Không ném lỗi để tránh toast "unexpected" khi người dùng đang gõ search
    handleAxiosError(error);
    return [];
  }
};

export const getListData = async (path: string, params: any = {}) => {
  try {
    const resp: ApiResponseSuccess<any> = await axios.get(path, { params });
    if ((resp as any)?.success) {
      if ((resp as any).data?.collection) {
        return {
          data: (resp as any).data.collection,
          total: (resp as any).data.total,
        };
      } else {
        return (resp as any).data;
      }
    } else {
      // nếu interceptor không unwrap
      const payload = (resp as any)?.data ?? resp;
      if (payload?.success) {
        if (payload.data?.collection) {
          return { data: payload.data.collection, total: payload.data.total };
        }
        return payload.data;
      }
      toast.error((payload && payload.message) || "Có lỗi xảy ra");
    }
  } catch (error: any) {
    handleAxiosError(error);
  }
};

/**
 * Luôn trả về mảng [{ name, actions:boolean }] từ endpoint /danh-sach-phan-quyen
 * Hỗ trợ:
 *  - V1: { success:true, data:[ ... ] }
 *  - V2: { version:'v2', items:[ ... ] }
 *  - Trả trực tiếp mảng
 */
export const getListPhanQuyenMacDinh = async () => {
  try {
    const resp: ApiResponseSuccess<any> = await axios.get(
      API_ROUTE_CONFIG.DANH_SACH_PHAN_QUYEN
    );

    // Interceptor có thể đã flatten; nếu không => dùng .data
    const payload: any = (resp as any)?.data ?? resp;

    // Ưu tiên V2.items -> V1.data -> bản thân payload nếu đã là mảng
    const rawArray =
      Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data)
        ? payload.data
        : [];

    // Chuẩn hoá về IPhanQuyen[]: ép mọi action về boolean
    const normalized = rawArray.map((it: any) => {
      const name = String(it?.name ?? "");
      const actionsObj = it?.actions && typeof it.actions === "object" ? it.actions : {};
      const actions = Object.fromEntries(
        Object.keys(actionsObj).map((k) => [k, !!actionsObj[k]])
      );
      return { name, actions };
    });

    return normalized;
  } catch (error: any) {
    handleAxiosError(error);
    return []; // an toàn cho FE (không crash .map)
  }
};
