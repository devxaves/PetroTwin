"use client";

import React, { useState, useEffect } from "react";
import type { WellTwinState } from "@/lib/api/types";
import {
  Gauge,
  Thermometer,
  Activity,
  Layers,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
} from "lucide-react";

interface WellSchematicTwinProps {
  wellId: string;
  twinState?: WellTwinState;
}

type FocusZone = "surface" | "tubing" | "pump" | "reservoir";

export function WellSchematicTwin({ wellId, twinState }: WellSchematicTwinProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeZone, setActiveZone] = useState<FocusZone>("surface");
  const [strokePhase, setStrokePhase] = useState(0); // 0 to 1

  const spm = twinState?.current_spm ?? 5.78;
  const strokeLength = twinState?.stroke_length_in ?? 120;
  const tempC = twinState?.current_temperature_c ?? 47.3;
  const viscosity = twinState?.current_viscosity_cp ?? 15214;
  const fillage = (twinState?.pump_fillage ?? 0.65) * 100;
  const cyclePhase = twinState?.css_cycle_phase ?? "PRODUCTION";

  // Sucker rod reciprocating animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const cycleDurationMs = (60 / Math.max(1, spm)) * 1000;
    let animationFrameId: number;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - startTime) % cycleDurationMs;
      const progress = elapsed / cycleDurationMs;
      // Sinusoidal displacement for harmonic rod motion
      const displacement = (Math.sin(progress * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      setStrokePhase(displacement);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, spm]);

  // Geometric calculations for the SVG schematic
  // Surface walking beam angle: -12 deg to +12 deg
  const beamAngle = (strokePhase - 0.5) * 24;
  // Polished rod vertical travel: 0 to 40px
  const rodOffset = strokePhase * 40;
  // Plunger vertical position in downhole barrel
  const plungerY = 320 + rodOffset;

  // Dynamic calculated kinematics
  const isUpstroke = strokePhase >= 0.5;
  const instantaneousLoad = Math.round(8150 + strokePhase * 10270);

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col text-slate-100">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-xs">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-base sm:text-lg text-white font-['Space_Grotesk'] uppercase tracking-wider">
                Live Subsurface Digital Twin
              </span>
              <span className="text-xs font-mono px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                CADENCE: {spm} SPM
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5 font-medium">
              Mechanical SRP reciprocation synchronized with Clearwater Sand thermal chamber
            </p>
          </div>
        </div>

        {/* Animation & Zone Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center bg-slate-800/90 rounded-2xl border border-slate-700/80 p-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveZone("surface")}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition font-bold ${
                activeZone === "surface"
                  ? "bg-orange-500 text-white font-black shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Surface
            </button>
            <button
              type="button"
              onClick={() => setActiveZone("tubing")}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition font-bold ${
                activeZone === "tubing"
                  ? "bg-sky-500 text-white font-black shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Wellbore
            </button>
            <button
              type="button"
              onClick={() => setActiveZone("pump")}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition font-bold ${
                activeZone === "pump"
                  ? "bg-emerald-500 text-white font-black shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Pump Barrel
            </button>
            <button
              type="button"
              onClick={() => setActiveZone("reservoir")}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition font-bold ${
                activeZone === "reservoir"
                  ? "bg-amber-500 text-white font-black shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Reservoir
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            className="p-2.5 rounded-2xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            title={isPlaying ? "Pause Motion" : "Resume Motion"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-orange-400" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* Main Schematic Body: Left SVG Visualizer + Right Telemetry HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
        {/* SVG Drawing Canvas (7 Cols) */}
        <div className="lg:col-span-7 p-4 bg-[#070b14] flex items-center justify-center relative overflow-hidden min-h-[440px]">
          {/* Subtle SCADA Grid Lines */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <svg
            viewBox="0 0 460 500"
            className="w-full h-auto max-h-[460px] select-none overflow-visible relative z-10"
          >
            <defs>
              <linearGradient id="wellboreThermal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0.95" />
              </linearGradient>

              <radialGradient id="steamChamber" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
                <stop offset="60%" stopColor="#ea580c" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
              </radialGradient>

              <filter id="thermalGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 1. SURFACE PUMPING UNIT */}
            <g id="surface-rig">
              {/* Ground level reference line */}
              <line
                x1="20"
                y1="140"
                x2="440"
                y2="140"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x="30" y="134" fill="#64748b" fontSize="8" fontFamily="monospace">
                GROUND LEVEL 0m
              </text>

              {/* Samson Post (A-Frame) */}
              <polygon points="120,140 145,55 170,140" fill="#1e293b" stroke="#475569" strokeWidth="2" />
              <polygon points="128,140 145,65 162,140" fill="#0f172a" />
              <circle cx="145" cy="55" r="4.5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />

              {/* Pitman Arm & Crank Weight */}
              <line x1="178" y1="78" x2="178" y2="128" stroke="#64748b" strokeWidth="3" />
              <circle cx="178" cy="128" r="10" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />

              {/* Walking Beam (Pivoting dynamically) */}
              <g transform={`rotate(${beamAngle}, 145, 55)`}>
                <rect x="75" y="50" width="115" height="10" rx="2" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
                {/* Horsehead Curved Cam */}
                <path
                  d="M 75,55 C 65,48 55,20 62,5 C 64,15 72,40 75,55 Z"
                  fill="#f97316"
                  stroke="#c2410c"
                  strokeWidth="1"
                />
              </g>

              {/* Polished Rod Wireline Bridle */}
              <line x1="62" y1={30 + rodOffset * 0.3} x2="62" y2={140} stroke="#94a3b8" strokeWidth="1.5" />
              {/* Stuffing box / Wellhead tee */}
              <rect x="56" y="132" width="12" height="14" fill="#334155" stroke="#64748b" strokeWidth="1" />
              <line x1="68" y1="138" x2="105" y2="138" stroke="#38bdf8" strokeWidth="2.5" />
              <text x="74" y="134" fill="#38bdf8" fontSize="7" fontFamily="monospace">
                FLOWLINE TO PAD
              </text>
            </g>

            {/* 2. WELLBORE CASING & THERMAL FLUID COLUMN */}
            <g id="subsurface-casing">
              {/* Outer Casing Pipe */}
              <rect x="54" y="146" width="16" height="320" fill="#0f172a" stroke="#334155" strokeWidth="2" />
              {/* Production Tubing with Thermal Gradient */}
              <rect x="58" y="146" width="8" height="315" fill="url(#wellboreThermal)" />
              {/* Reciprocating Sucker Rod String */}
              <line
                x1="62"
                y1="140"
                x2="62"
                y2={plungerY}
                stroke="#f8fafc"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </g>

            {/* 3. SUBSURFACE INSERT PUMP BARREL & PLUNGER */}
            <g id="downhole-pump">
              {/* Pump Barrel Housing */}
              <rect x="53" y="320" width="18" height="90" fill="none" stroke="#ffffff" strokeWidth="1.5" rx="1" />
              {/* Reciprocating Plunger */}
              <rect
                x="56"
                y={plungerY}
                width="12"
                height="32"
                fill="#ea580c"
                stroke="#ffffff"
                strokeWidth="1"
                rx="1"
              />
              {/* Traveling Valve indicator ball */}
              <circle
                cx="62"
                cy={plungerY + 26}
                r="2.5"
                fill={isUpstroke ? "#38bdf8" : "#f97316"}
                stroke="#ffffff"
                strokeWidth="0.8"
              />
              {/* Standing Valve at bottom of barrel */}
              <circle
                cx="62"
                cy="404"
                r="2.5"
                fill={isUpstroke ? "#f97316" : "#38bdf8"}
                stroke="#ffffff"
                strokeWidth="0.8"
              />
            </g>

            {/* 4. CLEARWATER SAND THERMAL PERFORATION CHAMBER */}
            <g id="reservoir-chamber" transform="translate(62, 445)">
              <ellipse cx="0" cy="0" rx="42" ry="28" fill="url(#steamChamber)" filter="url(#thermalGlow)" />
              {/* Perforation Jets */}
              <g stroke="#f97316" strokeWidth="1.5" strokeDasharray="2 3">
                <line x1="-22" y1="-8" x2="-8" y2="-8" />
                <line x1="-24" y1="0" x2="-8" y2="0" />
                <line x1="-22" y1="8" x2="-8" y2="8" />
                <line x1="8" y1="-8" x2="22" y2="-8" />
                <line x1="8" y1="0" x2="24" y2="0" />
                <line x1="8" y1="8" x2="22" y2="8" />
              </g>
              <text x="32" y="3" fill="#fb923c" fontSize="8" fontFamily="monospace" fontWeight="bold">
                CLEARWATER SAND &bull; 460m ({tempC.toFixed(1)} &deg;C)
              </text>
            </g>

            {/* Depth Markers */}
            <g id="depth-ticks">
              <line x1="36" y1="146" x2="44" y2="146" stroke="#475569" strokeWidth="1" />
              <text x="8" y="149" fill="#94a3b8" fontSize="8" fontFamily="monospace">0m</text>
              <line x1="36" y1="220" x2="44" y2="220" stroke="#475569" strokeWidth="1" />
              <text x="8" y="223" fill="#94a3b8" fontSize="8" fontFamily="monospace">100m</text>
              <line x1="36" y1="300" x2="44" y2="300" stroke="#475569" strokeWidth="1" />
              <text x="8" y="303" fill="#94a3b8" fontSize="8" fontFamily="monospace">250m</text>
              <line x1="36" y1="380" x2="44" y2="380" stroke="#475569" strokeWidth="1" />
              <text x="8" y="383" fill="#94a3b8" fontSize="8" fontFamily="monospace">380m</text>
              <line x1="36" y1="445" x2="44" y2="445" stroke="#f97316" strokeWidth="1.5" />
              <text x="8" y="448" fill="#f97316" fontSize="8" fontFamily="monospace" fontWeight="bold">460m</text>
            </g>
          </svg>
        </div>

        {/* Right Engineering Telemetry Readouts (5 Cols) */}
        <div className="lg:col-span-5 p-5 flex flex-col justify-between gap-4 bg-slate-900/95">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="uppercase font-bold text-slate-300 tracking-wider">
                  Telemetry HUD: {wellId}
                </span>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-bold border border-orange-500/30 uppercase">
                {cyclePhase}
              </span>
            </div>

            {/* Live Reciprocation Status Gauge */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Kinematic Motion</span>
                <span
                  className={`flex items-center gap-1 font-bold text-xs ${
                    isUpstroke ? "text-sky-400" : "text-amber-400"
                  }`}
                >
                  {isUpstroke ? (
                    <>
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>UPSTROKE (Fluid Lift)</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>DOWNSTROKE (Reset)</span>
                    </>
                  )}
                </span>
              </div>

              {/* Dynamic Instantaneous Load & Valve Synchronization */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-[11px]">
                <div>
                  <span className="text-slate-400">Traveling Valve</span>
                  <div className={`font-bold ${isUpstroke ? "text-emerald-400" : "text-sky-400"}`}>
                    {isUpstroke ? "CLOSED (Lifting)" : "OPEN (Fluid Bypass)"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Standing Valve</span>
                  <div className={`font-bold ${isUpstroke ? "text-amber-400" : "text-slate-400"}`}>
                    {isUpstroke ? "OPEN (Intake)" : "CLOSED (Seated)"}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Dynamic Rod Load</span>
                <span className="font-bold text-white">
                  {instantaneousLoad.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">lbs</span>
                </span>
              </div>
            </div>

            {/* Focus Zone Telemetry Details */}
            <div className="mt-3.5">
              {activeZone === "surface" && (
                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 flex flex-col gap-2 font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-orange-400 font-bold">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Surface Pumping Unit (SRP)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                    Heavy-duty beam pumping jack synchronized with downhole stroke kinematics.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-orange-500/20 text-[11px]">
                    <div>
                      <span className="text-slate-400">Motor Speed</span>
                      <div className="font-bold text-white">{spm} SPM</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Stroke Length</span>
                      <div className="font-bold text-white">{strokeLength}&quot;</div>
                    </div>
                  </div>
                </div>
              )}

              {activeZone === "tubing" && (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex flex-col gap-2 font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Wellbore Casing &amp; Production Tubing</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                    Tubing extends 460m into Clearwater formation. Hydrodynamic viscous drag monitored in real-time.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sky-500/20 text-[11px]">
                    <div>
                      <span className="text-slate-400">Vertical Depth</span>
                      <div className="font-bold text-white">460 m</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Tubing Pressure</span>
                      <div className="font-bold text-white">122.9 MPa</div>
                    </div>
                  </div>
                </div>
              )}

              {activeZone === "pump" && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2 font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Downhole Plunger &amp; Pump Barrel</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                    Insert pump barrel with synchronized dual ball-and-seat valves.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                    <div>
                      <span className="text-slate-400">Pump Fillage</span>
                      <div className="font-bold text-emerald-400">{fillage.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Valve Seal</span>
                      <div className="font-bold text-white">Nominal (Zero Leak)</div>
                    </div>
                  </div>
                </div>
              )}

              {activeZone === "reservoir" && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>Clearwater Sand Thermal Chamber</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                    Cyclic Steam Stimulation heating chamber mobilizing Cold Lake dead bitumen.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-500/20 text-[11px]">
                    <div>
                      <span className="text-slate-400">Steam Radius</span>
                      <div className="font-bold text-white">14.2 m</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Bitumen Viscosity</span>
                      <div className="font-bold text-sky-400">~{viscosity.toLocaleString()} cP</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>MODEL: HYBRID ML+PHYSICS TWIN</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              TELEMETRY LOCKED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
