/**
 * Barrel export for all well twin components.
 * Also exports shared domain constants used across multiple tab components.
 */

export { WellTwinHeader } from "./WellTwinHeader";
export { WellTwinTabs } from "./WellTwinTabs";
export { OverviewTab } from "./OverviewTab";
export { DiagnosticsTab } from "./DiagnosticsTab";
export { CSSOptimizerTab } from "./CSSOptimizerTab";
export { WhatIfTab } from "./WhatIfTab";
export { WellSchematicTwin } from "./WellSchematicTwin";

export type { WellTab } from "./WellTwinTabs";

/**
 * Safe Operating Envelope bounds — CSS + SRP parameter limits.
 * Shared across CSSOptimizerTab and WhatIfTab to ensure consistency.
 * These represent physical/geomechanical safety constraints.
 */
export const SAFE_OPERATING_ENVELOPE = {
  steam_volume_min: 1200,
  steam_volume_max: 3800,
  steam_pressure_min: 8.0,
  steam_pressure_max: 13.5,
  soak_days_min: 2,
  soak_days_max: 7,
  cutoff_min: 40,
  cutoff_max: 150,
  spm_min: 2.0,
  spm_max: 12.0,
  stroke_min: 60,
  stroke_max: 192,
} as const;

