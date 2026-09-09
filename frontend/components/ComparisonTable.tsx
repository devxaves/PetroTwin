"use client";

import React from "react";
import type { ComparisonMetric } from "@/lib/api/types";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface ComparisonRow {
  label: string;
  metricKey: string;
  current: number;
  proposed: number;
  delta: number;
  deltaPct?: number | null;
  unit: string;
  lowerIsBetter?: boolean;
}

interface ComparisonTableProps {
  comparison: Record<string, ComparisonMetric>;
}

export function ComparisonTable({ comparison }: ComparisonTableProps) {
  if (!comparison || Object.keys(comparison).length === 0) {
    return (
      <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b] text-slate-500 font-mono text-xs">
        No comparison data available.
      </div>
    );
  }

  const rows: ComparisonRow[] = [
    {
      label: "Cumulative Oil Production",
      metricKey: "cumulative_oil_bbl",
      current: comparison.cumulative_oil_bbl?.current ?? 0,
      proposed: comparison.cumulative_oil_bbl?.proposed ?? 0,
      delta: comparison.cumulative_oil_bbl?.delta ?? 0,
      deltaPct: comparison.cumulative_oil_bbl?.delta_pct,
      unit: "bbl",
      lowerIsBetter: false,
    },
    {
      label: "Steam-Oil Ratio (SOR)",
      metricKey: "sor",
      current: comparison.sor?.current ?? 0,
      proposed: comparison.sor?.proposed ?? 0,
      delta: comparison.sor?.delta ?? 0,
      deltaPct: comparison.sor?.delta_pct,
      unit: "t/bbl",
      lowerIsBetter: true,
    },
    {
      label: "Energy Intensity Cost",
      metricKey: "energy_intensity_usd_per_bbl",
      current: comparison.energy_intensity_usd_per_bbl?.current ?? 0,
      proposed: comparison.energy_intensity_usd_per_bbl?.proposed ?? 0,
      delta: comparison.energy_intensity_usd_per_bbl?.delta ?? 0,
      deltaPct: comparison.energy_intensity_usd_per_bbl?.delta_pct,
      unit: "$/bbl",
      lowerIsBetter: true,
    },
    {
      label: "Hydrodynamic Rod-Float Risk",
      metricKey: "rod_float_risk_score",
      current: comparison.rod_float_risk_score?.current ?? 0,
      proposed: comparison.rod_float_risk_score?.proposed ?? 0,
      delta: comparison.rod_float_risk_score?.delta ?? 0,
      deltaPct: comparison.rod_float_risk_score?.delta_pct,
      unit: "pts",
      lowerIsBetter: true,
    },
    {
      label: "Net Economic Value",
      metricKey: "net_economic_value_usd",
      current: comparison.net_economic_value_usd?.current ?? 0,
      proposed: comparison.net_economic_value_usd?.proposed ?? 0,
      delta: comparison.net_economic_value_usd?.delta ?? 0,
      deltaPct: comparison.net_economic_value_usd?.delta_pct,
      unit: "USD",
      lowerIsBetter: false,
    },
    {
      label: "Pump Volumetric Efficiency",
      metricKey: "pump_volumetric_efficiency",
      current: comparison.pump_volumetric_efficiency?.current ?? 0,
      proposed: comparison.pump_volumetric_efficiency?.proposed ?? 0,
      delta: comparison.pump_volumetric_efficiency?.delta ?? 0,
      deltaPct: comparison.pump_volumetric_efficiency?.delta_pct,
      unit: "%",
      lowerIsBetter: false,
    },
  ];

  return (
    <div
      className="rounded-3xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden"
      data-testid="comparison-table-container"
    >
      <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
            Baseline vs. Proposed Operational Comparison
          </h4>
          <span className="text-xs text-slate-600 font-sans mt-0.5 block font-medium">
            Coupled reservoir and mechanical subsystem evaluation matrix
          </span>
        </div>
        <span className="text-xs font-mono font-extrabold text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
          Coupled Solver Engine
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs sm:text-sm" data-testid="comparison-table">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-700 uppercase font-extrabold bg-slate-100/80 tracking-wider">
              <th className="py-4 px-5">Metric</th>
              <th className="py-4 px-5 text-right">Current Baseline</th>
              <th className="py-4 px-5 text-right">Proposed Scenario</th>
              <th className="py-4 px-5 text-right">Delta</th>
              <th className="py-4 px-5 text-right">Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isZero = Math.abs(row.delta) < 0.001;
              const isFavorable = row.lowerIsBetter
                ? row.delta < 0
                : row.delta > 0;

              let deltaColor = "text-slate-600";
              let badgeColor = "bg-slate-100 text-slate-700 border border-slate-200";
              if (!isZero) {
                deltaColor = isFavorable ? "text-emerald-700" : "text-rose-700";
                badgeColor = isFavorable
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold"
                  : "bg-rose-50 text-rose-800 border border-rose-300 font-bold";
              }

              return (
                <tr
                  key={row.metricKey}
                  className="hover:bg-orange-50/30 transition-colors"
                  data-testid={`row-${row.metricKey}`}
                >
                  <td className="py-4 px-5 font-sans text-slate-900 font-bold text-xs sm:text-sm">
                    {row.label}
                  </td>
                  <td className="py-4 px-5 text-right text-slate-700 font-semibold">
                    {row.current.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-xs text-slate-500 font-medium">{row.unit}</span>
                  </td>
                  <td
                    className="py-4 px-5 text-right font-black text-slate-900 text-sm sm:text-base"
                    data-testid={`proposed-${row.metricKey}`}
                  >
                    {row.proposed.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-xs text-slate-600 font-medium">{row.unit}</span>
                  </td>
                  <td
                    className={`py-4 px-5 text-right font-black ${deltaColor}`}
                    data-testid={`delta-${row.metricKey}`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {isZero ? (
                        <Minus className="w-4 h-4 text-slate-400" />
                      ) : row.delta > 0 ? (
                        <ArrowUp className="w-4 h-4" data-testid="arrow-up" />
                      ) : (
                        <ArrowDown className="w-4 h-4" data-testid="arrow-down" />
                      )}
                      <span>
                        {row.delta > 0 ? "+" : ""}
                        {row.delta.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold tracking-wide ${badgeColor}`}
                      data-testid={`badge-${row.metricKey}`}
                    >
                      {isZero
                        ? "UNCHANGED"
                        : isFavorable
                        ? "IMPROVING"
                        : "WORSENING"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
