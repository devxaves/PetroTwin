interface DataReadoutProps {
  /** Label above the value */
  label: string;
  /** The data value to display */
  value: string;
  /** Optional color override for the value */
  valueColor?: string;
}

/**
 * Monospace data display component for presenting system values.
 * Mimics the readout panels on industrial instrumentation.
 */
export default function DataReadout({
  label,
  value,
  valueColor,
}: DataReadoutProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="data-label">{label}</span>
      <span
        className="data-readout text-lg"
        style={{
          fontFamily: "var(--font-data)",
          color: valueColor ?? "var(--color-foreground)",
        }}
        data-testid={`readout-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {value}
      </span>
    </div>
  );
}
