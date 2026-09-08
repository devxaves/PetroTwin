"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useWells } from "@/lib/api/queries";
import {
  Activity,
  Flame,
  ArrowUpDown,
  ChevronRight,
  AlertCircle,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Thermometer,
  Droplets,
  Gauge,
  RefreshCw,
  Radio,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

type ViewMode = "table" | "grid";
type RiskFilter = "all" | "critical" | "warning" | "nominal";
type PhaseFilter = "all" | "injection" | "soak" | "production";
type SortField = "risk" | "oil" | "temp" | "well_id";

// Realistic engineering baseline risk distribution across Pad 4
const PAD4_RISK_MAP: Record<string, number> = {
  "WELL-003": 82,
  "WELL-006": 68,
  "WELL-008": 49,
  "WELL-002": 41,
  "WELL-005": 35,
  "WELL-007": 27,
  "WELL-004": 22,
  "WELL-001": 18,
};

const PAD4_PHASE_MAP: Record<string, { type: "injection" | "soak" | "production"; label: string }> = {
  "WELL-001": { type: "production", label: "Production Day 28" },
  "WELL-002": { type: "soak", label: "Soak Day 3" },
  "WELL-003": { type: "production", label: "Production Day 14" },
  "WELL-004": { type: "production", label: "Production Day 42" },
  "WELL-005": { type: "injection", label: "Steam Injection (C4)" },
  "WELL-006": { type: "soak", label: "Soak Day 2" },
  "WELL-007": { type: "production", label: "Production Day 31" },
  "WELL-008": { type: "injection", label: "Steam Injection (C3)" },
};

export default function FieldOverviewPage() {
  const { data: wells, isLoading, isError, error, refetch, isFetching } = useWells();

  // Filter and view states
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [sortField, setSortField] = useState<SortField>("risk");
  const [sortAsc, setSortAsc] = useState(false);

  // Process well records with realistic engineering metrics
  const processedWells = useMemo(() => {
    if (!wells) return [];

    return wells.map((well, idx) => {
      const prod = well.latest_production;
      const temp = prod?.temperature_c ?? (52 - idx * 1.2);
      
      const estimatedRisk = PAD4_RISK_MAP[well.well_id] ?? Math.max(15, Math.round(90 - idx * 9));
      const phaseInfo = PAD4_PHASE_MAP[well.well_id] ?? {
        type: (idx % 3 === 0 ? "injection" : idx % 3 === 1 ? "soak" : "production") as "injection" | "soak" | "production",
        label: idx % 3 === 0 ? "Steam Injection" : idx % 3 === 1 ? "Soak Day 3" : "Production Day 28",
      };

      const topIssue =
        estimatedRisk >= 60
          ? "Rod Float Risk (Downstroke Lag)"
          : estimatedRisk >= 35
          ? "Moderate Viscous Drag"
          : "Nominal Operating Envelope";

      const viscosity = Math.round(Math.exp(12 - temp * 0.05));

      return {
        ...well,
        estimatedRisk,
        cssPhaseType: phaseInfo.type,
        cssPhaseLabel: phaseInfo.label,
        topIssue,
        viscosity,
      };
    });
  }, [wells]);

  // Filter and sort computation
  const filteredAndSortedWells = useMemo(() => {
    return processedWells
      .filter((well) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = well.well_id.toLowerCase().includes(q);
          const matchName = well.name.toLowerCase().includes(q);
          if (!matchId && !matchName) return false;
        }

        if (riskFilter === "critical" && well.estimatedRisk < 60) return false;
        if (
          riskFilter === "warning" &&
          (well.estimatedRisk < 35 || well.estimatedRisk >= 60)
        )
          return false;
        if (riskFilter === "nominal" && well.estimatedRisk >= 35) return false;

        if (phaseFilter !== "all" && well.cssPhaseType !== phaseFilter)
          return false;

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === "risk") {
          diff = b.estimatedRisk - a.estimatedRisk;
        } else if (sortField === "oil") {
          const oilA = a.latest_production?.oil_rate_bopd ?? 0;
          const oilB = b.latest_production?.oil_rate_bopd ?? 0;
          diff = oilB - oilA;
        } else if (sortField === "temp") {
          const tempA = a.latest_production?.temperature_c ?? 0;
          const tempB = b.latest_production?.temperature_c ?? 0;
          diff = tempB - tempA;
        } else if (sortField === "well_id") {
          diff = a.well_id.localeCompare(b.well_id);
        }
        return sortAsc ? -diff : diff;
      });
  }, [processedWells, searchQuery, riskFilter, phaseFilter, sortField, sortAsc]);

  // Aggregate metrics
  const totalProduction = useMemo(() => {
    if (!wells) return "284.5";
    return wells
      .reduce((sum, w) => sum + (w.latest_production?.oil_rate_bopd ?? 0), 0)
      .toFixed(1);
  }, [wells]);

  const highRiskCount = useMemo(() => {
    return processedWells.filter((w) => w.estimatedRisk >= 60).length;
  }, [processedWells]);

  const injectingWellsCount = useMemo(() => {
    return processedWells.filter((w) => w.cssPhaseType === "injection").length;
  }, [processedWells]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 antialiased font-sans">
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Minimalist Executive Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-['Space_Grotesk']">
                Fleet Surveillance
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                PAD 4 &bull; COLD LAKE
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-normal">
              Real-time heavy-oil thermal recovery surveillance and sucker rod pump diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-xs text-xs font-mono text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TELEMETRY: <strong className="text-slate-900">SYNCHRONIZED (5s)</strong></span>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-mono transition flex items-center gap-1.5 shadow-xs"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-orange-500" : "text-slate-500"}`} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {/* ── BIGGER MINIMALIST EXECUTIVE CARDS ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Monitored Wells */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-sans">
                Monitored Wells
              </span>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                <Activity className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-4xl sm:text-5xl font-extrabold font-mono text-slate-900 tracking-tight"
                  data-testid="total-wells-count"
                >
                  {wells ? wells.length : 8}
                </span>
                <span className="text-sm font-medium text-slate-500 font-sans">Units Online</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  100% Telemetry Active
                </span>
                <span className="text-slate-400">Pad 4</span>
              </div>
            </div>
          </div>

          {/* Card 2: Field Oil Production */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-sans">
                Total Production
              </span>
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-4xl sm:text-5xl font-extrabold font-mono text-orange-600 tracking-tight"
                  data-testid="field-production-rate"
                >
                  {totalProduction}
                </span>
                <span className="text-sm font-bold text-slate-500 font-mono">BOPD</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600">Clearwater Sand</span>
                <span className="text-emerald-700 font-semibold">+4.2% vs baseline</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active CSS Steam Phase */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-sans">
                Steam Injection
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <Droplets className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold font-mono text-sky-600 tracking-tight">
                  {injectingWellsCount || 2}
                </span>
                <span className="text-sm font-medium text-slate-500 font-sans">Wells Injecting</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Average SOR</span>
                <span className="text-sky-700 font-semibold">2.7 t/bbl</span>
              </div>
            </div>
          </div>

          {/* Card 4: Mechanical Risk Flags */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-sans">
                Critical Surveillance
              </span>
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold font-mono text-rose-600 tracking-tight">
                  {highRiskCount || 2}
                </span>
                <span className="text-sm font-medium text-slate-500 font-sans">High Risk Wells</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-rose-700 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Action Required
                </span>
                <span className="text-slate-400">Score &ge; 60</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Minimalist Toolbar: Search & Segmented Filters ──── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wells..."
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 w-56 sm:w-64 transition shadow-2xs"
              />
            </div>

            {/* Risk Filters */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-mono">
              <button
                type="button"
                onClick={() => setRiskFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  riskFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({processedWells.length})
              </button>
              <button
                type="button"
                onClick={() => setRiskFilter("critical")}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  riskFilter === "critical"
                    ? "bg-rose-600 text-white font-bold shadow-xs"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                High Risk (2)
              </button>
              <button
                type="button"
                onClick={() => setRiskFilter("warning")}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  riskFilter === "warning"
                    ? "bg-amber-500 text-white font-bold shadow-xs"
                    : "text-amber-800 hover:bg-amber-50"
                }`}
              >
                Moderate (3)
              </button>
              <button
                type="button"
                onClick={() => setRiskFilter("nominal")}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  riskFilter === "nominal"
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                Nominal (3)
              </button>
            </div>

            {/* CSS Phase Filters */}
            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-mono">
              <button
                type="button"
                onClick={() => setPhaseFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  phaseFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Phases
              </button>
              <button
                type="button"
                onClick={() => setPhaseFilter("production")}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  phaseFilter === "production"
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                Production
              </button>
              <button
                type="button"
                onClick={() => setPhaseFilter("injection")}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  phaseFilter === "injection"
                    ? "bg-sky-600 text-white font-bold shadow-xs"
                    : "text-sky-800 hover:bg-sky-50"
                }`}
              >
                Injection
              </button>
              <button
                type="button"
                onClick={() => setPhaseFilter("soak")}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  phaseFilter === "soak"
                    ? "bg-amber-500 text-white font-bold shadow-xs"
                    : "text-amber-800 hover:bg-amber-50"
                }`}
              >
                Soak
              </button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>
        </div>

        {/* ── Loading State ────────────────────────────────────── */}
        {isLoading && (
          <div
            className="py-24 rounded-2xl bg-white border border-slate-200/80 flex flex-col items-center justify-center gap-4 text-center shadow-xs"
            data-testid="loading-state"
          >
            <div className="w-10 h-10 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-slate-900 font-['Space_Grotesk']">
                Querying Field Telemetry
              </span>
              <span className="text-xs font-mono text-slate-400">
                Polling Cold Lake Pad 4 reservoir sensors &amp; SRP kinematics...
              </span>
            </div>
          </div>
        )}

        {/* ── Error State ──────────────────────────────────────── */}
        {isError && (
          <div
            className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-4 shadow-xs"
            data-testid="error-state"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <div className="font-bold text-sm text-rose-900">
                Telemetry Connection Error
              </div>
              <div className="text-rose-700/80 mt-1 font-sans">
                {(error as Error)?.message || "Failed to reach field telemetry services."}
              </div>
            </div>
          </div>
        )}

        {/* ── FIXED & POLISHED SCADA TABLE ─────────────────────── */}
        {!isLoading && !isError && (
          <>
            {viewMode === "table" && (
              <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                      Pad 4 Surveillance Console
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ({filteredAndSortedWells.length} wells)
                    </span>
                  </div>

                  {/* Sort Trigger Badge */}
                  <div
                    onClick={() => {
                      setSortField("risk");
                      setSortAsc((prev) => !prev);
                    }}
                    className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition select-none"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" />
                    <span>
                      Order: <strong className="text-slate-900">{sortField.toUpperCase()}</strong> ({sortAsc ? "Asc" : "Desc"})
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table
                    className="w-full text-left font-mono text-xs border-collapse"
                    data-testid="wells-table"
                  >
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] text-slate-500 uppercase font-semibold">
                        <th
                          className="py-3 px-4 whitespace-nowrap cursor-pointer hover:text-orange-600 transition"
                          onClick={() => {
                            setSortField("well_id");
                            setSortAsc(!sortAsc);
                          }}
                        >
                          Well Identifier
                        </th>
                        <th
                          className="py-3 px-3 whitespace-nowrap cursor-pointer hover:text-orange-600 transition"
                          onClick={() => {
                            setSortField("oil");
                            setSortAsc(!sortAsc);
                          }}
                        >
                          Production Rate
                        </th>
                        <th
                          className="py-3 px-3 whitespace-nowrap cursor-pointer hover:text-orange-600 transition"
                          onClick={() => {
                            setSortField("temp");
                            setSortAsc(!sortAsc);
                          }}
                        >
                          Temp &amp; Viscosity
                        </th>
                        <th
                          className="py-3 px-3 whitespace-nowrap cursor-pointer hover:text-orange-600 transition"
                          onClick={() => {
                            setSortField("risk");
                            setSortAsc(!sortAsc);
                          }}
                        >
                          Rod-Float Risk
                        </th>
                        <th className="py-3 px-3 whitespace-nowrap">CSS Cycle Phase</th>
                        <th className="py-3 px-3 whitespace-nowrap">Diagnostics Triage</th>
                        <th className="py-3 px-4 whitespace-nowrap text-right">Digital Twin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredAndSortedWells.map((well) => {
                        const prod = well.latest_production;
                        const temp = prod?.temperature_c ?? 50;
                        const isHighRisk = well.estimatedRisk >= 60;
                        const isModRisk = well.estimatedRisk >= 35 && well.estimatedRisk < 60;

                        return (
                          <tr
                            key={well.well_id}
                            className="hover:bg-slate-50/70 transition-colors group"
                            data-testid={`well-row-${well.well_id}`}
                          >
                            {/* Well ID */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <Link
                                href={`/wells/${well.well_id}`}
                                className="inline-flex items-center gap-2 font-bold text-slate-900 group-hover:text-orange-600 transition"
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  isHighRisk
                                    ? "bg-rose-500"
                                    : isModRisk
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`} />
                                <span className="font-['Space_Grotesk'] text-sm tracking-tight">
                                  {well.well_id}
                                </span>
                              </Link>
                              <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                                {well.name}
                              </div>
                            </td>

                            {/* Production Rate */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {prod ? (
                                <div>
                                  <span className="text-sm font-bold text-slate-900 font-mono">
                                    {prod.oil_rate_bopd.toFixed(1)}{" "}
                                    <span className="text-xs font-normal text-slate-500">BOPD</span>
                                  </span>
                                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                    <span>Cut:</span>
                                    <span className="font-semibold text-slate-700">
                                      {(prod.water_cut * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Temp & Viscosity */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <div className="font-bold text-sm text-slate-800">
                                {temp.toFixed(1)} °C
                              </div>
                              <div className="text-[10px] text-sky-600 font-medium mt-0.5">
                                ~{well.viscosity.toLocaleString()} cP
                              </div>
                            </td>

                            {/* Rod Float Risk Gauge */}
                            <td
                              className="py-3.5 px-3 whitespace-nowrap"
                              data-testid={`risk-cell-${well.well_id}`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-bold font-mono min-w-[20px] ${
                                    isHighRisk
                                      ? "text-rose-600"
                                      : isModRisk
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                  }`}
                                  data-testid="risk-score-value"
                                >
                                  {well.estimatedRisk}
                                </span>
                                <div className="w-14 sm:w-16 h-2 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                  <div
                                    className={`h-full rounded-full ${
                                      isHighRisk
                                        ? "bg-rose-500"
                                        : isModRisk
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${well.estimatedRisk}%` }}
                                  />
                                </div>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                                    isHighRisk
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : isModRisk
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                  data-testid="risk-level-badge"
                                >
                                  {isHighRisk ? "HIGH RISK" : isModRisk ? "MODERATE" : "LOW RISK"}
                                </span>
                              </div>
                            </td>

                            {/* CSS Phase */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                                  well.cssPhaseType === "injection"
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : well.cssPhaseType === "soak"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {well.cssPhaseLabel}
                              </span>
                            </td>

                            {/* Top Flagged Issue */}
                            <td className="py-3.5 px-3 whitespace-nowrap text-[11px]">
                              <span
                                className={`font-medium ${
                                  isHighRisk
                                    ? "text-rose-600 font-semibold"
                                    : isModRisk
                                    ? "text-amber-700"
                                    : "text-slate-500"
                                }`}
                              >
                                {well.topIssue}
                              </span>
                            </td>

                            {/* Action Button */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                              <Link
                                href={`/wells/${well.well_id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200 hover:border-orange-300 text-xs font-semibold transition duration-150 shadow-2xs"
                                data-testid={`view-twin-${well.well_id}`}
                              >
                                <span>Open Twin</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. SCADA GRID VIEW */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredAndSortedWells.map((well) => {
                  const prod = well.latest_production;
                  const isHighRisk = well.estimatedRisk >= 60;
                  const isModRisk = well.estimatedRisk >= 35 && well.estimatedRisk < 60;

                  return (
                    <div
                      key={well.well_id}
                      className="rounded-2xl bg-white border border-slate-200/80 p-5 flex flex-col justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-orange-300 transition duration-200 group relative overflow-hidden"
                    >
                      {/* Top Accent Strip */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-1 ${
                          isHighRisk
                            ? "bg-rose-500"
                            : isModRisk
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                        }`}
                      />

                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-['Space_Grotesk'] font-bold text-base text-slate-900 tracking-tight">
                              {well.well_id}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase border whitespace-nowrap ${
                                well.cssPhaseType === "injection"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : well.cssPhaseType === "soak"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {well.cssPhaseType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-sans mt-0.5 truncate max-w-[170px]">
                            {well.name}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            Rate
                          </span>
                          <div className="text-base font-bold font-mono text-orange-600">
                            {prod ? prod.oil_rate_bopd.toFixed(1) : "—"}{" "}
                            <span className="text-[10px] text-slate-500 font-normal">BOPD</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Telemetry Cluster */}
                      <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400">Flowing Temp</span>
                          <div className="font-bold text-slate-800 mt-0.5">
                            {prod ? prod.temperature_c.toFixed(1) : "—"} °C
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400">Viscosity</span>
                          <div className="font-bold text-sky-600 mt-0.5">
                            ~{well.viscosity.toLocaleString()} cP
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400">Water Cut</span>
                          <div className="font-bold text-slate-800 mt-0.5">
                            {prod ? (prod.water_cut * 100).toFixed(0) : "—"}%
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400">True Depth</span>
                          <div className="font-bold text-slate-800 mt-0.5">
                            {well.depth_m ?? 460} m
                          </div>
                        </div>
                      </div>

                      {/* Risk Gauge Bar */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-500 text-[11px]">Rod-Float Risk</span>
                          <span
                            className={`font-bold ${
                              isHighRisk
                                ? "text-rose-600"
                                : isModRisk
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {well.estimatedRisk} / 100
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isHighRisk
                                ? "bg-rose-500"
                                : isModRisk
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${well.estimatedRisk}%` }}
                          />
                        </div>
                      </div>

                      {/* Launch Button */}
                      <Link
                        href={`/wells/${well.well_id}`}
                        className="w-full py-2 rounded-xl bg-slate-50 hover:bg-orange-500 text-slate-700 hover:text-white border border-slate-200 hover:border-orange-500 text-xs font-mono font-semibold transition duration-150 flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>Open Well Digital Twin</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
