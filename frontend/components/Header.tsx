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
    <header className="border-b border-slate-200 bg-white/98 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-50 shadow-xs">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 group-hover:border-orange-400 group-hover:scale-105 transition duration-200 shadow-xs">
              <Flame className="w-5 h-5 fill-orange-500/20 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 font-['Space_Grotesk']">
                  ThermoTwin
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200 font-mono font-bold tracking-tight">
                  DIGITAL TWIN v2.0
                </span>
              </div>
              <div className="text-xs text-slate-600 font-medium">
                CSS Heavy-Oil &amp; SRP Operations Intelligence
              </div>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-2 text-xs sm:text-sm font-medium">
            <Link
              href="/dashboard"
              className={`px-3.5 py-2 rounded-xl transition duration-150 flex items-center gap-2 ${
                pathname === "/dashboard"
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold"
              }`}
            >
              <Activity className="w-4 h-4 text-orange-400" />
              <span>Fleet Command</span>
            </Link>

            {/* Well Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={`px-3.5 py-2 rounded-xl transition duration-150 flex items-center gap-2 border ${
                  wellId
                    ? "bg-orange-50 border-orange-300 text-orange-950 font-bold shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                }`}
              >
                <span>{wellId ? `Well: ${wellId}` : "Select Well Twin"}</span>
                <ChevronDown className="w-4 h-4 opacity-70" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 text-xs divide-y divide-slate-100">
                    <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                      Cold Lake Pad 4 Wells
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {wellList.map((w) => (
                        <button
                          key={w.well_id}
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            router.push(`/wells/${w.well_id}`);
                          }}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-orange-50/50 transition ${
                            w.well_id === wellId
                              ? "bg-orange-50 font-bold text-orange-950"
                              : "text-slate-800 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="font-mono font-bold text-slate-900">{w.well_id}</span>
                          </div>
                          <span className="text-xs text-slate-500 truncate max-w-[130px]">
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
              className={`px-3.5 py-2 rounded-xl transition duration-150 flex items-center gap-2 ${
                pathname === "/status"
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold"
              }`}
            >
              <Database className="w-4 h-4 text-sky-500" />
              <span>Telemetry Health</span>
            </Link>
          </nav>
        </div>

        {/* Telemetry Status & Clock */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden lg:flex items-center gap-2 text-slate-600 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Radio className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="font-bold text-slate-800">PAD 4</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-900 font-bold">{currentTime || "LIVE"}</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-2xs font-bold text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="tracking-wide">SCADA LIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
