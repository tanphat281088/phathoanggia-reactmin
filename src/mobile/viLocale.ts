// src/mobile/viLocale.ts

// ❗ Nếu bản của anh import en-US báo lỗi, comment dòng dưới:
import enUS from 'antd-mobile/es/locales/en-US'; // có thể giữ hoặc bỏ; không bắt buộc

// JSON Việt hoá thường dùng
const viLocale = {
  locale: 'vi-VN',
  common: {
    confirm: 'Xác nhận',
    cancel: 'Hủy',
    loading: 'Đang tải',
  },
  DatePicker: {
    till: 'đến',
  },
  Dialog: {
    confirm: 'Xác nhận',
    cancel: 'Hủy',
  },
  ActionSheet: {
    cancelText: 'Hủy',
  },
};

// ❗ Nếu import enUS ở trên bị lỗi, thay dòng export dưới thành: export default viLocale;
export default (enUS ? { ...enUS, ...viLocale } : viLocale);
