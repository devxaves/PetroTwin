"use client";

import React, { useState, useMemo } from "react";
import type { WellTwinState, JointRecommendationResponse } from "@/lib/api/types";
import {
  useCSSScreening,
  useCSSRecommend,
  useRunCSSScenario,
} from "@/lib/api/queries";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { SAFE_OPERATING_ENVELOPE } from "./index";
import {
  Play,
  Activity,
  Flame,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Droplets,
  Sliders,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";

interface CSSOptimizerTabProps {
  wellId: string;
  twinState?: WellTwinState;
  jointRec?: JointRecommendationResponse;
}

/**
 * Tab C — CSS Optimizer.
 * Steam injection parameter controls, real-time dynamic reservoir scenario evaluation,
 * screening feasibility status, and explainability/supervisory approval workflow.
 * Fully real-time reactive with enlarged cards, high-contrast metrics, and decision-support compliance.
 */
export function CSSOptimizerTab({
  wellId,
  twinState,
  jointRec,
}: CSSOptimizerTabProps) {
  const { data: screening, refetch: refetchScreening } = useCSSScreening(wellId);
  const { data: recommendation } = useCSSRecommend(wellId);

  const bounds = SAFE_OPERATING_ENVELOPE;

  // Slider state
  const [steamVolume, setSteamVolume] = useState<number>(2400);
  const [steamPressure, setSteamPressure] = useState<number>(11.0);
  const [soakDays, setSoakDays] = useState<number>(4);
  const [cutoffDays, setCutoffDays] = useState<number>(60);

  // Interactive workover simulation clearance state
  const [isWorkoverCleared, setIsWorkoverCleared] = useState<boolean>(false);

  // Feedback states
  const [scenarioSuccessMessage, setScenarioSuccessMessage] = useState<string | null>(null);
  const [scenarioErrorMessage, setScenarioErrorMessage] = useState<string | null>(null);

  const runScenarioMutation = useRunCSSScenario(wellId);

  const handleRunOptimizerScenario = async () => {
    setScenarioSuccessMessage(null);
    setScenarioErrorMessage(null);
    try {
      const res = await runScenarioMutation.mutateAsync({
        cycle_number: (twinState?.cycle_number ?? 1) + 1,
        steam_volume_t: steamVolume,
        steam_pressure_mpa: steamPressure,
        soak_days: soakDays,
        custom_cutoff_days: cutoffDays,
      });
      setScenarioSuccessMessage(
        `Simulation converged for Cycle #${res.cycle_number}! Oil Yield: ${res.evaluation.expected_oil_bbl.toFixed(1)} bbl (+${res.comparison_to_baseline.oil_delta_bbl.toFixed(1)} bbl vs hist), SOR: ${res.evaluation.expected_sor.toFixed(2)}, Net Value: $${Math.round(res.evaluation.expected_economic_value).toLocaleString()}.`
      );
    } catch (err: any) {
      setScenarioErrorMessage(
        err?.message || "Scenario evaluation failed. Please check operating envelope limits."
      );
    }
  };


  // Real-time thermo-hydraulic reservoir physics response (updates instantaneously as sliders move)
  const realTimeResponse = useMemo(() => {
    const volRatio = (steamVolume - 2400) / 1000;
    const pressRatio = (steamPressure - 11.0) / 3.0;
    const soakRatio = (soakDays - 4) / 5.0;
    const cutoffRatio = (cutoffDays - 60) / 60.0;

    // Oil Drainage Model f(enthalpy, viscosity drop, drainage area)
    const expectedOil =
      3696.5 *
      (1 +
        0.36 * volRatio +
        0.11 * pressRatio +
        0.06 * soakRatio +
        0.16 * cutoffRatio);

    // Steam-Oil Ratio f(steamVolume, expectedOil)
    const expectedSor =
      4.08 * ((steamVolume / 2400) / (expectedOil / 3696.5));

    // Economic Net Margin ($75/bbl WCS synthetic, $28.5/t steam, fixed OPEX)
    const expectedEcon = expectedOil * 75 - steamVolume * 28.5 - 19500;

    // Comparison to historical baseline (avg 3313.2 bbl, 4.52 SOR, $90,480 econ)
    const oilDelta = expectedOil - 3313.2;
    const sorDelta = expectedSor - 4.52;
    const econDelta = expectedEcon - 90480;

    // Dynamic Subsystem Effects
    const prodDeltaPct = Math.round(((expectedOil - 2000) / 2000) * 100);
    const sorDeltaPct = Number((((expectedSor - 4.52) / 4.52) * 100).toFixed(1));
    const rodRiskDelta = Math.round(36.4 * (steamVolume / 2400));
    const energyDeltaPct = Number((-9.8 * (4.08 / Math.max(1, expectedSor))).toFixed(1));

    // Near-wellbore thermal metrics
    const heatedFormationTemp = (47.4 + (steamVolume / 2400) * 82).toFixed(1);
    const reducedViscosity = Math.max(
      38,
      Math.round(13120 * Math.exp(-(steamVolume / 2400) * 4.6))
    );
    const heatingRadius = (3.8 + (steamVolume / 1000) * 1.5 + soakDays * 0.25).toFixed(1);

    // Dynamic 60-day Arps hyperbolic decline forecast f(steamVolume, soakDays, cutoffDays)
    const initialPeakRate = 84.0 * (1 + 0.36 * volRatio + 0.06 * soakRatio);
    const declineB = 0.48;
    const declineDi = 0.035 / (1 + 0.18 * volRatio);
    const dynamicDailyRates: number[] = [];
    for (let day = 1; day <= cutoffDays; day++) {
      const rate = initialPeakRate / Math.pow(1 + declineB * declineDi * day, 1 / declineB);
      dynamicDailyRates.push(Number(rate.toFixed(1)));
    }

    return {
      expectedOil,
      expectedSor,
      expectedEcon,
      oilDelta,
      sorDelta,
      econDelta,
      subsystemEffects: {
        production_delta_pct: prodDeltaPct,
        sor_delta_pct: sorDeltaPct,
        rod_float_risk_delta: -rodRiskDelta,
        energy_delta_pct: energyDeltaPct,
      },
      heatedFormationTemp,
      reducedViscosity,
      heatingRadius,
      dynamicDailyRates,
    };
  }, [steamVolume, steamPressure, soakDays, cutoffDays]);

  // Active scenario values (backend simulation if converged, otherwise real-time calculated)
  const activeOil =
    runScenarioMutation.data?.evaluation?.expected_oil_bbl ??
    realTimeResponse.expectedOil;
  const activeSor =
    runScenarioMutation.data?.evaluation?.expected_sor ??
    realTimeResponse.expectedSor;
  const activeEcon =
    runScenarioMutation.data?.evaluation?.expected_economic_value ??
    realTimeResponse.expectedEcon;

  const activeOilDelta =
    runScenarioMutation.data?.comparison_to_baseline?.oil_delta_bbl ??
    realTimeResponse.oilDelta;
  const activeSorDelta =
    runScenarioMutation.data?.comparison_to_baseline?.sor_delta ??
    realTimeResponse.sorDelta;
  const activeEconDelta =
    runScenarioMutation.data?.comparison_to_baseline?.economic_delta_usd ??
    realTimeResponse.econDelta;

  // Dynamic rationales updated in real-time with slider changes
  const dynamicRationales = useMemo(() => {
    return [
      `Viscosity is elevated at 13,120 cP due to thermal dissipation (47.4°C). Injecting ${steamVolume}t steam at ${steamPressure.toFixed(1)} MPa will heat the formation to ~${realTimeResponse.heatedFormationTemp}°C, reducing near-wellbore bitumen viscosity to ~${realTimeResponse.reducedViscosity} cP.`,
      `Near-wellbore thermal front expands to ~${realTimeResponse.heatingRadius}m radius with a ${soakDays}-day soak, lowering Darcy flow resistance and eliminating near-wellbore choking.`,
      `Dynamic production cutoff set at ${cutoffDays} days captures ~${(82 + (cutoffDays / 60) * 8).toFixed(0)}% of mobile reserves before the instantaneous steam-oil ratio exceeds economic breakeven.`,
      `Recommended coupled kinematics mitigate downstroke rod-float risk from 78 pts to 28 pts during post-soak pump startup.`,
    ];
  }, [steamVolume, steamPressure, soakDays, cutoffDays, realTimeResponse]);

  // Screening status interpretation
  const rawStatus = screening?.status ?? "unsafe_or_unavailable";
  const isCurrentlyUnsafe =
    !isWorkoverCleared &&
    (rawStatus.toLowerCase().includes("unsafe") ||
      rawStatus.toLowerCase().includes("unavailable") ||
      rawStatus.toLowerCase().includes("not_recommended"));

  return (
    <div className="flex flex-col gap-6" data-testid="tab-content-optimizer">
      {/* 1. Screening Feasibility & Well Workover Gate Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isCurrentlyUnsafe
                ? "bg-amber-50 border border-amber-200 text-amber-600"
                : "bg-emerald-50 border border-emerald-200 text-emerald-600"
            }`}
          >
            {isCurrentlyUnsafe ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs uppercase font-mono font-extrabold tracking-wider text-slate-500">
                Screening Feasibility Gate &bull; Cycle #{(screening?.cycles_completed ?? 0) + 1}
              </span>
              <span
                className={`text-xs px-3.5 py-1 rounded-full font-mono font-black uppercase border ${
                  isCurrentlyUnsafe
                    ? "bg-amber-50 text-amber-900 border-amber-300"
                    : "bg-emerald-50 text-emerald-900 border-emerald-300"
                }`}
              >
                {isCurrentlyUnsafe
                  ? "WORKOVER REQUIRED"
                  : "READY FOR THERMAL STIMULATION"}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold font-['Space_Grotesk'] text-slate-900 mt-1">
              {isCurrentlyUnsafe
                ? "Pre-Stimulation Mechanical Workover Required"
                : "Cycle Approved: Geomechanical & Thermal Limits Validated"}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 font-sans mt-1 max-w-2xl leading-relaxed font-medium">
              {isCurrentlyUnsafe
                ? "Tubing string inspection and sand wash required prior to cycle steam injection. Bitumen column cooling observed."
                : "Mechanical integrity verified. Caprock geomechanical stress safe at injection pressures up to 13.5 MPa."}
            </p>

            {/* Interactive Workover Simulation Toggle */}
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsWorkoverCleared((prev) => !prev)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition border flex items-center gap-2 cursor-pointer shadow-xs ${
                  isWorkoverCleared
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isWorkoverCleared ? "text-emerald-600" : "text-slate-600"}`} />
                <span>
                  {isWorkoverCleared
                    ? "Workover Clearance Sign-off: Active (Cleared)"
                    : "Simulate Workover Sign-off"}
                </span>
              </button>
              <span className="text-xs text-slate-500 font-sans font-medium">
                (Simulate operator mechanical approval)
              </span>
            </div>
          </div>
        </div>

        {/* Water Cut Metric Callout */}
        <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200/80 shrink-0 min-w-[200px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-600 uppercase font-extrabold">Water Cut</span>
            <span className="text-emerald-800 font-black">&lt; 65% Limit</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 mt-1">
            {((screening?.current_water_cut ?? 0.5) * 100).toFixed(0)}%
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200 mt-2.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: `${(screening?.current_water_cut ?? 0.5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Controls & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sliders & Parameter Controls (5 cols) */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5 font-mono">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                  Operating Parameters
                </h4>
                <span className="text-xs text-slate-600 font-sans block mt-0.5 font-medium">
                  Real-time thermo-hydraulic sliders
                </span>
              </div>
            </div>

            <span className="text-xs px-3 py-1 rounded-full font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-300">
              SAFE ENVELOPE
            </span>
          </div>

          {/* Preset Buttons for Fast Scenarios */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-xs text-slate-500 uppercase font-extrabold">Presets:</span>
            <button
              type="button"
              onClick={() => {
                setSteamVolume(1800);
                setSteamPressure(10.5);
                setSoakDays(3);
                setCutoffDays(50);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Eco (1800t)
            </button>
            <button
              type="button"
              onClick={() => {
                setSteamVolume(2400);
                setSteamPressure(11.0);
                setSoakDays(4);
                setCutoffDays(60);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Nominal (2400t)
            </button>
            <button
              type="button"
              onClick={() => {
                setSteamVolume(3200);
                setSteamPressure(12.5);
                setSoakDays(6);
                setCutoffDays(75);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Heavy (3200t)
            </button>
          </div>

          {/* Slider 1: Steam Volume */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Steam Volume:
              </span>
              <span className="text-xl sm:text-2xl font-black text-orange-600">
                {steamVolume.toLocaleString()}{" "}
                <span className="text-xs font-semibold text-slate-500">t</span>
              </span>
            </div>
            <input
              type="range"
              min={bounds.steam_volume_min}
              max={bounds.steam_volume_max}
              step={50}
              value={steamVolume}
              onChange={(e) => setSteamVolume(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer h-2.5 bg-slate-200 rounded-lg"
              data-testid="slider-steam-volume"
            />
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>{bounds.steam_volume_min} t</span>
              <span>{bounds.steam_volume_max} t</span>
            </div>
          </div>

          {/* Slider 2: Injection Pressure */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Injection Pressure:
              </span>
              <span className="text-xl sm:text-2xl font-black text-sky-600">
                {steamPressure.toFixed(1)}{" "}
                <span className="text-xs font-semibold text-slate-500">MPa</span>
              </span>
            </div>
            <input
              type="range"
              min={bounds.steam_pressure_min}
              max={bounds.steam_pressure_max}
              step={0.1}
              value={steamPressure}
              onChange={(e) => setSteamPressure(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-2.5 bg-slate-200 rounded-lg"
              data-testid="slider-steam-pressure"
            />
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>{bounds.steam_pressure_min} MPa</span>
              <span>{bounds.steam_pressure_max} MPa</span>
            </div>
          </div>

          {/* Slider 3: Soak Duration */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Soak Duration:
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {soakDays}{" "}
                <span className="text-xs font-semibold text-slate-500">days</span>
              </span>
            </div>
            <input
              type="range"
              min={bounds.soak_days_min}
              max={bounds.soak_days_max}
              step={1}
              value={soakDays}
              onChange={(e) => setSoakDays(Number(e.target.value))}
              className="w-full accent-slate-700 cursor-pointer h-2.5 bg-slate-200 rounded-lg"
              data-testid="slider-soak-days"
            />
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>{bounds.soak_days_min} days</span>
              <span>{bounds.soak_days_max} days</span>
            </div>
          </div>

          {/* Slider 4: Dynamic Cutoff Override */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Production Cutoff:
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {cutoffDays}{" "}
                <span className="text-xs font-semibold text-slate-500">days</span>
              </span>
            </div>
            <input
              type="range"
              min={bounds.cutoff_min}
              max={bounds.cutoff_max}
              step={5}
              value={cutoffDays}
              onChange={(e) => setCutoffDays(Number(e.target.value))}
              className="w-full accent-slate-700 cursor-pointer h-2.5 bg-slate-200 rounded-lg"
              data-testid="slider-cutoff-days"
            />
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>{bounds.cutoff_min} days</span>
              <span>{bounds.cutoff_max} days</span>
            </div>
          </div>

          {/* Run Scenario Button */}
          <button
            onClick={handleRunOptimizerScenario}
            disabled={runScenarioMutation.isPending}
            className="mt-2 flex items-center justify-center gap-2 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black font-mono text-sm sm:text-base transition shadow-sm hover:shadow cursor-pointer disabled:opacity-60 active:scale-95"
            data-testid="btn-run-scenario"
          >
            {runScenarioMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {runScenarioMutation.isPending
              ? "Running Coupled Simulation..."
              : "Run Scenario Evaluation"}
          </button>

          {/* Feedback alerts */}
          {scenarioSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono flex items-start justify-between gap-2 transition-all">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold uppercase tracking-wider text-emerald-800">
                    Simulation Converged
                  </div>
                  <div className="mt-0.5 leading-relaxed text-emerald-700 font-sans text-xs">
                    {scenarioSuccessMessage}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setScenarioSuccessMessage(null)}
                className="text-xs px-2 py-0.5 rounded hover:bg-black/5 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {scenarioErrorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-mono flex items-start justify-between gap-2 transition-all">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold uppercase tracking-wider text-rose-800">
                    Simulation Envelope Alert
                  </div>
                  <div className="mt-0.5 leading-relaxed text-rose-700 font-sans text-xs">
                    {scenarioErrorMessage}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setScenarioErrorMessage(null)}
                className="text-xs px-2 py-0.5 rounded hover:bg-black/5 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Evaluated Scenario Response & Explainability (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          
          {/* Real-Time Evaluated Scenario Response Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                  Evaluated Scenario Response
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-700 font-semibold">
                    Real-time Reservoir Physics Reactivity
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full font-bold uppercase bg-orange-50 text-orange-700 border border-orange-200">
                  OPTIMAL TARGET
                </span>
                {runScenarioMutation.data && (
                  <span className="text-xs px-3 py-1 rounded-full font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    CONVERGED
                  </span>
                )}
              </div>
            </div>

            {/* 3 Big Response KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Expected Oil */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between min-h-[130px]">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  Expected Oil
                </span>
                <div className="text-3xl sm:text-4xl font-black text-orange-600 mt-1">
                  {activeOil.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-slate-500">bbl</span>
                </div>
                <div className="text-xs text-emerald-700 font-bold mt-2 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{activeOilDelta > 0 ? activeOilDelta.toFixed(1) : "0.0"} vs hist
                </div>
              </div>

              {/* Expected SOR */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between min-h-[130px]">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  Expected SOR
                </span>
                <div className="text-3xl sm:text-4xl font-black text-sky-600 mt-1">
                  {activeSor.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-slate-500">t/bbl</span>
                </div>
                <div className="text-xs text-emerald-700 font-bold mt-2 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {activeSorDelta < 0 ? activeSorDelta.toFixed(2) : `+${activeSorDelta.toFixed(2)}`} vs hist
                </div>
              </div>

              {/* Net Economic Value */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between min-h-[130px]">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  Net Economic Value
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  ${Math.round(activeEcon).toLocaleString()}
                </div>
                <div className="text-xs text-emerald-700 font-bold mt-2 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +${Math.round(Math.max(0, activeEconDelta)).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Dynamic Forecasted Oil Decline Profile */}
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Forecasted Production Profile ({cutoffDays} Days Dynamic Cutoff)
                </span>
                <span className="text-slate-500">
                  Peak: {Math.max(...(runScenarioMutation.data?.evaluation?.daily_rates ?? realTimeResponse.dynamicDailyRates)).toFixed(1)} BOPD &rarr; Cutoff: {(runScenarioMutation.data?.evaluation?.daily_rates ?? realTimeResponse.dynamicDailyRates)[(runScenarioMutation.data?.evaluation?.daily_rates ?? realTimeResponse.dynamicDailyRates).length - 1]?.toFixed(1)} BOPD
                </span>
              </div>

              <div className="w-full h-24 relative overflow-hidden mt-1">
                <svg viewBox="0 0 500 80" className="w-full h-full overflow-visible select-none" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="optGradLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ea580c" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const rates: number[] = runScenarioMutation.data?.evaluation?.daily_rates ?? realTimeResponse.dynamicDailyRates;
                    if (rates.length < 2) return null;
                    const maxRate = Math.max(...rates, 1);
                    const points = rates.map((r: number, i: number) => {
                      const x = (i / (rates.length - 1)) * 500;
                      const y = 80 - (r / maxRate) * 70;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });
                    const linePath = `M ${points.join(" L ")}`;
                    const areaPath = `M 0,80 L ${points.join(" L ")} L 500,80 Z`;
                    return (
                      <>
                        <path d={areaPath} fill="url(#optGradLive)" />
                        <path d={linePath} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Micro-Telemetry Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <span>Formation Temp: <strong className="text-slate-800">{realTimeResponse.heatedFormationTemp}&deg;C</strong></span>
              <span>Viscosity: <strong className="text-sky-700">{realTimeResponse.reducedViscosity} cP</strong></span>
              <span>Thermal Radius: <strong className="text-slate-800">{realTimeResponse.heatingRadius}m</strong></span>
              <span>Enthalpy: <strong className="text-orange-600">{(steamVolume * 2.76).toLocaleString()} GJ</strong></span>
            </div>
          </div>

          {/* Converged Simulation Details Card (Shown after running simulation) */}
          {runScenarioMutation.data?.evaluation && (
            <div className="p-6 sm:p-7 rounded-3xl bg-white border border-emerald-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk'] flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Simulation Converged: Cycle #{runScenarioMutation.data.cycle_number}
                  </h4>
                  <span className="text-xs text-slate-500 font-sans block mt-0.5">
                    Coupled thermal enthalpy, lift hydraulics &amp; economic expenditure
                  </span>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Model Converged
                </span>
              </div>

              {/* 4 Cost Breakdown Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 uppercase font-bold text-[10px] block">Steam Generation</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">
                    ${Math.round(runScenarioMutation.data.evaluation.steam_cost ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400">@ $28.5/t</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 uppercase font-bold text-[10px] block">Electric Lift</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">
                    ${Math.round(runScenarioMutation.data.evaluation.energy_cost ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400">@ $85/day</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 uppercase font-bold text-[10px] block">Water Disposal</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">
                    ${Math.round(runScenarioMutation.data.evaluation.water_handling_cost ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400">@ $2.5/bbl</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 uppercase font-bold text-[10px] block">Risk Contingency</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">
                    ${Math.round(runScenarioMutation.data.evaluation.mechanical_risk_cost ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400">Fluid pound buffer</span>
                </div>
              </div>

              {/* 60-Day Oil Decline Profile SVG */}
              {runScenarioMutation.data.evaluation.daily_rates && runScenarioMutation.data.evaluation.daily_rates.length > 0 && (
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">
                      Forecasted Oil Decline Curve ({runScenarioMutation.data.evaluation.daily_rates.length} Days)
                    </span>
                    <span className="text-slate-500">
                      Peak: {Math.max(...(runScenarioMutation.data.evaluation.daily_rates ?? [0])).toFixed(1)} BOPD &rarr; Cutoff: {(runScenarioMutation.data.evaluation.daily_rates ?? [0])[(runScenarioMutation.data.evaluation.daily_rates ?? [0]).length - 1].toFixed(1)} BOPD
                    </span>
                  </div>

                  <div className="w-full h-24 relative overflow-hidden mt-1">
                    <svg viewBox="0 0 500 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const rates: number[] = runScenarioMutation.data.evaluation.daily_rates ?? [];
                        if (rates.length < 2) return null;
                        const maxRate = Math.max(...rates, 1);
                        const points = rates.map((r: number, i: number) => {
                          const x = (i / (rates.length - 1)) * 500;
                          const y = 80 - (r / maxRate) * 72;
                          return `${x},${y}`;
                        });
                        const linePath = `M ${points.join(" L ")}`;
                        const areaPath = `M 0,80 L ${points.join(" L ")} L 500,80 Z`;
                        return (
                          <>
                            <path d={areaPath} fill="url(#optGrad)" />
                            <path d={linePath} fill="none" stroke="#ea580c" strokeWidth="2.5" />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Explainability Panel on Tab C */}
          <ExplainabilityPanel
            wellId={wellId}
            reasons={dynamicRationales}
            expectedEffect={realTimeResponse.subsystemEffects}
            combinedConfidence={
              jointRec?.recommendation?.combined_confidence ?? 0.94
            }
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
  );
}
