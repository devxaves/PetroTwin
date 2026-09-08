"use client";

import React from "react";
import type { CardPoint } from "@/lib/api/types";

interface DynamometerCardProps {
  cardPoints: CardPoint[];
  classificationLabel: string;
  confidence?: number;
  width?: number;
  height?: number;
}

export function DynamometerCard({
  cardPoints,
  classificationLabel,
  confidence,
  width = 500,
  height = 320,
}: DynamometerCardProps) {
  if (!cardPoints || cardPoints.length === 0) {
    return (
      <div
        className="w-full h-64 flex items-center justify-center rounded bg-[#0d1321] border border-[#1e293b] text-slate-500 font-mono text-xs"
        data-testid="dyna-card-empty"
      >
        No dynamometer card points available
      </div>
    );
  }

  // Calculate bounding box for points
  const positions = cardPoints.map((p) => p.position);
  const loads = cardPoints.map((p) => p.load);

  const minPos = Math.min(...positions);
  const maxPos = Math.max(...positions);
  const minLoad = Math.min(...loads);
  const maxLoad = Math.max(...loads);

  const posPadding = (maxPos - minPos) * 0.1 || 5;
  const loadPadding = (maxLoad - minLoad) * 0.1 || 1000;

  const xMin = Math.max(0, minPos - posPadding);
  const xMax = maxPos + posPadding;
  const yMin = Math.max(0, minLoad - loadPadding);
  const yMax = maxLoad + loadPadding;

  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 40;
  const paddingBottom = 50;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // Scale functions
  const scaleX = (pos: number) => {
    return paddingLeft + ((pos - xMin) / (xMax - xMin || 1)) * plotWidth;
  };

  const scaleY = (load: number) => {
    // Invert Y for SVG coordinates
    return (
      paddingTop + plotHeight - ((load - yMin) / (yMax - yMin || 1)) * plotHeight
    );
  };

  // Generate SVG polyline points string
  const pointsString = cardPoints
    .map((p) => `${scaleX(p.position).toFixed(1)},${scaleY(p.load).toFixed(1)}`)
    .join(" ");

  // Grid tick lines
  const xTicks = 5;
  const yTicks = 5;

  const xTickValues = Array.from({ length: xTicks + 1 }, (_, i) => {
    return xMin + (i * (xMax - xMin)) / xTicks;
  });

  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => {
    return yMin + (i * (yMax - yMin)) / yTicks;
  });

  // Condition color styling
  const isNormal = classificationLabel.toLowerCase().includes("normal");
  const isRodFloat =
    classificationLabel.toLowerCase().includes("float") ||
    classificationLabel.toLowerCase().includes("fluid pound");
  const badgeColor = isNormal
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isRodFloat
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div
      className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3"
      data-testid="dynamometer-card-container"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase text-slate-800 font-['Space_Grotesk']">
            Surface Dynamometer Card
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            {cardPoints.length} points acquired
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold uppercase border ${badgeColor}`}
            data-testid="dyna-classification-badge"
          >
            {classificationLabel}
          </span>
          {confidence !== undefined && (
            <span
              className="text-xs px-2.5 py-1 rounded-md bg-orange-50 border border-orange-200 font-mono font-semibold text-orange-700"
              data-testid="dyna-confidence-badge"
            >
              {(confidence * 100).toFixed(1)}% ML Conf
            </span>
          )}
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-lg border border-slate-200/80 bg-slate-50/50 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[360px] select-none font-mono"
          data-testid="dyna-svg"
        >
          {/* Background grid */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={plotWidth}
            height={plotHeight}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
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
                  stroke="#edf2f7"
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
                  stroke="#edf2f7"
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

          {/* Axis Labels */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={height - 10}
            textAnchor="middle"
            fill="#475569"
            fontSize="11"
            fontWeight="bold"
          >
            Polished Rod Position (inches)
          </text>
          <text
            transform={`rotate(-90 18 ${paddingTop + plotHeight / 2})`}
            x={18}
            y={paddingTop + plotHeight / 2}
            textAnchor="middle"
            fill="#475569"
            fontSize="11"
            fontWeight="bold"
          >
            Polished Rod Load (lbs)
          </text>

          {/* Dynamometer closed curve polyline - vibrant safety orange */}
          <polyline
            points={pointsString}
            fill="rgba(234, 88, 12, 0.05)"
            stroke="#ea580c"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            data-testid="dyna-polyline"
          />

          {/* Start/End anchor points */}
          {cardPoints.length > 0 && (
            <circle
              cx={scaleX(cardPoints[0].position)}
              cy={scaleY(cardPoints[0].load)}
              r="4.5"
              fill="#ea580c"
              stroke="#ffffff"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
