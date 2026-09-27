"use client";

import React from "react";
import { Activity, Gauge, Flame, Cpu } from "lucide-react";

export type WellTab = "overview" | "diagnostics" | "optimizer" | "whatif";

interface WellTwinTabsProps {
  activeTab: WellTab;
  onTabChange: (tab: WellTab) => void;
}

const TABS: { id: WellTab; label: string; tag: string; Icon: React.ComponentType<{ className?: string }>; testId: string }[] = [
  { id: "overview", label: "Subsurface Twin & Overview", tag: "SCADA", Icon: Activity, testId: "tab-overview" },
  { id: "diagnostics", label: "SRP Diagnostics", tag: "Dyno", Icon: Gauge, testId: "tab-diagnostics" },
  { id: "optimizer", label: "CSS Steam Optimizer", tag: "Reservoir", Icon: Flame, testId: "tab-optimizer" },
  { id: "whatif", label: "What-If Simulator", tag: "Coupled", Icon: Cpu, testId: "tab-whatif" },
];

/**
 * Executive segmented tab switcher for the well digital twin.
 * Preserves all test IDs (tab-overview, tab-diagnostics, tab-optimizer, tab-whatif).
 */
export function WellTwinTabs({ activeTab, onTabChange }: WellTwinTabsProps) {
  return (
    <div
      className="flex items-center gap-3 p-2 bg-slate-100 rounded-3xl font-mono text-xs sm:text-sm overflow-x-auto border border-slate-200 shadow-xs"
      data-testid="twin-tabs"
    >
      {TABS.map(({ id, label, tag, Icon, testId }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl transition font-bold whitespace-nowrap ${
              isActive
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/90"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
            data-testid={testId}
          >
            <Icon className={`w-5 h-5 ${isActive ? "text-orange-600" : "text-slate-500"}`} />
            <span className="text-xs sm:text-sm font-['Space_Grotesk'] tracking-wide">{label}</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-extrabold ${
                isActive
                  ? "bg-orange-50 text-orange-800 border border-orange-200"
                  : "bg-slate-200 text-slate-700 font-semibold"
              }`}
            >
              {tag}
            </span>
          </button>
        );
      })}
    </div>
  );
}

