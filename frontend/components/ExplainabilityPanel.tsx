"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, Edit3, Shield, Info, AlertTriangle } from "lucide-react";
import { useRecordApproval } from "@/lib/api/queries";

interface ExplainabilityPanelProps {
  wellId: string;
  reasons: string[];
  expectedEffect?: {
    production_delta_pct?: number;
    sor_delta_pct?: number;
    rod_float_risk_delta?: number;
    energy_delta_pct?: number;
  };
  combinedConfidence?: number;
  recommendationSnapshot: Record<string, any>;
  onDecisionLogged?: (decision: string) => void;
}

export function ExplainabilityPanel({
  wellId,
  reasons,
  expectedEffect,
  combinedConfidence = 0.85,
  recommendationSnapshot,
  onDecisionLogged,
}: ExplainabilityPanelProps) {
  const [operatorNotes, setOperatorNotes] = useState("");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [lastActionStatus, setLastActionStatus] = useState<string | null>(null);

  const approvalMutation = useRecordApproval(wellId);

  const confPct = Math.round(combinedConfidence * 100);
  let confTier = "HIGH";
  let confColor = "text-emerald-400";
  let confBg = "bg-emerald-500/10 border-emerald-500/30";

  if (confPct < 60) {
    confTier = "LOW";
    confColor = "text-rose-400";
    confBg = "bg-rose-500/10 border-rose-500/30";
  } else if (confPct < 80) {
    confTier = "MEDIUM";
    confColor = "text-amber-400";
    confBg = "bg-amber-500/10 border-amber-500/30";
  }

  const handleDecision = async (decision: "approved" | "rejected" | "modified") => {
    try {
      await approvalMutation.mutateAsync({
        recommendation_snapshot: recommendationSnapshot,
        operator_decision: decision,
        operator_notes: operatorNotes.trim() || undefined,
      });
      setLastActionStatus(`Decision "${decision.toUpperCase()}" recorded in audit trail.`);
      setOperatorNotes("");
      setIsNotesOpen(false);
      if (onDecisionLogged) onDecisionLogged(decision);
    } catch (err: any) {
      setLastActionStatus(`Failed to record decision: ${err.message}`);
    }
  };

  return (
    <div
      className="p-5 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-4 shadow-xl"
      data-testid="explainability-panel"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Twin Recommendation &amp; Explainability
          </span>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">Combined Model Confidence:</span>
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono font-bold border ${confBg} ${confColor}`}
            data-testid="combined-confidence-badge"
          >
            {confPct}% ({confTier})
          </span>
        </div>
      </div>

      {/* Rationale Bullets */}
      <div>
        <div className="text-[11px] font-mono uppercase text-slate-400 mb-2">
          Physical &amp; Reservoir Rationales
        </div>
        <ul className="space-y-1.5" data-testid="reasons-list">
          {reasons.map((reason, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-xs font-mono text-slate-300 bg-[#131b2e] p-2 rounded border border-slate-800"
            >
              <span className="text-amber-500 font-bold">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Expected Effects Grid */}
      {expectedEffect && (
        <div>
          <div className="text-[11px] font-mono uppercase text-slate-400 mb-2">
            Expected Subsystem Effects (Coupled Model)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#131b2e] border border-slate-800">
              <div className="text-[10px] text-slate-400">Oil Production</div>
              <div
                className={`text-sm font-bold ${
                  (expectedEffect.production_delta_pct ?? 0) >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {(expectedEffect.production_delta_pct ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.production_delta_pct ?? 0}%
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#131b2e] border border-slate-800">
              <div className="text-[10px] text-slate-400">Steam-Oil Ratio</div>
              <div
                className={`text-sm font-bold ${
                  (expectedEffect.sor_delta_pct ?? 0) <= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {(expectedEffect.sor_delta_pct ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.sor_delta_pct ?? 0}%
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#131b2e] border border-slate-800">
              <div className="text-[10px] text-slate-400">Rod-Float Risk</div>
              <div
                className={`text-sm font-bold ${
                  (expectedEffect.rod_float_risk_delta ?? 0) <= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {(expectedEffect.rod_float_risk_delta ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.rod_float_risk_delta ?? 0} pts
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#131b2e] border border-slate-800">
              <div className="text-[10px] text-slate-400">Energy Intensity</div>
              <div
                className={`text-sm font-bold ${
                  (expectedEffect.energy_delta_pct ?? 0) <= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {(expectedEffect.energy_delta_pct ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.energy_delta_pct ?? 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operator Action Bar */}
      <div className="border-t border-[#1e293b] pt-3 flex flex-col gap-3">
        {isNotesOpen && (
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">
              Engineering Remarks / Operational Notes:
            </label>
            <input
              type="text"
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g. Approved with reduced soak time per field engineer observation"
              className="w-full bg-[#080c14] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDecision("approved")}
              disabled={approvalMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs font-mono transition shadow"
              data-testid="btn-approve"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={() => handleDecision("rejected")}
              disabled={approvalMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900 font-semibold text-xs font-mono transition"
              data-testid="btn-reject"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
            <button
              onClick={() => {
                setIsNotesOpen(true);
                if (isNotesOpen && operatorNotes.trim()) {
                  handleDecision("modified");
                }
              }}
              disabled={approvalMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 hover:bg-amber-900 font-semibold text-xs font-mono transition"
              data-testid="btn-modify"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isNotesOpen ? "Save Modification" : "Modify..."}
            </button>
          </div>

          {/* Explicit Safety Disclosure */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 italic bg-[#080c14] px-3 py-1 rounded border border-[#1e293b]">
            <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              This logs a decision. No equipment or live system is controlled by this action.
            </span>
          </div>
        </div>

        {lastActionStatus && (
          <div className="p-2 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-mono">
            {lastActionStatus}
          </div>
        )}
      </div>
    </div>
  );
}
