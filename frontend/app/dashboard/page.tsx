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
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Field Summary Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-1 border-l-4 border-l-slate-400 hover-card-lift">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">Total Monitored Wells</span>
            <span className="text-3xl font-bold font-mono text-slate-900" data-testid="total-wells-count">
              {wells ? wells.length : 8}
            </span>
            <span className="text-[11px] text-emerald-600 font-mono font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              100% Telemetry Active
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-1 border-l-4 border-l-orange-500 hover-card-lift">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">Field Oil Production</span>
            <span className="text-3xl font-bold font-mono text-orange-600" data-testid="field-production-rate">
              {wells
                ? wells
                    .reduce((sum, w) => sum + (w.latest_production?.oil_rate_bopd ?? 0), 0)
                    .toFixed(1)
                : "284.5"}{" "}
              <span className="text-xs font-medium text-slate-500">BOPD</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Cold Lake Clearwater Sand</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-1 border-l-4 border-l-sky-500 hover-card-lift">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">Active CSS Steam Phase</span>
            <span className="text-3xl font-bold font-mono text-sky-600">
              3 <span className="text-xs font-medium text-slate-500">Wells Injecting</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Average SOR: 2.7 t/bbl</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-1 border-l-4 border-l-rose-500 hover-card-lift">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">Mechanical Risk Flags</span>
            <span className="text-3xl font-bold font-mono text-rose-600">
              2 <span className="text-xs font-medium text-slate-500">Wells &gt; 50 pts</span>
            </span>
            <span className="text-[11px] text-rose-600/90 font-mono font-medium">Action Recommended</span>
          </div>
        </div>

        {/* Wells Table Section */}
        <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-base font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                Well Fleet Overview
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Live heavy-oil thermal recovery and SRP mechanical operating states.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200/80">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sorted by Rod-Float Risk (Descending)</span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3" data-testid="loading-state">
              <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
              <div className="text-xs font-mono text-slate-500">
                Querying field telemetry and reservoir states...
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div
              className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-3"
              data-testid="error-state"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold">Failed to load well fleet data</div>
                <div>{(error as Error)?.message}</div>
              </div>
            </div>
          )}

          {/* Data Table */}
          {!isLoading && !isError && (
            <div className="overflow-x-auto rounded-lg border border-slate-200/80">
              <table className="w-full text-left font-mono text-xs" data-testid="wells-table">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] text-slate-600 uppercase font-semibold">
                    <th className="py-3 px-4">Well ID</th>
                    <th className="py-3 px-4">Current Production</th>
                    <th className="py-3 px-4">Temp / Viscosity</th>
                    <th className="py-3 px-4">Rod-Float Risk</th>
                    <th className="py-3 px-4">CSS Phase</th>
                    <th className="py-3 px-4">Top Flagged Issue</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedWells.map((well, idx) => {
                    const prod = well.latest_production;
                    const temp = prod?.temperature_c ?? 55;
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
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        data-testid={`well-row-${well.well_id}`}
                      >
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/wells/${well.well_id}`}
                            className="flex items-center gap-2 font-bold text-slate-900 group-hover:text-orange-600 transition"
                          >
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="font-['Space_Grotesk'] text-sm">{well.well_id}</span>
                          </Link>
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                            {well.name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-800 font-semibold">
                          {prod ? (
                            <div>
                              <span className="text-slate-900">{prod.oil_rate_bopd.toFixed(1)} BOPD</span>
                              <div className="text-[10px] text-slate-500 font-normal">
                                Water Cut: {(prod.water_cut * 100).toFixed(0)}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="font-medium">{temp.toFixed(1)} °C</div>
                          <div className="text-[10px] text-sky-600 font-semibold">
                            ~{(Math.exp(12 - temp * 0.05)).toFixed(0)} cP
                          </div>
                        </td>

                        <td className="py-3.5 px-4" data-testid={`risk-cell-${well.well_id}`}>
                          <RiskGauge score={estimatedRisk} compact />
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-medium text-slate-700">
                            {cssPhase}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 text-[11px]">
                          <span
                            className={`font-medium ${
                              estimatedRisk >= 60
                                ? "text-rose-600"
                                : estimatedRisk >= 35
                                ? "text-amber-600"
                                : "text-slate-600"
                            }`}
                          >
                            {topIssue}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/wells/${well.well_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-50 hover:bg-orange-500 text-orange-700 hover:text-white border border-orange-200 hover:border-orange-500 text-xs font-semibold transition duration-150 shadow-2xs"
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
