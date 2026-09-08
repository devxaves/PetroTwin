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
      className="p-6 rounded-xl bg-white border border-slate-200/80 flex flex-col gap-4 shadow-xs"
      data-testid="explainability-panel"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
            Twin Recommendation &amp; Explainability
          </span>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 font-medium">Combined Model Confidence:</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-bold border ${confBg} ${confColor}`}
            data-testid="combined-confidence-badge"
          >
            {confPct}% ({confTier})
          </span>
        </div>
      </div>

      {/* Rationale Bullets */}
      <div>
        <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold mb-2">
          Physical &amp; Reservoir Rationales
        </div>
        <ul className="space-y-1.5" data-testid="reasons-list">
          {reasons.map((reason, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs font-mono text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80"
            >
              <span className="text-orange-500 font-bold">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Expected Effects Grid */}
      {expectedEffect && (
        <div>
          <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold mb-2">
            Expected Subsystem Effects (Coupled Model)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] text-slate-500 font-medium">Oil Production</div>
              <div
                className={`text-base font-extrabold ${
                  (expectedEffect.production_delta_pct ?? 0) >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {(expectedEffect.production_delta_pct ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.production_delta_pct ?? 0}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] text-slate-500 font-medium">Steam-Oil Ratio</div>
              <div
                className={`text-base font-extrabold ${
                  (expectedEffect.sor_delta_pct ?? 0) <= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {(expectedEffect.sor_delta_pct ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.sor_delta_pct ?? 0}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] text-slate-500 font-medium">Rod-Float Risk</div>
              <div
                className={`text-base font-extrabold ${
                  (expectedEffect.rod_float_risk_delta ?? 0) <= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {(expectedEffect.rod_float_risk_delta ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.rod_float_risk_delta ?? 0} pts
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] text-slate-500 font-medium">Energy Intensity</div>
              <div
                className={`text-base font-extrabold ${
                  (expectedEffect.energy_delta_pct ?? 0) <= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
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
      <div className="border-t border-slate-100 pt-3.5 flex flex-col gap-3">
        {isNotesOpen && (
          <div>
            <label className="text-[11px] font-mono text-slate-500 font-medium block mb-1">
              Engineering Remarks / Operational Notes:
            </label>
            <input
              type="text"
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g. Approved with reduced soak time per field engineer observation"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleDecision("approved")}
              disabled={approvalMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono transition shadow-xs cursor-pointer"
              data-testid="btn-approve"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={() => handleDecision("rejected")}
              disabled={approvalMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold text-xs font-mono transition cursor-pointer"
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 font-semibold text-xs font-mono transition cursor-pointer"
              data-testid="btn-modify"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isNotesOpen ? "Save Modification" : "Modify..."}
            </button>
          </div>

          {/* Explicit Safety Disclosure */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              This logs a decision. No physical equipment is actuated.
            </span>
          </div>
        </div>

        {lastActionStatus && (
          <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-xs font-mono font-medium">
            {lastActionStatus}
          </div>
        )}
      </div>
    </div>
  );
}

