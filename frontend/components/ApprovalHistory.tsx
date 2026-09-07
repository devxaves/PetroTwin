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
        className="p-4 rounded bg-[#0d1321] border border-[#1e293b] text-slate-500 font-mono text-xs"
        data-testid="approvals-empty"
      >
        No operator approvals recorded for this well yet.
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded bg-[#0d1321] border border-[#1e293b] flex flex-col gap-3"
      data-testid="approval-history-container"
    >
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Operator Audit History ({approvals.length})
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Immutable Audit Log (Non-Actuating)
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1" data-testid="approvals-list">
        {approvals.map((appr) => {
          const isApproved = appr.operator_decision === "approved";
          const isRejected = appr.operator_decision === "rejected";
          const badgeClass = isApproved
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            : isRejected
            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
            : "bg-amber-500/10 text-amber-400 border-amber-500/30";

          return (
            <div
              key={appr.id}
              className="p-2.5 rounded bg-[#131b2e] border border-slate-800 flex flex-col gap-1.5 font-mono text-xs"
              data-testid={`approval-item-${appr.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${badgeClass}`}
                    data-testid="decision-badge"
                  >
                    {appr.operator_decision}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(appr.decided_at).toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">ID #{appr.id}</span>
              </div>

              {appr.operator_notes && (
                <div className="text-slate-300 text-[11px] bg-[#080c14] p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500">Note:</span> {appr.operator_notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
