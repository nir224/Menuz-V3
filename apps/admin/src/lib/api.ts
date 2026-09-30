const tokenKey = "menuz-admin-token";

export function getToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(tokenKey) ?? "";
}

export function setToken(token: string) {
  window.sessionStorage.setItem(tokenKey, token);
}

export function clearToken() {
  window.sessionStorage.removeItem(tokenKey);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const method = (init?.method ?? "GET").toUpperCase();
  const response = await fetch(`/menuz-api${path}`, {
    ...init,
    body: init?.body ?? (method === "GET" ? undefined : "{}"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const error = new Error(body.error || "request_failed") as Error & { code?: string };
    error.code = body.error;
    throw error;
  }
  return body;
}
