import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { SnackbarProvider } from "notistack";
import { ConfigProvider } from "antd";
import { router } from "./configs/app-router";
import { installFetchGuard } from "./setup/fetch-guard";
installFetchGuard();

// ...phần khởi động React của bạn...


/* ✅ CSS responsive toàn cục */
import "./components/responsive/Responsive.css";

createRoot(document.getElementById("root")!).render(
  <ConfigProvider theme={{ token: {} }}>
    <SnackbarProvider anchorOrigin={{ vertical: "top", horizontal: "center" }}>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </SnackbarProvider>
  </ConfigProvider>
);
