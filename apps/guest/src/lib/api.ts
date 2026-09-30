export const apiBase = "/menuz-api";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const response = await fetch(`${apiBase}${path}`, {
    cache: "no-store",
    ...init,
    body: init?.body ?? (method === "GET" ? undefined : "{}"),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const error = new Error(body.error || "request_failed") as Error & { code?: string; totalCents?: number };
    error.code = body.error;
    error.totalCents = (body as { totalCents?: number }).totalCents;
    throw error;
  }
  return body;
}
