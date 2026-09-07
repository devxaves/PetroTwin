import { type ReactNode } from "react";

interface SystemPanelProps {
  /** Panel title — rendered in industrial uppercase label style */
  title: string;
  /** Optional subtitle or identifier code */
  code?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Bordered panel component reminiscent of SCADA/HMI instrument panels.
 * Thin borders, no drop shadows, top-edge light streak.
 */
export default function SystemPanel({
  title,
  code,
  children,
  className = "",
}: SystemPanelProps) {
  return (
    <div className={`hmi-panel ${className}`}>
      <div className="hmi-panel-header flex items-center justify-between">
        <span>{title}</span>
        {code && (
          <span
            className="text-[var(--color-border-bright)] text-[0.6rem] tracking-widest"
            style={{ fontFamily: "var(--font-data)" }}
          >
            {code}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
