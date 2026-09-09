"use client";

import React from "react";
import type { WellTwinState } from "@/lib/api/types";
import { Activity, ShieldCheck, Wifi, WifiOff } from "lucide-react";

interface WellTwinHeaderProps {
  wellId: string;
  twinState?: WellTwinState;
  isLiveStream?: boolean;
  onToggleLiveStream?: () => void;
  pulseCount?: number;
}

const WELL_NAMES: Record<string, string> = {
  "WELL-001": "Pad A - Thermal Producer 01",
  "WELL-002": "Pad A - Thermal Producer 02",
  "WELL-003": "Pad B - Thermal Producer 01",
  "WELL-004": "Pad B - Thermal Producer 02",
  "WELL-005": "Pad C - Thermal Producer 01",
  "WELL-006": "Pad C - Thermal Producer 02",
  "WELL-007": "Pad D - Deep Thermal 01",
  "WELL-008": "Pad D - Deep Thermal 02",
};

/**
 * Top executive banner for the individual well digital twin.
 * Displays well identity, formation zone, stroke kinematics, and integrated live telemetry toggle.
 */
export function WellTwinHeader({
  wellId,
  twinState,
  isLiveStream = true,
  onToggleLiveStream,
  pulseCount = 0,
}: WellTwinHeaderProps) {
  const spm = twinState?.current_spm ?? 8.0;
  const strokeLength = twinState?.stroke_length_in ?? 120;
  const phase = twinState?.css_cycle_phase ?? "PRODUCTION";
  const cycleNum = twinState?.cycle_number ?? 4;
  const wellName = WELL_NAMES[wellId] ?? "Thermal Production Unit";

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-5">
      {/* Left: Well Identity & Operating Status */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-mono font-black text-2xl shadow-inner">
          {wellId.replace("WELL-", "")}
        </div>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-extrabold text-2xl sm:text-3xl text-slate-900 font-['Space_Grotesk'] tracking-tight">
              {wellId}
            </h1>
            <span className="text-sm text-slate-600 font-sans font-semibold">
              &bull; {wellName}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {phase}
            </span>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 font-mono mt-2 flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold border border-slate-200">
              PAD 4 &bull; CLEARWATER (460m)
            </span>
            <span className="text-slate-300 font-bold">&bull;</span>
            <span className="font-semibold text-slate-800">CSS Cycle #{cycleNum}</span>
            <span className="text-slate-300 font-bold">&bull;</span>
            <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
              <Activity className="w-4 h-4 text-orange-500" />
              Stroke: {strokeLength}&quot; @ {spm} SPM
            </span>
            <span className="text-slate-300 font-bold">&bull;</span>
            <span className="text-emerald-800 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Operating Envelope Verified
            </span>
          </div>
        </div>
      </div>

      {/* Right: Live Telemetry Pulse & Control Button */}
      <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
        <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            {isLiveStream ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400" />
            )}
          </span>
          <span>
            {isLiveStream ? `LIVE SYNC (#${pulseCount})` : "STREAM PAUSED"}
          </span>
        </div>

        {onToggleLiveStream && (
          <button
            type="button"
            onClick={onToggleLiveStream}
            className={`px-4 py-2.5 rounded-2xl transition flex items-center gap-2 border font-bold ${
              isLiveStream
                ? "bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs"
            }`}
          >
            {isLiveStream ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>Pause Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Resume Live</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
