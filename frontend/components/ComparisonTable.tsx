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
      className="rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden"
      data-testid="comparison-table-container"
    >
      <div className="p-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-display">
          Baseline vs. Proposed Operational Comparison
        </span>
        <span className="text-[11px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
          Coupled Solver Engine
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs" data-testid="comparison-table">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase bg-slate-100/50">
              <th className="py-3 px-4 font-semibold">Metric</th>
              <th className="py-3 px-4 text-right font-semibold">Current Baseline</th>
              <th className="py-3 px-4 text-right font-semibold">Proposed Scenario</th>
              <th className="py-3 px-4 text-right font-semibold">Delta</th>
              <th className="py-3 px-4 text-right font-semibold">Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isZero = Math.abs(row.delta) < 0.001;
              const isFavorable = row.lowerIsBetter
                ? row.delta < 0
                : row.delta > 0;

              let deltaColor = "text-slate-500";
              let badgeColor = "bg-slate-100 text-slate-600 border border-slate-200";
              if (!isZero) {
                deltaColor = isFavorable ? "text-emerald-600" : "text-rose-600";
                badgeColor = isFavorable
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                  : "bg-rose-50 text-rose-700 border border-rose-200/80";
              }

              return (
                <tr
                  key={row.metricKey}
                  className="hover:bg-orange-50/30 transition-colors"
                  data-testid={`row-${row.metricKey}`}
                >
                  <td className="py-3.5 px-4 font-sans text-slate-800 font-medium">
                    {row.label}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-600">
                    {row.current.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] text-slate-400">{row.unit}</span>
                  </td>
                  <td
                    className="py-3.5 px-4 text-right font-bold text-slate-900"
                    data-testid={`proposed-${row.metricKey}`}
                  >
                    {row.proposed.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] text-slate-500">{row.unit}</span>
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-bold ${deltaColor}`}
                    data-testid={`delta-${row.metricKey}`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {isZero ? (
                        <Minus className="w-3.5 h-3.5 text-slate-400" />
                      ) : row.delta > 0 ? (
                        <ArrowUp className="w-3.5 h-3.5" data-testid="arrow-up" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5" data-testid="arrow-down" />
                      )}
                      <span>
                        {row.delta > 0 ? "+" : ""}
                        {row.delta.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${badgeColor}`}
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
