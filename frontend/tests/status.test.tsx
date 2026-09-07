import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StatusPage from "@/app/status/page";

/* ── Mock the API module ──────────────────────────────────────── */
vi.mock("@/lib/api", () => ({
  fetchHealth: vi.fn(),
}));

import { fetchHealth } from "@/lib/api";
const mockFetchHealth = vi.mocked(fetchHealth);

describe("StatusPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    // Never resolve the fetch — stays in loading
    mockFetchHealth.mockReturnValue(new Promise(() => {}));
    render(<StatusPage />);

    expect(screen.getByTestId("overall-status-text")).toHaveTextContent(
      "Initializing..."
    );
  });

  it("shows success state when health returns ok", async () => {
    mockFetchHealth.mockResolvedValue({
      status: "ok",
      db: "connected",
      redis: "connected",
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByTestId("overall-status-text")).toHaveTextContent(
        "All Systems Operational"
      );
    });

    expect(screen.getByTestId("response-status")).toHaveTextContent("200 OK");
  });

  it("shows error state when fetch fails", async () => {
    mockFetchHealth.mockRejectedValue(new Error("Connection refused"));

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByTestId("overall-status-text")).toHaveTextContent(
        "Connection Failure"
      );
    });
  });

  it("shows degraded state when a service is down", async () => {
    mockFetchHealth.mockResolvedValue({
      status: "degraded",
      db: "connected",
      redis: "disconnected",
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByTestId("overall-status-text")).toHaveTextContent(
        "Partial Degradation"
      );
    });
  });

  it("renders the API endpoint display", async () => {
    mockFetchHealth.mockResolvedValue({
      status: "ok",
      db: "connected",
      redis: "connected",
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByTestId("api-endpoint")).toHaveTextContent(
        "GET /health"
      );
    });
  });
});
