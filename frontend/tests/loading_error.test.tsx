import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import FieldOverviewPage from "@/app/page";
import * as queries from "@/lib/api/queries";

// Mock queries
vi.mock("@/lib/api/queries", () => ({
  useWells: vi.fn(),
}));

describe("Loading and Error States", () => {
  it("renders loading spinner when queries are pending", () => {
    vi.mocked(queries.useWells).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(<FieldOverviewPage />);

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.getByText(/Querying field telemetry/i)).toBeInTheDocument();
  });

  it("renders error banner when query encounters an exception", () => {
    vi.mocked(queries.useWells).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network timeout connecting to backend FastAPI service"),
    } as any);

    render(<FieldOverviewPage />);

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText("Network timeout connecting to backend FastAPI service")).toBeInTheDocument();
  });
});
