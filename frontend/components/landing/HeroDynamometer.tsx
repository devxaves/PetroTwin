"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

/**
 * HeroDynamometer — Animated SVG dynamometer card for the landing page hero.
 *
 * Morphs between a "Normal" load-position loop and a "Rod Float" loop.
 * The rod-float shape shows the characteristic downstroke load collapse
 * that indicates hydrodynamic drag problems in heavy oil wells.
 *
 * This is the ONE orchestrated animation moment on the landing page.
 * Respects prefers-reduced-motion: shows a static "Normal" card instead.
 */

// --- Card shape generators (position 0→1 parametric, 200 points) ---

const NUM_POINTS = 200;

function generateNormalCard(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const t = i / NUM_POINTS;
    const angle = t * Math.PI * 2;

    // Normal operating card: roughly rectangular with rounded corners
    // Upstroke (0→0.5): high load, increasing position
    // Downstroke (0.5→1): low load, decreasing position
    let x: number, y: number;

    if (t < 0.5) {
      // Upstroke
      const phase = t * 2; // 0→1
      x = phase;
      // Load rises sharply at start, stays high, slight sag mid-stroke
      y = 0.75 + 0.2 * Math.sin(phase * Math.PI) - 0.05 * Math.sin(phase * Math.PI * 2);
    } else {
      // Downstroke
      const phase = (t - 0.5) * 2; // 0→1
      x = 1 - phase;
      // Load drops at top, stays lower
      y = 0.35 - 0.1 * Math.sin(phase * Math.PI) + 0.05 * Math.sin(phase * Math.PI * 2);
    }

    points.push({ x, y });
  }
  return points;
}

function generateRodFloatCard(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const t = i / NUM_POINTS;

    let x: number, y: number;

    if (t < 0.5) {
      // Upstroke — similar to normal but slightly lower peak
      const phase = t * 2;
      x = phase;
      y = 0.70 + 0.18 * Math.sin(phase * Math.PI) - 0.04 * Math.sin(phase * Math.PI * 2);
    } else {
      // Downstroke — the rod-float signature: load collapses dramatically
      // at mid-downstroke, creating a sharp dip (the "float" where the
      // rod string falls faster than the fluid column due to high viscosity drag)
      const phase = (t - 0.5) * 2;
      x = 1 - phase;
      // Deep collapse at 30-70% of downstroke
      const collapse = Math.exp(-((phase - 0.5) ** 2) / 0.04) * 0.25;
      y = 0.30 - 0.08 * Math.sin(phase * Math.PI) - collapse;
    }

    points.push({ x, y });
  }
  return points;
}

const normalCard = generateNormalCard();
const rodFloatCard = generateRodFloatCard();

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Smooth easing function
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface HeroDynamometerProps {
  className?: string;
}

export function HeroDynamometer({ className = "" }: HeroDynamometerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, morphT: number) => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, width * dpr, height * dpr);

      const pad = { left: 50, right: 30, top: 30, bottom: 40 };
      const plotW = width - pad.left - pad.right;
      const plotH = height - pad.top - pad.bottom;

      // Scale for high-DPI
      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = "#080c14";
      ctx.fillRect(0, 0, width, height);

      // Plot area border
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.strokeRect(pad.left, pad.top, plotW, plotH);

      // Grid lines
      ctx.strokeStyle = "#1a2540";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      for (let i = 1; i < 5; i++) {
        const gy = pad.top + (plotH * i) / 5;
        ctx.beginPath();
        ctx.moveTo(pad.left, gy);
        ctx.lineTo(pad.left + plotW, gy);
        ctx.stroke();

        const gx = pad.left + (plotW * i) / 5;
        ctx.beginPath();
        ctx.moveTo(gx, pad.top);
        ctx.lineTo(gx, pad.top + plotH);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Interpolate between normal and rod-float cards
      const easedT = easeInOutCubic(morphT);
      const points = normalCard.map((np, i) => {
        const rp = rodFloatCard[i];
        return {
          x: pad.left + lerp(np.x, rp.x, easedT) * plotW,
          y: pad.top + plotH - lerp(np.y, rp.y, easedT) * plotH,
        };
      });

      // Draw the trace with glow
      // Outer glow
      ctx.shadowColor = morphT > 0.5 ? "#dc262680" : "#0891b280";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = morphT > 0.5 ? "#dc2626" : "#0891b2";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Inner bright line (no shadow)
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.strokeStyle = morphT > 0.5 ? "#f87171" : "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Start point marker
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#080c14";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = "#64748b";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Polished Rod Position (in)", pad.left + plotW / 2, height - 8);

      ctx.save();
      ctx.translate(14, pad.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText("Polished Rod Load (lbs)", 0, 0);
      ctx.restore();

      // Classification label
      const label = morphT > 0.5 ? "ROD FLOAT" : "NORMAL";
      const labelColor = morphT > 0.5 ? "#f87171" : "#22c55e";
      ctx.fillStyle = "#0d1321";
      ctx.strokeStyle = morphT > 0.5 ? "#7f1d1d" : "#166534";
      ctx.lineWidth = 1;
      const labelWidth = 100;
      const labelX = pad.left + plotW - labelWidth - 8;
      const labelY = pad.top + 8;
      ctx.fillRect(labelX, labelY, labelWidth, 22);
      ctx.strokeRect(labelX, labelY, labelWidth, 22);

      ctx.fillStyle = labelColor;
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, labelX + labelWidth / 2, labelY + 15);

      ctx.restore();
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    resize();
    window.addEventListener("resize", resize);

    if (reducedMotion) {
      // Static render — show normal card only
      resize();
      draw(ctx, canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height, 0);
      return () => window.removeEventListener("resize", resize);
    }

    // Animation loop: morph between normal (0) and rod-float (1)
    // 4 seconds per direction, with 1.5 second pause at each extreme
    const MORPH_DURATION = 4000;
    const PAUSE_DURATION = 1500;
    const CYCLE = (MORPH_DURATION + PAUSE_DURATION) * 2;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % CYCLE;

      let morphT: number;
      if (elapsed < MORPH_DURATION) {
        // Morphing normal → rod-float
        morphT = elapsed / MORPH_DURATION;
      } else if (elapsed < MORPH_DURATION + PAUSE_DURATION) {
        // Pause at rod-float
        morphT = 1;
      } else if (elapsed < MORPH_DURATION * 2 + PAUSE_DURATION) {
        // Morphing rod-float → normal
        morphT = 1 - (elapsed - MORPH_DURATION - PAUSE_DURATION) / MORPH_DURATION;
      } else {
        // Pause at normal
        morphT = 0;
      }

      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height, morphT);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion, draw]);

  return (
    <div className={`relative ${className}`} data-testid="hero-dynamometer">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
        aria-label="Animated dynamometer card showing load-position loop morphing between normal operation and rod-float condition"
        role="img"
      />
      {/* Subtle scan-line overlay matching the dashboard aesthetic */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.04) 2px,
            rgba(0, 0, 0, 0.04) 4px
          )`,
        }}
      />
    </div>
  );
}
