"use client";

import React, { useState } from "react";
import type { WellTwinState } from "@/lib/api/types";
import { useWellProduction, useWellCSSCycles } from "@/lib/api/queries";
import { WellSchematicTwin } from "./WellSchematicTwin";
import { ProductionTrendChart } from "./ProductionTrendChart";
import { Database, Flame, ChevronDown, ChevronUp } from "lucide-react";

interface OverviewTabProps {
  wellId: string;
  twinState?: WellTwinState;
}

/**
 * Tab A — Overview.
 * High-impact SCADA operations view:
 * 1. Live Subsurface Digital Twin Schematic
 * 2. 10-Day Production Trajectory Chart & Compact Multi-sensor Telemetry Table
 * 3. Connected CSS Operational Cycles Timeline
 */
export function OverviewTab({ wellId, twinState }: OverviewTabProps) {
  const { data: productionHistory, isLoading: isProdLoading } =
    useWellProduction(wellId);
  const { data: cssCycles } = useWellCSSCycles(wellId);
  const [showAllRows, setShowAllRows] = useState(false);

  const displayRecords = productionHistory
    ? showAllRows
      ? [...productionHistory].reverse()
      : [...productionHistory].slice(-5).reverse()
    : [];

  return (
    <div className="flex flex-col gap-6" data-testid="tab-content-overview">
      {/* 1. Live Animated Subsurface Digital Twin Schematic */}
      <WellSchematicTwin wellId={wellId} twinState={twinState} />

      {/* 2. Grid: Production Trajectory & Telemetry Table + CSS Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left (7 Cols): Production & Thermal Trend + Telemetry Log */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3.5 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                  Production &amp; Thermal Trajectory
                </h3>
                <span className="text-xs text-slate-500 font-sans">
                  Coupled 10-day oil rate &amp; downhole flowing temperature
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
              {productionHistory?.length ?? 0} Records
            </span>
          </div>

          {/* Interactive Dual-Axis Trend Chart */}
          {productionHistory && productionHistory.length > 0 && (
            <ProductionTrendChart records={productionHistory} />
          )}

          {/* Telemetry Data Table */}
          {isProdLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin" />
              <span className="text-xs font-mono text-slate-400">Loading telemetry...</span>
            </div>
          ) : displayRecords.length > 0 ? (
            <div className="flex flex-col gap-2 pt-2">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] text-slate-500 uppercase font-semibold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Oil (BOPD)</th>
                      <th className="py-2.5 px-3 text-right">Water (BWPD)</th>
                      <th className="py-2.5 px-3 text-right">Cut</th>
                      <th className="py-2.5 px-3 text-right">Temp (°C)</th>
                      <th className="py-2.5 px-3 text-right">Press (MPa)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {displayRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-600">
                          {new Date(r.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-orange-600">
                          {r.oil_rate_bopd.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {r.water_rate_bwpd.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {(r.water_cut * 100).toFixed(0)}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-800 font-medium">
                          {r.temperature_c.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-sky-700 font-medium">
                          {r.tubing_pressure.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {productionHistory && productionHistory.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllRows((prev) => !prev)}
                  className="self-center mt-1 text-xs font-mono text-slate-500 hover:text-orange-600 transition flex items-center gap-1 py-1 px-3 rounded-lg hover:bg-slate-50"
                >
                  {showAllRows ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View All Records ({productionHistory.length})</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono py-6 text-center bg-slate-50 rounded-xl">
              No historical production records returned.
            </div>
          )}
        </div>

        {/* Right (5 Cols): CSS Cycles Timeline */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3.5 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                    CSS Cycles History
                  </h3>
                  <span className="text-xs text-slate-500 font-sans">
                    Thermal injection runs &amp; steam quality
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                {cssCycles?.length ?? 0} Cycles
              </span>
            </div>

            {/* Connected Vertical / Horizontal Stepper */}
            {cssCycles && cssCycles.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3 font-mono text-xs">
                {cssCycles.map((c) => {
                  const isLatest = c.cycle_id === cssCycles.length;
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                        isLatest
                          ? "bg-orange-50/50 border-orange-200"
                          : "bg-slate-50/80 border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isLatest
                              ? "bg-orange-600 text-white shadow-xs"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          C{c.cycle_id}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              Cycle #{c.cycle_id}
                            </span>
                            {isLatest && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {c.steam_pressure} MPa &bull; {c.steam_temperature_c}&deg;C
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-orange-600 text-sm">
                          {c.steam_volume_t.toLocaleString()}t
                        </span>
                        <div className="text-[10px] text-sky-700 font-semibold mt-0.5">
                          {(c.steam_quality * 100).toFixed(0)}% Quality
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-mono py-8 text-center bg-slate-50 rounded-xl">
                No historical cycle records returned.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Cumulative Steam: ~11,940t</span>
            <span className="text-slate-600 font-medium">Avg SOR: 2.7 t/bbl</span>
          </div>
        </div>
      </div>
    </div>
  );
}
