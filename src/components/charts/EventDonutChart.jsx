import React, { useState } from 'react';

/**
 * High-Contrast Cyber Sentinel Donut / Pie Chart
 * Features distinctly separated, vibrant colors across diverse hue angles,
 * large legible typography, and zero distracting hover clutter inside the circle.
 */
export default function EventDonutChart({
  title = 'Registrations by Event',
  subtitle = '',
  totalCount = 0,
  totalLabel = 'Total',
  segments = [],
  rightElement = null,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Enlarged dimensions for prominence and readability
  const radius = 88;
  const strokeWidth = 26;
  const center = 120;
  const circumference = 2 * Math.PI * radius;

  // Ultra-distinct high-contrast color palette (zero adjacent or similar hues)
  const defaultDistinctColors = [
    '#00f0ff', // 0: Electric Cyan (~185°)
    '#f59e0b', // 1: Neon Amber / Gold (~38°)
    '#a855f7', // 2: Vivid Violet / Purple (~270°)
    '#10b981', // 3: Emerald Mint Green (~155°)
    '#ec4899', // 4: Hot Magenta / Pink (~330°)
    '#3b82f6', // 5: Royal Cobalt Blue (~215°)
    '#ff5722', // 6: Deep Coral Flame (~14°)
    '#84cc16', // 7: Electric Lime (~84°)
  ];

  const activeSegments = Array.isArray(segments) ? segments : [];

  // Compute strokeDasharray and strokeDashoffset for each segment
  const numActiveSlices = activeSegments.filter((s) => (s.percentage || 0) > 0).length;
  const sliceGap = numActiveSlices > 1 ? 4 : 0; // pixel gap on arc circumference

  let accumulatedPercent = 0;
  const renderedSegments = activeSegments.map((seg, idx) => {
    const pct = Math.max(0, Math.min(100, seg.percentage || 0));
    const arcLength = Math.max(0, (pct / 100) * circumference - sliceGap);
    const strokeDasharray = `${arcLength} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference + sliceGap / 2);
    accumulatedPercent += pct;

    const assignedColor = seg.color || defaultDistinctColors[idx % defaultDistinctColors.length];

    return {
      ...seg,
      percentage: pct,
      strokeDasharray,
      strokeDashoffset,
      color: assignedColor,
      index: idx,
    };
  });

  return (
    <div className="w-full">
      {/* Header with Title, Subtitle, and View Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold font-heading text-white tracking-wide">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
        {rightElement && (
          <div className="shrink-0">{rightElement}</div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-2">
        {/* Prominent Donut Graphic with Distinct Slice Gaps */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 240 240"
            className="w-full h-full -rotate-90 transform"
          >
            <defs>
              {renderedSegments.map((seg) => (
                <filter
                  key={`filter-${seg.index}`}
                  id={`donutGlow-${seg.index}`}
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="160%"
                >
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="5"
                    floodColor={seg.color}
                    floodOpacity="0.8"
                  />
                </filter>
              ))}
            </defs>

            {/* Dark Background Track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth={strokeWidth}
            />

            {/* Glowing & Clearly Partitioned Segment Arcs */}
            {renderedSegments.map((seg) => {
              if (seg.percentage <= 0) return null;
              const isHovered = hoveredIdx === seg.index;
              return (
                <circle
                  key={seg.index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: isHovered
                      ? `url(#donutGlow-${seg.index}) drop-shadow(0 0 16px ${seg.color})`
                      : `drop-shadow(0 0 6px ${seg.color}75)`,
                    opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                    transformOrigin: 'center',
                  }}
                  onMouseEnter={() => setHoveredIdx(seg.index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Center Callout: Large, Bold, Elegant, NO annoying hover instruction text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span
              className="text-5xl sm:text-6xl font-black font-heading tracking-tight leading-none transition-colors"
              style={{
                color: hoveredIdx !== null ? activeSegments[hoveredIdx]?.color || '#ffffff' : '#ffffff',
                textShadow: hoveredIdx !== null
                  ? `0 0 24px ${activeSegments[hoveredIdx]?.color || '#00f0ff'}`
                  : '0 0 18px rgba(255, 255, 255, 0.45)',
              }}
            >
              {hoveredIdx !== null
                ? activeSegments[hoveredIdx]?.count
                : Number(totalCount || 0).toLocaleString()}
            </span>
            <span className="text-sm sm:text-base font-black text-slate-200 uppercase tracking-widest mt-2 truncate max-w-[170px]">
              {hoveredIdx !== null ? activeSegments[hoveredIdx]?.label : totalLabel}
            </span>
            {hoveredIdx !== null && (
              <span
                className="text-xs sm:text-sm font-mono font-black mt-1.5 px-3 py-0.5 rounded-full"
                style={{
                  color: activeSegments[hoveredIdx]?.color || '#00f0ff',
                  background: `${activeSegments[hoveredIdx]?.color || '#00f0ff'}30`,
                  border: `1.5px solid ${activeSegments[hoveredIdx]?.color || '#00f0ff'}80`,
                }}
              >
                {activeSegments[hoveredIdx]?.percentage}% of total
              </span>
            )}
          </div>
        </div>

        {/* Separated High-Contrast Segment Legend with Larger Bold Text */}
        <div className="flex-1 w-full space-y-3.5">
          {activeSegments.length === 0 ? (
            <div className="py-6 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-base text-slate-300 text-center font-medium">
              No matching registrations recorded yet.
            </div>
          ) : (
            activeSegments.map((seg, idx) => {
              const isHovered = hoveredIdx === idx;
              const color = seg.color || defaultDistinctColors[idx % defaultDistinctColors.length];

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between py-3.5 px-4.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    isHovered
                      ? 'bg-white/10 border shadow-lg translate-x-1'
                      : 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07]'
                  }`}
                  style={{
                    borderColor: isHovered ? color : 'rgba(255, 255, 255, 0.12)',
                    boxShadow: isHovered ? `0 0 18px ${color}40` : 'none',
                  }}
                >
                  {/* Left: Distinct Color Box & Larger Bold Label */}
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <span
                      className="w-4.5 h-4.5 rounded-md shrink-0 transition-transform duration-200 border"
                      style={{
                        backgroundColor: color,
                        borderColor: '#ffffff',
                        boxShadow: `0 0 12px ${color}`,
                        transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                      }}
                    />
                    <span
                      className={`text-base sm:text-lg font-extrabold truncate transition-colors ${
                        isHovered ? 'text-white' : 'text-slate-100'
                      }`}
                      title={seg.label}
                    >
                      {seg.label}
                    </span>
                  </div>

                  {/* Right: Exact Count & Percentage Badge */}
                  <div className="flex items-center gap-3.5 shrink-0">
                    <span className="font-mono text-base sm:text-lg text-white font-black">
                      {seg.count}
                    </span>
                    <span
                      className="font-mono text-xs sm:text-sm font-black px-3 py-1 rounded-lg transition-all"
                      style={{
                        backgroundColor: `${color}30`,
                        color: color,
                        border: `1.5px solid ${color}80`,
                        boxShadow: isHovered ? `0 0 10px ${color}60` : 'none',
                      }}
                    >
                      {seg.percentage}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
