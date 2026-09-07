interface StatusIndicatorProps {
  /** Current state of the indicator */
  state: "ok" | "error" | "warn" | "idle" | "loading";
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { led: "w-2 h-2", text: "text-xs" },
  md: { led: "w-2.5 h-2.5", text: "text-sm" },
  lg: { led: "w-3 h-3", text: "text-base" },
} as const;

const stateConfig = {
  ok: { ledClass: "led-ok", label: "ONLINE", labelColor: "text-[var(--color-status-ok)]" },
  error: { ledClass: "led-error", label: "OFFLINE", labelColor: "text-[var(--color-status-error)]" },
  warn: { ledClass: "led-warn", label: "DEGRADED", labelColor: "text-[var(--color-status-warn)]" },
  idle: { ledClass: "led-idle", label: "STANDBY", labelColor: "text-[var(--color-status-idle)]" },
  loading: { ledClass: "", label: "POLLING", labelColor: "text-[var(--color-accent)]" },
} as const;

/**
 * LED-style status indicator that mimics real industrial panel lights.
 * Breathes/pulses based on state — not a static dot.
 */
export default function StatusIndicator({
  state,
  size = "md",
}: StatusIndicatorProps) {
  const { led, text } = sizeMap[size];
  const config = stateConfig[state];

  return (
    <div className="flex items-center gap-2">
      {state === "loading" ? (
        <div className="hmi-spinner" data-testid="status-spinner" />
      ) : (
        <div
          className={`led ${led} ${config.ledClass}`}
          data-testid={`led-${state}`}
        />
      )}
      <span
        className={`font-[var(--font-data)] font-semibold tracking-wider ${text} ${config.labelColor}`}
        style={{ fontFamily: "var(--font-data)" }}
        data-testid="status-label"
      >
        {config.label}
      </span>
    </div>
  );
}
