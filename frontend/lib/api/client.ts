/**
 * Base HTTP fetch wrapper with robust error handling for ThermoTwin.
 */

const rawApiBase =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC1_API_URL ||
  "http://localhost:8000";
const API_BASE = rawApiBase.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type") && options?.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let errBody: any;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }
    const message =
      (typeof errBody === "object" && errBody?.detail) ||
      `Request failed with HTTP ${res.status}`;
    throw new ApiError(res.status, message, errBody);
  }

  return res.json() as Promise<T>;
}
