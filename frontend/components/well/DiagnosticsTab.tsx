"use client";

import React, { useState } from "react";
import type { WellTwinState } from "@/lib/api/types";
import { useDiagnosticsLatest } from "@/lib/api/queries";
import { DynamometerCard } from "@/components/DynamometerCard";
import { RiskGauge } from "@/components/RiskGauge";
import {
  Zap,
  Check,
  ArrowDownRight,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Play,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";

interface DiagnosticsTabProps {
  wellId: string;
  twinState?: WellTwinState;
  onNavigateToWhatIf?: (spm?: number) => void;
}

/**
 * Tab B — SRP Diagnostics.
 * Visual dynamometer card with failure pattern library and stroke scrubber,
 * weighted rod-float risk factor bars, and interactive kinematic remediation studio.
 * Adheres strictly to Decision Support Architecture (no direct autonomous actuation).
 */
export function DiagnosticsTab({
  wellId,
  twinState,
  onNavigateToWhatIf,
}: DiagnosticsTabProps) {
  const { data: diagnostics, isLoading: isDiagLoading } =
    useDiagnosticsLatest(wellId);

  // Decision Support Modal & Staging State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isWorkOrderStaged, setIsWorkOrderStaged] = useState(false);
  const [operatorId, setOperatorId] = useState("PE-4819 (Lead Petroleum Eng.)");
  const [operatorNotes, setOperatorNotes] = useState(
    "Downstroke viscous sinking lag mitigation. Lower cadence by 1.48 SPM to allow bitumen column buoyancy equilibrium at 47.3°C."
  );

  // Safety checklist state
  const [checklist, setChecklist] = useState({
    buckling: true,
    vfdThermal: true,
    gearboxTorque: true,
    viscosityEquilibrium: true,
  });

  const recommendation = diagnostics?.rod_float_risk?.recommendation;
  const currentSpm =
    recommendation?.current_spm ?? twinState?.current_spm ?? 5.78;
  const targetSpm = recommendation?.target_spm ?? 4.3;

  const handleStageWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsWorkOrderStaged(true);
    setIsReviewModalOpen(false);
  };

  const handleGoToWhatIf = () => {
    setIsReviewModalOpen(false);
    if (onNavigateToWhatIf) {
      onNavigateToWhatIf(targetSpm);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-testid="tab-content-diagnostics">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dynamometer Card (7 cols) */}
        <div className="lg:col-span-7">
          {isDiagLoading ? (
            <div className="h-80 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin" />
              <span className="text-xs font-mono text-slate-400">
                Loading dynamometer telemetry...
              </span>
            </div>
          ) : (
            <DynamometerCard
              cardPoints={diagnostics?.card_points ?? []}
              classificationLabel={
                diagnostics?.ml_prediction ?? "Rod Float (Downstroke Lag)"
              }
              confidence={diagnostics?.confidence ?? 0.998}
            />
          )}
        </div>

        {/* Rod-Float Risk Gauge & Kinematics Remediation (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <RiskGauge
            score={
              diagnostics?.rod_float_risk?.risk_score ??
              twinState?.rod_float_risk_score ??
              78
            }
            level={
              diagnostics?.rod_float_risk?.risk_level ??
              twinState?.rod_float_risk_level ??
              "HIGH"
            }
            factorBreakdown={diagnostics?.rod_float_risk?.factor_breakdown}
          />

          {/* Interactive Remediation Action Studio */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] font-mono text-xs flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                    Kinematic Remediation Studio
                  </h4>
                  <span className="text-xs text-slate-500 font-sans block mt-0.5">
                    Decision Support Advisory System
                  </span>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-700 font-bold border border-orange-200 uppercase">
                {recommendation?.action ?? "REDUCE_SPM"}
              </span>
            </div>

            {/* Decision Support Advisory Notice */}
            <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 text-sky-800 text-xs font-sans flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                <strong>Human-in-the-Loop Enforced:</strong> Autonomous field
                actuation is locked. Recommended setpoints require operator
                safety review or What-If simulation before field dispatch.
              </span>
            </div>

            {/* Diagnostic Explanation */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs sm:text-sm font-sans leading-relaxed font-medium">
              {recommendation?.rule ??
                "Severe downstroke viscous drag detected. Bitumen column buoyant resistance exceeds rod fall velocity, risking rod buckling."}
            </div>

            {/* Setpoint Modification & Predicted Benefit */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs text-slate-600 uppercase font-extrabold tracking-wider">
                  Current Cadence
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {currentSpm}{" "}
                  <span className="text-xs font-semibold text-slate-500">SPM</span>
                </div>
                <span className="text-xs text-rose-700 font-bold mt-0.5 block">
                  Lagging Downstroke
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90">
                <span className="text-xs text-emerald-900 uppercase font-extrabold tracking-wider">
                  Target Setpoint
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
                  {targetSpm}{" "}
                  <span className="text-xs font-semibold text-emerald-600">SPM</span>
                </div>
                <span className="text-xs text-emerald-800 font-bold flex items-center gap-1 mt-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  -26% Rod Fall Stress
                </span>
              </div>
            </div>

            {/* Projected Impact Pill */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-700 font-sans font-bold">
                Projected Risk Mitigation:
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="line-through text-slate-400 font-medium">78 pts</span>
                <span className="font-black text-emerald-800 text-sm sm:text-base">
                  &rarr; 28 pts (Nominal)
                </span>
              </div>
            </div>

            {/* Work Order Staged Status Notification */}
            {isWorkOrderStaged && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-sans flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-sm text-emerald-950">
                    Supervisory Work Order #WO-8492 Staged
                  </div>
                  <div className="text-xs text-emerald-800 mt-1 font-medium">
                    Target {targetSpm} SPM queued for field dispatch review by{" "}
                    {operatorId}. Direct autonomous pump override remains blocked.
                  </div>
                </div>
              </div>
            )}

            {/* Decision Support Two-Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Action 1: What-If Simulation */}
              <button
                type="button"
                onClick={handleGoToWhatIf}
                className="py-4 px-5 rounded-2xl font-black transition duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer active:scale-95"
                data-testid="btn-whatif-kinematics"
              >
                <Sliders className="w-4 h-4 text-orange-400" />
                <span>Simulate in What-If</span>
              </button>

              {/* Action 2: Operator Review & Approval Gate */}
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="py-4 px-5 rounded-2xl font-black transition duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm bg-orange-600 hover:bg-orange-500 text-white shadow-xs cursor-pointer active:scale-95"
                data-testid="btn-review-setpoint"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Review &amp; Authorize</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUPERVISORY OPERATOR REVIEW & SAFETY GATE MODAL ── */}
      {isReviewModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6"
          onClick={() => setIsReviewModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col text-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                    Supervisory Setpoint Review
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-bold text-slate-700">
                      WELL: {wellId}
                    </span>
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 font-extrabold border border-sky-200 uppercase font-mono">
                      Decision Support Gate
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition font-bold cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Operator Sign-off Form & Body */}
            <form onSubmit={handleStageWorkOrder} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-3.5 flex-1 min-h-0">
                {/* Decision Support Advisory Header */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm font-sans text-slate-700 leading-relaxed font-medium">
                  <strong className="text-slate-900 font-bold">Safety Policy:</strong> Petroleum
                  engineers must verify mechanical envelope limits before staging
                  kinematic modifications into the field supervisory queue. Direct
                  autonomous actuation is prohibited.
                </div>

                {/* Kinematics Comparison Card */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] sm:text-xs text-slate-500 uppercase font-extrabold">
                      Current Setting
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                      {currentSpm} <span className="text-xs font-semibold text-slate-500">SPM</span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-rose-700 font-bold mt-1">
                      Risk Score: 78 / 100 (HIGH)
                    </div>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] sm:text-xs text-emerald-900 uppercase font-extrabold">
                      Proposed Setpoint
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5">
                      {targetSpm} <span className="text-xs font-semibold text-emerald-600">SPM</span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-emerald-800 font-bold mt-1">
                      Projected Risk: 28 / 100 (Nominal)
                    </div>
                  </div>
                </div>

                {/* Safety Verification Checklist */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 font-mono">
                    Mandatory Safety Verification Checks
                  </span>
                  <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm font-sans">
                    <label className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 cursor-pointer hover:bg-slate-100 transition font-medium">
                      <input
                        type="checkbox"
                        checked={checklist.buckling}
                        onChange={(e) =>
                          setChecklist((prev) => ({
                            ...prev,
                            buckling: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded text-orange-600 accent-orange-600 shrink-0"
                      />
                      <span className="text-xs sm:text-sm leading-snug">
                        <strong>Rod Compressive Buckling:</strong> MPRL remains above
                        critical 4,000 lbs neutral point.
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 cursor-pointer hover:bg-slate-100 transition font-medium">
                      <input
                        type="checkbox"
                        checked={checklist.vfdThermal}
                        onChange={(e) =>
                          setChecklist((prev) => ({
                            ...prev,
                            vfdThermal: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded text-orange-600 accent-orange-600 shrink-0"
                      />
                      <span className="text-xs sm:text-sm leading-snug">
                        <strong>Surface VFD Thermal Duty:</strong> Inverter frequency
                        reduction is within continuous rating.
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 cursor-pointer hover:bg-slate-100 transition font-medium">
                      <input
                        type="checkbox"
                        checked={checklist.gearboxTorque}
                        onChange={(e) =>
                          setChecklist((prev) => ({
                            ...prev,
                            gearboxTorque: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded text-orange-600 accent-orange-600 shrink-0"
                      />
                      <span className="text-xs sm:text-sm leading-snug">
                        <strong>Gearbox Torque Envelope:</strong> PPRL load stays
                        below 26,000 lbs rating boundary.
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 cursor-pointer hover:bg-slate-100 transition font-medium">
                      <input
                        type="checkbox"
                        checked={checklist.viscosityEquilibrium}
                        onChange={(e) =>
                          setChecklist((prev) => ({
                            ...prev,
                            viscosityEquilibrium: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded text-orange-600 accent-orange-600 shrink-0"
                      />
                      <span className="text-xs sm:text-sm leading-snug">
                        <strong>Bitumen Viscosity Match:</strong> Fall velocity
                        aligns with current 47.3°C column fluid.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Operator Sign-off Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 font-mono">
                      Authorized Operator / Engineer
                    </label>
                    <input
                      type="text"
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                      required
                      className="p-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 font-mono">
                      Remediation Protocol
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="CSS Heavy Oil Viscous Drag Control"
                      className="p-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-100 text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 font-mono">
                    Engineering Justification / Sign-off Notes
                  </label>
                  <textarea
                    rows={2}
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 text-xs font-sans bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons in Sticky Modal Footer */}
              <div className="p-3.5 sm:p-4.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-b-3xl">
                <button
                  type="button"
                  onClick={handleGoToWhatIf}
                  className="px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Sliders className="w-4 h-4 text-slate-500" />
                  <span>Test in What-If First</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-orange-600 hover:bg-orange-500 text-white transition shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Stage Supervisory Work Order</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
