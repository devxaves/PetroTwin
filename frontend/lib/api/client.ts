/**
 * Base HTTP fetch wrapper with robust error handling for PetroTwin.
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

let cachedToken: string | null = null;

/**
 * Retrieves a valid Bearer authentication token.
 * Defaults to demo approver credentials for decision support actions.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("petrotwin_auth_token");
    if (stored) return stored;
  }
  if (cachedToken) return cachedToken;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "approver_demo",
        password: "ApproverPass2026!",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      cachedToken = data.access_token;
      if (typeof window !== "undefined" && cachedToken) {
        localStorage.setItem("petrotwin_auth_token", cachedToken);
      }
      return cachedToken;
    }
  } catch (err) {
    console.warn("Auto-authentication with demo approver credentials failed:", err);
  }
  return null;
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

  // Ensure Bearer authentication is attached for protected routes
  if (!headers.has("Authorization")) {
    const token = await getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  // If token expired or rejected with 401, re-login and retry once
  if (res.status === 401 && !headers.has("X-Retry")) {
    cachedToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("petrotwin_auth_token");
    }
    const freshToken = await getAuthToken();
    if (freshToken) {
      headers.set("Authorization", `Bearer ${freshToken}`);
      headers.set("X-Retry", "1");
      res = await fetch(url, {
        ...options,
        headers,
        cache: "no-store",
      });
    }
  }

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

