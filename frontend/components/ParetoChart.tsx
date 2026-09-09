"use client";

import React, { useState, useMemo, useRef } from "react";
import type { ParetoPoint } from "@/lib/api/types";
import {
  TrendingUp,
  Sparkles,
  Layers,
  Radio,
  Sliders,
  DollarSign,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Info,
} from "lucide-react";

export interface LiveScenarioPoint {
  sor: number;
  cumulative_oil_bbl: number;
  steam_volume_t?: number;
  steam_pressure_mpa?: number;
  soak_days?: number;
  production_cutoff_days?: number;
  spm?: number;
  stroke_length?: number;
  net_economic_value_usd?: number;
  rod_float_risk_score?: number;
}

export interface BaselineScenarioPoint {
  sor: number;
  cumulative_oil_bbl: number;
  net_economic_value_usd?: number;
  rod_float_risk_score?: number;
}

export type TradeOffMode = "sor_oil" | "econ_oil" | "risk_oil";

interface ParetoChartProps {
  points: ParetoPoint[];
  onSelectPoint?: (point: ParetoPoint) => void;
  liveScenario?: LiveScenarioPoint;
  baselineScenario?: BaselineScenarioPoint;
  width?: number;
  height?: number;
}

export function ParetoChart({
  points,
  onSelectPoint,
  liveScenario,
  baselineScenario,
  width = 640,
  height = 360,
}: ParetoChartProps) {
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [hoverPoint, setHoverPoint] = useState<ParetoPoint | null>(null);
  const [hoverLive, setHoverLive] = useState(false);
  const [hoverBaseline, setHoverBaseline] = useState(false);
  const [tradeOffMode, setTradeOffMode] = useState<TradeOffMode>("sor_oil");
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Fallback points if none provided
  const effectivePoints = useMemo(() => {
    if (points && points.length > 0) return points;
    return [
      { point_id: 1, steam_volume_t: 1800, steam_pressure_mpa: 10.5, soak_days: 3, production_cutoff_days: 55, cumulative_oil_bbl: 3697, sor: 2.52, economic_value: 178000, energy_cost_per_bbl: 21.0, rod_float_risk_score: 28, objective_weight_oil: 0.5 },
      { point_id: 2, steam_volume_t: 2200, steam_pressure_mpa: 11.0, soak_days: 4, production_cutoff_days: 65, cumulative_oil_bbl: 5240, sor: 3.02, economic_value: 265000, energy_cost_per_bbl: 21.4, rod_float_risk_score: 35, objective_weight_oil: 0.65 },
      { point_id: 3, steam_volume_t: 2600, steam_pressure_mpa: 11.5, soak_days: 4, production_cutoff_days: 75, cumulative_oil_bbl: 5857, sor: 3.42, economic_value: 301500, energy_cost_per_bbl: 22.2, rod_float_risk_score: 42, objective_weight_oil: 0.8 },
      { point_id: 4, steam_volume_t: 3200, steam_pressure_mpa: 12.5, soak_days: 5, production_cutoff_days: 85, cumulative_oil_bbl: 6350, sor: 3.68, economic_value: 328000, energy_cost_per_bbl: 23.1, rod_float_risk_score: 52, objective_weight_oil: 0.95 },
    ];
  }, [points]);

  // Determine X & Y metrics based on TradeOffMode
  const getPointX = (p: { sor: number; economic_value?: number; rod_float_risk_score?: number }) => {
    if (tradeOffMode === "econ_oil") return (p.economic_value ?? 250000) / 1000;
    if (tradeOffMode === "risk_oil") return p.rod_float_risk_score ?? 35;
    return p.sor;
  };

  const getLiveX = () => {
    if (!liveScenario) return 3.42;
    if (tradeOffMode === "econ_oil") return (liveScenario.net_economic_value_usd ?? 301500) / 1000;
    if (tradeOffMode === "risk_oil") return liveScenario.rod_float_risk_score ?? 42;
    return liveScenario.sor;
  };

  const getBaselineX = () => {
    if (!baselineScenario) return 3.49;
    if (tradeOffMode === "econ_oil") return (baselineScenario.net_economic_value_usd ?? 330700) / 1000;
    if (tradeOffMode === "risk_oil") return baselineScenario.rod_float_risk_score ?? 77.6;
    return baselineScenario.sor;
  };

  const allX = [
    ...effectivePoints.map(getPointX),
    getLiveX(),
    getBaselineX(),
  ];

  const allY = [
    ...effectivePoints.map((p) => p.cumulative_oil_bbl),
    liveScenario?.cumulative_oil_bbl ?? 5857,
    baselineScenario?.cumulative_oil_bbl ?? 6122,
  ];

  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const xPadding = (maxX - minX) * 0.15 || 0.3;
  const yPadding = (maxY - minY) * 0.15 || 250;

  const xMin = Math.max(0, minX - xPadding);
  const xMax = maxX + xPadding;
  const yMin = Math.max(0, minY - yPadding);
  const yMax = maxY + yPadding;

  const paddingLeft = 70;
  const paddingRight = 35;
  const paddingTop = 35;
  const paddingBottom = 50;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const scaleX = (val: number) => {
    return paddingLeft + ((val - xMin) / (xMax - xMin || 1)) * plotWidth;
  };

  const scaleY = (val: number) => {
    return (
      paddingTop + plotHeight - ((val - yMin) / (yMax - yMin || 1)) * plotHeight
    );
  };

  const sortedPoints = useMemo(() => {
    return [...effectivePoints].sort((a, b) => getPointX(a) - getPointX(b));
  }, [effectivePoints, tradeOffMode]);

  const frontierLineString = sortedPoints
    .map((pt) => `${scaleX(getPointX(pt)).toFixed(1)},${scaleY(pt.cumulative_oil_bbl).toFixed(1)}`)
    .join(" ");

  const frontierAreaString = `M ${scaleX(getPointX(sortedPoints[0])).toFixed(1)},${(paddingTop + plotHeight).toFixed(1)} ` +
    sortedPoints.map((pt) => `L ${scaleX(getPointX(pt)).toFixed(1)},${scaleY(pt.cumulative_oil_bbl).toFixed(1)}`).join(" ") +
    ` L ${scaleX(getPointX(sortedPoints[sortedPoints.length - 1])).toFixed(1)},${(paddingTop + plotHeight).toFixed(1)} Z`;

  const handlePointClick = (pt: ParetoPoint) => {
    setSelectedPointId(pt.point_id);
    if (onSelectPoint) {
      onSelectPoint(pt);
    }
  };

  const activeHoverPoint = hoverPoint;

  const liveXVal = getLiveX();
  const liveYVal = liveScenario?.cumulative_oil_bbl ?? 5857.6;
  const liveCX = scaleX(liveXVal);
  const liveCY = scaleY(liveYVal);

  const baselineXVal = getBaselineX();
  const baselineYVal = baselineScenario?.cumulative_oil_bbl ?? 6122.1;
  const baselineCX = scaleX(baselineXVal);
  const baselineCY = scaleY(baselineYVal);

  const xAxisLabel =
    tradeOffMode === "econ_oil"
      ? "Net Economic Value (k USD) → [Higher is Better]"
      : tradeOffMode === "risk_oil"
      ? "Rod-Float Risk Index (pts) → [Lower is Better]"
      : "Steam-Oil Ratio (SOR, t/bbl) → [Lower is Better]";

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
              Pareto Frontier &mdash; Multi-Objective Trade-Off
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-sans block mt-1">
            Real-time coupled simulator trajectory mapped against optimal Pareto front
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
          <button
            type="button"
            onClick={() => setTradeOffMode("sor_oil")}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              tradeOffMode === "sor_oil"
                ? "bg-white text-orange-600 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            SOR vs. Oil
          </button>
          <button
            type="button"
            onClick={() => setTradeOffMode("econ_oil")}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              tradeOffMode === "econ_oil"
                ? "bg-white text-sky-600 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Econ Value vs. Oil
          </button>
          <button
            type="button"
            onClick={() => setTradeOffMode("risk_oil")}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              tradeOffMode === "risk_oil"
                ? "bg-white text-emerald-600 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Risk vs. Oil
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/40 p-2 select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
          onMouseMove={(e) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) {
              setMousePos({
                x: ((e.clientX - rect.left) / rect.width) * width,
                y: ((e.clientY - rect.top) / rect.height) * height,
              });
            }
          }}
          onMouseLeave={() => setMousePos(null)}
        >
          <defs>
            <linearGradient id="paretoAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.01" />
            </linearGradient>

            <filter id="liveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

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

          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + ratio * plotHeight;
            const x = paddingLeft + ratio * plotWidth;
            const yVal = yMax - ratio * (yMax - yMin);
            const xVal = xMin + ratio * (xMax - xMin);

            return (
              <g key={`pareto-grid-${i}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + plotWidth}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="500"
                >
                  {Math.round(yVal).toLocaleString()}
                </text>

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
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="500"
                >
                  {tradeOffMode === "econ_oil" ? `$${Math.round(xVal)}k` : xVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          <path d={frontierAreaString} fill="url(#paretoAreaGrad)" />

          <polyline
            points={frontierLineString}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            opacity="0.85"
          />

          {mousePos &&
            mousePos.x >= paddingLeft &&
            mousePos.x <= paddingLeft + plotWidth &&
            mousePos.y >= paddingTop &&
            mousePos.y <= paddingTop + plotHeight && (
              <g pointerEvents="none" opacity="0.6">
                <line
                  x1={mousePos.x}
                  y1={paddingTop}
                  x2={mousePos.x}
                  y2={paddingTop + plotHeight}
                  stroke="#cbd5e1"
                  strokeDasharray="2 2"
                />
                <line
                  x1={paddingLeft}
                  y1={mousePos.y}
                  x2={paddingLeft + plotWidth}
                  y2={mousePos.y}
                  stroke="#cbd5e1"
                  strokeDasharray="2 2"
                />
              </g>
            )}

          {baselineScenario && (
            <g
              className="cursor-pointer transition-transform hover:scale-125"
              onMouseEnter={() => setHoverBaseline(true)}
              onMouseLeave={() => setHoverBaseline(false)}
            >
              <rect
                x={baselineCX - 6}
                y={baselineCY - 6}
                width="12"
                height="12"
                transform={`rotate(45 ${baselineCX} ${baselineCY})`}
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={baselineCX}
                y={baselineCY - 14}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill="#0284c7"
                fontFamily="monospace"
              >
                Baseline
              </text>
            </g>
          )}

          {effectivePoints.map((pt) => {
            const cx = scaleX(getPointX(pt));
            const cy = scaleY(pt.cumulative_oil_bbl);
            const isSelected = selectedPointId === pt.point_id;

            return (
              <g
                key={pt.point_id}
                className="cursor-pointer"
                onClick={() => handlePointClick(pt)}
                onMouseEnter={() => setHoverPoint(pt)}
                onMouseLeave={() => setHoverPoint(null)}
              >
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="14"
                    fill="rgba(234, 88, 12, 0.2)"
                    className="animate-pulse"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 8 : 6}
                  fill={isSelected ? "#ea580c" : "#0284c7"}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="transition-all hover:scale-125 drop-shadow-xs"
                />
              </g>
            );
          })}

          <g
            className="cursor-pointer transition-all duration-150"
            onMouseEnter={() => setHoverLive(true)}
            onMouseLeave={() => setHoverLive(false)}
          >
            <circle
              cx={liveCX}
              cy={liveCY}
              r="16"
              fill="rgba(234, 88, 12, 0.2)"
              className="animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <circle
              cx={liveCX}
              cy={liveCY}
              r="10"
              fill="rgba(234, 88, 12, 0.35)"
              stroke="#ea580c"
              strokeWidth="1.5"
            />
            <circle
              cx={liveCX}
              cy={liveCY}
              r="6.5"
              fill="#ea580c"
              stroke="#ffffff"
              strokeWidth="2"
              filter="url(#liveGlow)"
            />
            <rect
              x={liveCX - 38}
              y={liveCY + 12}
              width="76"
              height="18"
              rx="9"
              fill="#ea580c"
              className="drop-shadow-xs"
            />
            <text
              x={liveCX}
              y={liveCY + 24}
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="#ffffff"
              fontFamily="monospace"
            >
              PROPOSED (LIVE)
            </text>
          </g>

          {/* Axis Labels */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#1e293b"
            fontSize="12"
            fontWeight="bold"
          >
            {xAxisLabel}
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
            Cum Oil (bbl) &rarr; [Higher is Better]
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-600 animate-pulse" />
            <span className="font-extrabold text-slate-900">Proposed Live Scenario</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-sky-600 inline-block" />
            <span className="text-slate-700 font-semibold">Current Baseline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
            <span className="text-slate-700 font-semibold">Pareto Frontier Solutions ({effectivePoints.length})</span>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-sans font-medium">
          Click any Pareto point to auto-load optimal parameters
        </span>
      </div>

      {(activeHoverPoint || hoverLive || hoverBaseline) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/90 border border-orange-200 text-xs font-mono grid grid-cols-2 sm:grid-cols-5 gap-3.5 shadow-xs animate-in fade-in">
          <div>
            <span className="text-slate-600 font-extrabold uppercase text-xs block">
              {hoverLive ? "Live Scenario Point" : hoverBaseline ? "Baseline Operating Point" : `Frontier #${activeHoverPoint?.point_id}`}
            </span>
            <span className="text-base font-black text-slate-900 block mt-0.5">
              {hoverLive ? "Coupled Solver" : hoverBaseline ? "Historical Avg" : "Optimal Point"}
            </span>
          </div>

          <div>
            <span className="text-slate-600 font-extrabold uppercase text-xs block">Cum Oil Yield:</span>
            <span className="text-base font-black text-orange-600 block mt-0.5">
              {(hoverLive
                ? liveScenario?.cumulative_oil_bbl ?? 5857
                : hoverBaseline
                ? baselineScenario?.cumulative_oil_bbl ?? 6122
                : activeHoverPoint?.cumulative_oil_bbl ?? 0
              ).toLocaleString()}{" "}
              <span className="text-xs font-semibold text-slate-500">bbl</span>
            </span>
          </div>

          <div>
            <span className="text-slate-600 font-extrabold uppercase text-xs block">Steam-Oil Ratio:</span>
            <span className="text-base font-black text-sky-600 block mt-0.5">
              {(hoverLive
                ? liveScenario?.sor ?? 3.42
                : hoverBaseline
                ? baselineScenario?.sor ?? 3.49
                : activeHoverPoint?.sor ?? 0
              ).toFixed(2)}{" "}
              <span className="text-xs font-semibold text-slate-500">t/bbl</span>
            </span>
          </div>

          <div>
            <span className="text-slate-600 font-extrabold uppercase text-xs block">Net Economic Margin:</span>
            <span className="text-base font-black text-slate-900 block mt-0.5">
              ${Math.round(
                hoverLive
                  ? liveScenario?.net_economic_value_usd ?? 301500
                  : hoverBaseline
                  ? baselineScenario?.net_economic_value_usd ?? 330700
                  : activeHoverPoint?.economic_value ?? 0
              ).toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-slate-600 font-extrabold uppercase text-xs block">Rod-Float Risk:</span>
            <span className="text-base font-black text-emerald-800 block mt-0.5">
              {hoverLive
                ? liveScenario?.rod_float_risk_score ?? 42
                : hoverBaseline
                ? baselineScenario?.rod_float_risk_score ?? 77.6
                : activeHoverPoint?.rod_float_risk_score ?? 35}{" "}
              <span className="text-xs font-semibold text-slate-500">pts</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

