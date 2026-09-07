import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { DynamometerCard } from "@/components/DynamometerCard";

describe("DynamometerCard Component", () => {
  const mockPoints = [
    { position: 0, load: 12000 },
    { position: 30, load: 18500 },
    { position: 80, load: 19200 },
    { position: 120, load: 18000 },
    { position: 90, load: 8500 },
    { position: 40, load: 7800 },
    { position: 0, load: 12000 },
  ];

  it("renders with correct points and classification label", () => {
    render(
      <DynamometerCard
        cardPoints={mockPoints}
        classificationLabel="Normal Operating"
        confidence={0.965}
      />
    );

    // Verify label rendered
    expect(screen.getByTestId("dyna-classification-badge")).toHaveTextContent("Normal Operating");

    // Verify confidence badge
    expect(screen.getByTestId("dyna-confidence-badge")).toHaveTextContent("96.5% ML Conf");

    // Verify SVG polyline element rendered with all 7 points
    const polyline = screen.getByTestId("dyna-polyline");
    expect(polyline).toBeInTheDocument();
    const pointsAttr = polyline.getAttribute("points");
    expect(pointsAttr?.trim().split(" ").length).toBe(7);

    // Verify unit labels
    expect(screen.getByText("Polished Rod Position (inches)")).toBeInTheDocument();
    expect(screen.getByText("Polished Rod Load (lbs)")).toBeInTheDocument();
  });

  it("renders empty state when no points provided", () => {
    render(
      <DynamometerCard
        cardPoints={[]}
        classificationLabel="No Data"
      />
    );
    expect(screen.getByTestId("dyna-card-empty")).toHaveTextContent("No dynamometer card points available");
  });
});
