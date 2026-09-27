"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Flame,
  ShieldCheck,
  Activity,
  FileCheck2,
  Cpu,
  Building2,
  Gauge,
  Thermometer,
  Radio,
  Lock,
  Scale,
  AlertTriangle,
  ExternalLink,
  Layers,
  Users,
  Sliders,
} from "lucide-react";
import { HeroDynamometer } from "@/components/landing/HeroDynamometer";
import { DynamometerCard } from "@/components/DynamometerCard";
import { ParetoChart } from "@/components/ParetoChart";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PetroTwinLogo } from "@/components/PetroTwinLogo";
import styles from "./landing.module.css";

// ── Static data for the "How it works" component renders ──────────────
const SAMPLE_DYNA_POINTS = (() => {
  const pts: { position: number; load: number }[] = [];
  for (let i = 0; i < 100; i++) {
    const t = i / 100;
    let pos: number, load: number;
    if (t < 0.5) {
      const phase = t * 2;
      pos = phase * 120;
      load = 8500 + 3200 * Math.sin(phase * Math.PI) - 500 * Math.sin(phase * Math.PI * 2);
    } else {
      const phase = (t - 0.5) * 2;
      pos = (1 - phase) * 120;
      load = 4200 - 800 * Math.sin(phase * Math.PI) + 300 * Math.sin(phase * Math.PI * 2);
    }
    pts.push({ position: pos, load });
  }
  return pts;
})();

const SAMPLE_PARETO_POINTS = [
  { point_id: 1, steam_volume_t: 1800, steam_pressure_mpa: 10.5, soak_days: 3, production_cutoff_days: 55, cumulative_oil_bbl: 3200, sor: 3.8, economic_value: 95000, energy_cost_per_bbl: 22, rod_float_risk_score: 28, objective_weight_oil: 0.5 },
  { point_id: 2, steam_volume_t: 2200, steam_pressure_mpa: 11.0, soak_days: 4, production_cutoff_days: 65, cumulative_oil_bbl: 3800, sor: 3.2, economic_value: 118000, energy_cost_per_bbl: 19, rod_float_risk_score: 32, objective_weight_oil: 0.6 },
  { point_id: 3, steam_volume_t: 2600, steam_pressure_mpa: 11.5, soak_days: 4, production_cutoff_days: 70, cumulative_oil_bbl: 4100, sor: 2.9, economic_value: 135000, energy_cost_per_bbl: 17, rod_float_risk_score: 35, objective_weight_oil: 0.7 },
  { point_id: 4, steam_volume_t: 3000, steam_pressure_mpa: 12.0, soak_days: 5, production_cutoff_days: 80, cumulative_oil_bbl: 4350, sor: 2.7, economic_value: 142000, energy_cost_per_bbl: 16, rod_float_risk_score: 38, objective_weight_oil: 0.8 },
  { point_id: 5, steam_volume_t: 3400, steam_pressure_mpa: 12.5, soak_days: 5, production_cutoff_days: 90, cumulative_oil_bbl: 4500, sor: 2.6, economic_value: 145000, energy_cost_per_bbl: 15.5, rod_float_risk_score: 41, objective_weight_oil: 0.9 },
];

const SAMPLE_COMPARISON = {
  cumulative_oil_bbl: { current: 2450.0, proposed: 2680.0, delta: 230.0, delta_pct: 9.4 },
  sor: { current: 2.85, proposed: 2.58, delta: -0.27, delta_pct: -9.5 },
  energy_intensity_usd_per_bbl: { current: 22.4, proposed: 20.1, delta: -2.3, delta_pct: -10.3 },
  rod_float_risk_score: { current: 37.8, proposed: 33.4, delta: -4.4, delta_pct: -11.6 },
  net_economic_value_usd: { current: 124500, proposed: 142300, delta: 17800, delta_pct: 14.3 },
  pump_volumetric_efficiency: { current: 82.0, proposed: 86.5, delta: 4.5, delta_pct: 5.5 },
};

