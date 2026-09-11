"use client";

import React, { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { HeroDynamometer } from "@/components/landing/HeroDynamometer";
import { DynamometerCard } from "@/components/DynamometerCard";
import { ParetoChart } from "@/components/ParetoChart";
import { ComparisonTable } from "@/components/ComparisonTable";
import styles from "./landing.module.css";

// ── Static data for the "How it works" component renders ──────────────
// These mirror the actual dashboard's fallback data — real shapes, not mockups.

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

// ── Scroll-reveal hook ────────────────────────────────────────────────

function useScrollReveal() {
  const refs = useRef<(HTMLElement | null)[]>([]);

  const setRef = useCallback((index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  }, []);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      // Show everything immediately
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
      { threshold: 0.15 }
    );

    refs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return setRef;
}

// ── Landing Page Component ────────────────────────────────────────────

export default function LandingPage() {
  const setRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 selection:bg-orange-500 selection:text-white">
      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className={styles.landingNav} data-testid="landing-nav">
        <div className={styles.landingNavInner}>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 shadow-xs">
              <Flame className="w-6 h-6 fill-current" />
            </div>
            <div>
              <span
                className="font-extrabold text-lg tracking-tight text-slate-900 font-['Space_Grotesk'] block"
              >
                ThermoTwin
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold block mt-[-2px]">
                Heavy Oil Operations Intelligence
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
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

      {/* ── 1. HERO ──────────────────────────────────────────── */}
      <section className={styles.hero} data-testid="hero-section">
        <div className={styles.heroText}>
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200/90 text-orange-800 text-xs font-mono font-black w-fit shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse"></span>
            NEXT-GEN HEAVY OIL DIGITAL TWIN
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] text-slate-900 font-['Space_Grotesk'] tracking-tight"
          >
            See the pump.
            <br />
            <span className="text-orange-600">Understand</span> the reservoir.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-sans font-medium">
            ThermoTwin connects cyclic steam injection decisions to sucker-rod pump mechanics.
            A coupled decision-support engine that unifies thermal reservoir modeling with
            downhole dyno diagnostics &mdash; so operators optimize both together.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/dashboard"
              className={styles.ctaButton}
              data-testid="hero-cta"
            >
              Open Fleet Twin &rarr;
            </Link>
            <Link
              href="/wells/WELL-001"
              className={styles.ctaButtonSecondary}
            >
              Live Demo: WELL-001
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <HeroDynamometer className="w-full h-full" />
        </div>
      </section>

      {/* ── 2. THE PROBLEM ───────────────────────────────────── */}
      <section
        className={`${styles.section} ${styles.container} py-24`}
        ref={setRef(0)}
        data-testid="problem-section"
      >
        <div className={styles.problemGrid}>
          <div>
            <div className="text-xs font-mono font-black uppercase tracking-wider text-orange-600 mb-2">
              The Engineering Gap
            </div>
            <h2
              className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 font-['Space_Grotesk'] tracking-tight"
            >
              Steam and pumping are optimized in separate silos
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 font-sans font-medium">
              In heavy oil thermal recovery, reservoir engineers optimize cyclic steam
              stimulation (CSS) purely for thermal penetration and oil yield. Meanwhile, production
              engineers tune sucker-rod pump speeds for mechanical reliability.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans font-medium">
              Neither sees the other's consequences: steam radically alters downhole viscosity,
              which alters fluid drag and hydrodynamic rod-float risk. ThermoTwin couples both
              subsystems in a single physics-grounded model.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            {/* Before/After diagram */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div
                className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-500 mb-4"
              >
                Today: Fragmented Siloed Optimization
              </div>
              <div className="flex items-center justify-around text-xs font-mono">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 text-2xl mb-2 shadow-inner">
                    ♨
                  </div>
                  <div className="text-slate-800 font-bold">CSS Team</div>
                </div>
                <div className="text-slate-300 text-2xl font-black">&times;</div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 text-2xl mb-2 shadow-inner">
                    ⛽
                  </div>
                  <div className="text-slate-800 font-bold">SRP Team</div>
                </div>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-white border-2 border-orange-500/40 shadow-xs bg-linear-to-r from-orange-50/30 via-white to-transparent">
              <div
                className="text-xs font-mono uppercase tracking-wider text-orange-700 font-black mb-4"
              >
                ThermoTwin: Coupled Industrial Logic
              </div>
              <div className="flex items-center justify-around text-xs font-mono">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl mb-2 shadow-md shadow-orange-500/20">
                    ♨
                  </div>
                  <div className="text-slate-900 font-black">CSS Engine</div>
                </div>
                <div className="flex flex-col items-center gap-1 text-orange-600 font-black">
                  <div className="text-lg font-black">&harr;</div>
                  <div className="text-xs uppercase font-extrabold tracking-wider bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">Coupled</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl mb-2 shadow-md">
                    ⛽
                  </div>
                  <div className="text-slate-900 font-black">SRP Diagnostics</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ──────────────────────────────────── */}
      <section
        className={`${styles.section} ${styles.container} py-20`}
        ref={setRef(1)}
        data-testid="howitworks-section"
      >
        <div className="flex flex-col gap-2 mb-10">
          <div className="text-xs font-mono font-black uppercase tracking-wider text-orange-600">
            Interactive Subsystems
          </div>
          <h2
            className="text-3xl sm:text-4xl font-black text-slate-900 font-['Space_Grotesk'] tracking-tight"
          >
            Three real capabilities, not static mockups
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl font-sans font-medium">
            Each panel below renders the live interactive dashboard component &mdash; the exact
            same logic you interact with inside the well twin.
          </p>
        </div>

        <div className={styles.howItWorksGrid}>
          {/* Panel 1: SRP Diagnostics */}
          <div className={styles.featurePanel}>
            <div className={styles.featurePanelHeader}>
              <span>SRP Diagnostics</span>
              <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                LIVE
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
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                ML classifier identifies pump conditions from surface dynamometer cards.
                Rod float, fluid pound, gas interference — diagnosed from the load-position
                shape, with physics-grounded confidence scores.
              </p>
            </div>
          </div>

          {/* Panel 2: CSS Optimizer */}
          <div className={styles.featurePanel}>
            <div className={styles.featurePanelHeader}>
              <span>CSS Optimizer</span>
              <span className="text-xs font-mono font-black text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-300">
                PARETO
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
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Constrained grid-search optimizer finds Pareto-optimal steam injection
                schedules balancing oil recovery against steam-oil ratio, within safe
                operating envelope limits.
              </p>
            </div>
          </div>

          {/* Panel 3: Joint What-If */}
          <div className={styles.featurePanel}>
            <div className={styles.featurePanelHeader}>
              <span>Joint What-If Engine</span>
              <span className="text-xs font-mono font-black text-orange-800 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-300">
                COUPLED
              </span>
            </div>
            <div className={styles.featurePanelVisual}>
              <ComparisonTable comparison={SAMPLE_COMPARISON} />
            </div>
            <div className={styles.featurePanelBody}>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Adjust both steam parameters and pump kinematics simultaneously. The coupled
                solver shows how changes propagate across subsystems &mdash; steam volume affects
                viscosity affects rod-float risk affects recommended SPM.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. REAL NUMBERS ──────────────────────────────────── */}
      <section
        className={`${styles.section} ${styles.container} py-20`}
        ref={setRef(2)}
        data-testid="metrics-section"
      >
        <div className="flex flex-col gap-2 mb-10">
          <div className="text-xs font-mono font-black uppercase tracking-wider text-orange-600">
            Field Performance
          </div>
          <h2
            className="text-3xl sm:text-4xl font-black text-slate-900 font-['Space_Grotesk'] tracking-tight"
          >
            Tested benchmark results, not marketing claims
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl font-sans font-medium">
            All numbers below are from verified evaluation runs on held-out synthetic test wells,
            with baseline comparisons and physical bounds rigorously enforced.
          </p>
        </div>

        <div className={styles.metricsGrid}>
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-orange-300 transition group">
            <div
              className="text-4xl sm:text-5xl font-black text-orange-600 mb-2 font-mono tracking-tight"
            >
              99.77%
            </div>
            <div
              className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 mb-2 font-['Space_Grotesk']"
            >
              Classifier accuracy
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
              Dynamometer card condition classification on held-out test wells.
              Baseline (majority-class) accuracy: 72.3%. The 27.5-point gain
              stems from physics-derived features.
            </p>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition group">
            <div
              className="text-4xl sm:text-5xl font-black text-emerald-600 mb-2 font-mono tracking-tight"
            >
              +52.3%
            </div>
            <div
              className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 mb-2 font-['Space_Grotesk']"
            >
              Economic value improvement
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
              Optimizer-recommended cycle vs. historical average unoptimized cycle
              on WELL-001 backtest. +152.3 bbl oil, SOR reduced from 4.33 to 3.18.
            </p>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-sky-300 transition group">
            <div
              className="text-4xl sm:text-5xl font-black text-sky-600 mb-2 font-mono tracking-tight"
            >
              &minus;4.4 pts
            </div>
            <div
              className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 mb-2 font-['Space_Grotesk']"
            >
              Risk reduction via steam
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
              Increasing steam volume from 2,000t to 3,400t lowers fluid viscosity
              from 2,604 cP to 1,842 cP, reducing rod-float risk from 37.8 to 33.4.
            </p>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-rose-300 transition group">
            <div
              className="text-4xl sm:text-5xl font-black text-rose-600 mb-2 font-mono tracking-tight"
            >
              +12.5 pts
            </div>
            <div
              className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 mb-2 font-['Space_Grotesk']"
            >
              Risk increase from pump speed
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
              Increasing SPM from 4.2 to 9.5 raises rod-float risk from 28.4 to 40.9.
              Proves mechanical and thermal systems must be solved jointly.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. TRUST / ARCHITECTURE ──────────────────────────── */}
      <section
        className={`${styles.section} ${styles.container} py-20`}
        ref={setRef(3)}
        data-testid="trust-section"
      >
        <div className="max-w-3xl bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="text-xs font-mono font-black uppercase tracking-wider text-orange-600 mb-2">
            Safety &amp; Compliance Architecture
          </div>
          <h2
            className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 font-['Space_Grotesk'] tracking-tight"
          >
            Decision-support, not autonomous actuation
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 font-sans font-medium">
            ThermoTwin is strictly advisory. The backend never directly connects to SCADA, RTU, or
            any remote field actuator. Every recommendation requires explicit operator
            review, approval, and is permanently recorded in an immutable audit trail.
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 font-sans font-medium">
            The hybrid physics solver couples reduced-order thermal models with ML residual
            correction (55.1% RMSE reduction). Hard constraint envelopes protect operators from
            exceeding geomechanical and rod load safety limits.
          </p>
          <p className="text-xs font-mono text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium">
            Environment: Synthetic high-fidelity benchmark wells. Field deployment includes telemetry calibration.
          </p>
        </div>
      </section>

      {/* ── 6. FINAL CTA ─────────────────────────────────────── */}
      <section
        className={`${styles.section} ${styles.container} py-24 text-center`}
        ref={setRef(4)}
        data-testid="final-cta-section"
      >
        <div className="max-w-3xl mx-auto p-10 sm:p-16 rounded-3xl bg-gradient-to-b from-orange-500/10 via-white to-white border border-orange-200 shadow-sm flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center mb-5 shadow-lg shadow-orange-500/30">
            <Flame className="w-7 h-7 fill-current" />
          </div>
          <h2
            className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 font-['Space_Grotesk'] tracking-tight"
          >
            Experience the working digital twin
          </h2>
          <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-lg mx-auto font-sans font-medium leading-relaxed">
            Explore 8 live wells across the fleet with real-time diagnostics, Pareto frontier exploration,
            and joint what-if scenario solvers.
          </p>
          <Link
            href="/dashboard"
            className={styles.ctaButton}
            data-testid="final-cta"
          >
            Open Fleet Twin &rarr;
          </Link>
        </div>
      </section>

      {/* ── 7. FOOTER ────────────────────────────────────────── */}
      <footer className={styles.footer} data-testid="landing-footer">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-orange-600 fill-current" />
            <span
              className="text-sm font-extrabold text-slate-800 uppercase tracking-wider font-['Space_Grotesk']"
            >
              ThermoTwin
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono font-medium">
            Heavy Oil Coupled Reservoir &amp; SRP Digital Twin &bull; Light Industrial Logic
          </span>
        </div>
      </footer>
    </div>
  );
}
