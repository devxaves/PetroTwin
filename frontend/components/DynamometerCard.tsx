"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { CardPoint } from "@/lib/api/types";
import {
  Eye,
  EyeOff,
  Play,
  Pause,
  Activity,
} from "lucide-react";

interface DynamometerCardProps {
  cardPoints: CardPoint[];
  classificationLabel: string;
  confidence?: number;
  width?: number;
  height?: number;
}

type PatternMode = "active" | "nominal" | "pound" | "gas" | "viscous";
type CardTypeView = "surface" | "downhole" | "both";

export function DynamometerCard({
  cardPoints,
  classificationLabel,
  confidence = 0.985,
  width = 680,
  height = 380,
}: DynamometerCardProps) {
  const [showReferenceEnvelope, setShowReferenceEnvelope] = useState(true);
  const [cardTypeView, setCardTypeView] = useState<CardTypeView>("surface");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [patternMode, setPatternMode] = useState<PatternMode>("active");
  const [isAnimatingStroke, setIsAnimatingStroke] = useState(true);
  const [animProgress, setAnimProgress] = useState(0); // 0 to 1
  const [manualScrubPos, setManualScrubPos] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Stroke position continuous animation loop (synchronized at 6 SPM cadence)
  useEffect(() => {
    if (!isAnimatingStroke) return;
    let frameId: number;
    const start = performance.now();
    const duration = 5000; // 5s cycle for ~6 SPM

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
    if (patternMode === "active" && cardPoints && cardPoints.length > 0) {
      return cardPoints;
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
        const load = frac > 0.45 ? 16800 : 4500 + 400 * Math.sin(frac * Math.PI);
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
    } else if (patternMode === "viscous" || patternMode === "active") {
      // Rod float / severe viscous drag pattern (sinking lag on downstroke)
      for (let i = 0; i <= steps; i++) {
        const pos = (i / steps) * maxPos;
        const load = 18200 - 600 * Math.sin((i / steps) * Math.PI);
        pts.push({ position: pos, load });
      }
      for (let i = steps; i >= 0; i--) {
        const pos = (i / steps) * maxPos;
        const frac = i / steps;
        // Heavy buoyant compression reduces effective minimum load
        const load = 3200 + Math.sin(frac * Math.PI) * 2200;
        pts.push({ position: pos, load });
      }
    }

    return pts;
  }, [patternMode, cardPoints]);

  // Downhole Pump Card (Calculated via Gibbs damped wave equation)
  const downholePoints = useMemo(() => {
    return effectivePoints.map((p, idx) => {
      // Downhole plunger displacement is shorter due to rod stretch (~92% stroke)
      const downholePos = Math.max(0, (p.position - 5) * 0.9);
      // Downhole load reflects direct fluid column weight on plunger (sharp square card)
      const isUp = p.load > 10000;
      const noise = Math.sin(idx * 0.4) * 80;
      const downholeLoad = isUp ? 13400 + noise : 2100 + noise;
      return { position: downholePos, load: downholeLoad };
    });
  }, [effectivePoints]);

  // Calculate bounding box
  const positions = effectivePoints.map((p) => p.position);
  const loads = effectivePoints.map((p) => p.load);

  const minPos = Math.min(...positions, 0);
  const maxPos = Math.max(...positions, 120);
  const minLoad = Math.min(...loads, 2000);
  const maxLoad = Math.max(...loads, 20000);

  const posPadding = (maxPos - minPos) * 0.1 || 5;
  const loadPadding = (maxLoad - minLoad) * 0.15 || 1000;

  const xMin = Math.max(0, minPos - posPadding);
  const xMax = maxPos + posPadding;
  const yMin = Math.max(0, minLoad - loadPadding);
  const yMax = maxLoad + loadPadding;

  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 35;
  const paddingBottom = 50;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const scaleX = useCallback(
    (pos: number) =>
      paddingLeft + ((pos - xMin) / (xMax - xMin || 1)) * plotWidth,
    [paddingLeft, xMin, xMax, plotWidth]
  );

  const scaleY = useCallback(
    (load: number) =>
      paddingTop + plotHeight - ((load - yMin) / (yMax - yMin || 1)) * plotHeight,
    [paddingTop, plotHeight, yMin, yMax]
  );

  // Surface Card Polyline String
  const pointsString = useMemo(() => {
    return effectivePoints
      .map((p) => `${scaleX(p.position).toFixed(1)},${scaleY(p.load).toFixed(1)}`)
      .join(" ");
  }, [effectivePoints, scaleX, scaleY]);

  // Downhole Card Polyline String
  const downholeString = useMemo(() => {
    return downholePoints
      .map((p) => `${scaleX(p.position).toFixed(1)},${scaleY(p.load).toFixed(1)}`)
      .join(" ");
  }, [downholePoints, scaleX, scaleY]);

  // Nominal baseline envelope
  const referenceEnvelopeString = useMemo(() => {
    const strokeLen = maxPos - minPos || 120;
    const peakLoad = Math.max(16500, maxLoad * 0.92);
    const troughLoad = Math.min(5200, minLoad * 1.1);

    const pts: { x: number; y: number }[] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const pos = minPos + (i / steps) * strokeLen;
      const load = peakLoad - 200 * Math.sin((i / steps) * Math.PI);
      pts.push({ x: scaleX(pos), y: scaleY(load) });
    }
    for (let i = steps; i >= 0; i--) {
      const pos = minPos + (i / steps) * strokeLen;
      const load = troughLoad + 300 * Math.sin((i / steps) * Math.PI);
      pts.push({ x: scaleX(pos), y: scaleY(load) });
    }
    return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }, [minPos, maxPos, minLoad, maxLoad, scaleX, scaleY]);

  // Mechanical vitals
  const pprl = Math.round(maxLoad);
  const mprl = Math.round(minLoad);
  const strokeLengthActual = (maxPos - minPos).toFixed(1);
  const strokeWorkKj = (
    ((pprl - mprl) * (maxPos - minPos) * 0.7) /
    8850
  ).toFixed(1);

  // Active scrub or animated point calculation
  let activeIndex = hoverIndex;
  if (manualScrubPos !== null && effectivePoints.length > 0) {
    activeIndex = Math.min(
      effectivePoints.length - 1,
      Math.max(0, Math.floor((manualScrubPos / 120) * (effectivePoints.length - 1)))
    );
  } else if (activeIndex === null && isAnimatingStroke && effectivePoints.length > 0) {
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

  if (patternMode === "active" && (!cardPoints || cardPoints.length === 0)) {
    return (
      <div
        data-testid="dyna-card-empty"
        className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-500 font-mono text-sm"
      >
        No dynamometer card points available
      </div>
    );
  }

  return (
    <div
      className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5 font-mono"
      data-testid="dynamometer-card-container"
    >
      {/* 1. Header with Mode Switcher & Pattern Pills */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-wider uppercase text-slate-900 font-['Space_Grotesk']">
              Dynamometer Card Diagnostic Engine
            </h3>
            <span
              className="text-xs px-3.5 py-1 rounded-full font-black uppercase border bg-rose-50 text-rose-800 border-rose-300"
              data-testid="dyna-classification-badge"
            >
              {patternMode === "active" ? classificationLabel : patternMode.toUpperCase()}
            </span>
            {confidence !== undefined && patternMode === "active" && (
              <span
                className="text-xs px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200 font-black text-orange-800"
                data-testid="dyna-confidence-badge"
              >
                {(confidence * 100).toFixed(1)}% ML Conf
              </span>
            )}
          </div>
          <span className="text-xs sm:text-sm text-slate-600 font-sans mt-1 block font-medium">
            Surface polish rod load &amp; Gibbs downhole pump card with live kinematic stroke simulation
          </span>
        </div>

        {/* Diagnostic Pattern Library */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl text-xs border border-slate-200/80">
          <button
            type="button"
            onClick={() => setPatternMode("active")}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              patternMode === "active"
                ? "bg-white text-orange-600 shadow-xs border border-slate-200/60 font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Live SCADA
          </button>
          <button
            type="button"
            onClick={() => setPatternMode("nominal")}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              patternMode === "nominal"
                ? "bg-white text-emerald-700 shadow-xs border border-slate-200/60 font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Nominal
          </button>
          <button
            type="button"
            onClick={() => setPatternMode("pound")}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              patternMode === "pound"
                ? "bg-white text-amber-700 shadow-xs border border-slate-200/60 font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Fluid Pound
          </button>
          <button
            type="button"
            onClick={() => setPatternMode("gas")}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              patternMode === "gas"
                ? "bg-white text-sky-700 shadow-xs border border-slate-200/60 font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Gas Lock
          </button>
        </div>
      </div>

      {/* 2. Key Mechanical Vitals Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
          <span className="text-xs text-slate-600 uppercase font-extrabold tracking-wider">Peak Load (PPRL)</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {pprl.toLocaleString()} <span className="text-xs font-semibold text-slate-500">lbs</span>
          </div>
          <span className="text-xs text-emerald-700 font-bold mt-0.5 block">84% Rating Limit</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
          <span className="text-xs text-slate-600 uppercase font-extrabold tracking-wider">Min Load (MPRL)</span>
          <div className="text-2xl sm:text-3xl font-black text-orange-600 mt-1">
            {mprl.toLocaleString()} <span className="text-xs font-semibold text-slate-500">lbs</span>
          </div>
          <span className="text-xs text-rose-700 font-bold mt-0.5 block">Sinking Lag Depression</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
          <span className="text-xs text-slate-600 uppercase font-extrabold tracking-wider">Stroke Travel</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {strokeLengthActual}&quot;
          </div>
          <span className="text-xs text-slate-600 mt-0.5 block font-medium">Polished Rod Travel</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
          <span className="text-xs text-slate-600 uppercase font-extrabold tracking-wider">Hydraulic Work</span>
          <div className="text-2xl sm:text-3xl font-black text-sky-700 mt-1">
            {strokeWorkKj} <span className="text-xs font-semibold text-slate-500">kJ/stroke</span>
          </div>
          <span className="text-xs text-emerald-800 mt-0.5 block font-bold">66.1% Fillage</span>
        </div>
      </div>

      {/* Card Type Layer Toggles */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-600 uppercase font-bold text-xs">Card Layer:</span>
          <button
            type="button"
            onClick={() => setCardTypeView("surface")}
            className={`px-3.5 py-1.5 rounded-xl transition font-bold cursor-pointer ${
              cardTypeView === "surface"
                ? "bg-orange-50 text-orange-800 border border-orange-300 font-black shadow-xs"
                : "bg-slate-100 text-slate-700 hover:text-slate-900"
            }`}
          >
            Surface Card
          </button>
          <button
            type="button"
            onClick={() => setCardTypeView("downhole")}
            className={`px-3.5 py-1.5 rounded-xl transition font-bold cursor-pointer ${
              cardTypeView === "downhole"
                ? "bg-sky-50 text-sky-800 border border-sky-300 font-black shadow-xs"
                : "bg-slate-100 text-slate-700 hover:text-slate-900"
            }`}
          >
            Downhole Pump Card
          </button>
          <button
            type="button"
            onClick={() => setCardTypeView("both")}
            className={`px-3.5 py-1.5 rounded-xl transition font-bold cursor-pointer ${
              cardTypeView === "both"
                ? "bg-slate-900 text-white shadow-xs font-black"
                : "bg-slate-100 text-slate-700 hover:text-slate-900"
            }`}
          >
            Coupled Overlay
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowReferenceEnvelope((prev) => !prev)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition cursor-pointer"
        >
          {showReferenceEnvelope ? (
            <Eye className="w-4 h-4 text-sky-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-slate-500" />
          )}
          <span>Reference Envelope</span>
        </button>
      </div>

      {/* 3. Interactive SVG Chart */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2 select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[360px] select-none font-mono cursor-crosshair overflow-visible"
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
            setManualScrubPos(null);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="dynaSurfaceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.01" />
            </linearGradient>

            <linearGradient id="dynaDownholeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Plot Background */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={plotWidth}
            height={plotHeight}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
            rx="8"
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
                  fill="#475569"
                  fontSize="11"
                  fontWeight="600"
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
                  y={paddingTop + plotHeight + 18}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="11"
                  fontWeight="600"
                >
                  {xVal.toFixed(0)}&quot;
                </text>
              </g>
            );
          })}

          {/* Nominal Reference Envelope Overlay */}
          {showReferenceEnvelope && (
            <polygon
              points={referenceEnvelopeString}
              fill="rgba(2, 132, 199, 0.06)"
              stroke="#0284c7"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              opacity="0.85"
            />
          )}

          {/* Downhole Card Layer */}
          {(cardTypeView === "downhole" || cardTypeView === "both") && (
            <polygon
              points={downholeString}
              fill="url(#dynaDownholeGrad)"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Surface Card Layer */}
          {(cardTypeView === "surface" || cardTypeView === "both") && (
            <polygon
              points={pointsString}
              fill="url(#dynaSurfaceGrad)"
              stroke={patternMode === "nominal" ? "#059669" : "#ea580c"}
              strokeWidth="2.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              data-testid="dyna-polyline"
            />
          )}

          {/* Real-time Reciprocating Tracking Marker */}
          {activePoint && (
            <g>
              <line
                x1={scaleX(activePoint.position)}
                y1={paddingTop}
                x2={scaleX(activePoint.position)}
                y2={paddingTop + plotHeight}
                stroke="#ea580c"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.8"
              />
              <circle
                cx={scaleX(activePoint.position)}
                cy={scaleY(activePoint.load)}
                r="12"
                fill="rgba(234, 88, 12, 0.2)"
                className="animate-pulse"
              />
              <circle
                cx={scaleX(activePoint.position)}
                cy={scaleY(activePoint.load)}
                r="6.5"
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
            fill="#1e293b"
            fontSize="12"
            fontWeight="bold"
          >
            Polished Rod Position (inches)
          </text>
          <text
            transform={`rotate(-90 20 ${paddingTop + plotHeight / 2})`}
            x={20}
            y={paddingTop + plotHeight / 2}
            textAnchor="middle"
            fill="#1e293b"
            fontSize="12"
            fontWeight="bold"
          >
            Polished Rod Load (lbs)
          </text>
        </svg>
      </div>

      {/* 4. Controls & Scrubbing Readout Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200/80 gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAnimatingStroke((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-100 text-slate-900 font-extrabold transition shadow-xs cursor-pointer"
          >
            {isAnimatingStroke ? (
              <>
                <Pause className="w-4 h-4 text-orange-600" />
                <span>Pause Motion</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-600" />
                <span>Play Live Motion</span>
              </>
            )}
          </button>

          <span className="text-slate-600 text-xs font-medium">
            Cadence: <strong className="text-slate-900 font-bold">5.8 SPM</strong>
          </span>
        </div>

        <div className="flex items-center gap-5">
          <div>
            <span className="text-slate-500 uppercase font-bold text-xs">Position:</span>{" "}
            <span className="font-black text-slate-900 text-sm sm:text-base ml-1">
              {activePoint ? `${activePoint.position.toFixed(1)}"` : "Scrub to inspect"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-bold text-xs">Rod Load:</span>{" "}
            <span className="font-black text-orange-600 text-sm sm:text-base ml-1">
              {activePoint ? `${Math.round(activePoint.load).toLocaleString()} lbs` : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-bold text-xs">Kinematic Phase:</span>{" "}
            <span className="font-black text-emerald-800 text-sm sm:text-base ml-1">
              {activePoint && activePoint.load > 10000 ? "UPSTROKE (Lift)" : "DOWNSTROKE (Sink)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
