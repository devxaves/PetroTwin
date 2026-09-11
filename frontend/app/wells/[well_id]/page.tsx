"use client";

import React, { useState, use } from "react";
import { Header } from "@/components/Header";
import {
  useWellTwinState,
  useJointRecommendation,
  useWellProduction,
  useDiagnosticsLatest,
} from "@/lib/api/queries";
import { useLiveTelemetrySimulator } from "@/lib/useLiveTelemetrySimulator";
import {
  WellTwinHeader,
  WellTwinTabs,
  OverviewTab,
  DiagnosticsTab,
  CSSOptimizerTab,
  WhatIfTab,
} from "@/components/well";
import type { WellTab } from "@/components/well";
import { Thermometer, Flame, Gauge, AlertCircle } from "lucide-react";

/**
 * Individual Well Digital Twin page.
 *
 * Provides an industrial-grade executive surveillance and optimization suite:
 * - Well identity and integrated live telemetry toggle
 * - 4 Big Executive KPI cards displaying critical thermal/mechanical vitals at the very top
 * - Segmented tab navigation for Subsurface Twin, SRP Diagnostics, CSS Optimizer, and What-If Engine
 */

interface WellPageProps {
  params: Promise<{ well_id: string }>;
}

export default function WellTwinPage({ params }: WellPageProps) {
  const resolvedParams = use(params);
  const wellId = resolvedParams.well_id;

  // Active tab & stream toggle
  const [activeTab, setActiveTab] = useState<WellTab>(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const tabParam = search.get("tab") as WellTab | null;
      if (
        tabParam &&
        ["overview", "diagnostics", "optimizer", "whatif"].includes(tabParam)
      ) {
        return tabParam;
      }
    }
    return "overview";
  });
  const [isLiveStream, setIsLiveStream] = useState(true);
  const [presetSpm, setPresetSpm] = useState<number | undefined>(undefined);

  const handleTabChange = (tab: WellTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Queries for well telemetry, production, diagnostics, and joint recommendations
  const { data: rawTwinState } = useWellTwinState(wellId);
  const { data: jointRec } = useJointRecommendation(wellId);
  const { data: productionHistory } = useWellProduction(wellId);
  const { data: diagReport } = useDiagnosticsLatest(wellId);

  // Real-time telemetry simulation wrapper
  const { liveState: twinState, pulseCount } = useLiveTelemetrySimulator(
    rawTwinState,
    isLiveStream
  );

  // Vitals calculations
  const tempC = twinState?.current_temperature_c ?? 47.3;
  const viscosity = Math.round(
    twinState?.current_viscosity_cp ?? Math.exp(12 - tempC * 0.05)
  );
  const fillage = (twinState?.pump_fillage ?? 0.664) * 100;
  const strokeLength = twinState?.stroke_length_in ?? 120;
  const spm = twinState?.current_spm ?? 5.78;
  const phase = twinState?.css_cycle_phase ?? "PRODUCTION";

  const latestProd = productionHistory && productionHistory.length > 0
    ? productionHistory[productionHistory.length - 1]
    : undefined;
  const oilRate = latestProd?.oil_rate_bopd ?? 5.8;
  const waterCut = (latestProd?.water_cut ?? 0.5) * 100;
  const tubingPress = latestProd?.tubing_pressure ?? 122.86;

  const riskScore =
    diagReport?.rod_float_risk?.risk_score ??
    twinState?.rod_float_risk_score ??
    82;
  const riskLevel =
    diagReport?.rod_float_risk?.risk_level ??
    twinState?.rod_float_risk_level ??
    (riskScore >= 60 ? "HIGH" : riskScore >= 35 ? "MODERATE" : "LOW");
  const isHighRisk = riskScore >= 60;
  const isModRisk = riskScore >= 35 && riskScore < 60;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased font-sans flex flex-col">
      <Header wellId={wellId} />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* 1. Well Identity & Telemetry Sync Header */}
        <WellTwinHeader
          wellId={wellId}
          twinState={twinState}
          isLiveStream={isLiveStream}
          onToggleLiveStream={() => setIsLiveStream((prev) => !prev)}
          pulseCount={pulseCount}
        />

        {/* 2. ── 4 BIG EXECUTIVE WELL KPI CARDS AT THE TOP ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Flowing Temperature & Viscosity */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                Flowing Temp &amp; Viscosity
              </span>
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <Thermometer className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black font-mono text-orange-600 tracking-tight">
                  {tempC.toFixed(1)}
                </span>
                <span className="text-sm font-extrabold text-slate-700 font-mono">&deg;C</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-sky-700 font-bold text-sm">~{viscosity.toLocaleString()} cP</span>
                <span className="text-slate-500 font-medium">Clearwater (460m)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Production Rate & Water Cut */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                Oil Production Rate
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black font-mono text-slate-900 tracking-tight">
                  {oilRate.toFixed(1)}
                </span>
                <span className="text-sm font-extrabold text-slate-700 font-mono">BOPD</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700 font-medium">
                  Water Cut: <strong className="text-slate-900 font-bold">{waterCut.toFixed(0)}%</strong>
                </span>
                <span className="text-slate-600 font-bold font-mono">{tubingPress.toFixed(1)} MPa</span>
              </div>
            </div>
          </div>

          {/* Card 3: Pump Fillage & Cadence */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                Pump Liquid Fillage
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Gauge className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-600 tracking-tight">
                  {fillage.toFixed(1)}
                </span>
                <span className="text-sm font-extrabold text-slate-700 font-mono">%</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700 font-medium">
                  Effective: <strong className="text-slate-900 font-bold">{((fillage / 100) * strokeLength).toFixed(1)}&quot;</strong>
                </span>
                <span className="text-emerald-800 font-bold">{spm} SPM</span>
              </div>
            </div>
          </div>

          {/* Card 4: Mechanical Rod-Float Risk */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                Rod-Float Risk Index
              </span>
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                  isHighRisk
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : isModRisk
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : "bg-emerald-50 border-emerald-200 text-emerald-600"
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                    isHighRisk
                      ? "text-rose-600"
                      : isModRisk
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {riskScore}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500">
                  / 100
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600">
                  CSS: <strong className="text-slate-900 font-bold">{phase}</strong>
                </span>
                <span
                  className={`font-mono font-extrabold uppercase text-xs px-2.5 py-0.5 rounded-full border ${
                    isHighRisk
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : isModRisk
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {riskLevel} RISK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Segmented Tab Navigation */}
        <WellTwinTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* 4. Active Tab Content View */}
        {activeTab === "overview" && (
          <OverviewTab wellId={wellId} twinState={twinState} />
        )}

        {activeTab === "diagnostics" && (
          <DiagnosticsTab
            wellId={wellId}
            twinState={twinState}
            onNavigateToWhatIf={(targetSpm) => {
              if (targetSpm !== undefined) {
                setPresetSpm(targetSpm);
              }
              handleTabChange("whatif");
            }}
          />
        )}

        {activeTab === "optimizer" && (
          <CSSOptimizerTab
            wellId={wellId}
            twinState={twinState}
            jointRec={jointRec}
          />
        )}

        {activeTab === "whatif" && (
          <WhatIfTab
            wellId={wellId}
            twinState={twinState}
            jointRec={jointRec}
            initialSpm={presetSpm}
          />
        )}

      </main>
    </div>
  );
}
