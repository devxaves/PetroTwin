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
  const [isActionSuccess, setIsActionSuccess] = useState<boolean>(true);

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
      const res = await approvalMutation.mutateAsync({
        recommendation_snapshot: recommendationSnapshot,
        operator_decision: decision,
        operator_notes: operatorNotes.trim() || undefined,
      });
      setIsActionSuccess(true);
      setLastActionStatus(
        `Decision "${decision.toUpperCase()}" recorded in audit log (Record #${res.id}). Field equipment unaffected.`
      );
      setOperatorNotes("");
      setIsNotesOpen(false);
      if (onDecisionLogged) onDecisionLogged(decision);
    } catch (err: any) {
      setIsActionSuccess(false);
      setLastActionStatus(`Action failed: ${err.message}`);
    }
  };


  return (
    <div
      className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-5"
      data-testid="explainability-panel"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
              Twin Recommendation &amp; Explainability
            </h3>
            <span className="text-xs text-slate-500 font-sans block mt-0.5">
              Coupled reservoir physics &amp; thermal enthalpy rationale
            </span>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 font-medium">Combined Model Confidence:</span>
          <span
            className={`text-xs sm:text-sm px-3 py-1 rounded-full font-mono font-bold border ${confBg} ${confColor}`}
            data-testid="combined-confidence-badge"
          >
            {confPct}% ({confTier})
          </span>
        </div>
      </div>

      {/* Rationale Bullets */}
      <div className="flex flex-col gap-2.5">
        <div className="text-xs font-mono uppercase text-slate-500 font-bold tracking-wider">
          Physical &amp; Reservoir Rationales
        </div>
        <ul className="space-y-2" data-testid="reasons-list">
          {reasons.map((reason, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 text-xs sm:text-sm font-sans text-slate-700 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed"
            >
              <span className="text-orange-500 font-bold mt-0.5">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Expected Effects Grid */}
      {expectedEffect && (
        <div className="flex flex-col gap-2.5">
          <div className="text-xs font-mono uppercase text-slate-500 font-bold tracking-wider">
            Expected Subsystem Effects (Coupled Model)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm font-mono">
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Oil Production</div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-1 ${
                  (expectedEffect.production_delta_pct ?? 0) >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {(expectedEffect.production_delta_pct ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.production_delta_pct ?? 0}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Steam-Oil Ratio</div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-1 ${
                  (expectedEffect.sor_delta_pct ?? 0) <= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {(expectedEffect.sor_delta_pct ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.sor_delta_pct ?? 0}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Rod-Float Risk</div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-1 ${
                  (expectedEffect.rod_float_risk_delta ?? 0) <= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {(expectedEffect.rod_float_risk_delta ?? 0) >= 0 ? "+" : ""}
                {expectedEffect.rod_float_risk_delta ?? 0} pts
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Energy Intensity</div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-1 ${
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
      <div className="border-t border-slate-100 pt-4 flex flex-col gap-3.5">
        {isNotesOpen && (
          <div>
            <label className="text-xs font-mono text-slate-600 font-bold block mb-1.5">
              Engineering Remarks / Operational Notes:
            </label>
            <input
              type="text"
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g. Approved with reduced soak time per field engineer observation"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 font-mono focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDecision("approved")}
              disabled={approvalMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm font-mono transition shadow-xs cursor-pointer"
              data-testid="btn-approve"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => handleDecision("rejected")}
              disabled={approvalMutation.isPending}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs sm:text-sm font-mono transition cursor-pointer"
              data-testid="btn-reject"
            >
              <XCircle className="w-4 h-4" />
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
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 font-bold text-xs sm:text-sm font-mono transition cursor-pointer"
              data-testid="btn-modify"
            >
              <Edit3 className="w-4 h-4" />
              {isNotesOpen ? "Save Modification" : "Modify..."}
            </button>
          </div>

          {/* Explicit Safety Disclosure */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              This logs a decision. No physical equipment is actuated.
            </span>
          </div>
        </div>

        {lastActionStatus && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm font-mono font-medium flex items-center justify-between gap-3 transition-all ${
              isActionSuccess
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-rose-50 border-rose-300 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isActionSuccess ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{lastActionStatus}</span>
            </div>
            <button
              onClick={() => setLastActionStatus(null)}
              className="text-xs px-2 py-1 rounded-md hover:bg-black/5 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

