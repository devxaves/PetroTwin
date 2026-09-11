"use client";

import React from "react";

interface PetroTwinLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function PetroTwinLogo({
  size = 36,
  className = "",
  showText = false,
}: PetroTwinLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className="shrink-0"
        aria-label="PetroTwin Logo"
      >
        <defs>
          <linearGradient id="ptFlameGrad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="ptBeamGrad" x1="24" y1="12" x2="38" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        
        {/* Background Badge */}
        <rect width="48" height="48" rx="12" fill="#0f172a" />
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="11"
          stroke="#ea580c"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Left Thermal Plume Curve (CSS Subsystem) */}
        <path
          d="M18 10C18 10 11 18 11 25C11 31 15.5 36 21.5 36C24 36 26.3 35 28 33.3C25.5 32.1 24 29.7 24 27C24 23.5 26.8 21 28.5 18.5C26 14.5 18 10 18 10Z"
          fill="url(#ptFlameGrad)"
        />

        {/* Right Mechanical Walking Beam Chevron (SRP Subsystem) */}
        <path
          d="M28 11L37 21L31 24.5L38 35H32.5L27.5 28.5L30 23.5L24.5 17.5L28 11Z"
          fill="url(#ptBeamGrad)"
        />

        {/* Central Coupled Telemetry Node */}
        <circle cx="26" cy="27" r="2.2" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-black text-slate-900 tracking-tight text-base font-['Space_Grotesk']">
              Petro<span className="text-orange-600">Twin</span>
            </span>
          </div>
          <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-widest font-bold mt-0.5">
            Digital Twin E&amp;P
          </span>
        </div>
      )}
    </div>
  );
}
