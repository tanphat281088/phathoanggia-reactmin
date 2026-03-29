// src/setup/fetch-guard.ts
declare global { interface Window { __fetchGuardInstalled?: boolean; } }

export function installFetchGuard() {
  if (typeof window === "undefined") return;
  if (window.__fetchGuardInstalled) return;
  window.__fetchGuardInstalled = true;

  const origFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const base =
      (import.meta as any)?.env?.VITE_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const raw = typeof input === "string" ? input : String((input as any)?.url || input);
    const url = new URL(raw, base);
    const path = url.pathname.replace(/^\/api/, "");

    const headers = new Headers(init?.headers || {});
    const token = localStorage.getItem("token");
    const rt    = localStorage.getItem("refresh_token");
    const did   = localStorage.getItem("device_id");
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    if (rt    && !headers.has("Refresh-Token")) headers.set("Refresh-Token", rt);
    if (did   && !headers.has("Device-Id"))     headers.set("Device-Id", did);
    if (!headers.has("Content-Type"))           headers.set("Content-Type", "application/json");
    if (!headers.has("Accept"))                 headers.set("Accept", "application/json");

    const resp = await origFetch(url.toString(), { ...init, headers });

    const isHarmless =
      /\/auth\/me$/.test(path) ||
      /\/danh-sach-phan-quyen$/.test(path) ||
      /\/vai-tro\/options$/.test(path) ||
      /^\/nhan-su(\/|$)/.test(path);

    if (resp.status === 403 && isHarmless) {
      const body = JSON.stringify({ success: true, data: null, suppressed: true });
      return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return resp;
  };
}
