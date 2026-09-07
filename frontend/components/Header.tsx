"use client";

import React from "react";
import Link from "next/link";
import { Activity, Flame, ShieldAlert, Layers } from "lucide-react";

interface HeaderProps {
  wellId?: string;
}

export function Header({ wellId }: HeaderProps) {
  return (
    <header className="border-b border-[#1e293b] bg-[#0d1321] px-6 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:border-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-wider uppercase text-slate-100">
                  ThermoTwin
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
                  HMI v2.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400 tracking-tight">
                CSS Thermal &amp; SRP Digital Twin
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-xs">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded transition ${
                !wellId
                  ? "bg-[#1a2540] text-amber-400 font-medium border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2e]"
              }`}
            >
              Field Overview
            </Link>
            {wellId && (
              <span className="flex items-center gap-1">
                <span className="text-slate-600">/</span>
                <span className="px-3 py-1.5 rounded bg-[#1a2540] text-cyan-400 font-mono font-medium border border-cyan-800/40">
                  {wellId}
                </span>
              </span>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#080c14] border border-[#1e293b]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300">SCADA LINK LIVE</span>
          </div>
          <div className="hidden sm:block text-slate-400 text-[11px]">
            FIELD: <span className="text-slate-200">COLD LAKE PAD 4</span>
          </div>
        </div>
      </div>
    </header>
  );
}
