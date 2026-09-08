/**
 * ThermoTwin API Type Definitions.
 * Strictly aligned with Backend FastAPI / Pydantic schemas.
 */

export interface ProductionSnapshot {
  timestamp: string;
  oil_rate_bopd: number;
  water_rate_bwpd: number;
  gas_rate: number;
  water_cut: number;
  tubing_pressure: number;
  casing_pressure: number;
  fluid_level_m: number;
  temperature_c: number;
}

export interface WellSummary {
  well_id: string;
  name: string;
  latitude: number;
  longitude: number;
  depth_m: number;
  reservoir_name: string;
  completion_type: string;
  pump_type: string;
  commission_date: string;
  latest_production: ProductionSnapshot | null;
}

export interface ProductionRecord {
  well_id: string;
  timestamp: string;
  oil_rate_bopd: number;
  water_rate_bwpd: number;
  gas_rate: number;
  water_cut: number;
  tubing_pressure: number;
  casing_pressure: number;
  fluid_level_m: number;
  temperature_c: number;
}

export interface CSSCycleRecord {
  id: number;
  well_id: string;
  cycle_id: number;
  injection_start: string;
  injection_end: string;
  steam_volume_t: number;
  steam_rate: number;
  steam_pressure: number;
  steam_temperature_c: number;
  steam_quality: number;
  soak_start: string;
  soak_end: string;
  production_start: string;
  production_end: string;
}

export interface CardPoint {
  position: number;
  load: number;
}

export interface FactorDetail {
  raw_value: number;
  normalized_factor: number;
  weight: number;
  weighted_contribution: number;
}

export interface AdjustmentRecommendation {
  action: string;
  rule: string;
  current_spm: number;
  target_spm: number;
  spm_reduction_pct: number;
  warning: string | null;
}

export interface RodFloatRiskResponse {
  risk_score: number;
  risk_level: "LOW" | "MODERATE" | "HIGH";
  factor_breakdown: Record<string, FactorDetail>;
  recommendation: AdjustmentRecommendation;
}

export interface DiagnosticReport {
  well_id: string;
  card_id: number | null;
  timestamp: string | null;
  ground_truth_label: string | null;
  ml_prediction: string;
  baseline_prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
  rod_float_risk: RodFloatRiskResponse;
  features: Record<string, number>;
  card_points: CardPoint[];
}

export interface WellTwinState {
  well_id: string;
  timestamp: string;
  current_temperature_c: number;
  current_viscosity_cp: number;
  css_cycle_phase: "injection" | "soak" | "production" | "idle";
  cycle_number: number;
  pump_fillage: number;
  rod_float_risk_score: number;
  rod_float_risk_level: "LOW" | "MODERATE" | "HIGH";
  dynamometer_classification: string;
  dynamometer_confidence: number;
  current_spm: number;
  stroke_length_in: number;
  predicted_production_trajectory: {
    days: number[];
    oil_rate_bopd: number[];
    cumulative_oil_bbl: number[];
  };
}

export interface JointRecommendationResponse {
  well_id: string;
  current_state: Record<string, any>;
  predicted_trajectory: Record<string, any>;
  recommendation: {
    css: {
      steam_volume_t: number;
      steam_pressure_mpa: number;
      soak_days: number;
      cutoff_days?: number;
      predicted_oil_bbl?: number;
      sor?: number;
      economic_value?: number;
      confidence?: number;
    };
    srp: {
      action: string;
      rule: string;
      current_spm: number;
      target_spm: number;
      spm_reduction_pct: number;
      warning?: string | null;
    };
    combined_confidence: number;
  };
  reasons: string[];
  expected_effect: {
    production_delta_pct: number;
    sor_delta_pct: number;
    rod_float_risk_delta: number;
    energy_delta_pct: number;
  };
  requires_operator_approval: boolean;
}

export interface CSSScreeningResponse {
  well_id: string;
  status: "RECOMMENDED" | "DEFERRED" | "NOT_RECOMMENDED";
  reasons: string[];
  current_water_cut: number;
  cycles_completed: number;
  mechanical_risk: {
    score: number;
    level: string;
  };
  recommendation: string;
}

