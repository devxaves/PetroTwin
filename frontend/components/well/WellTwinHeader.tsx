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
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
      {/* Left: Well Identity & Operating Status */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 font-mono font-extrabold text-lg shadow-inner">
          {wellId.replace("WELL-", "")}
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-bold text-xl sm:text-2xl text-slate-900 font-['Space_Grotesk'] tracking-tight">
              {wellId}
            </h1>
            <span className="text-xs text-slate-500 font-sans font-medium">
              &bull; {wellName}
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {phase}
            </span>
          </div>

          <div className="text-xs text-slate-500 font-mono mt-1.5 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              PAD 4 &bull; CLEARWATER (460m)
            </span>
            <span className="text-slate-300">&bull;</span>
            <span>CSS Cycle #{cycleNum}</span>
            <span className="text-slate-300">&bull;</span>
            <span className="flex items-center gap-1 text-slate-700 font-medium">
              <Activity className="w-3.5 h-3.5 text-orange-500" />
              Stroke: {strokeLength}&quot; @ {spm} SPM
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Operating Envelope Verified
            </span>
          </div>
        </div>
      </div>

      {/* Right: Live Telemetry Pulse & Control Button */}
      <div className="flex items-center gap-3 font-mono text-xs">
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600">
          <span className="relative flex h-2 w-2">
            {isLiveStream ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400" />
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
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border font-medium ${
              isLiveStream
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs"
            }`}
          >
            {isLiveStream ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pause Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Resume Live</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