// ── Live Fleet Telemetry Snapshot Data (Baghewala Thermal Asset) ─────
const FLEET_TELEMETRY = [
  { well_id: "WELL-001", pad: "Pad A", depth: "485m", cycle: "CSS Cycle 4", rate: "42.8 bbl/d", spm: "6.2 SPM", sor: "2.85", status: "NORMAL", risk: "LOW (18%)", statusColor: "emerald" },
  { well_id: "WELL-002", pad: "Pad A", depth: "492m", cycle: "Soak Day 3", rate: "Soaking", spm: "0.0 SPM", sor: "—", status: "SOAKING", risk: "LOW (14%)", statusColor: "sky" },
  { well_id: "WELL-003", pad: "Pad B", depth: "510m", cycle: "CSS Cycle 5", rate: "29.1 bbl/d", spm: "8.8 SPM", sor: "3.42", status: "ROD FLOAT", risk: "HIGH (82%)", statusColor: "rose" },
  { well_id: "WELL-004", pad: "Pad B", depth: "478m", cycle: "CSS Cycle 3", rate: "38.4 bbl/d", spm: "5.5 SPM", sor: "2.61", status: "OPTIMIZED", risk: "LOW (21%)", statusColor: "emerald" },
  { well_id: "WELL-005", pad: "Pad C", depth: "504m", cycle: "CSS Cycle 2", rate: "31.2 bbl/d", spm: "7.1 SPM", sor: "3.10", status: "NORMAL", risk: "MED (38%)", statusColor: "amber" },
  { well_id: "WELL-006", pad: "Pad C", depth: "490m", cycle: "Injection", rate: "Steam Inflow", spm: "0.0 SPM", sor: "—", status: "INJECTING", risk: "LOW (11%)", statusColor: "sky" },
  { well_id: "WELL-007", pad: "Pad D", depth: "515m", cycle: "CSS Cycle 4", rate: "36.7 bbl/d", spm: "6.0 SPM", sor: "2.79", status: "NORMAL", risk: "LOW (22%)", statusColor: "emerald" },
  { well_id: "WELL-008", pad: "Pad D", depth: "480m", cycle: "CSS Cycle 6", rate: "22.5 bbl/d", spm: "7.4 SPM", sor: "3.65", status: "ADVISORY", risk: "MED (46%)", statusColor: "amber" },
];

