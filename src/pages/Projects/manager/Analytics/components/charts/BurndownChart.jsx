import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Chart,
  LineController, LineElement, PointElement, LinearScale,
  CategoryScale, Tooltip, Legend, Filler,
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const BurndownChart = forwardRef(({ burndownData, scopeMarkers = [], dailyBurnup = [] }, ref) => {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }));

  useEffect(() => {
    if (!burndownData || !canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const { labels, actualRemaining, idealRemaining, totalScope } = burndownData;

    const weekendPlugin = {
      id: "weekendShading",
      beforeDraw(chart) {
        const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
        if (!x) return;
        dailyBurnup.forEach((d, i) => {
          const nonWorking = d.isHoliday || (d.isWeekend && !d.isWorkingWeekend);
          if (!nonWorking) return;
          const xStart = x.getPixelForValue(i - 0.5);
          const xEnd   = x.getPixelForValue(i + 0.5);
          const colW   = xEnd - xStart;
          ctx.save();
          ctx.fillStyle = d.isHoliday
            ? "rgba(251, 191, 36, 0.22)"
            : "rgba(148, 163, 184, 0.15)";
          ctx.fillRect(xStart, top, colW, bottom - top);
          if (d.isHoliday) {
            // amber top border line
            ctx.fillStyle = "rgba(245, 158, 11, 0.7)";
            ctx.fillRect(xStart, top, colW, 2);
            // "Holiday" label rotated inside the column
            ctx.save();
            ctx.translate(xStart + colW / 2, bottom - 6);
            ctx.rotate(-Math.PI / 2);
            ctx.font = "bold 9px sans-serif";
            ctx.fillStyle = "rgba(180, 83, 9, 0.75)";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText("Holiday", 0, 0);
            ctx.restore();
          }
          ctx.restore();
        });
      },
    };

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      plugins: [weekendPlugin],
      data: {
        labels,
        datasets: [
          {
            label:                "Actual remaining",
            data:                 actualRemaining,
            borderColor:          "#4F46E5",
            backgroundColor:      "rgba(79,70,229,0.08)",
            borderWidth:          2.5,
            pointRadius:          5,
            pointBackgroundColor: "#4F46E5",
            pointBorderColor:     "#fff",
            pointBorderWidth:     2,
            fill:                 true,
            tension:              0.3,
            spanGaps:             true,
          },
          {
            label:                "Total scope",
            data:                 totalScope,
            borderColor:          "#F59E0B",
            backgroundColor:      "transparent",
            borderWidth:          2,
            borderDash:           [4, 3],
            pointRadius:          3,
            pointBackgroundColor: "#F59E0B",
            pointBorderColor:     "#fff",
            pointBorderWidth:     1.5,
            fill:                 false,
            tension:              0,
            spanGaps:             true,
          },
          {
            label:       "Ideal remaining",
            data:        idealRemaining,
            borderColor: "#94A3B8",
            borderDash:  [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill:        false,
            tension:     0,
            spanGaps:    true,
          },
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction:         { mode: "index", intersect: false },
        plugins: {
          legend:  { display: false },
          tooltip: {
            backgroundColor: "#1E293B",
            titleColor:      "#F1F5F9",
            bodyColor:       "#CBD5E1",
            padding:         10,
            callbacks: {
              label: (ctx) => {
                if (ctx.raw === null) return null;
                return ` ${ctx.dataset.label}: ${Math.round(ctx.raw)} pts`;
              },
            },
          },
        },
        scales: {
          x: {
            grid:  { color: "rgba(0,0,0,0.05)" },
            ticks: {
              color:       "#94A3B8",
              font:        { size: 11 },
              autoSkip:    false,
              maxRotation: 45,
              callback: function (val, index) {
                const label = this.getLabelForValue(val);
                const d     = dailyBurnup[index];
                if (d?.isHoliday) return `${label} 🏖`;
                if (d?.isWeekend && !d?.isWorkingWeekend) return `${label} 🌙`;
                return label;
              },
            },
          },
          y: {
            grid:        { color: "rgba(0,0,0,0.05)" },
            ticks:       { color: "#94A3B8", font: { size: 12 } },
            beginAtZero: true,
            title:       { display: true, text: "Story points", color: "#94A3B8", font: { size: 12 } },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [burndownData, dailyBurnup]);

  const hasActualData = burndownData?.actualRemaining?.some((v) => v !== null);

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 bg-indigo-600 rounded" />
          Actual remaining
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0" style={{ borderTop: "2px dashed #F59E0B" }} />
          Total scope
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0" style={{ borderTop: "2px dashed #94A3B8" }} />
          Ideal burndown
        </span>
        <span className="flex items-center gap-1.5 text-green-600">▲ Scope added</span>
        <span className="flex items-center gap-1.5 text-red-500">▼ Scope removed</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm" style={{ background: "rgba(148,163,184,0.25)" }} />
          Weekend
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm" style={{ background: "rgba(251,191,36,0.25)" }} />
          Holiday
        </span>
      </div>

      {!hasActualData && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          No remaining-points data yet — the actual burndown line will appear once the sprint is active and progress is recorded.
          The ideal burndown line shows the target trajectory.
        </div>
      )}

      <div style={{ position: "relative", width: "100%", height: "300px" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
});

BurndownChart.displayName = "BurndownChart";
export default BurndownChart;