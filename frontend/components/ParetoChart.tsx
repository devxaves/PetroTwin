"use client";

import React, { useState } from "react";
import type { ParetoPoint } from "@/lib/api/types";

interface ParetoChartProps {
  points: ParetoPoint[];
  onSelectPoint?: (point: ParetoPoint) => void;
  width?: number;
  height?: number;
}

export function ParetoChart({
  points,
  onSelectPoint,
  width = 500,
  height = 300,
}: ParetoChartProps) {
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center rounded bg-[#0d1321] border border-[#1e293b] text-slate-500 font-mono text-xs">
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

  // Sort points by SOR for connected line
  const sortedPoints = [...points].sort((a, b) => a.sor - b.sor);
  const polylinePoints = sortedPoints
    .map((p) => `${scaleX(p.sor).toFixed(1)},${scaleY(p.cumulative_oil_bbl).toFixed(1)}`)
    .join(" ");

  const handlePointClick = (pt: ParetoPoint) => {
    setSelectedPointId(pt.point_id);
    if (onSelectPoint) onSelectPoint(pt);
  };

  const activePoint = points.find((p) => p.point_id === selectedPointId);

  return (
    <div
      className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3.5"
      data-testid="pareto-chart-container"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
            Pareto Frontier (Non-Dominated Trade-Offs)
          </span>
          <div className="text-[11px] font-mono text-slate-500 font-medium">
            Cumulative Oil (bbl) vs. Steam-Oil Ratio (SOR)
          </div>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 font-mono font-semibold">
          {points.length} Optimal Scenarios
        </span>
      </div>

      <div className="relative overflow-x-auto rounded-lg border border-slate-200/80 bg-slate-50/50 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none font-mono"
          data-testid="pareto-svg"
        >
          {/* Plot Background */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={plotWidth}
            height={plotHeight}
            fill="#ffffff"
            stroke="#e2e8f0"
          />

          {/* Connected Frontier Line */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2"
            strokeDasharray="4 3"
            opacity="0.8"
          />

          {/* Pareto Points */}
          {sortedPoints.map((pt) => {
            const cx = scaleX(pt.sor);
            const cy = scaleY(pt.cumulative_oil_bbl);
            const isSelected = pt.point_id === selectedPointId;

            return (
              <g
                key={pt.point_id}
                className="cursor-pointer group"
                onClick={() => handlePointClick(pt)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 7 : 5}
                  fill={isSelected ? "#ea580c" : "#0284c7"}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all hover:scale-125 shadow-xs"
                />
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontWeight="bold"
          >
            Steam-Oil Ratio (SOR, t/bbl) → [Lower is Better]
          </text>
          <text
            transform={`rotate(-90 18 ${paddingTop + plotHeight / 2})`}
            x={18}
            y={paddingTop + plotHeight / 2}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontWeight="bold"
          >
            Cum Oil (bbl) → [Higher is Better]
          </text>
        </svg>
      </div>

      {/* Selected Point Callout */}
      {activePoint && (
        <div className="p-3 rounded-lg bg-orange-50/60 border border-orange-200 text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-2.5 shadow-2xs">
          <div>
            <span className="text-slate-500 font-medium">Steam Volume:</span>{" "}
            <span className="text-slate-900 font-bold">{activePoint.steam_volume_t}t</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Pressure:</span>{" "}
            <span className="text-slate-900 font-bold">{activePoint.steam_pressure_mpa} MPa</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Oil Production:</span>{" "}
            <span className="text-orange-600 font-extrabold">{Math.round(activePoint.cumulative_oil_bbl)} bbl</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">SOR:</span>{" "}
            <span className="text-sky-700 font-extrabold">{activePoint.sor.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
