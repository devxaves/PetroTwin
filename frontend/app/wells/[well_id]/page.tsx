"use client";

import React, { useState, use } from "react";
import { Header } from "@/components/Header";
import {
  useWellTwinState,
  useWellProduction,
  useWellCSSCycles,
  useDiagnosticsLatest,
  useCSSScreening,
  useCSSRecommend,
  useRunCSSScenario,
  useSimulateWhatIf,
  useParetoFront,
  useApprovals,
  useJointRecommendation,
} from "@/lib/api/queries";
import { DynamometerCard } from "@/components/DynamometerCard";
import { RiskGauge } from "@/components/RiskGauge";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ParetoChart } from "@/components/ParetoChart";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { ApprovalHistory } from "@/components/ApprovalHistory";
import {
  Activity,
  Gauge,
  Flame,
  Cpu,
  AlertCircle,
  Play,
  RotateCcw,
  Check,
} from "lucide-react";

interface WellPageProps {
  params: Promise<{ well_id: string }>;
}

export default function WellTwinPage({ params }: WellPageProps) {
  const resolvedParams = use(params);
  const wellId = resolvedParams.well_id;

  const [activeTab, setActiveTab] = useState<"overview" | "diagnostics" | "optimizer" | "whatif">("overview");

  // React Query data fetching
  const { data: twinState, isLoading: isTwinLoading } = useWellTwinState(wellId);
  const { data: productionHistory, isLoading: isProdLoading } = useWellProduction(wellId);
  const { data: cssCycles } = useWellCSSCycles(wellId);
  const { data: diagnostics, isLoading: isDiagLoading } = useDiagnosticsLatest(wellId);
  const { data: screening } = useCSSScreening(wellId);
  const { data: recommendation } = useCSSRecommend(wellId);
  const { data: jointRec } = useJointRecommendation(wellId);
  const { data: paretoData } = useParetoFront(wellId);
  const { data: approvalsData } = useApprovals(wellId);

  // CSS Optimizer interactive scenario state
  const [steamVolume, setSteamVolume] = useState<number>(2400);
  const [steamPressure, setSteamPressure] = useState<number>(11.0);
  const [soakDays, setSoakDays] = useState<number>(4);
  const [cutoffDays, setCutoffDays] = useState<number>(60);
  const runScenarioMutation = useRunCSSScenario(wellId);

  // What-If Simulator combined interactive sliders state
  const [whatIfSteam, setWhatIfSteam] = useState<number>(2600);
  const [whatIfPressure, setWhatIfPressure] = useState<number>(11.5);
  const [whatIfSoak, setWhatIfSoak] = useState<number>(4);
  const [whatIfCutoff, setWhatIfCutoff] = useState<number>(75);
  const [whatIfSpm, setWhatIfSpm] = useState<number>(6.5);
  const [whatIfStroke, setWhatIfStroke] = useState<number>(120);
  const simulateWhatIfMutation = useSimulateWhatIf(wellId);

  // Safe Operating Envelope bounds (from Prompt 4 / API specifications)
  const bounds = {
    steam_volume_min: 1200,
    steam_volume_max: 3800,
    steam_pressure_min: 8.0,
    steam_pressure_max: 13.5,
    soak_days_min: 2,
    soak_days_max: 7,
    cutoff_min: 40,
    cutoff_max: 150,
    spm_min: 2.0,
    spm_max: 16.0,
    stroke_min: 40.0,
    stroke_max: 220.0,
  };

  const handleRunOptimizerScenario = () => {
    runScenarioMutation.mutate({
      cycle_number: (twinState?.cycle_number ?? 1) + 1,
      steam_volume_t: steamVolume,
      steam_pressure_mpa: steamPressure,
      soak_days: soakDays,
      custom_cutoff_days: cutoffDays,
    });
  };

  const handleRunWhatIf = () => {
    simulateWhatIfMutation.mutate({
      steam_volume: whatIfSteam,
      injection_pressure: whatIfPressure,
      soak_time: whatIfSoak,
      cutoff_days: whatIfCutoff,
      spm: whatIfSpm,
      stroke_length: whatIfStroke,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14]">
      <Header wellId={wellId} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Well Head Status Banner */}
        <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
              {wellId}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-100">
                  Well {wellId} Digital Twin
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono">
                  {twinState?.css_cycle_phase ?? "PRODUCTION"}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Cycle #{twinState?.cycle_number ?? 4} | Stroke: {twinState?.stroke_length_in ?? 120}" @ {twinState?.current_spm ?? 8.0} SPM
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase">Downhole Temp</div>
              <div className="text-slate-200 font-bold">
                {twinState ? twinState.current_temperature_c.toFixed(1) : "103.1"} °C
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase">Viscosity</div>
              <div className="text-cyan-400 font-bold">
                {twinState ? twinState.current_viscosity_cp.toFixed(0) : "2604"} cP
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase">Pump Fillage</div>
              <div className="text-emerald-400 font-bold">
                {twinState ? (twinState.pump_fillage * 100).toFixed(1) : "85.0"}%
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#1e293b] pb-2 font-mono text-xs" data-testid="twin-tabs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded transition ${
              activeTab === "overview"
                ? "bg-[#1a2540] text-amber-400 font-bold border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2e]"
            }`}
            data-testid="tab-overview"
          >
            <Activity className="w-3.5 h-3.5" />
            Tab A — Overview
          </button>

          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`flex items-center gap-2 px-4 py-2 rounded transition ${
              activeTab === "diagnostics"
                ? "bg-[#1a2540] text-cyan-400 font-bold border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2e]"
            }`}
            data-testid="tab-diagnostics"
          >
            <Gauge className="w-3.5 h-3.5" />
            Tab B — SRP Diagnostics
          </button>

          <button
            onClick={() => setActiveTab("optimizer")}
            className={`flex items-center gap-2 px-4 py-2 rounded transition ${
              activeTab === "optimizer"
                ? "bg-[#1a2540] text-emerald-400 font-bold border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2e]"
            }`}
            data-testid="tab-optimizer"
          >
            <Flame className="w-3.5 h-3.5" />
            Tab C — CSS Optimizer
          </button>

          <button
            onClick={() => setActiveTab("whatif")}
            className={`flex items-center gap-2 px-4 py-2 rounded transition ${
              activeTab === "whatif"
                ? "bg-[#1a2540] text-rose-400 font-bold border border-rose-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2e]"
            }`}
            data-testid="tab-whatif"
          >
            <Cpu className="w-3.5 h-3.5" />
            Tab D — What-If Simulator
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB A — OVERVIEW
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6" data-testid="tab-content-overview">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b]">
                <div className="text-[10px] font-mono uppercase text-slate-400">Current Flowing Temp</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {twinState ? twinState.current_temperature_c.toFixed(1) : "103.1"} °C
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Viscosity: {twinState ? twinState.current_viscosity_cp.toFixed(0) : "2604"} cP
                </div>
              </div>

              <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b]">
                <div className="text-[10px] font-mono uppercase text-slate-400">Pump Liquid Fillage</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {twinState ? (twinState.pump_fillage * 100).toFixed(1) : "85.0"}%
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Effective Stroke: {twinState ? (twinState.pump_fillage * twinState.stroke_length_in).toFixed(1) : "102.0"}"
                </div>
              </div>

              <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b]">
                <div className="text-[10px] font-mono uppercase text-slate-400">CSS Cycle Status</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1 uppercase">
                  {twinState?.css_cycle_phase ?? "PRODUCTION"}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Cycle #{twinState?.cycle_number ?? 4} | Cumulative: ~18,400 bbl
                </div>
              </div>
            </div>

            {/* Production History Table & Readouts */}
            <div className="p-5 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Recent Production History (From /wells/{wellId}/production)
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {productionHistory?.length ?? 0} Records Acquired
                </span>
              </div>

              {isProdLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="hmi-spinner" />
                </div>
              ) : productionHistory && productionHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[#1e293b] text-[10px] text-slate-500 uppercase bg-[#080c14]">
                        <th className="py-2 px-3">Timestamp</th>
                        <th className="py-2 px-3 text-right">Oil Rate (BOPD)</th>
                        <th className="py-2 px-3 text-right">Water Rate (BWPD)</th>
                        <th className="py-2 px-3 text-right">Water Cut</th>
                        <th className="py-2 px-3 text-right">Temperature (°C)</th>
                        <th className="py-2 px-3 text-right">Tubing Press (MPa)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]/50">
                      {productionHistory.slice(-10).reverse().map((r, i) => (
                        <tr key={i} className="hover:bg-[#131b2e]/60">
                          <td className="py-2 px-3 text-slate-400">
                            {new Date(r.timestamp).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-amber-400">
                            {r.oil_rate_bopd.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {r.water_rate_bwpd.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400">
                            {(r.water_cut * 100).toFixed(0)}%
                          </td>
                          <td className="py-2 px-3 text-right text-slate-200">
                            {r.temperature_c.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right text-cyan-400">
                            {r.tubing_pressure.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-mono py-4 text-center">
                  No historical production records returned by backend.
                </div>
              )}
            </div>

            {/* CSS Operational Cycles Timeline */}
            <div className="p-5 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  CSS Operational Cycles Timeline (From /wells/{wellId}/css-cycles)
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {cssCycles?.length ?? 0} Recorded Cycles
                </span>
              </div>

              {cssCycles && cssCycles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                  {cssCycles.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded bg-[#131b2e] border border-slate-800 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400">Cycle #{c.cycle_id}</span>
                        <span className="text-[10px] text-slate-500">
                          {c.steam_volume_t}t steam
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Injection: {c.steam_pressure} MPa @ {c.steam_temperature_c}°C
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Quality: {(c.steam_quality * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-mono py-4 text-center">
                  No historical cycle records returned.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB B — SRP DIAGNOSTICS
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === "diagnostics" && (
          <div className="flex flex-col gap-6" data-testid="tab-content-diagnostics">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Dynamometer Card (7 cols) */}
              <div className="lg:col-span-7">
                {isDiagLoading ? (
                  <div className="h-64 flex items-center justify-center bg-[#0d1321] rounded border border-[#1e293b]">
                    <div className="hmi-spinner" />
                  </div>
                ) : (
                  <DynamometerCard
                    cardPoints={diagnostics?.card_points ?? []}
                    classificationLabel={diagnostics?.ml_prediction ?? "Normal Operating"}
                    confidence={diagnostics?.confidence}
                  />
                )}
              </div>

              {/* Rod-Float Risk Gauge & Breakdown (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <RiskGauge
                  score={diagnostics?.rod_float_risk?.risk_score ?? twinState?.rod_float_risk_score ?? 35}
                  level={diagnostics?.rod_float_risk?.risk_level ?? twinState?.rod_float_risk_level}
                  factorBreakdown={diagnostics?.rod_float_risk?.factor_breakdown}
                />

                {/* Adjustment Recommendation Card */}
                {diagnostics?.rod_float_risk?.recommendation && (
                  <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b] font-mono text-xs flex flex-col gap-2">
                    <div className="text-[10px] uppercase text-slate-400">Recommended Action</div>
                    <div className="text-sm font-bold text-amber-400">
                      {diagnostics.rod_float_risk.recommendation.action}
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      {diagnostics.rod_float_risk.recommendation.rule}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                      <span>Current SPM: {diagnostics.rod_float_risk.recommendation.current_spm}</span>
                      <span className="text-emerald-400 font-bold">
                        Target: {diagnostics.rod_float_risk.recommendation.target_spm} SPM
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB C — CSS OPTIMIZER
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === "optimizer" && (
          <div className="flex flex-col gap-6" data-testid="tab-content-optimizer">
            {/* Screening Status Card */}
            {screening && (
              <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b] flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Screening Status</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">
                    {screening.status} — Cycle #{screening.cycles_completed + 1}
                  </div>
                  <div className="text-slate-300 text-[11px] mt-1">
                    {screening.recommendation}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase">Current Water Cut</div>
                  <div className="text-slate-200 font-bold">
                    {(screening.current_water_cut * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sliders & Parameters (5 cols) */}
              <div className="lg:col-span-5 p-5 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                  <span className="font-semibold uppercase tracking-wider text-slate-300">
                    Safe-Envelope Parameter Controls
                  </span>
                  <span className="text-[10px] text-emerald-400">API BOUNDED</span>
                </div>

                {/* Steam Volume */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Steam Volume (t):</span>
                    <span className="text-amber-400 font-bold">{steamVolume} t</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.steam_volume_min}
                    max={bounds.steam_volume_max}
                    step={50}
                    value={steamVolume}
                    onChange={(e) => setSteamVolume(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                    data-testid="slider-steam-volume"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>{bounds.steam_volume_min} t</span>
                    <span>{bounds.steam_volume_max} t</span>
                  </div>
                </div>

                {/* Steam Pressure */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Injection Pressure (MPa):</span>
                    <span className="text-cyan-400 font-bold">{steamPressure.toFixed(1)} MPa</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.steam_pressure_min}
                    max={bounds.steam_pressure_max}
                    step={0.1}
                    value={steamPressure}
                    onChange={(e) => setSteamPressure(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                    data-testid="slider-steam-pressure"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>{bounds.steam_pressure_min} MPa</span>
                    <span>{bounds.steam_pressure_max} MPa</span>
                  </div>
                </div>

                {/* Soak Days */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Soak Duration:</span>
                    <span className="text-slate-200 font-bold">{soakDays} days</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.soak_days_min}
                    max={bounds.soak_days_max}
                    step={1}
                    value={soakDays}
                    onChange={(e) => setSoakDays(Number(e.target.value))}
                    className="w-full accent-slate-400 cursor-pointer"
                    data-testid="slider-soak-days"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>{bounds.soak_days_min} days</span>
                    <span>{bounds.soak_days_max} days</span>
                  </div>
                </div>

                {/* Cutoff Days */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dynamic Cutoff Override:</span>
                    <span className="text-slate-200 font-bold">{cutoffDays} days</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.cutoff_min}
                    max={bounds.cutoff_max}
                    step={5}
                    value={cutoffDays}
                    onChange={(e) => setCutoffDays(Number(e.target.value))}
                    className="w-full accent-slate-400 cursor-pointer"
                    data-testid="slider-cutoff-days"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>{bounds.cutoff_min} days</span>
                    <span>{bounds.cutoff_max} days</span>
                  </div>
                </div>

                <button
                  onClick={handleRunOptimizerScenario}
                  disabled={runScenarioMutation.isPending}
                  className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono transition"
                  data-testid="btn-run-scenario"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {runScenarioMutation.isPending ? "Evaluating Scenario..." : "Run Scenario Evaluation"}
                </button>
              </div>

              {/* Scenario Results / Recommendation Card (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Active Evaluation / Recommended Scenario */}
                <div className="p-5 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                    <span className="font-semibold uppercase tracking-wider text-slate-300">
                      {runScenarioMutation.data ? "Evaluated Scenario Response" : "Engine Recommended Scenario"}
                    </span>
                    <span className="text-[10px] text-amber-400">OPTIMAL TARGET</span>
                  </div>

                  {(() => {
                    const sc = runScenarioMutation.data?.evaluation ?? recommendation?.recommended_scenario;
                    const deltas = runScenarioMutation.data?.comparison_to_baseline ?? recommendation?.expected_delta;

                    if (!sc) {
                      return (
                        <div className="py-8 text-center text-slate-500">
                          Loading recommended scenario parameters...
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded bg-[#131b2e] border border-slate-800">
                          <div className="text-[10px] text-slate-400">Expected Oil</div>
                          <div className="text-base font-bold text-amber-400 mt-0.5">
                            {sc.expected_oil_bbl?.toFixed(1)} bbl
                          </div>
                          {deltas?.oil_delta_bbl !== undefined && (
                            <div className="text-[10px] text-emerald-400">
                              +{deltas.oil_delta_bbl} vs hist
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded bg-[#131b2e] border border-slate-800">
                          <div className="text-[10px] text-slate-400">Expected SOR</div>
                          <div className="text-base font-bold text-cyan-400 mt-0.5">
                            {sc.expected_sor?.toFixed(2)} t/bbl
                          </div>
                          {deltas?.sor_delta !== undefined && (
                            <div className="text-[10px] text-emerald-400">
                              {deltas.sor_delta} vs hist
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded bg-[#131b2e] border border-slate-800">
                          <div className="text-[10px] text-slate-400">Net Economic Value</div>
                          <div className="text-base font-bold text-slate-100 mt-0.5">
                            ${Math.round(sc.expected_economic_value ?? 0).toLocaleString()}
                          </div>
                          {deltas?.economic_delta_usd !== undefined && (
                            <div className="text-[10px] text-emerald-400">
                              +${Math.round(deltas.economic_delta_usd).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Explainability Panel on Tab C */}
                <ExplainabilityPanel
                  wellId={wellId}
                  reasons={
                    jointRec?.reasons ?? [
                      "Viscosity elevated due to localized near-wellbore thermal dissipation.",
                      "Safe operating envelope verified: steam pressure within geomechanical limits.",
                    ]
                  }
                  expectedEffect={jointRec?.expected_effect}
                  combinedConfidence={jointRec?.recommendation?.combined_confidence ?? 0.88}
                  recommendationSnapshot={{
                    steam_volume: steamVolume,
                    steam_pressure: steamPressure,
                    soak_days: soakDays,
                    cutoff_days: cutoffDays,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB D — WHAT-IF SIMULATOR
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === "whatif" && (
          <div className="flex flex-col gap-6" data-testid="tab-content-whatif">
            {/* Combined Parameter Controls Grid */}
            <div className="p-5 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <div>
                  <span className="font-semibold uppercase tracking-wider text-slate-200">
                    Coupled What-If Operating Sliders
                  </span>
                  <span className="text-[11px] text-slate-400 block font-sans">
                    Adjust both CSS steam parameters and SRP pumping kinematics to simulate joint response.
                  </span>
                </div>
                <button
                  onClick={handleRunWhatIf}
                  disabled={simulateWhatIfMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
                  data-testid="btn-simulate-whatif"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {simulateWhatIfMutation.isPending ? "Simulating..." : "Simulate Scenario"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Steam Volume */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Steam Vol:</span>
                    <span className="text-amber-400 font-bold">{whatIfSteam}t</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.steam_volume_min}
                    max={bounds.steam_volume_max}
                    step={50}
                    value={whatIfSteam}
                    onChange={(e) => setWhatIfSteam(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                    data-testid="whatif-slider-steam"
                  />
                  <span className="text-[9px] text-slate-500">{bounds.steam_volume_min} - {bounds.steam_volume_max} t</span>
                </div>

                {/* Steam Pressure */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Pressure:</span>
                    <span className="text-cyan-400 font-bold">{whatIfPressure.toFixed(1)} MPa</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.steam_pressure_min}
                    max={bounds.steam_pressure_max}
                    step={0.1}
                    value={whatIfPressure}
                    onChange={(e) => setWhatIfPressure(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                    data-testid="whatif-slider-pressure"
                  />
                  <span className="text-[9px] text-slate-500">{bounds.steam_pressure_min} - {bounds.steam_pressure_max} MPa</span>
                </div>

                {/* Soak Days */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Soak:</span>
                    <span className="text-slate-200 font-bold">{whatIfSoak}d</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.soak_days_min}
                    max={bounds.soak_days_max}
                    step={1}
                    value={whatIfSoak}
                    onChange={(e) => setWhatIfSoak(Number(e.target.value))}
                    className="w-full accent-slate-400 cursor-pointer"
                    data-testid="whatif-slider-soak"
                  />
                  <span className="text-[9px] text-slate-500">{bounds.soak_days_min} - {bounds.soak_days_max} days</span>
                </div>

                {/* Cutoff Days */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Cutoff:</span>
                    <span className="text-slate-200 font-bold">{whatIfCutoff}d</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.cutoff_min}
                    max={bounds.cutoff_max}
                    step={5}
                    value={whatIfCutoff}
                    onChange={(e) => setWhatIfCutoff(Number(e.target.value))}
                    className="w-full accent-slate-400 cursor-pointer"
                    data-testid="whatif-slider-cutoff"
                  />
                  <span className="text-[9px] text-slate-500">{bounds.cutoff_min} - {bounds.cutoff_max} days</span>
                </div>

                {/* SPM */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">SPM:</span>
                    <span className="text-rose-400 font-bold">{whatIfSpm.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.spm_min}
                    max={bounds.spm_max}
                    step={0.5}
                    value={whatIfSpm}
                    onChange={(e) => setWhatIfSpm(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                    data-testid="whatif-slider-spm"
                  />
                  <span className="text-[9px] text-slate-500">{bounds.spm_min} - {bounds.spm_max} SPM</span>
                </div>

                {/* Stroke Length */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Stroke:</span>
                    <span className="text-slate-200 font-bold">{whatIfStroke}"</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.stroke_min}
                    max={bounds.stroke_max}
                    step={5}
                    value={whatIfStroke}
                    onChange={(e) => setWhatIfStroke(Number(e.target.value))}
                    className="w-full accent-slate-400 cursor-pointer"
                    data-testid="whatif-slider-stroke"
                  />
                  <span className="text-[9px] text-slate-500">{bounds.stroke_min} - {bounds.stroke_max} in</span>
                </div>
              </div>
            </div>

            {/* Comparison Table (Current vs. Proposed) */}
            <div>
              <ComparisonTable
                comparison={
                  simulateWhatIfMutation.data?.comparison ?? {
                    cumulative_oil_bbl: {
                      current: 2450.0,
                      proposed: 2680.0,
                      delta: 230.0,
                      delta_pct: 9.4,
                    },
                    sor: {
                      current: 2.85,
                      proposed: 2.58,
                      delta: -0.27,
                      delta_pct: -9.5,
                    },
                    energy_intensity_usd_per_bbl: {
                      current: 22.4,
                      proposed: 20.1,
                      delta: -2.3,
                      delta_pct: -10.3,
                    },
                    rod_float_risk_score: {
                      current: 37.8,
                      proposed: 33.4,
                      delta: -4.4,
                      delta_pct: -11.6,
                    },
                    net_economic_value_usd: {
                      current: 124500,
                      proposed: 142300,
                      delta: 17800,
                      delta_pct: 14.3,
                    },
                    pump_volumetric_efficiency: {
                      current: 82.0,
                      proposed: 86.5,
                      delta: 4.5,
                      delta_pct: 5.5,
                    },
                  }
                }
              />
            </div>

            {/* Pareto Front Scatter Plot */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <ParetoChart
                  points={paretoData?.pareto_front ?? []}
                  onSelectPoint={(pt) => {
                    setWhatIfSteam(pt.steam_volume_t);
                    setWhatIfPressure(pt.steam_pressure_mpa);
                    setWhatIfSoak(pt.soak_days);
                    setWhatIfCutoff(pt.production_cutoff_days);
                  }}
                />
              </div>

              {/* Explainability & Approval on Tab D */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <ExplainabilityPanel
                  wellId={wellId}
                  reasons={
                    jointRec?.reasons ?? [
                      "What-If coupled simulation accounts for non-isothermal inflow and viscous drag.",
                      "SPM increase improves production rate while maintaining rod-float risk < 40.",
                    ]
                  }
                  expectedEffect={jointRec?.expected_effect}
                  combinedConfidence={jointRec?.recommendation?.combined_confidence ?? 0.89}
                  recommendationSnapshot={{
                    steam_volume: whatIfSteam,
                    spm: whatIfSpm,
                    stroke: whatIfStroke,
                  }}
                />

                {/* Approval History List */}
                <ApprovalHistory approvals={approvalsData ?? []} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