export interface CSSRecommendResponse {
  well_id: string;
  cycle_number: number;
  recommended_scenario: {
    steam_volume_t: number;
    steam_pressure_mpa: number;
    soak_days: number;
    cutoff_days: number;
    expected_oil_bbl: number;
    expected_sor: number;
    expected_economic_value: number;
    energy_cost_per_bbl: number;
  };
  historical_average: {
    cycles_count: number;
    avg_cum_oil_bbl: number;
    avg_sor: number;
    avg_economic_value: number;
  };
  expected_delta: {
    oil_delta_bbl: number;
    economic_delta_usd: number;
    sor_delta: number;
  };
  constraints_checked: {
    envelope_compliant: boolean;
    violations: string[];
  };
}

export interface CSSScenarioRequest {
  cycle_number: number;
  steam_volume_t: number;
  steam_pressure_mpa: number;
  soak_days: number;
  custom_cutoff_days?: number | null;
  oil_price?: number | null;
}

export interface CSSScenarioResponse {
  status: string;
  well_id: string;
  cycle_number: number;
  evaluation: {
    steam_volume_t: number;
    steam_pressure_mpa: number;
    soak_days: number;
    cutoff_days: number;
    expected_oil_bbl: number;
    expected_sor: number;
    expected_economic_value: number;
    energy_cost_per_bbl: number;
    steam_cost?: number;
    energy_cost?: number;
    water_handling_cost?: number;
    mechanical_risk_cost?: number;
    daily_rates?: number[];
  };

  historical_average: {
    avg_cum_oil_bbl: number;
    avg_sor: number;
    avg_economic_value: number;
  };
  comparison_to_baseline: {
    oil_delta_bbl: number;
    economic_delta_usd: number;
    sor_delta: number;
  };
}

export interface WhatIfRequest {
  steam_volume?: number;
  injection_pressure?: number;
  soak_time?: number;
  cutoff_days?: number;
  spm?: number;
  stroke_length?: number;
  oil_price?: number;
}

export interface ComparisonMetric {
  current: number;
  proposed: number;
  delta: number;
  delta_pct?: number | null;
}

export interface WhatIfResponse {
  well_id: string;
  scenario_inputs: {
    steam_volume_t: number;
    steam_pressure_mpa: number;
    soak_days: number;
    production_cutoff_days: number;
    spm: number;
    stroke_length_in: number;
  };
  comparison: {
    cumulative_oil_bbl: ComparisonMetric;
    sor: ComparisonMetric;
    energy_intensity_usd_per_bbl: ComparisonMetric;
    rod_float_risk_score: ComparisonMetric;
    net_economic_value_usd: ComparisonMetric;
    pump_volumetric_efficiency: ComparisonMetric;
  };
  current_state_summary: Record<string, any>;
  proposed_state_summary: Record<string, any>;
  envelope_validation: {
    is_valid: boolean;
    violations: string[];
  };
}

export interface ParetoPoint {
  point_id: number;
  steam_volume_t: number;
  steam_pressure_mpa: number;
  soak_days: number;
  production_cutoff_days: number;
  cumulative_oil_bbl: number;
  sor: number;
  economic_value: number;
  energy_cost_per_bbl: number;
  rod_float_risk_score: number;
  objective_weight_oil: number;
}

export interface ParetoResponse {
  well_id: string;
  points_count: number;
  pareto_front: ParetoPoint[];
  optimization_axes: {
    x_axis: string;
    y_axis: string;
  };
}

export interface ApprovalCreateRequest {
  recommendation_snapshot: Record<string, any>;
  operator_decision: "approved" | "rejected" | "modified";
  operator_notes?: string | null;
}

export interface ApprovalResponse {
  id: number;
  well_id: string;
  recommendation_snapshot: Record<string, any>;
  operator_decision: "approved" | "rejected" | "modified";
  operator_notes: string | null;
  decided_at: string;
  outcome_recorded_at: string | null;
}
