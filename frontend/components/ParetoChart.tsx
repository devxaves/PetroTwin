"use client";

import React, { useState } from "react";
import type { ParetoPoint } from "@/lib/api/types";
import { TrendingUp, Sparkles, AlertTriangle } from "lucide-react";

interface ParetoChartProps {
  points: ParetoPoint[];
  onSelectPoint?: (point: ParetoPoint) => void;
  width?: number;
  height?: number;
}

export function ParetoChart({
  points,
  onSelectPoint,
  width = 620,
  height = 350,
}: ParetoChartProps) {
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [hoverPoint, setHoverPoint] = useState<ParetoPoint | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center rounded-3xl bg-slate-50 border border-slate-200 text-slate-500 font-mono text-xs">
        No Pareto front points computed.
      </div>
    );
  }

  // Axes: X = SOR (lower is better), Y = Cumulative Oil (higher is better)
  const sorValues = points.map((p) => p.sor);
  const oilValues = points.map((p) => p.cumulative_oil_bbl);

  const minSor = Math.min(...sorValues);
  const maxSor = Math.max(...sorValues);
  const minOil = Math.min(...oilValues);
  const maxOil = Math.max(...oilValues);

  const sorPadding = (maxSor - minSor) * 0.1 || 0.2;
  const oilPadding = (maxOil - minOil) * 0.1 || 100;

  const xMin = Math.max(0, minSor - sorPadding);
  const xMax = maxSor + sorPadding;
  const yMin = Math.max(0, minOil - oilPadding);
  const yMax = maxOil + oilPadding;

  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 45;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const scaleX = (sor: number) => {
    return paddingLeft + ((sor - xMin) / (xMax - xMin || 1)) * plotWidth;
  };

  const scaleY = (oil: number) => {
    return (
      paddingTop + plotHeight - ((oil - yMin) / (yMax - yMin || 1)) * plotHeight
    );
  };

  // Sort points by SOR ascending to draw the non-dominated Pareto frontier curve
  const sortedPoints = [...points].sort((a, b) => a.sor - b.sor);
  const frontierLineString = sortedPoints
    .map((pt) => `${scaleX(pt.sor).toFixed(1)},${scaleY(pt.cumulative_oil_bbl).toFixed(1)}`)
    .join(" ");

  const handlePointClick = (pt: ParetoPoint) => {
    setSelectedPointId(pt.point_id);
    if (onSelectPoint) {
      onSelectPoint(pt);
    }
  };

  const activePoint =
    hoverPoint ??
    (selectedPointId !== null
      ? points.find((p) => p.point_id === selectedPointId)
      : null);

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
              Pareto Frontier &mdash; Oil vs. Energy Trade-off
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-sans block mt-1">
            Click optimal solution point to auto-load coupled simulator parameters
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          {points.length} Frontier Solutions
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
        >
          {/* Background Grid */}
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

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + ratio * plotHeight;
            const x = paddingLeft + ratio * plotWidth;
            const yVal = yMax - ratio * (yMax - yMin);
            const xVal = xMin + ratio * (xMax - xMin);

            return (
              <g key={`pareto-grid-${i}`}>
                {/* Horizontal */}
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
                  fontSize="11"
                  fontWeight="500"
                >
                  {Math.round(yVal).toLocaleString()}
                </text>

                {/* Vertical */}
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
                  fontSize="11"
                  fontWeight="500"
                >
                  {xVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Non-dominated Frontier Polyline */}
          <polyline
            points={frontierLineString}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2.5"
            strokeDasharray="5 3"
            opacity="0.8"
          />

          {/* Points */}
          {points.map((pt) => {
            const cx = scaleX(pt.sor);
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
                    r="12"
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

          {/* Axis Labels */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#334155"
            fontSize="11"
            fontWeight="bold"
          >
            Steam-Oil Ratio (SOR, t/bbl) &rarr; [Lower is Better]
          </text>
          <text
            transform={`rotate(-90 18 ${paddingTop + plotHeight / 2})`}
            x={18}
            y={paddingTop + plotHeight / 2}
            textAnchor="middle"
            fill="#334155"
            fontSize="11"
            fontWeight="bold"
          >
            Cum Oil (bbl) &rarr; [Higher is Better]
          </text>
        </svg>
      </div>

      {/* Selected / Hovered Point Callout */}
      {activePoint ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/70 border border-orange-200 text-xs sm:text-sm font-mono grid grid-cols-2 sm:grid-cols-4 gap-4 shadow-xs">
          <div>
            <span className="text-slate-500 font-semibold uppercase text-[11px] block">Steam Volume:</span>
            <span className="text-slate-900 font-black text-base">{activePoint.steam_volume_t} t</span>
            <div className="text-xs text-slate-500 mt-0.5">P = {activePoint.steam_pressure_mpa} MPa</div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold uppercase text-[11px] block">Oil Production:</span>
            <span className="text-orange-600 font-black text-base">{Math.round(activePoint.cumulative_oil_bbl)} bbl</span>
            <div className="text-xs text-slate-500 mt-0.5">Soak: {activePoint.soak_days} days</div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold uppercase text-[11px] block">Steam-Oil Ratio:</span>
            <span className="text-sky-700 font-black text-base">{activePoint.sor.toFixed(2)}</span>
            <div className="text-xs text-slate-500 mt-0.5">t steam / bbl oil</div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold uppercase text-[11px] block">Net Economic Value:</span>
            <span className="text-emerald-700 font-black text-base">
              ${Math.round(activePoint.economic_value).toLocaleString()}
            </span>
            <div className="text-xs text-slate-500 mt-0.5">Risk Score: {activePoint.rod_float_risk_score} pts</div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-500 text-xs text-center font-sans">
          Click any solution point on the Pareto curve to auto-load optimal operating parameters
        </div>
      )}
    </div>
  );
}
