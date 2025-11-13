/* eslint-disable @typescript-eslint/no-explicit-any */
export const vnd = (n?: any) =>
  Number(n ?? 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
