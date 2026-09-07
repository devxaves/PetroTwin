import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ComparisonTable } from "@/components/ComparisonTable";

describe("ComparisonTable Component", () => {
  const mockComparison = {
    cumulative_oil_bbl: {
      current: 2400.0,
      proposed: 2750.0,
      delta: 350.0,
      delta_pct: 14.6,
    },
    sor: {
      current: 2.8,
      proposed: 2.4,
      delta: -0.4,
      delta_pct: -14.3,
    },
    rod_float_risk_score: {
      current: 38.0,
      proposed: 48.5,
      delta: 10.5,
      delta_pct: 27.6,
    },
  };

  it("renders correct delta arrows and improving/worsening tags", () => {
    render(<ComparisonTable comparison={mockComparison} />);

    // Check Cumulative Oil (higher is better, +350 is improving)
    const oilRow = screen.getByTestId("row-cumulative_oil_bbl");
    expect(oilRow).toHaveTextContent("+350");
    const oilBadge = screen.getByTestId("badge-cumulative_oil_bbl");
    expect(oilBadge).toHaveTextContent("IMPROVING");

    // Check SOR (lower is better, -0.4 is improving)
    const sorRow = screen.getByTestId("row-sor");
    expect(sorRow).toHaveTextContent("-0.4");
    const sorBadge = screen.getByTestId("badge-sor");
    expect(sorBadge).toHaveTextContent("IMPROVING");

    // Check Rod Float Risk (lower is better, +10.5 is worsening)
    const riskRow = screen.getByTestId("row-rod_float_risk_score");
    expect(riskRow).toHaveTextContent("+10.5");
    const riskBadge = screen.getByTestId("badge-rod_float_risk_score");
    expect(riskBadge).toHaveTextContent("WORSENING");
  });
});
