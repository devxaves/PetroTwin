/**
 * Typed API client for PetroTwin backend.
 *
 * Uses the NEXT_PUBLIC1_API_URL env var in production,
 * falls back to localhost:8000 for local dev.
 */

export interface HealthResponse {
  status: "ok" | "degraded";
  db: "connected" | "disconnected";
  redis: "connected" | "disconnected";
}

const API_BASE =
  process.env.NEXT_PUBLIC1_API_URL ?? "http://localhost:8000";

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Health check failed: HTTP ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
