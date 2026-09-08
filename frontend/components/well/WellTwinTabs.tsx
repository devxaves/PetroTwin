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
      className="flex items-center gap-2.5 p-2 bg-slate-100/90 rounded-2xl font-mono text-xs sm:text-sm overflow-x-auto border border-slate-200/70 shadow-xs"
      data-testid="twin-tabs"
    >
      {TABS.map(({ id, label, tag, Icon, testId }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl transition font-medium whitespace-nowrap ${
              isActive
                ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/90"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
            data-testid={testId}
          >
            <Icon className={`w-4.5 h-4.5 ${isActive ? "text-orange-600" : "text-slate-400"}`} />
            <span className="text-xs sm:text-sm">{label}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                isActive
                  ? "bg-orange-50 text-orange-700 font-bold border border-orange-200"
                  : "bg-slate-200/70 text-slate-500 font-medium"
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

