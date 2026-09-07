"use client";

import React, { useState } from "react";
import * as Sentry from "@sentry/nextjs";

export function SentryTestTrigger() {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    throw new Error("Deliberate frontend test error for Sentry verification");
  }

  const handleTrigger = () => {
    try {
      throw new Error("Deliberate client error logged to Sentry");
    } catch (err) {
      Sentry.captureException(err);
      setHasError(true);
    }
  };

  return (
    <button
      onClick={handleTrigger}
      className="hidden text-[10px] text-slate-600"
      data-testid="sentry-trigger-btn"
    >
      Trigger Test Sentry Error
    </button>
  );
}
