"use client";

import React from "react";
import type { ApprovalResponse } from "@/lib/api/types";
import { Clock, CheckCircle, XCircle, Edit3 } from "lucide-react";

interface ApprovalHistoryProps {
  approvals: ApprovalResponse[];
}

export function ApprovalHistory({ approvals }: ApprovalHistoryProps) {
  if (!approvals || approvals.length === 0) {
    return (
      <div
        className="p-4 rounded-xl bg-white border border-slate-200/80 text-slate-400 font-mono text-xs shadow-xs"
        data-testid="approvals-empty"
      >
        No operator approvals recorded for this well yet.
      </div>
    );
  }

  return (
    <div
      className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col gap-3.5"
      data-testid="approval-history-container"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 font-display">
            Operator Audit History ({approvals.length})
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          Immutable Audit Log
        </span>
      </div>

      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1" data-testid="approvals-list">
        {approvals.map((appr) => {
          const isApproved = appr.operator_decision === "approved";
          const isRejected = appr.operator_decision === "rejected";
          const badgeClass = isApproved
            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
            : isRejected
            ? "bg-rose-50 text-rose-700 border-rose-200/80"
            : "bg-amber-50 text-amber-700 border-amber-200/80";

          return (
            <div
              key={appr.id}
              className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex flex-col gap-1.5 font-mono text-xs hover:border-orange-200 transition"
              data-testid={`approval-item-${appr.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${badgeClass}`}
                    data-testid="decision-badge"
                  >
                    {appr.operator_decision}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(appr.decided_at).toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">ID #{appr.id}</span>
              </div>

              {appr.operator_notes && (
                <div className="text-slate-700 text-[11px] bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-400 font-medium">Note:</span> {appr.operator_notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
