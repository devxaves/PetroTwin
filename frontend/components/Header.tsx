"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Flame, ChevronDown, Activity, Database, Radio } from "lucide-react";
import { useWells } from "@/lib/api/queries";

interface HeaderProps {
  wellId?: string;
}

export function Header({ wellId }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: wells } = useWells();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "UTC",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " UTC"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const wellList = wells ?? [
    { well_id: "WELL-001", name: "Cold Lake Pad 4 — Well 1" },
    { well_id: "WELL-002", name: "Cold Lake Pad 4 — Well 2" },
    { well_id: "WELL-003", name: "Cold Lake Pad 4 — Well 3" },
    { well_id: "WELL-004", name: "Cold Lake Pad 4 — Well 4" },
  ];

  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-2.5 sticky top-0 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 group-hover:border-orange-400 group-hover:scale-105 transition duration-200 shadow-xs">
              <Flame className="w-4 h-4 fill-orange-500/20 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-slate-900 font-['Space_Grotesk']">
                  ThermoTwin
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/80 font-mono font-semibold tracking-tight">
                  DIGITAL TWIN v2.0
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-normal">
                CSS Heavy-Oil &amp; SRP Operations Intelligence
              </div>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg transition duration-150 flex items-center gap-1.5 ${
                pathname === "/dashboard"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-orange-400" />
              <span>Fleet Command</span>
            </Link>

            {/* Well Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg transition duration-150 flex items-center gap-1.5 border ${
                  wellId
                    ? "bg-orange-50 border-orange-200 text-orange-900 font-semibold shadow-xs"
                    : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>{wellId ? `Well: ${wellId}` : "Select Well Twin"}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 text-xs divide-y divide-slate-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Cold Lake Pad 4 Wells
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {wellList.map((w) => (
                        <button
                          key={w.well_id}
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            router.push(`/wells/${w.well_id}`);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition ${
                            w.well_id === wellId
                              ? "bg-orange-50/80 font-bold text-orange-900"
                              : "text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <span className="font-mono font-medium">{w.well_id}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                            {w.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link
              href="/status"
              className={`px-3 py-1.5 rounded-lg transition duration-150 flex items-center gap-1.5 ${
                pathname === "/status"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Database className="w-3.5 h-3.5 text-sky-500" />
              <span>Telemetry Health</span>
            </Link>
          </nav>
        </div>

        {/* Telemetry Status & Clock */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden lg:flex items-center gap-2 text-slate-500 text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
            <Radio className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
            <span className="font-semibold text-slate-600">PAD 4</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700 font-semibold">{currentTime || "LIVE"}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-[11px] tracking-tight">SCADA LIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
