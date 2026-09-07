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
      className="p-4 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-3"
      data-testid="pareto-chart-container"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Pareto Frontier (Non-Dominated Trade-Offs)
          </span>
          <div className="text-[11px] font-mono text-slate-400">
            Cumulative Oil (bbl) vs. Steam-Oil Ratio (SOR)
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-mono">
          {points.length} Optimal Points
        </span>
      </div>

      <div className="relative overflow-x-auto">
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
            fill="#080c14"
            stroke="#1e293b"
          />

          {/* Connected Frontier Line */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.6"
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
                  r={isSelected ? 6 : 4.5}
                  fill={isSelected ? "#f59e0b" : "#38bdf8"}
                  stroke="#080c14"
                  strokeWidth="1.5"
                  className="transition-all hover:scale-125"
                />
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#94a3b8"
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
            fill="#94a3b8"
            fontSize="10"
            fontWeight="bold"
          >
            Cum Oil (bbl) → [Higher is Better]
          </text>
        </svg>
      </div>

      {/* Selected Point Callout */}
      {activePoint && (
        <div className="p-2.5 rounded bg-[#131b2e] border border-cyan-800/40 text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-slate-500">Steam:</span>{" "}
            <span className="text-slate-200">{activePoint.steam_volume_t}t</span>
          </div>
          <div>
            <span className="text-slate-500">Pressure:</span>{" "}
            <span className="text-slate-200">{activePoint.steam_pressure_mpa} MPa</span>
          </div>
          <div>
            <span className="text-slate-500">Oil:</span>{" "}
            <span className="text-amber-400 font-bold">{Math.round(activePoint.cumulative_oil_bbl)} bbl</span>
          </div>
          <div>
            <span className="text-slate-500">SOR:</span>{" "}
            <span className="text-cyan-400 font-bold">{activePoint.sor.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
