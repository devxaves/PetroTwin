"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import type { CardPoint } from "@/lib/api/types";
import {
  Gauge,
  Eye,
  EyeOff,
  Play,
  Pause,
  Layers,
  Sparkles,
  Zap,
  Info,
} from "lucide-react";

interface DynamometerCardProps {
  cardPoints: CardPoint[];
  classificationLabel: string;
  confidence?: number;
  width?: number;
  height?: number;
}

type PatternMode = "active" | "nominal" | "pound" | "gas";

export function DynamometerCard({
  cardPoints,
  classificationLabel,
  confidence,
  width = 660,
  height = 380,
}: DynamometerCardProps) {
  const [showReferenceEnvelope, setShowReferenceEnvelope] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [patternMode, setPatternMode] = useState<PatternMode>("active");
  const [isAnimatingStroke, setIsAnimatingStroke] = useState(false);
  const [animProgress, setAnimProgress] = useState(0); // 0 to 1
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Stroke position animation loop
  useEffect(() => {
    if (!isAnimatingStroke) return;
    let frameId: number;
    let start = performance.now();
    const duration = 4000; // 4s cycle

    const loop = (now: number) => {
      const elapsed = (now - start) % duration;
      setAnimProgress(elapsed / duration);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isAnimatingStroke]);

  // Synthetic standard diagnostic patterns for comparison
  const effectivePoints = useMemo(() => {
    if (patternMode === "active" || !cardPoints || cardPoints.length === 0) {
      return cardPoints ?? [];
    }

    const maxPos = 120;
    const pts: CardPoint[] = [];
    const steps = 60;

    if (patternMode === "nominal") {
      // Clean full-fill rectangular rounded card
      for (let i = 0; i <= steps; i++) {
        const pos = (i / steps) * maxPos;
        const load = 17500 - 300 * Math.sin((i / steps) * Math.PI);
        pts.push({ position: pos, load });
      }
      for (let i = steps; i >= 0; i--) {
        const pos = (i / steps) * maxPos;
        const load = 4800 + 300 * Math.sin((i / steps) * Math.PI);
        pts.push({ position: pos, load });
      }
    } else if (patternMode === "pound") {
      // Fluid pound: late load drop on downstroke
      for (let i = 0; i <= steps; i++) {
        const pos = (i / steps) * maxPos;
        const load = 17500 - 400 * Math.sin((i / steps) * Math.PI);
        pts.push({ position: pos, load });
      }
      for (let i = steps; i >= 0; i--) {
        const pos = (i / steps) * maxPos;
        const frac = i / steps;
        const load = frac > 0.5 ? 16800 : 4500 + 400 * Math.sin(frac * Math.PI);
        pts.push({ position: pos, load });
      }
    } else if (patternMode === "gas") {
      // Gas interference: gradual smooth concave decompression
      for (let i = 0; i <= steps; i++) {
        const pos = (i / steps) * maxPos;
        const load = 17500 - 500 * Math.sin((i / steps) * Math.PI);
        pts.push({ position: pos, load });
      }
      for (let i = steps; i >= 0; i--) {
        const pos = (i / steps) * maxPos;
        const frac = i / steps;
        const load = 4800 + Math.pow(frac, 2) * 11000;
        pts.push({ position: pos, load });
      }
    }

    return pts;
  }, [patternMode, cardPoints]);

  if (!cardPoints || cardPoints.length === 0) {
    return (
      <div
        className="w-full h-72 flex items-center justify-center rounded-2xl bg-white border border-slate-200/80 text-slate-400 font-mono text-xs shadow-xs"
        data-testid="dyna-card-empty"
      >
        No dynamometer card points acquired
      </div>
    );
  }

  // Calculate bounding box
  const positions = effectivePoints.map((p) => p.position);
  const loads = effectivePoints.map((p) => p.load);

  const minPos = Math.min(...positions);
  const maxPos = Math.max(...positions);
  const minLoad = Math.min(...loads);
  const maxLoad = Math.max(...loads);

  const posPadding = (maxPos - minPos) * 0.1 || 5;
  const loadPadding = (maxLoad - minLoad) * 0.15 || 1000;

  const xMin = Math.max(0, minPos - posPadding);
  const xMax = maxPos + posPadding;
  const yMin = Math.max(0, minLoad - loadPadding);
  const yMax = maxLoad + loadPadding;

  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 45;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const scaleX = (pos: number) =>
    paddingLeft + ((pos - xMin) / (xMax - xMin || 1)) * plotWidth;

  const scaleY = (load: number) =>
    paddingTop + plotHeight - ((load - yMin) / (yMax - yMin || 1)) * plotHeight;

  // Polyline string
  const pointsString = useMemo(() => {
    return effectivePoints
      .map((p) => `${scaleX(p.position).toFixed(1)},${scaleY(p.load).toFixed(1)}`)
      .join(" ");
  }, [effectivePoints, xMin, xMax, yMin, yMax, plotWidth, plotHeight]);

  // Nominal baseline envelope
  const referenceEnvelopeString = useMemo(() => {
    const strokeLen = maxPos - minPos || 120;
    const peakLoad = Math.max(16500, maxLoad * 0.92);
    const troughLoad = Math.min(5200, minLoad * 1.1);

    const pts: { x: number; y: number }[] = [];
    const steps = 40;
    // Upstroke
    for (let i = 0; i <= steps; i++) {
      const pos = minPos + (i / steps) * strokeLen;
      const load = peakLoad - 200 * Math.sin((i / steps) * Math.PI);
      pts.push({ x: scaleX(pos), y: scaleY(load) });
    }
    // Downstroke
    for (let i = steps; i >= 0; i--) {
      const pos = minPos + (i / steps) * strokeLen;
      const load = troughLoad + 300 * Math.sin((i / steps) * Math.PI);
      pts.push({ x: scaleX(pos), y: scaleY(load) });
    }
    return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }, [minPos, maxPos, minLoad, maxLoad]);

  // Key mechanical engineering calculations
  const pprl = Math.round(maxLoad);
  const mprl = Math.round(minLoad);
  const strokeLengthActual = (maxPos - minPos).toFixed(1);
  const strokeWorkKj = (
    ((pprl - mprl) * (maxPos - minPos) * 0.7) /
    8850
  ).toFixed(1);

  // Active scrub or animated index
  let activeIndex = hoverIndex;
  if (activeIndex === null && isAnimatingStroke && effectivePoints.length > 0) {
    activeIndex = Math.floor(animProgress * (effectivePoints.length - 1));
  }
  const activePoint = activeIndex !== null ? effectivePoints[activeIndex] : null;

  // Grid tick lines
  const xTicks = 5;
  const yTicks = 4;
  const xTickValues = Array.from({ length: xTicks + 1 }, (_, i) =>
    xMin + (i * (xMax - xMin)) / xTicks
  );
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    yMin + (i * (yMax - yMin)) / yTicks
  );

  return (
    <div
      className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5"
      data-testid="dynamometer-card-container"
    >
      {/* 1. Header with Mode Switcher & Pattern Pills */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base sm:text-lg font-bold tracking-wider uppercase text-slate-900 font-['Space_Grotesk']">
              Surface Dynamometer Diagnostic Card
            </h3>
            <span
              className="text-xs sm:text-sm px-3 py-1 rounded-full font-mono font-bold uppercase border bg-rose-50 text-rose-700 border-rose-200"
              data-testid="dyna-classification-badge"
            >
              {patternMode === "active" ? classificationLabel : patternMode.toUpperCase()}
            </span>
            {confidence !== undefined && patternMode === "active" && (
              <span
                className="text-xs sm:text-sm px-3 py-1 rounded-full bg-orange-50 border border-orange-200 font-mono font-bold text-orange-700"
                data-testid="dyna-confidence-badge"
              >
                {(confidence * 100).toFixed(1)}% ML Conf
              </span>
            )}
          </div>
          <span className="text-xs sm:text-sm text-slate-500 font-sans mt-1 block">
            Polished rod load vs. stroke displacement with kinematic scrubbing &amp; baseline overlay
          </span>
        </div>

        {/* Pattern Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs sm:text-sm font-mono">
          <button
            type="button"
            onClick={() => setPatternMode("active")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              patternMode === "active"
                ? "bg-white text-slate-900 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Live Telemetry
          </button>
          <button
            type="button"
            onClick={() => setPatternMode("nominal")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              patternMode === "nominal"
                ? "bg-white text-emerald-700 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Nominal
          </button>
          <button
            type="button"
            onClick={() => setPatternMode("pound")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              patternMode === "pound"
                ? "bg-white text-amber-700 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Fluid Pound
          </button>
          <button
            type="button"
            onClick={() => setPatternMode("gas")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              patternMode === "gas"
                ? "bg-white text-sky-700 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Gas Lock
          </button>
        </div>
      </div>

      {/* 2. Key Mechanical Vitals Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-mono">
        <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Peak Load (PPRL)</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {pprl.toLocaleString()} <span className="text-xs font-normal text-slate-500">lbs</span>
          </div>
          <span className="text-xs text-emerald-600 font-semibold mt-0.5 block">84% Rating Envel.</span>
        </div>

        <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Min Load (MPRL)</span>
          <div className="text-2xl sm:text-3xl font-black text-orange-600 mt-1">
            {mprl.toLocaleString()} <span className="text-xs font-normal text-slate-500">lbs</span>
          </div>
          <span className="text-xs text-rose-600 font-semibold mt-0.5 block">Lag Depression</span>
        </div>

        <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Measured Stroke</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {strokeLengthActual}&quot;
          </div>
          <span className="text-xs text-slate-500 mt-0.5 block">Surface Travel</span>
        </div>

        <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Work Per Stroke</span>
          <div className="text-2xl sm:text-3xl font-black text-sky-700 mt-1">
            {strokeWorkKj} <span className="text-xs font-normal text-slate-500">kJ</span>
          </div>
          <span className="text-xs text-slate-500 mt-0.5 block">Pump Hydraulic Lift</span>
        </div>
      </div>

      {/* 3. Interactive SVG Chart */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/50 p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[360px] select-none font-mono cursor-crosshair"
          data-testid="dyna-svg"
          onMouseMove={(e) => {
            if (!svgRef.current || effectivePoints.length === 0) return;
            const rect = svgRef.current.getBoundingClientRect();
            const svgX = ((e.clientX - rect.left) / rect.width) * width;
            let closestIdx = 0;
            let minDistance = Infinity;
            effectivePoints.forEach((p, idx) => {
              const px = scaleX(p.position);
              const dist = Math.abs(px - svgX);
              if (dist < minDistance) {
                minDistance = dist;
                closestIdx = idx;
              }
            });
            setHoverIndex(closestIdx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Plot Background */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={plotWidth}
            height={plotHeight}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
            rx="4"
          />

          {/* Grid lines - horizontal */}
          {yTickValues.map((yVal, i) => {
            const y = scaleY(yVal);
            return (
              <g key={`y-grid-${i}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + plotWidth}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="500"
                >
                  {Math.round(yVal).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Grid lines - vertical */}
          {xTickValues.map((xVal, i) => {
            const x = scaleX(xVal);
            return (
              <g key={`x-grid-${i}`}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + plotHeight}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={paddingTop + plotHeight + 16}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="500"
                >
                  {xVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Nominal Reference Envelope Overlay */}
          {showReferenceEnvelope && (
            <polygon
              points={referenceEnvelopeString}
              fill="rgba(56, 189, 248, 0.08)"
              stroke="#0284c7"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              opacity="0.8"
            />
          )}

          {/* Dynamometer closed curve polyline */}
          <polyline
            points={pointsString}
            fill={patternMode === "nominal" ? "rgba(16, 185, 129, 0.08)" : "rgba(234, 88, 12, 0.08)"}
            stroke={patternMode === "nominal" ? "#10b981" : "#ea580c"}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            data-testid="dyna-polyline"
          />

          {/* Active scrubbing marker */}
          {activePoint && (
            <g>
              <line
                x1={scaleX(activePoint.position)}
                y1={paddingTop}
                x2={scaleX(activePoint.position)}
                y2={paddingTop + plotHeight}
                stroke="#ea580c"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.7"
              />
              <circle
                cx={scaleX(activePoint.position)}
                cy={scaleY(activePoint.load)}
                r="6"
                fill="#ea580c"
                stroke="#ffffff"
                strokeWidth="2.5"
                className="drop-shadow-sm"
              />
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#334155"
            fontSize="12"
            fontWeight="bold"
          >
            Polished Rod Position (inches)
          </text>
          <text
            transform={`rotate(-90 18 ${paddingTop + plotHeight / 2})`}
            x={18}
            y={paddingTop + plotHeight / 2}
            textAnchor="middle"
            fill="#334155"
            fontSize="12"
            fontWeight="bold"
          >
            Polished Rod Load (lbs)
          </text>
        </svg>
      </div>

      {/* 4. Controls & Scrubbing Readout Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-mono bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAnimatingStroke((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-100 text-slate-800 font-semibold transition shadow-xs text-xs sm:text-sm"
          >
            {isAnimatingStroke ? (
              <>
                <Pause className="w-4 h-4 text-orange-600" />
                <span>Pause Motion</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-600" />
                <span>Play Stroke Motion</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowReferenceEnvelope((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-100 text-slate-800 font-semibold transition shadow-xs text-xs sm:text-sm"
          >
            {showReferenceEnvelope ? (
              <Eye className="w-4 h-4 text-sky-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-400" />
            )}
            <span>Nominal Baseline</span>
          </button>
        </div>

        <div className="flex items-center gap-5">
          <div>
            <span className="text-slate-400 text-xs uppercase font-semibold">Position:</span>{" "}
            <span className="font-bold text-slate-900 text-sm">
              {activePoint ? `${activePoint.position.toFixed(1)}"` : "Scrub to inspect"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase font-semibold">Load:</span>{" "}
            <span className="font-bold text-orange-600 text-sm">
              {activePoint ? `${Math.round(activePoint.load).toLocaleString()} lbs` : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
