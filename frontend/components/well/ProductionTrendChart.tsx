"use client";

import React, { useState } from "react";
import type { ProductionRecord } from "@/lib/api/types";
import { TrendingUp, Thermometer, Droplets, Calendar } from "lucide-react";

interface ProductionTrendChartProps {
  records: ProductionRecord[];
}

export function ProductionTrendChart({ records }: ProductionTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!records || records.length === 0) {
    return null;
  }

  // Slice last 10 records chronologically
  const data = records.slice(-10);

  // Bounds for SVG
  const width = 580;
  const height = 150;
  const padding = { top: 20, right: 30, bottom: 25, left: 40 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const bopdValues = data.map((d) => d.oil_rate_bopd);
  const minBopd = Math.max(0, Math.floor(Math.min(...bopdValues) - 0.5));
  const maxBopd = Math.ceil(Math.max(...bopdValues) + 0.5);

  const tempValues = data.map((d) => d.temperature_c);
  const minTemp = Math.floor(Math.min(...tempValues) - 2);
  const maxTemp = Math.ceil(Math.max(...tempValues) + 2);

  const getX = (i: number) =>
    padding.left + (i / Math.max(1, data.length - 1)) * chartW;

  const getYBopd = (val: number) =>
    padding.top +
    chartH -
    ((val - minBopd) / Math.max(0.1, maxBopd - minBopd)) * chartH;

  const getYTemp = (val: number) =>
    padding.top +
    chartH -
    ((val - minTemp) / Math.max(0.1, maxTemp - minTemp)) * chartH;

  // Build SVG path strings
  const bopdPoints = data.map((d, i) => `${getX(i)},${getYBopd(d.oil_rate_bopd)}`);
  const bopdLinePath = `M ${bopdPoints.join(" L ")}`;
  const bopdAreaPath = `${bopdLinePath} L ${getX(data.length - 1)},${
    padding.top + chartH
  } L ${getX(0)},${padding.top + chartH} Z`;

  const tempPoints = data.map((d, i) => `${getX(i)},${getYTemp(d.temperature_c)}`);
  const tempLinePath = `M ${tempPoints.join(" L ")}`;

  // Summary statistics
  const avgBopd = (
    bopdValues.reduce((a, b) => a + b, 0) / bopdValues.length
  ).toFixed(1);
  const peakBopd = Math.max(...bopdValues).toFixed(1);
  const avgTemp = (
    tempValues.reduce((a, b) => a + b, 0) / tempValues.length
  ).toFixed(1);

  const activeRecord =
    hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1];

  return (
    <div className="flex flex-col gap-3">
      {/* Mini Header & Summary Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-orange-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>Oil Rate: {activeRecord.oil_rate_bopd.toFixed(1)} BOPD</span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Temp: {activeRecord.temperature_c.toFixed(1)} °C</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Avg: <strong className="text-slate-800">{avgBopd} BOPD</strong>
          </span>
          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Peak: <strong className="text-orange-600">{peakBopd} BOPD</strong>
          </span>
          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Mean Temp: <strong className="text-sky-700">{avgTemp} °C</strong>
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full bg-slate-50/70 rounded-xl p-2 border border-slate-200/80 overflow-hidden relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="bopdGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="#e2e8f0"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={padding.top + chartH / 2}
            x2={width - padding.right}
            y2={padding.top + chartH / 2}
            stroke="#e2e8f0"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={padding.top + chartH}
            x2={width - padding.right}
            y2={padding.top + chartH}
            stroke="#cbd5e1"
          />

          {/* Y Axis Labels (Left: BOPD) */}
          <text
            x={padding.left - 6}
            y={padding.top + 4}
            fill="#ea580c"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="end"
            fontWeight="bold"
          >
            {maxBopd}
          </text>
          <text
            x={padding.left - 6}
            y={padding.top + chartH}
            fill="#ea580c"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="end"
          >
            {minBopd}
          </text>

          {/* Y Axis Labels (Right: Temp) */}
          <text
            x={width - padding.right + 6}
            y={padding.top + 4}
            fill="#0284c7"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="start"
            fontWeight="bold"
          >
            {maxTemp}°
          </text>
          <text
            x={width - padding.right + 6}
            y={padding.top + chartH}
            fill="#0284c7"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="start"
          >
            {minTemp}°
          </text>

          {/* BOPD Area & Line */}
          <path d={bopdAreaPath} fill="url(#bopdGrad)" />
          <path
            d={bopdLinePath}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Temp Line */}
          <path
            d={tempLinePath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cyBopd = getYBopd(d.oil_rate_bopd);
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible hover bar */}
                <rect
                  x={cx - chartW / (data.length * 2)}
                  y={padding.top}
                  width={chartW / data.length}
                  height={chartH}
                  fill="transparent"
                />

                {isHovered && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={padding.top + chartH}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                <circle
                  cx={cx}
                  cy={cyBopd}
                  r={isHovered ? 5 : 3.5}
                  fill="#ffffff"
                  stroke="#ea580c"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all"
                />

                {/* X axis date label */}
                <text
                  x={cx}
                  y={height - 6}
                  fill="#64748b"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {new Date(d.timestamp).getDate()}/
                  {new Date(d.timestamp).getMonth() + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
