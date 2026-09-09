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
        <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                  Production &amp; Thermal Trajectory
                </h3>
                <span className="text-xs text-slate-500 font-sans block mt-0.5">
                  Coupled 10-day oil rate &amp; downhole flowing temperature
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
              {productionHistory?.length ?? 0} Records Logged
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
              <span className="text-xs font-mono text-slate-500">Loading telemetry...</span>
            </div>
          ) : displayRecords.length > 0 ? (
            <div className="flex flex-col gap-2 pt-2">
              <div className="overflow-x-auto w-full border border-slate-200 rounded-2xl">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-xs text-slate-700 uppercase font-bold tracking-wider font-sans">
                      <th className="py-3 px-3.5">Date</th>
                      <th className="py-3 px-3.5 text-right">Oil (BOPD)</th>
                      <th className="py-3 px-3.5 text-right">Water (BWPD)</th>
                      <th className="py-3 px-3.5 text-right">Cut</th>
                      <th className="py-3 px-3.5 text-right">Temp (°C)</th>
                      <th className="py-3 px-3.5 text-right">Press (MPa)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {displayRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-orange-50/20 transition-colors">
                        <td className="py-3 px-3.5 text-slate-800 font-semibold font-sans">
                          {new Date(r.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-orange-600 text-sm">
                          {r.oil_rate_bopd.toFixed(1)}
                        </td>
                        <td className="py-3 px-3.5 text-right text-slate-700 font-medium">
                          {r.water_rate_bwpd.toFixed(1)}
                        </td>
                        <td className="py-3 px-3.5 text-right text-slate-800 font-bold">
                          {(r.water_cut * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 px-3.5 text-right text-slate-900 font-extrabold">
                          {r.temperature_c.toFixed(1)}
                        </td>
                        <td className="py-3 px-3.5 text-right text-sky-700 font-bold">
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
                  className="self-center mt-2 text-xs font-mono font-bold text-slate-700 hover:text-orange-600 transition flex items-center gap-1.5 py-1.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 shadow-2xs"
                >
                  {showAllRows ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>View All Records ({productionHistory.length})</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono py-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
              No historical production records returned.
            </div>
          )}
        </div>

        {/* Right (5 Cols): CSS Cycles Timeline */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                    CSS Cycles History
                  </h3>
                  <span className="text-xs text-slate-500 font-sans block mt-0.5">
                    Thermal injection runs &amp; steam quality
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
                {cssCycles?.length ?? 0} Cycles
              </span>
            </div>

            {/* Connected Vertical Stepper */}
            {cssCycles && cssCycles.length > 0 ? (
              <div className="mt-5 flex flex-col gap-3.5 font-mono text-xs">
                {cssCycles.map((c) => {
                  const isLatest = c.cycle_id === cssCycles.length;
                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isLatest
                          ? "bg-orange-50/60 border-orange-300 shadow-xs"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-xs ${
                            isLatest
                              ? "bg-orange-600 text-white"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          C{c.cycle_id}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">
                              Cycle #{c.cycle_id}
                            </span>
                            {isLatest && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 font-bold uppercase border border-orange-300">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 font-sans mt-0.5 font-medium">
                            {c.steam_pressure} MPa &bull; {c.steam_temperature_c}&deg;C
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-orange-600 text-base">
                          {c.steam_volume_t.toLocaleString()}t
                        </span>
                        <div className="text-xs text-sky-800 font-bold mt-0.5">
                          {(c.steam_quality * 100).toFixed(0)}% Quality
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono py-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                No historical cycle records returned.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-600 font-medium">
            <span>Cumulative Steam: ~11,940t</span>
            <span className="text-slate-900 font-bold">Avg SOR: 2.7 t/bbl</span>
          </div>
        </div>
      </div>
    </div>
  );
}
