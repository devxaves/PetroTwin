"use client";

import React from "react";
import type { FactorDetail } from "@/lib/api/types";
import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

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
      className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3.5"
      data-testid="risk-gauge"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {resolvedLevel === "HIGH" ? (
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          ) : resolvedLevel === "MODERATE" ? (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          )}
          <span className="text-xs font-bold tracking-wider uppercase text-slate-800 font-['Space_Grotesk']">
            Hydrodynamic Rod-Float Risk
          </span>
        </div>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-md font-mono uppercase font-bold border ${statusBg}`}
          data-testid="risk-level-badge"
        >
          {resolvedLevel} RISK
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Risk Score</div>
          <div
            className={`text-3xl font-extrabold font-mono tracking-tight ${statusColor}`}
            data-testid="risk-score-value"
          >
            {safeScore}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
          </div>
        </div>
        <div className="text-right text-[11px] text-slate-500 font-mono">
          <div>Envelope: &lt; 30.0 Safe</div>
          <div>Critical: &ge; 60.0 Sinking Lag</div>
        </div>
      </div>

      {/* Segmented Risk Bar */}
      <div className="relative w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex">
        <div className="w-[30%] h-full border-r border-slate-200/80 bg-emerald-50/50" />
        <div className="w-[30%] h-full border-r border-slate-200/80 bg-amber-50/50" />
        <div className="w-[40%] h-full bg-rose-50/50" />
        <div
          className={`absolute top-0 bottom-0 left-0 ${barColor} transition-all duration-500 shadow-sm rounded-full`}
          style={{ width: `${safeScore}%` }}
        />
      </div>

      {/* Factor Breakdown */}
      {factorBreakdown && Object.keys(factorBreakdown).length > 0 && (
        <div className="mt-2 pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-slate-400">
            Weighted Factor Contributions
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {Object.entries(factorBreakdown).map(([factorName, detail]) => {
              const pct = Math.round(detail.weighted_contribution);
              return (
                <div
                  key={factorName}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60"
                >
                  <span className="text-slate-600 capitalize text-[11px] font-medium">
                    {factorName.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-900 font-semibold">+{pct} pts</span>
                    <span className="text-[9px] text-slate-400">
                      (w: {detail.weight})
                    </span>
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
