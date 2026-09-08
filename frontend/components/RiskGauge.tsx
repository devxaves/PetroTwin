"use client";

import React from "react";
import type { FactorDetail } from "@/lib/api/types";
import { AlertTriangle, CheckCircle, ShieldAlert, Zap } from "lucide-react";

interface RiskGaugeProps {
  score: number;
  level?: "LOW" | "MODERATE" | "HIGH" | string;
  factorBreakdown?: Record<string, FactorDetail>;
  compact?: boolean;
}

export function RiskGauge({
  score,
  level,
  factorBreakdown,
  compact = false,
}: RiskGaugeProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  // Color classification based on 0-30 LOW, 30-60 MODERATE, 60-100 HIGH
  let statusColor = "text-emerald-600";
  let statusBg = "bg-emerald-50 border-emerald-200 text-emerald-700";
  let barColor = "bg-emerald-500";
  let resolvedLevel = level ?? (safeScore < 30 ? "LOW" : safeScore < 60 ? "MODERATE" : "HIGH");

  if (safeScore >= 60 || resolvedLevel === "HIGH") {
    statusColor = "text-rose-600";
    statusBg = "bg-rose-50 border-rose-200 text-rose-700";
    barColor = "bg-rose-500";
    resolvedLevel = "HIGH";
  } else if (safeScore >= 30 || resolvedLevel === "MODERATE") {
    statusColor = "text-amber-600";
    statusBg = "bg-amber-50 border-amber-200 text-amber-700";
    barColor = "bg-amber-500";
    resolvedLevel = "MODERATE";
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2" data-testid="risk-gauge-compact">
        <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className={`h-full ${barColor} transition-all duration-500 rounded-full`}
            style={{ width: `${safeScore}%` }}
          />
        </div>
        <span
          className={`font-mono text-xs font-bold ${statusColor}`}
          data-testid="risk-score-value"
        >
          {safeScore}
        </span>
        <span
          className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold border ${statusBg}`}
          data-testid="risk-level-badge"
        >
          {resolvedLevel}
        </span>
      </div>
    );
  }

  return (
    <div
      className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5"
      data-testid="risk-gauge"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              resolvedLevel === "HIGH"
                ? "bg-rose-50 text-rose-600 border border-rose-100"
                : resolvedLevel === "MODERATE"
                ? "bg-amber-50 text-amber-600 border border-amber-100"
                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
            }`}
          >
            {resolvedLevel === "HIGH" ? (
              <ShieldAlert className="w-5 h-5" />
            ) : resolvedLevel === "MODERATE" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-wider uppercase text-slate-900 font-['Space_Grotesk']">
              Hydrodynamic Rod-Float Risk
            </h3>
            <span className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5 block">
              Downstroke buoyancy &amp; viscous drag index
            </span>
          </div>
        </div>

        <span
          className={`text-xs sm:text-sm px-3 py-1 rounded-full font-mono uppercase font-bold border ${statusBg}`}
          data-testid="risk-level-badge"
        >
          {resolvedLevel} RISK
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase font-mono text-slate-500 font-bold tracking-wider">
            Risk Severity Score
          </div>
          <div
            className={`text-5xl sm:text-6xl font-black font-mono tracking-tight mt-1 ${statusColor}`}
            data-testid="risk-score-value"
          >
            {safeScore}
            <span className="text-sm font-normal text-slate-400 ml-1.5">/ 100</span>
          </div>
        </div>

        <div className="text-right text-xs sm:text-sm text-slate-600 font-mono space-y-1">
          <div className="flex items-center justify-end gap-1.5 text-emerald-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>&lt; 30.0 Nominal Range</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-rose-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>&ge; 60.0 Sinking Lag Warning</span>
          </div>
        </div>
      </div>

      {/* Segmented Risk Bar */}
      <div className="relative w-full h-4 sm:h-5 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex">
        <div className="w-[30%] h-full border-r border-slate-200/80 bg-emerald-50/50" />
        <div className="w-[30%] h-full border-r border-slate-200/80 bg-amber-50/50" />
        <div className="w-[40%] h-full bg-rose-50/50" />
        <div
          className={`absolute top-0 bottom-0 left-0 ${barColor} transition-all duration-500 shadow-sm rounded-full`}
          style={{ width: `${safeScore}%` }}
        />
      </div>

      {/* Factor Breakdown with Visual Impact Bars */}
      {factorBreakdown && Object.keys(factorBreakdown).length > 0 && (
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
          <div className="text-xs uppercase font-mono font-bold tracking-wider text-slate-500 flex items-center justify-between">
            <span>Weighted Factor Contribution</span>
            <span>Impact Pts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-mono">
            {Object.entries(factorBreakdown).map(([factorName, detail]) => {
              const pts = Math.round(detail.weighted_contribution);
              const isHighContrib = pts >= 15;

              return (
                <div
                  key={factorName}
                  className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 capitalize text-xs sm:text-sm font-bold truncate max-w-[140px]">
                      {factorName.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-sm sm:text-base font-black ${
                        isHighContrib ? "text-rose-600" : "text-amber-600"
                      }`}
                    >
                      +{pts} pts
                    </span>
                  </div>

                  {/* Impact Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isHighContrib ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, (pts / 30) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-sans">
                    <span>Weight: <strong className="text-slate-700 font-mono">{(detail.weight * 100).toFixed(0)}%</strong></span>
                    <span>Raw: <strong className="text-slate-700 font-mono">{detail.raw_value.toFixed(1)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

