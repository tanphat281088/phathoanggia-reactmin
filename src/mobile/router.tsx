// src/mobile/router.tsx
import type { RouteObject } from "react-router-dom";
import { Navigate, Outlet } from "react-router-dom";
import MobileShell from "./MobileShell";

import ChamCongNhanVien from "../pages/NhanSu/ChamCongNhanVien";
import DonTuCuaToi from "../pages/NhanSu/DonTuCuaToi";
import ThongBaoCongTyPage from "../pages/NhanSu/ThongBaoCongTyPage";

export const mobileRoute: RouteObject = {
  path: "/admin/m",
  element: <MobileShell />,
  children: [
    { index: true, element: <Navigate to="attendance" replace /> },
    { path: "attendance", element: <ChamCongNhanVien /> },
    { path: "don-tu", element: <DonTuCuaToi /> },
    { path: "thong-bao", element: <ThongBaoCongTyPage /> },
  ],
};

export const mobileRoutes: RouteObject[] = [mobileRoute];

export default function MobileRoutesElement() {
  return <Outlet />;
}
