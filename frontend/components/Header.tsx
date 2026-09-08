"use client";

import React from "react";
import Link from "next/link";
import { Activity, Flame, ShieldAlert, Layers } from "lucide-react";

interface HeaderProps {
  wellId?: string;
}

export function Header({ wellId }: HeaderProps) {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 py-3.5 sticky top-0 z-40 shadow-xs">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 group-hover:border-orange-400 group-hover:scale-105 transition duration-200 shadow-xs">
              <Flame className="w-4 h-4 fill-orange-500/20 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wider uppercase text-slate-900 font-['Space_Grotesk']">
                  ThermoTwin
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100/70 text-orange-700 border border-orange-200 font-mono font-semibold">
                  TWIN v2.0
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium tracking-tight">
                CSS Thermal &amp; SRP Digital Twin
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-md transition duration-150 ${
                !wellId
                  ? "bg-orange-500 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Field Overview
            </Link>
            {wellId && (
              <span className="flex items-center gap-1.5">
                <span className="text-slate-400 font-light">/</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-mono text-xs font-semibold border border-slate-200">
                  {wellId}
                </span>
              </span>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3.5 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 font-medium text-[11px]">SCADA TELEMETRY ACTIVE</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-[11px] font-medium bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <span>FIELD:</span>
            <span className="text-slate-900 font-semibold">COLD LAKE PAD 4</span>
          </div>
        </div>
      </div>
    </header>
  );
}
