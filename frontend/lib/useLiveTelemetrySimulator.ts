"use client";

import { useState, useEffect } from "react";
import type { WellTwinState } from "@/lib/api/types";

/**
 * Hook providing realistic real-time telemetry jitter for Digital Twin simulation.
 * Simulates micro-fluctuations in downhole sensor readings (temperature, viscosity, fillage, load).
 */
export function useLiveTelemetrySimulator(initialState?: WellTwinState, isLive = true) {
  const [liveState, setLiveState] = useState<WellTwinState | undefined>(initialState);
  const [prevInitialState, setPrevInitialState] = useState(initialState);
  const [pulseCount, setPulseCount] = useState(0);

  if (initialState !== prevInitialState) {
    setPrevInitialState(initialState);
    setLiveState(initialState);
  }

  useEffect(() => {
    if (!isLive || !initialState) return;

    // Jitter interval every 3 seconds
    const interval = setInterval(() => {
      setLiveState((prev) => {
        if (!prev) return prev;

        // Subtle realistic brownian jitter
        const tempDelta = (Math.random() - 0.5) * 0.4;
        const newTemp = Math.round((prev.current_temperature_c + tempDelta) * 10) / 10;
        
        // Viscosity inverse exponential relation with temp
        const newViscosity = Math.round(Math.exp(12 - newTemp * 0.05));

        // Pump fillage minor fluctuation
        const fillageDelta = (Math.random() - 0.5) * 0.008;
        const newFillage = Math.min(0.98, Math.max(0.65, prev.pump_fillage + fillageDelta));

        return {
          ...prev,
          current_temperature_c: newTemp,
          current_viscosity_cp: newViscosity,
          pump_fillage: Math.round(newFillage * 1000) / 1000,
        };
      });

      setPulseCount((c) => c + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive, initialState]);

  return { liveState: liveState ?? initialState, pulseCount };
}
