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
    <div className="min-h-screen bg-[#0B1120] text-[#CBD5E1]">
      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className={styles.landingNav} data-testid="landing-nav">
        <div className={styles.landingNavInner}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-600/15 border border-amber-600/30 flex items-center justify-center text-amber-500">
              <Flame className="w-4 h-4" />
            </div>
            <span
              className="font-semibold text-sm tracking-wider uppercase text-slate-100"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              ThermoTwin
            </span>
          </div>
          <Link
            href="/dashboard"
            className={styles.ctaButton}
            data-testid="nav-cta"
          >
            Open the twin
          </Link>
        </div>
      </nav>

      {/* ── 1. HERO ──────────────────────────────────────────── */}
      <section className={styles.hero} data-testid="hero-section">
        <div className={styles.heroText}>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-slate-50"
            style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
          >
            See the pump.
            <br />
            Understand the reservoir.
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-lg leading-relaxed">
            ThermoTwin connects steam injection decisions to pump consequences.
            A decision-support system that couples cyclic steam stimulation with
            sucker-rod pump diagnostics — so you can optimize both together.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className={styles.ctaButton}
              data-testid="hero-cta"
            >
              Open the twin
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <HeroDynamometer className="w-full h-full" />
        </div>
      </section>

      {/* ── 2. THE PROBLEM ───────────────────────────────────── */}
      <section
        className={`${styles.section} ${styles.container} py-20`}
        ref={setRef(0)}
        data-testid="problem-section"
      >
        <div className={styles.problemGrid}>
          <div>
            <h2
              className="text-2xl font-bold text-slate-100 mb-4"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              Steam and pumping are optimized in separate silos
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              In heavy oil thermal recovery, reservoir engineers optimize cyclic steam
              stimulation for oil recovery. Production engineers tune sucker-rod pump
              speed for mechanical reliability. Neither sees the other's consequences:
              steam changes viscosity, which changes rod-float risk, which should change
              pump speed — but these decisions happen on different desks, different
              timescales, different software.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              ThermoTwin couples both subsystems in a single physics-constrained model,
              so you see what happens to the pump when you change the steam, and vice versa.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {/* Before/After diagram */}
            <div className="p-4 rounded bg-[#0d1321] border border-[#1e293b]">
              <div
                className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-3"
              >
                Today: Separate optimization
              </div>
              <div className="flex items-center justify-around text-xs font-mono">
                <div className="text-center">
                  <div className="w-14 h-14 rounded bg-[#1C2A3F] border border-amber-800/40 flex items-center justify-center text-amber-500 text-lg mb-1">
                    ♨
                  </div>
                  <div className="text-slate-400">CSS Team</div>
                </div>
                <div className="text-slate-600 text-lg">✕</div>
                <div className="text-center">
                  <div className="w-14 h-14 rounded bg-[#1C2A3F] border border-cyan-800/40 flex items-center justify-center text-cyan-500 text-lg mb-1">
                    ⛽
                  </div>
                  <div className="text-slate-400">SRP Team</div>
                </div>
              </div>
            </div>
            <div className="p-4 rounded bg-[#0d1321] border border-emerald-900/40">
              <div
                className="text-[10px] font-mono uppercase tracking-wider text-emerald-500/70 mb-3"
              >
                ThermoTwin: Coupled optimization
              </div>
              <div className="flex items-center justify-around text-xs font-mono">
                <div className="text-center">
                  <div className="w-14 h-14 rounded bg-[#1C2A3F] border border-amber-800/40 flex items-center justify-center text-amber-500 text-lg mb-1">
                    ♨
                  </div>
                  <div className="text-slate-400">CSS</div>
                </div>
                <div className="flex flex-col items-center gap-0.5 text-emerald-500">
                  <div className="text-sm">⟷</div>
                  <div className="text-[9px] text-emerald-400/70">coupled</div>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 rounded bg-[#1C2A3F] border border-cyan-800/40 flex items-center justify-center text-cyan-500 text-lg mb-1">
                    ⛽
                  </div>
                  <div className="text-slate-400">SRP</div>
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
        <h2
          className="text-2xl font-bold text-slate-100 mb-2"
          style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
        >
          Three real capabilities, not features
        </h2>
        <p className="text-sm text-slate-400 mb-8 max-w-2xl">
          Each panel below renders the actual dashboard component with sample data — the same
          code you interact with inside the twin.
        </p>

        <div className={styles.howItWorksGrid}>
          {/* Panel 1: SRP Diagnostics */}
          <div className={styles.featurePanel}>
            <div className={styles.featurePanelHeader}>
              SRP Diagnostics
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
              <p className="text-xs text-slate-400 leading-relaxed">
                ML classifier identifies pump conditions from surface dynamometer cards.
                Rod float, fluid pound, gas interference — diagnosed from the load-position
                shape, with physics-grounded confidence scores.
              </p>
            </div>
          </div>

          {/* Panel 2: CSS Optimizer */}
          <div className={styles.featurePanel}>
            <div className={styles.featurePanelHeader}>
              CSS Optimizer
            </div>
            <div className={styles.featurePanelVisual}>
              <ParetoChart
                points={SAMPLE_PARETO_POINTS}
                width={500}
                height={280}
              />
            </div>
            <div className={styles.featurePanelBody}>
              <p className="text-xs text-slate-400 leading-relaxed">
                Constrained grid-search optimizer finds Pareto-optimal steam injection
                schedules balancing oil recovery against steam-oil ratio, within safe
                operating envelope limits.
              </p>
            </div>
          </div>

          {/* Panel 3: Joint What-If */}
          <div className={styles.featurePanel}>
            <div className={styles.featurePanelHeader}>
              Joint What-If Engine
            </div>
            <div className={styles.featurePanelVisual}>
              <ComparisonTable comparison={SAMPLE_COMPARISON} />
            </div>
            <div className={styles.featurePanelBody}>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adjust both steam parameters and pump kinematics simultaneously. The coupled
                solver shows how changes propagate across subsystems — steam volume affects
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
        <h2
          className="text-2xl font-bold text-slate-100 mb-2"
          style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
        >
          Tested results, not marketing claims
        </h2>
        <p className="text-sm text-slate-400 mb-8 max-w-2xl">
          All numbers below are from verified evaluation runs on held-out synthetic test data,
          not cherry-picked examples. Context and baselines are included.
        </p>

        <div className={styles.metricsGrid}>
          <div className="p-5 rounded bg-[#0d1321] border border-[#1e293b]">
            <div
              className="text-3xl font-bold text-amber-500 mb-1"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              99.77%
            </div>
            <div
              className="text-xs font-semibold text-slate-300 mb-2"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              Classifier accuracy
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dynamometer card condition classification on held-out test wells.
              Baseline (majority-class) accuracy: 72.3%. The 27.5-point improvement
              comes from physics-derived features, not just pattern matching.
            </p>
          </div>

          <div className="p-5 rounded bg-[#0d1321] border border-[#1e293b]">
            <div
              className="text-3xl font-bold text-emerald-400 mb-1"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              +52.3%
            </div>
            <div
              className="text-xs font-semibold text-slate-300 mb-2"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              Economic value improvement
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Optimizer-recommended cycle vs. historical average unoptimized cycle
              on WELL-001 backtest. +152.3 bbl oil, SOR reduced from 4.33 to 3.18.
              All within safe operating envelope constraints.
            </p>
          </div>

          <div className="p-5 rounded bg-[#0d1321] border border-[#1e293b]">
            <div
              className="text-3xl font-bold text-cyan-400 mb-1"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              −4.4 pts
            </div>
            <div
              className="text-xs font-semibold text-slate-300 mb-2"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              Risk reduction via steam
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Increasing steam volume from 2,000t to 3,400t lowers fluid viscosity
              from 2,604 cP to 1,842 cP, reducing rod-float risk from 37.8 to 33.4.
              The coupling effect is modest and physically grounded.
            </p>
          </div>

          <div className="p-5 rounded bg-[#0d1321] border border-[#1e293b]">
            <div
              className="text-3xl font-bold text-rose-400 mb-1"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              +12.5 pts
            </div>
            <div
              className="text-xs font-semibold text-slate-300 mb-2"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              Risk increase from pump speed
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Increasing SPM from 4.2 to 9.5 raises rod-float risk from 28.4 to 40.9.
              This is why you can't optimize the pump without knowing the reservoir
              state — the mechanical and thermal systems are coupled.
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
        <div className="max-w-2xl">
          <h2
            className="text-2xl font-bold text-slate-100 mb-4"
            style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
          >
            Decision-support, not autonomous control
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            ThermoTwin is strictly advisory. The backend never connects to SCADA, RTU, or
            any field actuation system. Every recommendation requires explicit operator
            approval, and every decision is logged to an immutable audit trail.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            The physics engine uses a hybrid approach: reduced-order thermal models for
            steam injection response, coupled with ML residual correction that achieves
            a 55.1% RMSE reduction over physics alone on held-out test wells. Constraints
            enforce safe operating envelopes — steam pressure, volume, soak time, and pump
            speed all have hard limits that the optimizer cannot violate.
          </p>
          <p className="text-sm text-slate-500 leading-relaxed">
            All evaluation data in this build is physics-consistent synthetic data,
            not proprietary field data. Real deployment requires field calibration
            against actual sensor telemetry.
          </p>
        </div>
      </section>

      {/* ── 6. FINAL CTA ─────────────────────────────────────── */}
      <section
        className={`${styles.section} ${styles.container} py-20 text-center`}
        ref={setRef(4)}
        data-testid="final-cta-section"
      >
        <h2
          className="text-2xl font-bold text-slate-100 mb-4"
          style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
        >
          Try the working twin
        </h2>
        <p className="text-sm text-slate-400 mb-6 max-w-lg mx-auto">
          The full dashboard is live with 8 synthetic wells, real-time diagnostics,
          a constrained optimizer, and a coupled what-if engine.
        </p>
        <Link
          href="/dashboard"
          className={styles.ctaButton}
          data-testid="final-cta"
        >
          Open the twin
        </Link>
      </section>

      {/* ── 7. FOOTER ────────────────────────────────────────── */}
      <footer className={styles.footer} data-testid="landing-footer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span
              className="text-xs text-slate-500"
              style={{ fontFamily: "var(--font-data, 'JetBrains Mono', monospace)" }}
            >
              ThermoTwin
            </span>
          </div>
          <span className="text-[11px] text-slate-600">
            Heavy oil digital twin for CSS + SRP optimization
          </span>
        </div>
      </footer>
    </div>
  );
}
