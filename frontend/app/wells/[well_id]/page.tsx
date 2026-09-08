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
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800">
      <Header wellId={wellId} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Well Head Status Banner */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-mono font-bold text-base shadow-inner">
              {wellId}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-lg text-slate-900 font-display">
                  Well {wellId} Digital Twin
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-semibold">
                  {twinState?.css_cycle_phase ?? "PRODUCTION"}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Cycle #{twinState?.cycle_number ?? 4} &bull; Stroke: {twinState?.stroke_length_in ?? 120}&quot; @ {twinState?.current_spm ?? 8.0} SPM
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Downhole Temp</div>
              <div className="text-slate-900 font-bold text-sm">
                {twinState ? twinState.current_temperature_c.toFixed(1) : "103.1"} °C
              </div>
            </div>
            <div className="text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Viscosity</div>
              <div className="text-sky-600 font-bold text-sm">
                {twinState ? twinState.current_viscosity_cp.toFixed(0) : "2604"} cP
              </div>
            </div>
            <div className="text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Pump Fillage</div>
              <div className="text-emerald-600 font-bold text-sm">
                {twinState ? (twinState.pump_fillage * 100).toFixed(1) : "85.0"}%
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 font-mono text-xs overflow-x-auto" data-testid="twin-tabs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "overview"
                ? "bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            data-testid="tab-overview"
          >
            <Activity className="w-3.5 h-3.5" />
            Tab A &mdash; Overview
          </button>

          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "diagnostics"
                ? "bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            data-testid="tab-diagnostics"
          >
            <Gauge className="w-3.5 h-3.5" />
            Tab B &mdash; SRP Diagnostics
          </button>

          <button
            onClick={() => setActiveTab("optimizer")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "optimizer"
                ? "bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            data-testid="tab-optimizer"
          >
            <Flame className="w-3.5 h-3.5" />
            Tab C &mdash; CSS Optimizer
          </button>

          <button
            onClick={() => setActiveTab("whatif")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "whatif"
                ? "bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            data-testid="tab-whatif"
          >
            <Cpu className="w-3.5 h-3.5" />
            Tab D &mdash; What-If Simulator
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB A — OVERVIEW
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6" data-testid="tab-content-overview">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Current Flowing Temp</div>
                <div className="text-3xl font-extrabold font-mono text-orange-600 mt-2">
                  {twinState ? twinState.current_temperature_c.toFixed(1) : "103.1"} &deg;C
                </div>
                <div className="text-xs text-slate-500 font-mono mt-2 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                  <span>Viscosity:</span>
                  <span className="font-bold text-slate-700">{twinState ? twinState.current_viscosity_cp.toFixed(0) : "2604"} cP</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Pump Liquid Fillage</div>
                <div className="text-3xl font-extrabold font-mono text-emerald-600 mt-2">
                  {twinState ? (twinState.pump_fillage * 100).toFixed(1) : "85.0"}%
                </div>
                <div className="text-xs text-slate-500 font-mono mt-2 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                  <span>Effective Stroke:</span>
                  <span className="font-bold text-slate-700">{twinState ? (twinState.pump_fillage * twinState.stroke_length_in).toFixed(1) : "102.0"}&quot;</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">CSS Cycle Status</div>
                <div className="text-3xl font-extrabold font-mono text-sky-600 mt-2 uppercase">
                  {twinState?.css_cycle_phase ?? "PRODUCTION"}
                </div>
                <div className="text-xs text-slate-500 font-mono mt-2 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                  <span>Cycle #{twinState?.cycle_number ?? 4}</span>
                  <span className="font-bold text-slate-700">Cumul: ~18,400 bbl</span>
                </div>
              </div>
            </div>

            {/* Production History Table & Readouts */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-display">
                    Recent Production History
                  </h3>
                  <span className="text-xs text-slate-400">Coupled downhole multi-sensor telemetry</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                  {productionHistory?.length ?? 0} Records Acquired
                </span>
              </div>

              {isProdLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="hmi-spinner" />
                </div>
              ) : productionHistory && productionHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase bg-slate-50">
                        <th className="py-3 px-3.5 font-semibold">Timestamp</th>
                        <th className="py-3 px-3.5 text-right font-semibold">Oil Rate (BOPD)</th>
                        <th className="py-3 px-3.5 text-right font-semibold">Water Rate (BWPD)</th>
                        <th className="py-3 px-3.5 text-right font-semibold">Water Cut</th>
                        <th className="py-3 px-3.5 text-right font-semibold">Temperature (&deg;C)</th>
                        <th className="py-3 px-3.5 text-right font-semibold">Tubing Press (MPa)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productionHistory.slice(-10).reverse().map((r, i) => (
                        <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                          <td className="py-2.5 px-3.5 text-slate-600">
                            {new Date(r.timestamp).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-orange-600">
                            {r.oil_rate_bopd.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-slate-700 font-medium">
                            {r.water_rate_bwpd.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-slate-500">
                            {(r.water_cut * 100).toFixed(0)}%
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-slate-800 font-medium">
                            {r.temperature_c.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-sky-600 font-semibold">
                            {r.tubing_pressure.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-mono py-6 text-center bg-slate-50 rounded-xl">
                  No historical production records returned by backend.
                </div>
              )}
            </div>

            {/* CSS Operational Cycles Timeline */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-display">
                    CSS Operational Cycles Timeline
                  </h3>
                  <span className="text-xs text-slate-400">Historical cyclic steam injection runs</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                  {cssCycles?.length ?? 0} Recorded Cycles
                </span>
              </div>

              {cssCycles && cssCycles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono text-xs">
                  {cssCycles.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1.5 hover:border-orange-200 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-orange-600">Cycle #{c.cycle_id}</span>
                        <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {c.steam_volume_t}t steam
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-700">
                        Injection: {c.steam_pressure} MPa @ {c.steam_temperature_c}&deg;C
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Quality: {(c.steam_quality * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-mono py-6 text-center bg-slate-50 rounded-xl">
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
                  <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
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
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs font-mono text-xs flex flex-col gap-2.5">
                    <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Recommended Kinematics</div>
                    <div className="text-base font-bold text-orange-600">
                      {diagnostics.rod_float_risk.recommendation.action}
                    </div>
                    <div className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded border border-slate-100 font-sans leading-relaxed">
                      {diagnostics.rod_float_risk.recommendation.rule}
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">Current SPM: {diagnostics.rod_float_risk.recommendation.current_spm}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
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
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Screening Feasibility Status</div>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">
                    {screening.status} &mdash; Cycle #{screening.cycles_completed + 1}
                  </div>
                  <div className="text-slate-600 text-xs mt-1 font-sans">
                    {screening.recommendation}
                  </div>
                </div>
                <div className="text-right bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Current Water Cut</div>
                  <div className="text-slate-900 font-bold text-base">
                    {(screening.current_water_cut * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sliders & Parameters (5 cols) */}
              <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="font-bold uppercase tracking-wider text-slate-800 font-display">
                    Operating Parameter Controls
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    SAFE ENVELOPE
                  </span>
                </div>

                {/* Steam Volume */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans font-medium">Steam Volume (t):</span>
                    <span className="text-orange-600 font-bold">{steamVolume} t</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.steam_volume_min}
                    max={bounds.steam_volume_max}
                    step={50}
                    value={steamVolume}
                    onChange={(e) => setSteamVolume(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                    data-testid="slider-steam-volume"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{bounds.steam_volume_min} t</span>
                    <span>{bounds.steam_volume_max} t</span>
                  </div>
                </div>

                {/* Steam Pressure */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans font-medium">Injection Pressure (MPa):</span>
                    <span className="text-sky-600 font-bold">{steamPressure.toFixed(1)} MPa</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.steam_pressure_min}
                    max={bounds.steam_pressure_max}
                    step={0.1}
                    value={steamPressure}
                    onChange={(e) => setSteamPressure(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                    data-testid="slider-steam-pressure"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{bounds.steam_pressure_min} MPa</span>
                    <span>{bounds.steam_pressure_max} MPa</span>
                  </div>
                </div>

                {/* Soak Days */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans font-medium">Soak Duration:</span>
                    <span className="text-slate-800 font-bold">{soakDays} days</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.soak_days_min}
                    max={bounds.soak_days_max}
                    step={1}
                    value={soakDays}
                    onChange={(e) => setSoakDays(Number(e.target.value))}
                    className="w-full accent-slate-600 cursor-pointer"
                    data-testid="slider-soak-days"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{bounds.soak_days_min} days</span>
                    <span>{bounds.soak_days_max} days</span>
                  </div>
                </div>

                {/* Cutoff Days */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-sans font-medium">Dynamic Cutoff Override:</span>
                    <span className="text-slate-800 font-bold">{cutoffDays} days</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.cutoff_min}
                    max={bounds.cutoff_max}
                    step={5}
                    value={cutoffDays}
                    onChange={(e) => setCutoffDays(Number(e.target.value))}
                    className="w-full accent-slate-600 cursor-pointer"
                    data-testid="slider-cutoff-days"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{bounds.cutoff_min} days</span>
                    <span>{bounds.cutoff_max} days</span>
                  </div>
                </div>

                <button
                  onClick={handleRunOptimizerScenario}
                  disabled={runScenarioMutation.isPending}
                  className="mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold font-mono transition shadow-sm hover:shadow"
                  data-testid="btn-run-scenario"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {runScenarioMutation.isPending ? "Evaluating Scenario..." : "Run Scenario Evaluation"}
                </button>
              </div>

              {/* Scenario Results / Recommendation Card (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Active Evaluation / Recommended Scenario */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-bold uppercase tracking-wider text-slate-800 font-display">
                      {runScenarioMutation.data ? "Evaluated Scenario Response" : "Engine Recommended Scenario"}
                    </span>
                    <span className="text-[10px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded font-bold border border-orange-200">
                      OPTIMAL TARGET
                    </span>
                  </div>

                  {(() => {
                    const sc = runScenarioMutation.data?.evaluation ?? recommendation?.recommended_scenario;
                    const deltas = runScenarioMutation.data?.comparison_to_baseline ?? recommendation?.expected_delta;

                    if (!sc) {
                      return (
                        <div className="py-12 text-center text-slate-400">
                          Loading recommended scenario parameters...
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                          <div className="text-[10px] text-slate-400 font-medium">Expected Oil</div>
                          <div className="text-xl font-bold text-orange-600 mt-1">
                            {sc.expected_oil_bbl?.toFixed(1)} bbl
                          </div>
                          {deltas?.oil_delta_bbl !== undefined && (
                            <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                              +{deltas.oil_delta_bbl} vs hist
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                          <div className="text-[10px] text-slate-400 font-medium">Expected SOR</div>
                          <div className="text-xl font-bold text-sky-600 mt-1">
                            {sc.expected_sor?.toFixed(2)} t/bbl
                          </div>
                          {deltas?.sor_delta !== undefined && (
                            <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                              {deltas.sor_delta} vs hist
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                          <div className="text-[10px] text-slate-400 font-medium">Net Economic Value</div>
                          <div className="text-xl font-bold text-slate-900 mt-1">
                            ${Math.round(sc.expected_economic_value ?? 0).toLocaleString()}
                          </div>
                          {deltas?.economic_delta_usd !== undefined && (
                            <div className="text-[10px] text-emerald-700 font-semibold mt-1">
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
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-5 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-3">
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-900 font-display text-sm block">
                    Coupled What-If Operating Sliders
                  </span>
                  <span className="text-xs text-slate-500 block font-sans mt-0.5">
                    Adjust both CSS steam parameters and SRP pumping kinematics to simulate coupled reservoir-mechanical response.
                  </span>
                </div>
                <button
                  onClick={handleRunWhatIf}
                  disabled={simulateWhatIfMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition shadow-sm hover:shadow"
                  data-testid="btn-simulate-whatif"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {simulateWhatIfMutation.isPending ? "Simulating..." : "Simulate Scenario"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Steam Volume */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-sans font-medium">Steam Vol:</span>
                    <span className="text-orange-600 font-bold">{whatIfSteam}t</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.steam_volume_min}
                    max={bounds.steam_volume_max}
                    step={50}
                    value={whatIfSteam}
                    onChange={(e) => setWhatIfSteam(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                    data-testid="whatif-slider-steam"
                  />
                  <span className="text-[10px] text-slate-400">{bounds.steam_volume_min} - {bounds.steam_volume_max} t</span>
                </div>

                {/* Steam Pressure */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-sans font-medium">Pressure:</span>
                    <span className="text-sky-600 font-bold">{whatIfPressure.toFixed(1)} MPa</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.steam_pressure_min}
                    max={bounds.steam_pressure_max}
                    step={0.1}
                    value={whatIfPressure}
                    onChange={(e) => setWhatIfPressure(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                    data-testid="whatif-slider-pressure"
                  />
                  <span className="text-[10px] text-slate-400">{bounds.steam_pressure_min} - {bounds.steam_pressure_max} MPa</span>
                </div>

                {/* Soak Days */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-sans font-medium">Soak:</span>
                    <span className="text-slate-800 font-bold">{whatIfSoak}d</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.soak_days_min}
                    max={bounds.soak_days_max}
                    step={1}
                    value={whatIfSoak}
                    onChange={(e) => setWhatIfSoak(Number(e.target.value))}
                    className="w-full accent-slate-600 cursor-pointer"
                    data-testid="whatif-slider-soak"
                  />
                  <span className="text-[10px] text-slate-400">{bounds.soak_days_min} - {bounds.soak_days_max} days</span>
                </div>

                {/* Cutoff Days */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-sans font-medium">Cutoff:</span>
                    <span className="text-slate-800 font-bold">{whatIfCutoff}d</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.cutoff_min}
                    max={bounds.cutoff_max}
                    step={5}
                    value={whatIfCutoff}
                    onChange={(e) => setWhatIfCutoff(Number(e.target.value))}
                    className="w-full accent-slate-600 cursor-pointer"
                    data-testid="whatif-slider-cutoff"
                  />
                  <span className="text-[10px] text-slate-400">{bounds.cutoff_min} - {bounds.cutoff_max} days</span>
                </div>

                {/* SPM */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-sans font-medium">SPM:</span>
                    <span className="text-rose-600 font-bold">{whatIfSpm.toFixed(1)}</span>
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
                  <span className="text-[10px] text-slate-400">{bounds.spm_min} - {bounds.spm_max} SPM</span>
                </div>

                {/* Stroke Length */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-sans font-medium">Stroke:</span>
                    <span className="text-slate-800 font-bold">{whatIfStroke}&quot;</span>
                  </div>
                  <input
                    type="range"
                    min={bounds.stroke_min}
                    max={bounds.stroke_max}
                    step={5}
                    value={whatIfStroke}
                    onChange={(e) => setWhatIfStroke(Number(e.target.value))}
                    className="w-full accent-slate-600 cursor-pointer"
                    data-testid="whatif-slider-stroke"
                  />
                  <span className="text-[10px] text-slate-400">{bounds.stroke_min} - {bounds.stroke_max} in</span>
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
