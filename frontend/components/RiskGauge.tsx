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
  let statusColor = "text-emerald-400";
  let statusBg = "bg-emerald-500/10 border-emerald-500/30";
  let barColor = "bg-emerald-500";
  let resolvedLevel = level ?? (safeScore < 30 ? "LOW" : safeScore < 60 ? "MODERATE" : "HIGH");

  if (safeScore >= 60 || resolvedLevel === "HIGH") {
    statusColor = "text-rose-400";
    statusBg = "bg-rose-500/10 border-rose-500/30";
    barColor = "bg-rose-500";
    resolvedLevel = "HIGH";
  } else if (safeScore >= 30 || resolvedLevel === "MODERATE") {
    statusColor = "text-amber-400";
    statusBg = "bg-amber-500/10 border-amber-500/30";
    barColor = "bg-amber-500";
    resolvedLevel = "MODERATE";
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2" data-testid="risk-gauge-compact">
        <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${safeScore}%` }}
          />
        </div>
        <span
          className={`font-mono text-xs font-semibold ${statusColor}`}
          data-testid="risk-score-value"
        >
          {safeScore}
        </span>
        <span
          className={`text-[9px] px-1 py-0.2 rounded font-mono uppercase tracking-wider border ${statusBg} ${statusColor}`}
          data-testid="risk-level-badge"
        >
          {resolvedLevel}
        </span>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-3"
      data-testid="risk-gauge"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {resolvedLevel === "HIGH" ? (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          ) : resolvedLevel === "MODERATE" ? (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            Hydrodynamic Rod-Float Risk
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded font-mono uppercase font-semibold border ${statusBg} ${statusColor}`}
          data-testid="risk-level-badge"
        >
          {resolvedLevel} RISK
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400">Score</div>
          <div
            className={`text-3xl font-bold font-mono tracking-tight ${statusColor}`}
            data-testid="risk-score-value"
          >
            {safeScore}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
          </div>
        </div>
        <div className="text-right text-[11px] text-slate-400 font-mono">
          <div>Envelope: &lt; 30.0 Safe</div>
          <div>Critical: &ge; 60.0 Sinking Lag</div>
        </div>
      </div>

      {/* Segmented Risk Bar */}
      <div className="relative w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-700/60 flex">
        <div className="w-[30%] h-full border-r border-slate-700/40 bg-emerald-950/40" />
        <div className="w-[30%] h-full border-r border-slate-700/40 bg-amber-950/40" />
        <div className="w-[40%] h-full bg-rose-950/40" />
        <div
          className={`absolute top-0 bottom-0 left-0 ${barColor} transition-all duration-500 shadow-lg`}
          style={{ width: `${safeScore}%` }}
        />
      </div>

      {/* Factor Breakdown */}
      {factorBreakdown && Object.keys(factorBreakdown).length > 0 && (
        <div className="mt-2 pt-3 border-t border-[#1e293b] flex flex-col gap-1.5">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Weighted Factor Contributions
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {Object.entries(factorBreakdown).map(([factorName, detail]) => {
              const pct = Math.round(detail.weighted_contribution);
              return (
                <div
                  key={factorName}
                  className="flex items-center justify-between p-1.5 rounded bg-[#131b2e] border border-slate-800"
                >
                  <span className="text-slate-400 capitalize text-[11px]">
                    {factorName.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300 font-medium">+{pct} pts</span>
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
