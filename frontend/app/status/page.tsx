"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StatusIndicator from "@/components/StatusIndicator";
import SystemPanel from "@/components/SystemPanel";
import DataReadout from "@/components/DataReadout";
import { fetchHealth, type HealthResponse } from "@/lib/api";

type ConnectionState = "loading" | "connected" | "error";

interface SystemState {
  connection: ConnectionState;
  health: HealthResponse | null;
  lastChecked: Date | null;
  errorMessage: string | null;
  pollCount: number;
}

const POLL_INTERVAL_MS = 5000;

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatUptime(startTime: Date): string {
  const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function StatusPage() {
  const [state, setState] = useState<SystemState>({
    connection: "loading",
    health: null,
    lastChecked: null,
    errorMessage: null,
    pollCount: 0,
  });

  const sessionStart = useRef(new Date());
  const [uptime, setUptime] = useState("00:00:00");

  const poll = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setState((prev) => ({
        connection: "connected",
        health: data,
        lastChecked: new Date(),
        errorMessage: null,
        pollCount: prev.pollCount + 1,
      }));
    } catch (err) {
      setState((prev) => ({
        connection: "error",
        health: prev.health,
        lastChecked: new Date(),
        errorMessage: err instanceof Error ? err.message : "Connection lost",
        pollCount: prev.pollCount + 1,
      }));
    }
  }, []);

  // Polling loop
  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  // Uptime ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(formatUptime(sessionStart.current));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus =
    state.connection === "loading"
      ? "loading"
      : state.connection === "error"
        ? "error"
        : state.health?.status === "ok"
          ? "ok"
          : "warn";

  const dbState =
    state.connection === "loading"
      ? "loading"
      : state.health?.db === "connected"
        ? "ok"
        : "error";

  const redisState =
    state.connection === "loading"
      ? "loading"
      : state.health?.redis === "connected"
        ? "ok"
        : "error";

  return (
    <div className="min-h-screen grid-bg">
      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <header className="border-b border-[var(--color-border-dim)] bg-[var(--color-surface-primary)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo mark — stylized TT */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold tracking-tight"
                style={{
                  fontFamily: "var(--font-data)",
                  background: "linear-gradient(135deg, var(--color-accent-dim), var(--color-accent))",
                  color: "var(--color-background)",
                }}
              >
                TT
              </div>
              <div>
                <h1
                  className="text-sm font-semibold text-[var(--color-foreground)] tracking-wide"
                  style={{ fontFamily: "var(--font-data)" }}
                >
                  THERMOTWIN
                </h1>
                <p className="text-[0.6rem] text-[var(--color-status-idle)] tracking-widest uppercase">
                  Infrastructure Control
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <StatusIndicator state={overallStatus} size="sm" />
            </div>
            <div
              className="text-xs text-[var(--color-status-idle)]"
              style={{ fontFamily: "var(--font-data)" }}
              data-testid="session-uptime"
            >
              SESSION {uptime}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Grid ────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title row */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2
              className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]"
            >
              System Status
            </h2>
            <p className="text-sm text-[var(--color-status-idle)] mt-1">
              Real-time infrastructure health monitoring
            </p>
          </div>
          <div className="text-right">
            <div className="data-label mb-1">Last Poll</div>
            <div
              className="text-sm text-[var(--color-foreground)]"
              style={{ fontFamily: "var(--font-data)" }}
              data-testid="last-checked"
            >
              {state.lastChecked
                ? formatTimestamp(state.lastChecked)
                : "—"}
            </div>
          </div>
        </div>

        {/* ── Status Panels ── asymmetric grid ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ── Overall System Status — wide panel ──────────── */}
          <div className="lg:col-span-8">
            <SystemPanel title="System Overview" code="SYS-001">
              <div className="flex flex-col gap-6">
                {/* Main status row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-lg flex items-center justify-center border ${
                        overallStatus === "ok"
                          ? "border-[var(--color-status-ok-dim)] bg-[var(--color-status-ok-dim)]/20"
                          : overallStatus === "error"
                            ? "border-[var(--color-status-error-dim)] bg-[var(--color-status-error-dim)]/20"
                            : overallStatus === "warn"
                              ? "border-[var(--color-status-warn-dim)] bg-[var(--color-status-warn-dim)]/20"
                              : "border-[var(--color-border-medium)] bg-[var(--color-surface-overlay)]"
                      }`}
                    >
                      <StatusIndicator state={overallStatus} size="lg" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold" data-testid="overall-status-text">
                        {overallStatus === "ok" && "All Systems Operational"}
                        {overallStatus === "error" && "Connection Failure"}
                        {overallStatus === "warn" && "Partial Degradation"}
                        {overallStatus === "loading" && "Initializing..."}
                      </div>
                      <div className="text-sm text-[var(--color-status-idle)] mt-0.5">
                        {state.errorMessage ?? "Infrastructure services responding normally"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Database */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded border border-[var(--color-border-dim)] bg-[var(--color-surface-raised)]"
                    data-testid="db-status-card"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIndicator state={dbState} size="sm" />
                      <div>
                        <div className="text-sm font-medium">PostgreSQL</div>
                        <div className="text-[0.65rem] text-[var(--color-status-idle)] tracking-wide uppercase">
                          TimescaleDB
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-xs text-[var(--color-border-bright)]"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      :5432
                    </div>
                  </div>

                  {/* Redis */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded border border-[var(--color-border-dim)] bg-[var(--color-surface-raised)]"
                    data-testid="redis-status-card"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIndicator state={redisState} size="sm" />
                      <div>
                        <div className="text-sm font-medium">Redis</div>
                        <div className="text-[0.65rem] text-[var(--color-status-idle)] tracking-wide uppercase">
                          Cache Layer
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-xs text-[var(--color-border-bright)]"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      :6379
                    </div>
                  </div>
                </div>
              </div>
            </SystemPanel>
          </div>

          {/* ── Telemetry Sidebar — narrow panel ───────────── */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <SystemPanel title="Telemetry" code="TEL-001">
              <div className="grid grid-cols-2 gap-4">
                <DataReadout
                  label="Poll Count"
                  value={String(state.pollCount).padStart(4, "0")}
                  valueColor="var(--color-accent)"
                />
                <DataReadout
                  label="Interval"
                  value={`${POLL_INTERVAL_MS / 1000}s`}
                />
                <DataReadout
                  label="API Status"
                  value={state.health?.status?.toUpperCase() ?? "—"}
                  valueColor={
                    state.health?.status === "ok"
                      ? "var(--color-status-ok)"
                      : state.health?.status === "degraded"
                        ? "var(--color-status-warn)"
                        : undefined
                  }
                />
                <DataReadout
                  label="Session"
                  value={uptime}
                />
              </div>
            </SystemPanel>

            <SystemPanel title="Endpoint" code="API-001">
              <div className="flex flex-col gap-2">
                <div className="data-label">Target</div>
                <code
                  className="text-xs px-3 py-2 rounded bg-[var(--color-surface-overlay)] text-[var(--color-accent)] border border-[var(--color-border-dim)] block break-all"
                  style={{ fontFamily: "var(--font-data)" }}
                  data-testid="api-endpoint"
                >
                  GET /health
                </code>
                <div className="flex items-center justify-between mt-2">
                  <div className="data-label">Response</div>
                  <div
                    className="text-xs"
                    style={{
                      fontFamily: "var(--font-data)",
                      color:
                        state.connection === "connected"
                          ? "var(--color-status-ok)"
                          : state.connection === "error"
                            ? "var(--color-status-error)"
                            : "var(--color-status-idle)",
                    }}
                    data-testid="response-status"
                  >
                    {state.connection === "connected"
                      ? "200 OK"
                      : state.connection === "error"
                        ? "ERR"
                        : "..."}
                  </div>
                </div>
              </div>
            </SystemPanel>
          </div>
        </div>

        {/* ── Bottom Bar ──────────────────────────────────────── */}
        <footer className="mt-8 pt-4 border-t border-[var(--color-border-dim)] flex items-center justify-between">
          <div className="text-[0.6rem] text-[var(--color-status-idle)] tracking-widest uppercase">
            ThermoTwin v0.1.0 — Infrastructure Monitor
          </div>
          <div
            className="text-[0.6rem] text-[var(--color-border-bright)]"
            style={{ fontFamily: "var(--font-data)" }}
          >
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })}
          </div>
        </footer>
      </main>
    </div>
  );
}
