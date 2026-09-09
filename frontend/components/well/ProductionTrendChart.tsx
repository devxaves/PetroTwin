"use client";

import React, { useState, useMemo, useRef } from "react";
import type { ProductionRecord } from "@/lib/api/types";
import {
  TrendingUp,
  Thermometer,
  Droplets,
  Calendar,
  Layers,
  Gauge,
  Activity,
  Zap,
} from "lucide-react";

interface ProductionTrendChartProps {
  records: ProductionRecord[];
}

type ChartMetricView = "coupled" | "oil" | "water_cut" | "pressure";
type TimeRangeView = 7 | 14 | 30 | 0; // 0 = all

// Helper function to build a smooth SVG cubic Bezier path from points
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2)
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

export function ProductionTrendChart({ records }: ProductionTrendChartProps) {
  const [metricView, setMetricView] = useState<ChartMetricView>("coupled");
  const [timeRange, setTimeRange] = useState<TimeRangeView>(14);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!records || records.length === 0) {
    return (
      <div className="p-6 text-center text-xs font-mono text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
        No production trajectory records available.
      </div>
    );
  }

  // Filter records by selected time range
  const data = useMemo(() => {
    if (timeRange === 0 || records.length <= timeRange) return records;
    return records.slice(-timeRange);
  }, [records, timeRange]);

  // Bounds for SVG
  const width = 600;
  const height = 180;
  const padding = { top: 25, right: 45, bottom: 35, left: 45 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Extents
  const bopdValues = data.map((d) => d.oil_rate_bopd);
  const minBopd = Math.max(0, Math.floor(Math.min(...bopdValues) * 0.85));
  const maxBopd = Math.ceil(Math.max(...bopdValues) * 1.15 || 10);

  const tempValues = data.map((d) => d.temperature_c);
  const minTemp = Math.floor(Math.min(...tempValues) - 3);
  const maxTemp = Math.ceil(Math.max(...tempValues) + 3);

  const cutValues = data.map((d) => d.water_cut * 100);
  const minCut = 0;
  const maxCut = 100;

  const pressValues = data.map((d) => d.tubing_pressure);
  const minPress = Math.max(0, Math.floor(Math.min(...pressValues) * 0.8));
  const maxPress = Math.ceil(Math.max(...pressValues) * 1.2 || 150);

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

  const getYCut = (val: number) =>
    padding.top +
    chartH -
    ((val - minCut) / Math.max(0.1, maxCut - minCut)) * chartH;

  const getYPress = (val: number) =>
    padding.top +
    chartH -
    ((val - minPress) / Math.max(0.1, maxPress - minPress)) * chartH;

  // Build points arrays for smooth Bezier curves
  const bopdPoints = data.map((d, i) => ({
    x: getX(i),
    y: getYBopd(d.oil_rate_bopd),
  }));
  const bopdSmoothPath = createSmoothPath(bopdPoints);
  const bopdAreaPath = `${bopdSmoothPath} L ${getX(data.length - 1)},${
    padding.top + chartH
  } L ${getX(0)},${padding.top + chartH} Z`;

  const tempPoints = data.map((d, i) => ({
    x: getX(i),
    y: getYTemp(d.temperature_c),
  }));
  const tempSmoothPath = createSmoothPath(tempPoints);

  const cutPoints = data.map((d, i) => ({
    x: getX(i),
    y: getYCut(d.water_cut * 100),
  }));
  const cutSmoothPath = createSmoothPath(cutPoints);
  const cutAreaPath = `${cutSmoothPath} L ${getX(data.length - 1)},${
    padding.top + chartH
  } L ${getX(0)},${padding.top + chartH} Z`;

  const pressPoints = data.map((d, i) => ({
    x: getX(i),
    y: getYPress(d.tubing_pressure),
  }));
  const pressSmoothPath = createSmoothPath(pressPoints);

  // Summary statistics
  const avgBopd = (
    bopdValues.reduce((a, b) => a + b, 0) / bopdValues.length
  ).toFixed(1);
  const peakBopd = Math.max(...bopdValues).toFixed(1);
  const avgTemp = (
    tempValues.reduce((a, b) => a + b, 0) / tempValues.length
  ).toFixed(1);
  const avgCut = (
    cutValues.reduce((a, b) => a + b, 0) / cutValues.length
  ).toFixed(0);

  const activeRecord =
    hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1];

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* View & Time Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-[11px]">
          <button
            type="button"
            onClick={() => setMetricView("coupled")}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              metricView === "coupled"
                ? "bg-white text-orange-600 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Coupled (Oil + Temp)
          </button>
          <button
            type="button"
            onClick={() => setMetricView("oil")}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              metricView === "oil"
                ? "bg-white text-orange-600 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Oil (BOPD)
          </button>
          <button
            type="button"
            onClick={() => setMetricView("water_cut")}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              metricView === "water_cut"
                ? "bg-white text-sky-600 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Water Cut (%)
          </button>
          <button
            type="button"
            onClick={() => setMetricView("pressure")}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              metricView === "pressure"
                ? "bg-white text-emerald-600 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pressure (MPa)
          </button>
        </div>

        {/* Time Window Pills */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg text-[10px] text-slate-500">
          <button
            type="button"
            onClick={() => setTimeRange(7)}
            className={`px-2 py-0.5 rounded transition ${
              timeRange === 7 ? "bg-white text-slate-900 font-bold shadow-xs" : "hover:text-slate-900"
            }`}
          >
            7D
          </button>
          <button
            type="button"
            onClick={() => setTimeRange(14)}
            className={`px-2 py-0.5 rounded transition ${
              timeRange === 14 ? "bg-white text-slate-900 font-bold shadow-xs" : "hover:text-slate-900"
            }`}
          >
            14D
          </button>
          <button
            type="button"
            onClick={() => setTimeRange(0)}
            className={`px-2 py-0.5 rounded transition ${
              timeRange === 0 ? "bg-white text-slate-900 font-bold shadow-xs" : "hover:text-slate-900"
            }`}
          >
            All ({records.length})
          </button>
        </div>
      </div>

      {/* Mini Summary Stats Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {(metricView === "coupled" || metricView === "oil") && (
            <div className="flex items-center gap-1.5 text-orange-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <span>Oil: {activeRecord.oil_rate_bopd.toFixed(1)} BOPD</span>
            </div>
          )}
          {(metricView === "coupled" || metricView === "pressure") && (
            <div className="flex items-center gap-1.5 text-sky-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>Temp: {activeRecord.temperature_c.toFixed(1)} °C</span>
            </div>
          )}
          {metricView === "water_cut" && (
            <div className="flex items-center gap-1.5 text-sky-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
              <span>Cut: {(activeRecord.water_cut * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Avg: <strong className="text-slate-800">{avgBopd} BOPD</strong>
          </span>
          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Peak: <strong className="text-orange-600">{peakBopd} BOPD</strong>
          </span>
          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Water Cut: <strong className="text-sky-700">{avgCut}%</strong>
          </span>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="w-full bg-slate-50/70 rounded-2xl p-2 border border-slate-200/80 overflow-hidden relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseMove={(e) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) {
              const svgX = ((e.clientX - rect.left) / rect.width) * width;
              const svgY = ((e.clientY - rect.top) / rect.height) * height;
              setMousePos({ x: svgX, y: svgY });

              // Snap to closest data point
              let closestIdx = 0;
              let minDistance = Infinity;
              data.forEach((_, i) => {
                const dist = Math.abs(getX(i) - svgX);
                if (dist < minDistance) {
                  minDistance = dist;
                  closestIdx = i;
                }
              });
              setHoveredIndex(closestIdx);
            }
          }}
          onMouseLeave={() => {
            setMousePos(null);
            setHoveredIndex(null);
          }}
        >
          <defs>
            <linearGradient id="bopdGradSmooth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="waterCutGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <line
            x1={padding.left}
            y1={padding.top + chartH / 2}
            x2={width - padding.right}
            y2={padding.top + chartH / 2}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <line
            x1={padding.left}
            y1={padding.top + chartH}
            x2={width - padding.right}
            y2={padding.top + chartH}
            stroke="#cbd5e1"
          />

          {/* Left Y Axis Labels (BOPD / Cut) */}
          {(metricView === "coupled" || metricView === "oil") && (
            <>
              <text
                x={padding.left - 8}
                y={padding.top + 4}
                fill="#ea580c"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
                fontWeight="bold"
              >
                {maxBopd}
              </text>
              <text
                x={padding.left - 8}
                y={padding.top + chartH}
                fill="#ea580c"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
              >
                {minBopd}
              </text>
            </>
          )}

          {metricView === "water_cut" && (
            <>
              <text
                x={padding.left - 8}
                y={padding.top + 4}
                fill="#0284c7"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
                fontWeight="bold"
              >
                100%
              </text>
              <text
                x={padding.left - 8}
                y={padding.top + chartH}
                fill="#0284c7"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
              >
                0%
              </text>
            </>
          )}

          {/* Right Y Axis Labels (Temp / Pressure) */}
          {metricView === "coupled" && (
            <>
              <text
                x={width - padding.right + 8}
                y={padding.top + 4}
                fill="#0284c7"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="start"
                fontWeight="bold"
              >
                {maxTemp}°C
              </text>
              <text
                x={width - padding.right + 8}
                y={padding.top + chartH}
                fill="#0284c7"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="start"
              >
                {minTemp}°C
              </text>
            </>
          )}

          {/* Render Curve Layers based on Active View */}
          {(metricView === "coupled" || metricView === "oil") && (
            <>
              <path d={bopdAreaPath} fill="url(#bopdGradSmooth)" />
              <path
                d={bopdSmoothPath}
                fill="none"
                stroke="#ea580c"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </>
          )}

          {metricView === "coupled" && (
            <path
              d={tempSmoothPath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {metricView === "water_cut" && (
            <>
              <path d={cutAreaPath} fill="url(#waterCutGrad)" />
              <path
                d={cutSmoothPath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </>
          )}

          {metricView === "pressure" && (
            <path
              d={pressSmoothPath}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Data Points and Hover Scrubber */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cyBopd = getYBopd(d.oil_rate_bopd);
            const isHovered = hoveredIndex === i;
            const isLatest = i === data.length - 1;

            return (
              <g key={i}>
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={padding.top + chartH}
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Primary Data Point Circle */}
                {(metricView === "coupled" || metricView === "oil") && (
                  <circle
                    cx={cx}
                    cy={cyBopd}
                    r={isHovered ? 6 : isLatest ? 5 : 3.5}
                    fill={isLatest ? "#ea580c" : "#ffffff"}
                    stroke="#ea580c"
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all"
                  />
                )}

                {/* Latest data point pulse */}
                {isLatest && (
                  <circle
                    cx={cx}
                    cy={cyBopd}
                    r="9"
                    fill="rgba(234, 88, 12, 0.25)"
                    className="animate-ping"
                    style={{ animationDuration: "2.5s" }}
                  />
                )}

                {/* X Axis Date Label */}
                <text
                  x={cx}
                  y={height - 10}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight={isHovered ? "bold" : "normal"}
                >
                  {new Date(d.timestamp).toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                  })}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Hover HUD */}
      {hoveredIndex !== null && (
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date:</span>
            <span className="font-bold text-slate-800">
              {new Date(activeRecord.timestamp).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Oil Yield:</span>
            <span className="font-bold text-orange-600">{activeRecord.oil_rate_bopd.toFixed(1)} BOPD</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Water Cut:</span>
            <span className="font-bold text-sky-700">{(activeRecord.water_cut * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Temp / Press:</span>
            <span className="font-bold text-slate-800">
              {activeRecord.temperature_c.toFixed(1)}°C &bull; {activeRecord.tubing_pressure.toFixed(1)} MPa
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

