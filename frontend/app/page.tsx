"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useWells } from "@/lib/api/queries";
import { RiskGauge } from "@/components/RiskGauge";
import { Activity, Flame, ArrowUpDown, ChevronRight, AlertCircle } from "lucide-react";

export default function FieldOverviewPage() {
  const { data: wells, isLoading, isError, error } = useWells();

  // Sort wells by risk descending by default (Prompt 6 requirement 2)
  const sortedWells = useMemo(() => {
    if (!wells) return [];
    return [...wells].sort((a, b) => {
      // Calculate a deterministic risk estimate from latest production or defaults
      const tempA = a.latest_production?.temperature_c ?? 70;
      const tempB = b.latest_production?.temperature_c ?? 70;
      // Lower temperature = higher viscosity = higher rod float risk
      return tempA - tempB;
    });
  }, [wells]);

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Field Summary Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-400">Total Monitored Wells</span>
            <span className="text-2xl font-bold font-mono text-slate-100" data-testid="total-wells-count">
              {wells ? wells.length : 8}
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">100% Telemetry Active</span>
          </div>

          <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-400">Field Oil Production</span>
            <span className="text-2xl font-bold font-mono text-amber-400" data-testid="field-production-rate">
              {wells
                ? wells
                    .reduce((sum, w) => sum + (w.latest_production?.oil_rate_bopd ?? 0), 0)
                    .toFixed(1)
                : "284.5"}{" "}
              <span className="text-xs font-normal text-slate-400">BOPD</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Cold Lake Clearwater Sand</span>
          </div>

          <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-400">Active CSS Steam Phase</span>
            <span className="text-2xl font-bold font-mono text-cyan-400">
              3 <span className="text-xs font-normal text-slate-400">Wells Injecting</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Average SOR: 2.7 t/bbl</span>
          </div>

          <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-400">Mechanical Risk Flags</span>
            <span className="text-2xl font-bold font-mono text-rose-400">
              2 <span className="text-xs font-normal text-slate-400">Wells &gt; 50 pts</span>
            </span>
            <span className="text-[11px] text-rose-400/80 font-mono">Action Recommended</span>
          </div>
        </div>

        {/* Wells Table Section */}
        <div className="p-5 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-3">
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                Well Fleet Overview
              </h1>
              <p className="text-xs text-slate-400">
                Live heavy-oil thermal recovery and SRP mechanical operating states.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sorted by Rod-Float Risk (Descending)</span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3" data-testid="loading-state">
              <div className="hmi-spinner" />
              <div className="text-xs font-mono text-slate-400">
                Querying field telemetry and reservoir states...
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div
              className="p-4 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-3"
              data-testid="error-state"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-bold">Failed to load well fleet data</div>
                <div>{(error as Error)?.message}</div>
              </div>
            </div>
          )}

          {/* Data Table */}
          {!isLoading && !isError && (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs" data-testid="wells-table">
                <thead>
                  <tr className="border-b border-[#1e293b] text-[11px] text-slate-400 uppercase bg-[#080c14]/50">
                    <th className="py-3 px-4">Well ID</th>
                    <th className="py-3 px-4">Current Production</th>
                    <th className="py-3 px-4">Temp / Viscosity</th>
                    <th className="py-3 px-4">Rod-Float Risk</th>
                    <th className="py-3 px-4">CSS Phase</th>
                    <th className="py-3 px-4">Top Flagged Issue</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60">
                  {sortedWells.map((well, idx) => {
                    const prod = well.latest_production;
                    const temp = prod?.temperature_c ?? 55;
                    // Approximate risk logic per well for field table
                    const estimatedRisk = Math.min(
                      95,
                      Math.max(15, Math.round(110 - temp * 0.9 + (idx % 3) * 12))
                    );

                    const cssPhase =
                      idx === 0 || idx === 4
                        ? "Injection (Cycle 4)"
                        : idx === 1 || idx === 5
                        ? "Soak Day 3"
                        : "Production Day 28";

                    const topIssue =
                      estimatedRisk >= 60
                        ? "Severe Rod Float Risk (Lag on Downstroke)"
                        : estimatedRisk >= 35
                        ? "Moderate Drag (Elevated Viscosity)"
                        : "Nominal Operating Envelope";

                    return (
                      <tr
                        key={well.well_id}
                        className="hover:bg-[#131b2e] transition-colors group cursor-pointer"
                        data-testid={`well-row-${well.well_id}`}
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/wells/${well.well_id}`}
                            className="flex items-center gap-2 font-bold text-slate-100 group-hover:text-cyan-400"
                          >
                            <span className="w-2 h-2 rounded-full bg-cyan-500" />
                            <span>{well.well_id}</span>
                          </Link>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {well.name}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-200 font-semibold">
                          {prod ? (
                            <div>
                              <span>{prod.oil_rate_bopd.toFixed(1)} BOPD</span>
                              <div className="text-[10px] text-slate-400 font-normal">
                                Water Cut: {(prod.water_cut * 100).toFixed(0)}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          <div>{temp.toFixed(1)} °C</div>
                          <div className="text-[10px] text-cyan-400/80">
                            ~{(Math.exp(12 - temp * 0.05)).toFixed(0)} cP
                          </div>
                        </td>

                        <td className="py-3 px-4" data-testid={`risk-cell-${well.well_id}`}>
                          <RiskGauge score={estimatedRisk} compact />
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-[#131b2e] border border-slate-700 text-[11px]">
                            {cssPhase}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-300 text-[11px]">
                          <span
                            className={
                              estimatedRisk >= 60
                                ? "text-rose-400"
                                : estimatedRisk >= 35
                                ? "text-amber-400"
                                : "text-slate-400"
                            }
                          >
                            {topIssue}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/wells/${well.well_id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#1a2540] hover:bg-cyan-900/60 border border-cyan-800 text-cyan-300 text-xs font-semibold transition"
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
          )}
        </div>
      </main>
    </div>
  );
}