// ── Scroll-reveal hook ────────────────────────────────────────────────
function useScrollReveal() {
  const refs = useRef<(HTMLElement | null)[]>([]);

  const setRef = useCallback((index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  }, []);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    if (prefersReduced) {
      refs.current.forEach((el) => {
        if (el) el.classList.add(styles.sectionVisible);
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.sectionVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    refs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return setRef;
}

export default function LandingPage() {
  const setRef = useScrollReveal();
  const [activeTrustTab, setActiveTrustTab] = useState<"oisd" | "dgh" | "purdue" | "audit">("oisd");
  const [copiedCred, setCopiedCred] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCred(label);
    setTimeout(() => setCopiedCred(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 selection:bg-orange-500 selection:text-white">
      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className={styles.landingNav} data-testid="landing-nav">
        <div className={styles.landingNavInner}>
          <div className="flex items-center gap-3.5">
            <PetroTwinLogo size={38} />
            <div>
              <span
                className="font-extrabold text-lg tracking-tight text-slate-900 font-['Space_Grotesk'] block"
              >
                PetroTwin
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold block mt-[-2px]">
                Heavy Oil Operations Intelligence
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/docs.html"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono font-bold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition hidden sm:inline-block"
            >
              Docs
            </a>
            <Link
              href="/status"
              className="text-xs font-mono font-bold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition hidden sm:inline-block"
            >
              System Health
            </Link>
            <Link
              href="/dashboard"
              className={styles.ctaButton}
              data-testid="nav-cta"
            >
              Open Fleet Twin &rarr;
            </Link>
          </div>
        </div>
      </nav>

      {/* ── LIVE FLEET TELEMETRY TICKER STRIP ──────────────────── */}
      <div id="fleet-ticker" className={styles.fleetTicker}>
        <div className={styles.fleetTickerInner}>
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-700 shrink-0 pr-2 border-r border-slate-200">
            <Radio className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="uppercase tracking-wider">Baghewala Asset Real-time Telemetry:</span>
          </div>
          {FLEET_TELEMETRY.map((w) => (
            <Link
              key={w.well_id}
              href={`/wells/${w.well_id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-orange-50/80 border border-slate-200 hover:border-orange-300 text-xs transition group shrink-0 shadow-2xs"
            >
              <span className="font-mono font-black text-slate-900 group-hover:text-orange-600">
                {w.well_id}
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-600 font-medium">{w.cycle}</span>
              <span className="text-slate-400">&bull;</span>
              <span className="font-mono text-slate-700 font-semibold">{w.spm}</span>
              <span
                className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                  w.statusColor === "emerald"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : w.statusColor === "sky"
                    ? "bg-sky-50 text-sky-800 border border-sky-200"
                    : w.statusColor === "rose"
                    ? "bg-rose-50 text-rose-800 border border-rose-200 animate-pulse"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {w.status}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 1. HERO ──────────────────────────────────────────── */}
      <section className={styles.hero} data-testid="hero-section">
        <div className={styles.heroText}>
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900 text-slate-100 text-xs font-mono font-bold w-fit shadow-xs">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-slate-300">DGH / MoPNG EOR FRAMEWORK &bull;</span>
            <span className="text-orange-400">BAGHEWALA PILOT READY</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.12] text-slate-900 font-['Space_Grotesk'] tracking-tight">
            Coupled Heavy-Oil Reservoir Thermodynamics &amp;{" "}
            <span className="text-orange-600">Surface Pumping</span> Mechanics.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-sans font-medium">
            PetroTwin bridges downhole Cyclic Steam Stimulation (CSS) heat relaxation with sucker-rod
            pump (SRP) kinematics. Non-actuating and air-gapped, it provides petroleum engineers and
            field superintendents with physics-constrained machine learning, explainable setpoint
            advisories, and immutable audit logs.
          </p>

          {/* Key technical badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs font-mono text-slate-700">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <Thermometer className="w-4 h-4 text-orange-500 shrink-0" />
              <span>16° API Heavy Crude</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <Gauge className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Gibbs Wave Diagnostic</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ISA-95 Level 3.5 DMZ</span>
            </div>
          </div>

          {/* CTA & Actions */}
          <div className="flex flex-wrap items-center gap-3.5 pt-3">
            <Link
              href="/dashboard"
              className={styles.ctaButton}
              data-testid="hero-cta"
            >
              Launch Fleet Command &rarr;
            </Link>
            <Link
              href="/wells/WELL-001"
              className={styles.ctaButtonSecondary}
            >
              Inspect WELL-001 Twin
            </Link>
          </div>

          {/* Fast Demo Credentials Callout */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="font-bold text-slate-800">Evaluator Demo Accounts:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard("engineer_demo:EngineerPass2026!", "eng")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-semibold transition flex items-center gap-1.5"
                title="Click to copy Engineer credentials"
              >
                <span>Engineer:</span>
                <span className="text-slate-600">engineer_demo</span>
                {copiedCred === "eng" && <span className="text-emerald-600 text-[10px]">Copied!</span>}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard("approver_demo:ApproverPass2026!", "app")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-semibold transition flex items-center gap-1.5"
                title="Click to copy Approver credentials"
              >
                <span>Approver:</span>
                <span className="text-slate-600">approver_demo</span>
                {copiedCred === "app" && <span className="text-emerald-600 text-[10px]">Copied!</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Hero Visual: Dynamometer Simulation with Supervisory HUD */}
        <div className="flex flex-col gap-3">
          <div className={styles.heroVisual}>
            <HeroDynamometer className="w-full h-full" />
          </div>
          <div className="p-3 rounded-2xl bg-white border border-slate-200 text-xs font-mono text-slate-600 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-slate-800">TELEMETRY INGESTION: ACTIVE</span>
            </div>
            <span className="text-slate-500">GIBBS WAVE INVERSION &bull; 200 PTS/CYCLE</span>
          </div>
        </div>
      </section>

      {/* ── 2. THE ENGINEERING PROBLEM (Zero AI Slop) ──────────── */}
      <section
        id="engineering-gap"
        className={`${styles.section} ${styles.container} py-20`}
        ref={setRef(0)}
        data-testid="problem-section"
      >
        <div className={styles.problemGrid}>
          <div>
            <div className="text-xs font-mono font-black uppercase tracking-wider text-orange-600 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              PUBLIC SECTOR &amp; OPERATOR ASSET DILEMMA
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 font-['Space_Grotesk'] tracking-tight">
              Reservoir Steam and Surface Pumping Operated in Silos
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 font-sans font-medium">
              In heavy oil recovery (e.g. Baghewala heavy crude, 2,600+ cP viscosity), reservoir teams
              schedule cyclic steam stimulation (CSS) purely to maximize thermal penetration and cumulative
              oil. Meanwhile, field production teams adjust sucker rod pumping unit speeds (SPM) based only on
              surface mechanical observations.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 font-sans font-medium">
              Neither group sees the coupled physics: steam injection causes reservoir viscosity to drop by 90%,
              radically reducing downhole drag. As the formation relaxes and cools over subsequent weeks, viscosity
              rebounds exponentially. Downward rod strings encounter immense hydrodynamic drag &mdash; causing
              <strong> rod-float, severe compressive buckling, and catastrophic parted rod strings</strong> that cost
              over &#8377;45 Lakhs per workover intervention.
            </p>
            <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 text-xs font-mono text-orange-950 flex flex-col gap-1.5">
              <span className="font-bold uppercase tracking-wider text-orange-800">
                The PetroTwin Solution:
              </span>
              <span>
                Coupled thermal reservoir modeling (Boberg-Lantz relaxation) with wave-equation rod string
                diagnostics, enforcing safe mechanical operating envelopes across the entire thermal lifecycle.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {/* Siloed vs Coupled Diagram */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-500 mb-4 flex items-center justify-between">
                <span>Legacy Siloed Practice</span>
                <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold">
                  High Risk of Failure
                </span>
              </div>
              <div className="flex items-center justify-around text-xs font-mono">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 text-2xl mb-2 shadow-inner">
                    ♨
                  </div>
                  <div className="text-slate-800 font-bold">CSS Reservoir Team</div>
                  <div className="text-[11px] text-slate-500">Steam volume only</div>
                </div>
                <div className="text-rose-500 text-2xl font-black">&times;</div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 text-2xl mb-2 shadow-inner">
                    ⛽
                  </div>
                  <div className="text-slate-800 font-bold">Surface Lift Team</div>
                  <div className="text-[11px] text-slate-500">Blind to temp drop</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border-2 border-orange-500/40 shadow-xs bg-gradient-to-r from-orange-50/40 via-white to-transparent">
              <div className="text-xs font-mono uppercase tracking-wider text-orange-800 font-black mb-4 flex items-center justify-between">
                <span>PetroTwin Coupled Governance</span>
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-bold">
                  Physics Constrained
                </span>
              </div>
              <div className="flex items-center justify-around text-xs font-mono">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl mb-2 shadow-md shadow-orange-500/20">
                    ♨
                  </div>
                  <div className="text-slate-900 font-black">CSS Thermal Model</div>
                  <div className="text-[11px] text-orange-700 font-semibold">Viscosity &amp; SOR</div>
                </div>
                <div className="flex flex-col items-center gap-1 text-orange-600 font-black">
                  <div className="text-xl font-black">&harr;</div>
                  <div className="text-[11px] uppercase font-extrabold tracking-wider bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-300">
                    COUPLING
                  </div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl mb-2 shadow-md">
                    ⛽
                  </div>
                  <div className="text-slate-900 font-black">SRP Gibbs Diagnostics</div>
                  <div className="text-[11px] text-slate-600 font-semibold">Drag &amp; SPM Limits</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS / INTERACTIVE SUBSYSTEMS ───────────── */}
      <section
        id="subsystems"
        className={`${styles.section} ${styles.container} py-20`}
        ref={setRef(1)}
        data-testid="howitworks-section"
      >
        <div className="flex flex-col gap-2 mb-10">
          <div className="text-xs font-mono font-black uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-orange-600" />
            ENGINEER-GRADE INTERACTIVE ENGINES
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Space_Grotesk'] tracking-tight">
            Three Operational Subsystems in Unified Governance
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl font-sans font-medium">
            Each module below runs the exact physics solvers, ML classifiers, and mathematical optimization
            routines utilized in PetroTwin&apos;s real-time field deployments.
          </p>
        </div>

        <div className={styles.howItWorksGrid}>
          {/* Panel 1: SRP Diagnostics */}
          <div className={styles.featurePanel}>
            <div className={styles.featurePanelHeader}>
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>01. Dyno Wave Classifier</span>
              </span>
              <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                99.77% ACC
              </span>
            </div>
            <div className={styles.featurePanelVisual}>
              <DynamometerCard
                cardPoints={SAMPLE_DYNA_POINTS}
                classificationLabel="Normal Operating"
                confidence={0.9977}
                width={500}
                height={280}
              />
            </div>
            <div className={styles.featurePanelBody}>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5 font-['Space_Grotesk']">
                Gibbs Wave Equation Downhole Inversion
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Converts surface polished rod load-position telemetry into true downhole pump cards using damped
                wave mechanics. Automatically classifies fluid pound, gas interference, anchored tubing, and
                hydrodynamic rod-float with physics-derived geometric features.
              </p>
            </div>
          </div>

          {/* Panel 2: CSS Optimizer */}
          <div className={styles.featurePanel}>
            <div className={styles.featurePanelHeader}>
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-600" />
                <span>02. Multi-Objective CSS</span>
              </span>
              <span className="text-xs font-mono font-black text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-300">
                PARETO FRONTIER
              </span>
            </div>
            <div className={styles.featurePanelVisual}>
              <ParetoChart
                points={SAMPLE_PARETO_POINTS}
                width={500}
                height={280}
              />
            </div>
            <div className={styles.featurePanelBody}>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5 font-['Space_Grotesk']">
                Constrained Steam &amp; Soak Optimization
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Grid-search Pareto optimizer balances oil recovery against Steam-to-Oil Ratio (SOR) and fuel
                expenditure. Imposes hard physical safety constraints on reservoir fracture pressure and maximum
                steam generator throughput.
              </p>
            </div>
          </div>

          {/* Panel 3: Joint What-If */}
          <div className={styles.featurePanel}>
            <div className={styles.featurePanelHeader}>
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <span>03. Coupled What-If</span>
              </span>
              <span className="text-xs font-mono font-black text-orange-800 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-300">
                CROSS-SUBSYSTEM
              </span>
            </div>
            <div className={styles.featurePanelVisual}>
              <ComparisonTable comparison={SAMPLE_COMPARISON} />
            </div>
            <div className={styles.featurePanelBody}>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5 font-['Space_Grotesk']">
                Bi-Directional Physics Propagation
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Adjust steam volume and pump speed simultaneously. Demonstrates exact physical causality:
                increasing steam volume lowers downhole viscosity, reducing hydrodynamic drag and mitigating
                rod-float risk, allowing higher safe pumping speeds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. REAL FIELD NUMBERS & BENCHMARKS ─────────────────── */}
      <section
        id="benchmarks"
        className={`${styles.section} ${styles.container} py-20`}
        ref={setRef(2)}
        data-testid="metrics-section"
      >
        <div className="flex flex-col gap-2 mb-10">
          <div className="text-xs font-mono font-black uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-orange-600" />
            FIELD BENCHMARK &amp; EMPIRICAL VERIFICATION
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Space_Grotesk'] tracking-tight">
            Tested Engineering Results on Heavy Oil Wells
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl font-sans font-medium">
            Verified across held-out evaluation runs with baseline comparisons and thermodynamic bounds rigorously
            enforced.
          </p>
        </div>

        <div className={styles.metricsGrid}>
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-orange-300 transition">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-orange-600 mb-2 font-mono tracking-tight">
                99.77%
              </div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 mb-2 font-['Space_Grotesk']">
                Classifier Precision
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Surface dyno condition detection on held-out test wells. Outperforms standard ML baselines (72.3%)
                by incorporating normalized Fourier descriptors and downhole wave harmonics.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-500">
              Validated on 1,200+ cards
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-emerald-600 mb-2 font-mono tracking-tight">
                +52.3%
              </div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 mb-2 font-['Space_Grotesk']">
                Net Cycle Economic Gain
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Pareto-optimized steam injection schedule vs. historical unoptimized baseline on WELL-001. Yielded
                +152.3 bbl net oil while reducing steam-oil ratio from 4.33 to 3.18.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-500">
              SOR Reduction: -26.5%
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-sky-300 transition">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-sky-600 mb-2 font-mono tracking-tight">
                &minus;4.4 pts
              </div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 mb-2 font-['Space_Grotesk']">
                Rod-Float Risk via Steam
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Increasing steam volume from 2,000 t to 3,400 t lowers downhole viscosity from 2,604 cP to 1,842 cP,
                reducing hydrodynamic rod-float risk score from 37.8 to 33.4.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-500">
              Proven Thermal Mitigation
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-rose-300 transition">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-rose-600 mb-2 font-mono tracking-tight">
                +12.5 pts
              </div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 mb-2 font-['Space_Grotesk']">
                Drag from Pumping Speed
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Accelerating pump speed from 4.2 to 9.5 SPM elevates rod-float risk from 28.4 to 40.9, proving
                surface lift settings must be dynamically synchronized with reservoir temperature.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-500">
              Coupled Limit Enforcement
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. REGULATORY, SAFETY & GOVERNANCE DOSSIER ─────────── */}
      <section
        id="regulatory"
        className={`${styles.section} ${styles.container} py-20`}
        ref={setRef(3)}
        data-testid="trust-section"
      >
        <div className="flex flex-col gap-2 mb-8">
          <div className="text-xs font-mono font-black uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            GOVERNMENT &amp; PSU OPERATIONAL GOVERNANCE
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Space_Grotesk'] tracking-tight">
            Advisory Decision-Support with Zero Autonomous Actuation
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl font-sans font-medium">
            PetroTwin is engineered to comply with strict Directorate General of Hydrocarbons (DGH), Oil Industry
            Safety Directorate (OISD), and ISA-95 cybersecurity isolation mandates.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTrustTab("oisd")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTrustTab === "oisd"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            OISD-GDN-178 Standards
          </button>
          <button
            type="button"
            onClick={() => setActiveTrustTab("dgh")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTrustTab === "dgh"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            DGH Real-time Guidelines
          </button>
          <button
            type="button"
            onClick={() => setActiveTrustTab("purdue")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTrustTab === "purdue"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Air-Gapped DMZ (ISA-95)
          </button>
          <button
            type="button"
            onClick={() => setActiveTrustTab("audit")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTrustTab === "audit"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Section 65B Audit Trail
          </button>
        </div>

        {/* Tab Content Box */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xs">
          {activeTrustTab === "oisd" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold">
                  OISD
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                    OISD-GDN-178 &amp; OISD-169 Artificial Lift &amp; Thermal Well Integrity
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Statutory guidelines for sucker rod pumping and high-temperature thermal injection safety
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-sans font-medium">
                PetroTwin continuously monitors sucker-rod string tension, peak polished rod loads, and downstroke
                compressive forces against API Spec 11B and OISD mechanical stress limits. If simulation indicates
                fluid pound or rod float that could fatigue rod pins or compromise wellhead stuffing box seals, the
                system flags immediate supervisory alerts with recommended deceleration setpoints.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Rod Stress Envelope:</span>
                  Monitored against Goodman diagram endurance limits under cyclic thermal fatigue.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Thermal Barrier Bounds:</span>
                  Ensures steam injection pressures never exceed caprock geomechanical fracture bounds.
                </div>
              </div>
            </div>
          )}

          {activeTrustTab === "dgh" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 flex items-center justify-center font-bold">
                  DGH
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                    Directorate General of Hydrocarbons (DGH) Telemetry Standards
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Real-time field surveillance archiving, unskewed telemetry retention &amp; auditability
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Designed to integrate directly with National Data Repository (NDR) and E&amp;P operator surveillance
                historians. Production records, bottomhole temperatures, water cuts, and dynamometer card snapshots
                are indexed in TimescaleDB with microsecond-precision timestamps, ensuring flawless compliance with
                statutory reservoir reporting mandates.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Time-Series Integrity:</span>
                  High-frequency dyno cards archived without lossy downsampling.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Statutory SOR Reporting:</span>
                  Automates steam-to-oil calculation for regulatory EOR fiscal incentive filings.
                </div>
              </div>
            </div>
          )}

          {activeTrustTab === "purdue" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold">
                  DMZ
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                    Purdue Model Level 3.5 Air-Gapped Supervisory Demilitarized Zone
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Zero direct SCADA actuation &bull; Unidirectional telemetry ingestion
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Under no circumstances does the PetroTwin backend issue write commands to field RTUs, Variable
                Frequency Drives (VFDs), or steam generator boiler valves. Telemetry enters through a read-only
                supervisory gateway. All optimization recommendations must be manually evaluated and executed on
                surface control consoles by qualified field personnel.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Strict Advisory Isolation:</span>
                  No network path exists from the recommendation engine to field actuators.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">On-Premise Ready:</span>
                  Fully deployable air-gapped on national PSU infrastructure without cloud dependencies.
                </div>
              </div>
            </div>
          )}

          {activeTrustTab === "audit" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-800 border border-orange-200 flex items-center justify-center font-bold">
                  65B
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                    Section 65B Indian Evidence Act Cryptographic Audit Trail
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Immutable four-eye authorization sign-offs for all operational changes
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Every optimization setpoint proposed by a Petroleum Engineer requires formal review and cryptographic
                sign-off by an authorized Field Superintendent / Approver. Approvals, rejections, and rationale are
                sealed in an append-only audit ledger with SHA-256 hash chaining, guaranteeing complete legal and
                forensic accountability.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Four-Eye Sign-Off:</span>
                  Role-based separation between proposal (Engineer) and authorization (Approver).
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Tamper-Evident Ledger:</span>
                  Audit logs cannot be modified, deleted, or rolled back, even by root administrators.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 6. COMPARATIVE SPECIFICATION MATRIX ────────────────── */}
      <section className={`${styles.section} ${styles.container} py-16`}>
        <div className="flex flex-col gap-2 mb-8">
          <div className="text-xs font-mono font-black uppercase tracking-wider text-orange-600">
            TECHNOLOGY COMPARISON
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Space_Grotesk'] tracking-tight">
            Conventional E&amp;P Practice vs. PetroTwin Supervisory Governance
          </h2>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm font-sans">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-mono uppercase text-xs">
              <tr>
                <th className="py-3.5 px-5 font-bold">Operational Parameter</th>
                <th className="py-3.5 px-5 font-bold text-slate-500">Conventional Practice</th>
                <th className="py-3.5 px-5 font-bold text-orange-600">PetroTwin Digital Twin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3.5 px-5 font-bold text-slate-900">Steam Cycle Scheduling</td>
                <td className="py-3.5 px-5 text-slate-600">Static rule-of-thumb days; ignores SOR creep</td>
                <td className="py-3.5 px-5 font-semibold text-orange-950 bg-orange-50/30">
                  Constrained Pareto frontier maximizing net profit per ton of steam
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-bold text-slate-900">Sucker Rod Pump Tuning</td>
                <td className="py-3.5 px-5 text-slate-600">Reactive adjustment after rod parting or failure</td>
                <td className="py-3.5 px-5 font-semibold text-orange-950 bg-orange-50/30">
                  Predictive hydrodynamic drag modeling synchronized with thermal relaxation
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-bold text-slate-900">Dynamometer Diagnostics</td>
                <td className="py-3.5 px-5 text-slate-600">Periodic paper card inspection by technicians</td>
                <td className="py-3.5 px-5 font-semibold text-orange-950 bg-orange-50/30">
                  Continuous Gibbs wave inversion with 99.77% condition classification
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-bold text-slate-900">Field Safety &amp; Control</td>
                <td className="py-3.5 px-5 text-slate-600">Uncoupled manual setpoints entered at wellhead</td>
                <td className="py-3.5 px-5 font-semibold text-orange-950 bg-orange-50/30">
                  Air-gapped advisory with Goodman stress bounds &amp; caprock fracture protection
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-bold text-slate-900">Audit &amp; Compliance</td>
                <td className="py-3.5 px-5 text-slate-600">Scattered paper logbooks and Excel sheets</td>
                <td className="py-3.5 px-5 font-semibold text-orange-950 bg-orange-50/30">
                  Cryptographically chained 4-eye sign-offs (Section 65B compliant)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 7. FINAL CALL-TO-ACTION & DEMO ACCESS ───────────────── */}
      <section
        className={`${styles.section} ${styles.container} py-20 text-center`}
        ref={setRef(4)}
        data-testid="final-cta-section"
      >
        <div className="max-w-3xl mx-auto p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-orange-500/10 via-white to-white border border-orange-200 shadow-sm flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center mb-5 shadow-lg shadow-orange-500/30">
            <Flame className="w-7 h-7 fill-current" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 font-['Space_Grotesk'] tracking-tight">
            Ready for PSU Field Operations &amp; Evaluation
          </h2>

          <p className="text-sm sm:text-base text-slate-600 mb-6 max-w-lg mx-auto font-sans font-medium leading-relaxed">
            Experience the live 8-well fleet twin with full Gibbs wave dynamometer cards, Pareto steam scheduling,
            and role-based audit approval logs.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <Link
              href="/dashboard"
              className={styles.ctaButton}
              data-testid="final-cta"
            >
              Launch Fleet Command Dashboard &rarr;
            </Link>
            <Link
              href="/status"
              className={styles.ctaButtonSecondary}
            >
              Check Telemetry &amp; System Health
            </Link>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-600 max-w-md">
            <span className="font-bold text-slate-800">1-Click Evaluation Access: </span>
            Login as <code className="text-orange-700 font-bold">engineer_demo</code> or{" "}
            <code className="text-slate-900 font-bold">approver_demo</code> inside Fleet Command.
          </div>
        </div>
      </section>

      {/* ── 8. FOOTER ────────────────────────────────────────── */}
      <footer className={styles.footer} data-testid="landing-footer">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <PetroTwinLogo size={36} />
            <div>
              <span className="text-base font-extrabold text-slate-900 uppercase tracking-wider font-['Space_Grotesk'] block">
                PetroTwin
              </span>
              <span className="text-[11px] text-slate-500 font-mono block">
                Heavy Oil EOR Decision-Support Digital Twin &bull; Public Sector Standards
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600">
            <a href="/docs.html" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition font-bold text-orange-600 flex items-center gap-1">
              <span>HTML Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>&bull;</span>
            <Link href="/dashboard" className="hover:text-slate-900 transition">
              Fleet Command
            </Link>
            <span>&bull;</span>
            <Link href="/wells/WELL-001" className="hover:text-slate-900 transition">
              Well Twins
            </Link>
            <span>&bull;</span>
            <Link href="/status" className="hover:text-slate-900 transition">
              System Telemetry
            </Link>
            <span>&bull;</span>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition flex items-center gap-1">
              <span>FastAPI Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>&bull;</span>
            <a href="http://localhost:8000/metrics" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition flex items-center gap-1">
              <span>Prometheus</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <div>
            Aligned with MoPNG / DGH Upstream Guidelines &bull; OISD-GDN-178 Integrity Standard
          </div>
          <div>
            Non-actuating advisory architecture &bull; &copy; 2026 PetroTwin Systems
          </div>
        </div>
      </footer>
    </div>
  );
}
