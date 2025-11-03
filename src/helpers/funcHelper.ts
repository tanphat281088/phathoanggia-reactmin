/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from "dayjs";
// import location from "../configs/location.json";

export const limitText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength) + "...";
};

export const formatTime = (time: string) => {
    return time ? dayjs(time, "HH:mm").format("HH:mm") : null;
};

export const formatDate = (date: string) => {
    return date ? dayjs(date, "YYYY-MM-DD").format("YYYY-MM-DD") : null;
};

export const formatDateTime = (date: string) => {
    return date
        ? dayjs(date, "YYYY-MM-DD HH:mm").format("YYYY-MM-DD HH:mm")
        : null;
};

export const formatTimeFromTimestamp = (timestamp: number) => {
    // Timestamp đã ở dạng giây
    const currentTime = Math.floor(Date.now() / 1000);
    // Lấy giá trị tuyệt đối của chênh lệch thời gian
    const timeDiff = Math.abs(timestamp - currentTime);

    const hours = Math.floor(timeDiff / 3600);
    const minutes = Math.floor((timeDiff % 3600) / 60);
    const seconds = timeDiff % 60;

    return hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;
};

export const checkLoginLockout = (): number | null => {
    const storedTimeLockout = localStorage.getItem("time_lockout");

    if (storedTimeLockout) {
        const lockoutTimestamp = parseInt(storedTimeLockout, 10);
        const currentTime = Math.floor(Date.now() / 1000);

        // Nếu thời gian khóa vẫn còn hiệu lực
        if (lockoutTimestamp > currentTime) {
            return lockoutTimestamp;
        } else {
            // Nếu thời gian khóa đã hết
            localStorage.removeItem("time_lockout");
        }
    }

    return null;
};

export const setLoginLockout = (timestamp: number): void => {
    localStorage.setItem("time_lockout", String(timestamp));
};

export const clearLoginLockout = (): void => {
    localStorage.removeItem("time_lockout");
};

export const isLockoutActive = (timestamp: number): boolean => {
    const currentTime = Math.floor(Date.now() / 1000);
    return timestamp > currentTime;
};

export const ConvertTextCheckBox = (key: string): string => {
  const map: Record<string, string> = {
    // 7 quyền chuẩn
    showMenu: "Hiện menu",
    index: "Xem",
    show: "Chi tiết",
    create: "Thêm",
    edit: "Sửa",
    delete: "Xóa",
    export: "Xuất file",

    // (giữ nếu bạn có dùng)
    import: "Nhập file",

    // Quyền đặc thù — Utilities (Facebook/Zalo)
    send: "Gửi trả lời",
    assign: "Gán phụ trách",
    status: "Đổi trạng thái",

    // Quyền đặc thù — CSKH (Điểm thành viên)
    sendZns: "Gửi ZNS",

    // Quyền đặc thù — Giao hàng
    notifyAndSetStatus: "Gửi SMS + đặt trạng thái",

    // Quyền đặc thù — Khách hàng vãng lai
    convert: "Chuyển sang khách chuẩn",

    // Quyền đặc thù — Cash (chuyển nội bộ)
    post: "Ghi sổ",
    unpost: "Gỡ sổ",
  };

  return map[key] ?? key;
};


export function mergeArrays(arr1: any, arr2: any) {
    const merged = JSON.parse(JSON.stringify(arr1));

    // Lặp lại từng mục trong arr2 và merge
    arr2.forEach((item2: any) => {
        const item1 = merged.find((item: any) => item.name === item2.name); // Tìm một mục phù hợp trong arr1
        if (item1) {
            item1.actions = { ...item1.actions, ...item2.actions };
        } else {
            merged.push(JSON.parse(JSON.stringify(item2)));
        }
    });

    return merged;
}

export const generateMaPhieu = (prefix: string) => {
    const currentDate = dayjs().format("YYYYMMDD");
    const timeCreate = dayjs().format("HHmmss");
    return `${prefix}-${currentDate}-${timeCreate}`;
};

export const checkIsToday = (date: string) => {
    const parsedDate = dayjs(date, "DD/MM/YYYY HH:mm:ss");
    return parsedDate.isValid() && parsedDate.isSame(dayjs(), "day");
};
