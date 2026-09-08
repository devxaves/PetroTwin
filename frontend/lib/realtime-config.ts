/**
 * ThermoTwin — Centralized Real-Time / Polling Configuration.
 *
 * All React Query staleTime & polling intervals reference this config
 * instead of hardcoded magic numbers. When the backend gains WebSocket/SSE
 * support, swap polling for streaming here — every consumer updates at once.
 */

export interface RealtimeTier {
  /** How often to poll (ms). Set 0 to disable polling. */
  pollingInterval: number;
  /** React Query staleTime (ms). Data younger than this skips refetch. */
  staleTime: number;
  /** Maximum data points to retain in sliding-window charts. */
  maxDataPoints: number;
  /** Whether this tier is active. */
  enabled: boolean;
}

/**
 * Tiered refresh configuration.
 *
 * fast     — approvals, health checks (5 s)
 * normal   — twin state, diagnostics, fleet list (10 s)
 * moderate — production history, joint recommendations (15 s)
 * slow     — CSS cycles, screening, optimizer recommendations (30 s)
 * rare     — Pareto front, heavy computations (60 s)
 */
export const REALTIME_CONFIG = {
  fast: {
    pollingInterval: 5_000,
    staleTime: 5_000,
    maxDataPoints: 600,
    enabled: true,
  },
  normal: {
    pollingInterval: 10_000,
    staleTime: 10_000,
    maxDataPoints: 300,
    enabled: true,
  },
  moderate: {
    pollingInterval: 15_000,
    staleTime: 15_000,
    maxDataPoints: 200,
    enabled: true,
  },
  slow: {
    pollingInterval: 30_000,
    staleTime: 30_000,
    maxDataPoints: 100,
    enabled: true,
  },
  rare: {
    pollingInterval: 60_000,
    staleTime: 60_000,
    maxDataPoints: 50,
    enabled: true,
  },
} as const satisfies Record<string, RealtimeTier>;

/** Default history window for live charts (ms). */
export const DEFAULT_HISTORY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
