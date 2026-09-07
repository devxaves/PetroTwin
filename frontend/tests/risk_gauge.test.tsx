import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { RiskGauge } from "@/components/RiskGauge";

describe("RiskGauge Component", () => {
  it("renders LOW risk score with green styling", () => {
    render(<RiskGauge score={18.4} />);

    expect(screen.getByTestId("risk-score-value")).toHaveTextContent("18");
    const badge = screen.getByTestId("risk-level-badge");
    expect(badge).toHaveTextContent("LOW RISK");
    expect(badge.className).toContain("text-emerald-400");
  });

  it("renders MODERATE risk score with amber styling", () => {
    render(<RiskGauge score={45.0} />);

    expect(screen.getByTestId("risk-score-value")).toHaveTextContent("45");
    const badge = screen.getByTestId("risk-level-badge");
    expect(badge).toHaveTextContent("MODERATE RISK");
    expect(badge.className).toContain("text-amber-400");
  });

  it("renders HIGH risk score with rose styling", () => {
    render(<RiskGauge score={72.6} />);

    expect(screen.getByTestId("risk-score-value")).toHaveTextContent("73");
    const badge = screen.getByTestId("risk-level-badge");
    expect(badge).toHaveTextContent("HIGH RISK");
    expect(badge.className).toContain("text-rose-400");
  });

  it("renders weighted factor contributions when provided", () => {
    const breakdown = {
      viscous_drag: {
        raw_value: 3200,
        normalized_factor: 0.8,
        weight: 0.35,
        weighted_contribution: 28.0,
      },
      pumping_speed: {
        raw_value: 9.5,
        normalized_factor: 0.65,
        weight: 0.25,
        weighted_contribution: 16.25,
      },
    };

    render(<RiskGauge score={44.25} factorBreakdown={breakdown} />);

    expect(screen.getByText("viscous drag")).toBeInTheDocument();
    expect(screen.getByText("+28 pts")).toBeInTheDocument();
    expect(screen.getByText("pumping speed")).toBeInTheDocument();
    expect(screen.getByText("+16 pts")).toBeInTheDocument();
  });
});
