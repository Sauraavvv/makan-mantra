"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BarChart3, TrendingUp } from "lucide-react";

export type PriceTrendChartPoint = {
  year: number;
  averagePricePerSqft: number;
};

type PriceTrendChartProps = {
  points: PriceTrendChartPoint[];
  title?: string;
  description?: string;
};

function formatPricePerSqft(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function PriceTrendChart({
  points,
  title = "Average Price Movement",
  description = "Hover on any point to inspect the yearly price.",
}: PriceTrendChartProps) {
  const gradientId = useId();
  const chartRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<"line" | "bar">("line");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const chart = useMemo(() => {
    const width = 960;
    const height = 340;
    const padding = { top: 28, right: 34, bottom: 34, left: 82 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const years = points.map((point) => point.year);
    const prices = points.map((point) => point.averagePricePerSqft);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const yFloor = Math.max(0, Math.floor((minPrice * 0.9) / 500) * 500);
    const yCeil = Math.ceil((maxPrice * 1.1) / 500) * 500;
    const yMin = yFloor === yCeil ? Math.max(0, yFloor - 500) : yFloor;
    const yMax = yFloor === yCeil ? yCeil + 500 : yCeil;
    const xSpan = Math.max(1, maxYear - minYear);
    const ySpan = Math.max(1, yMax - yMin);
    const xFor = (year: number) => padding.left + ((year - minYear) / xSpan) * chartWidth;
    const yFor = (price: number) => padding.top + chartHeight - ((price - yMin) / ySpan) * chartHeight;
    const plotted = points.map((point) => ({
      ...point,
      x: xFor(point.year),
      y: yFor(point.averagePricePerSqft),
    }));
    const path = plotted
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    const areaPath = `${path} L ${plotted[plotted.length - 1].x.toFixed(2)} ${padding.top + chartHeight} L ${plotted[0].x.toFixed(2)} ${padding.top + chartHeight} Z`;
    const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) / 4) * index);

    return {
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      baselineY: padding.top + chartHeight,
      barWidth: Math.min(56, Math.max(24, (chartWidth / Math.max(1, points.length)) * 0.46)),
      path,
      areaPath,
      plotted,
      yTicks: yTicks.map((tick) => ({ value: tick, y: yFor(tick) })),
    };
  }, [points]);

  const activePoint = activeIndex === null ? null : chart.plotted[activeIndex] ?? null;
  const tooltipWidth = 152;
  const tooltipHeight = 58;
  const tooltipX = activePoint
    ? Math.min(
        Math.max(activePoint.x - tooltipWidth / 2, chart.padding.left),
        chart.width - chart.padding.right - tooltipWidth,
      )
    : 0;
  const tooltipY = activePoint ? Math.max(activePoint.y - tooltipHeight - 14, chart.padding.top - 8) : 0;

  return (
    <div ref={chartRef} className="flex h-full flex-col overflow-hidden rounded-xl border border-orange-200 bg-white">
      <div className="h-[150px] shrink-0 bg-orange-50 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold leading-tight text-foreground">{title}</h3>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Yearly price movement</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">
              {chartMode === "line" ? "Switch to bar" : "Switch to line"}
            </span>
            <button
              type="button"
              aria-label={chartMode === "line" ? "Switch to bar graph" : "Switch to line graph"}
              title={chartMode === "line" ? "Switch to bar graph" : "Switch to line graph"}
              onClick={() => {
                setActiveIndex(null);
                setChartMode((mode) => (mode === "line" ? "bar" : "line"));
              }}
              className="grid size-12 place-items-center rounded-xl bg-orange-100 text-foreground transition-colors hover:bg-orange-200"
            >
              {chartMode === "line" ? (
                <BarChart3 className="h-5 w-5" strokeWidth={1.65} />
              ) : (
                <TrendingUp className="h-5 w-5" strokeWidth={1.65} />
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 flex min-h-[58px] items-center rounded-xl border-2 border-orange-200 bg-orange-100/70 px-3 py-2.5">
          <p className="text-xs font-medium leading-relaxed text-foreground/75">{description}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-full w-full min-w-[760px]"
          role="img"
          aria-label="Yearly average price per square foot line chart"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--saffron)" stopOpacity="0.24" />
              <stop offset="52%" stopColor="var(--saffron)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--saffron)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect
            x={chart.padding.left}
            y={chart.padding.top}
            width={chart.width - chart.padding.left - chart.padding.right}
            height={chart.chartHeight}
            rx="18"
            className="fill-background"
          />

          {chart.yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={chart.padding.left}
                x2={chart.width - chart.padding.right}
                y1={tick.y}
                y2={tick.y}
                className="stroke-border"
                strokeDasharray="5 8"
              />
              <text
                x={chart.padding.left - 16}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[12px]"
              >
                {formatPricePerSqft(tick.value)}
              </text>
            </g>
          ))}

          {chartMode === "line" ? (
            <>
              <path
                d={chart.areaPath}
                fill={`url(#${gradientId})`}
                className={`transition-opacity duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}
              />
              <path
                d={chart.path}
                fill="none"
                className="stroke-saffron"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={isVisible ? 0 : 1}
                style={{ transition: "stroke-dashoffset 1200ms ease-out" }}
              />

              {chart.plotted.map((point, index) => {
                const active = index === activeIndex;
                return (
                  <g
                    key={point.year}
                    className={`transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}
                    style={{ transitionDelay: isVisible ? `${350 + index * 80}ms` : "0ms" }}
                  >
                    <line
                      x1={point.x}
                      x2={point.x}
                      y1={chart.padding.top}
                      y2={chart.padding.top + chart.chartHeight}
                      className={active ? "stroke-saffron/40" : "stroke-transparent"}
                      strokeDasharray="4 7"
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={active ? 6.5 : 4}
                      className="fill-background stroke-saffron transition-all"
                      strokeWidth={active ? 3 : 2}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="16"
                      className="cursor-pointer fill-transparent"
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onFocus={() => setActiveIndex(index)}
                      onBlur={() => setActiveIndex(null)}
                      tabIndex={0}
                      aria-label={`${point.year}: ${formatPricePerSqft(point.averagePricePerSqft)} per sq.ft`}
                    />
                    <text
                      x={point.x}
                      y={chart.padding.top + chart.chartHeight + 24}
                      textAnchor="middle"
                      className={active ? "fill-foreground text-[12px] font-bold" : "fill-muted-foreground text-[12px] font-semibold"}
                    >
                      {point.year}
                    </text>
                  </g>
                );
              })}
            </>
          ) : (
            <>
              {chart.plotted.map((point, index) => {
                const active = index === activeIndex;
                const barHeight = chart.baselineY - point.y;
                return (
                  <g
                    key={point.year}
                    className={`transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}
                    style={{ transitionDelay: isVisible ? `${200 + index * 70}ms` : "0ms" }}
                  >
                    <rect
                      x={point.x - chart.barWidth / 2}
                      y={isVisible ? point.y : chart.baselineY}
                      width={chart.barWidth}
                      height={isVisible ? barHeight : 0}
                      rx="8"
                      className={active ? "fill-saffron" : "fill-saffron/70"}
                      style={{ transition: "height 700ms ease-out, y 700ms ease-out, fill 160ms ease" }}
                    />
                    <rect
                      x={point.x - chart.barWidth / 2 - 8}
                      y={chart.padding.top}
                      width={chart.barWidth + 16}
                      height={chart.chartHeight}
                      className="cursor-pointer fill-transparent"
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onFocus={() => setActiveIndex(index)}
                      onBlur={() => setActiveIndex(null)}
                      tabIndex={0}
                      aria-label={`${point.year}: ${formatPricePerSqft(point.averagePricePerSqft)} per sq.ft`}
                    />
                    <text
                      x={point.x}
                      y={chart.padding.top + chart.chartHeight + 24}
                      textAnchor="middle"
                      className={active ? "fill-foreground text-[12px] font-bold" : "fill-muted-foreground text-[12px] font-semibold"}
                    >
                      {point.year}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {activePoint && (
            <g pointerEvents="none">
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                rx="14"
                className="fill-background stroke-saffron/40"
                strokeWidth="1.5"
              />
              <text x={tooltipX + 16} y={tooltipY + 23} className="fill-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
                {activePoint.year}
              </text>
              <text x={tooltipX + 16} y={tooltipY + 43} className="fill-foreground text-[15px] font-bold">
                {formatPricePerSqft(activePoint.averagePricePerSqft)}
                <tspan className="fill-muted-foreground text-[11px] font-medium"> / sq.ft</tspan>
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
