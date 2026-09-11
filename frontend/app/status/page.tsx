"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StatusIndicator from "@/components/StatusIndicator";
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo mark */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-orange-50 border border-orange-200 text-orange-600 shadow-inner"
                style={{ fontFamily: "var(--font-data)" }}
              >
                TT
              </div>
              <div>
                <h1
                  className="text-sm font-bold text-slate-900 tracking-wide font-display"
                >
                  PETROTWIN
                </h1>
                <p className="text-[0.65rem] text-slate-400 font-mono tracking-widest uppercase">
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
              className="text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200"
              data-testid="session-uptime"
            >
              SESSION {uptime}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Grid ────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Page title row */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display"
            >
              System Telemetry Status
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
              Real-time cluster infrastructure and microservice heartbeat
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase font-mono text-slate-500 font-extrabold mb-1">Last Poll</div>
            <div
              className="text-xs sm:text-sm font-mono font-black text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
              data-testid="last-checked"
            >
              {state.lastChecked
                ? formatTimestamp(state.lastChecked)
                : "—"}
            </div>
          </div>
        </div>

        {/* ── Status Panels ── asymmetric grid ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Overall System Status — wide panel ──────────── */}
          <div className="lg:col-span-8">
            <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="font-extrabold uppercase tracking-wider text-slate-900 font-display text-xs sm:text-sm">
                  System Overview
                </span>
                <span className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 font-bold">
                  SYS-001
                </span>
              </div>

              <div className="flex flex-col gap-6">
                {/* Main status row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
                        overallStatus === "ok"
                          ? "border-emerald-200 bg-emerald-50"
                          : overallStatus === "error"
                            ? "border-rose-200 bg-rose-50"
                            : overallStatus === "warn"
                              ? "border-amber-200 bg-amber-50"
                              : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <StatusIndicator state={overallStatus} size="lg" />
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-display" data-testid="overall-status-text">
                        {overallStatus === "ok" && "All Systems Operational"}
                        {overallStatus === "error" && "Connection Failure"}
                        {overallStatus === "warn" && "Partial Degradation"}
                        {overallStatus === "loading" && "Initializing..."}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 mt-1 font-sans font-medium">
                        {state.errorMessage ?? "All coupled microservices responding within nominal thresholds (<20ms)"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Database */}
                  <div
                    className="flex items-center justify-between px-5 py-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:border-orange-200 transition"
                    data-testid="db-status-card"
                  >
                    <div className="flex items-center gap-3.5">
                      <StatusIndicator state={dbState} size="sm" />
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">PostgreSQL</div>
                        <div className="text-xs text-slate-500 tracking-wide uppercase font-mono font-semibold">
                          TimescaleDB Core
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                    >
                      :5432
                    </div>
                  </div>

                  {/* Redis */}
                  <div
                    className="flex items-center justify-between px-5 py-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:border-orange-200 transition"
                    data-testid="redis-status-card"
                  >
                    <div className="flex items-center gap-3.5">
                      <StatusIndicator state={redisState} size="sm" />
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">Redis</div>
                        <div className="text-xs text-slate-500 tracking-wide uppercase font-mono font-semibold">
                          Fast In-Memory Cache
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
                    >
                      :6379
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Telemetry Sidebar — narrow panel ───────────── */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-bold uppercase tracking-wider text-slate-900 font-display text-xs">
                  Telemetry Poll
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  TEL-001
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DataReadout
                  label="Poll Count"
                  value={String(state.pollCount).padStart(4, "0")}
                  valueColor="#ea580c"
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
                      ? "#16a34a"
                      : state.health?.status === "degraded"
                        ? "#d97706"
                        : undefined
                  }
                />
                <DataReadout
                  label="Session"
                  value={uptime}
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-bold uppercase tracking-wider text-slate-900 font-display text-xs">
                  Active Endpoint
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  API-001
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Target Health URI</div>
                <code
                  className="text-xs px-3 py-2 rounded-lg bg-slate-50 text-orange-600 font-bold border border-slate-200 block break-all font-mono"
                  data-testid="api-endpoint"
                >
                  GET /health
                </code>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Response Code</div>
                  <div
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{
                      color:
                        state.connection === "connected"
                          ? "#16a34a"
                          : state.connection === "error"
                            ? "#dc2626"
                            : "#64748b",
                      backgroundColor:
                        state.connection === "connected"
                          ? "#f0fdf4"
                          : state.connection === "error"
                            ? "#fef2f2"
                            : "#f8fafc",
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
            </div>
          </div>
        </div>

        {/* ── Bottom Bar ──────────────────────────────────────── */}
        <footer className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[0.65rem] text-slate-400 font-mono uppercase tracking-wider">
            PetroTwin v0.1.0 &bull; Infrastructure Health Engine
          </div>
          <div
            className="text-[0.65rem] text-slate-400 font-mono"
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
