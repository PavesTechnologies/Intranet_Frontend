import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Chart,
  LineController, LineElement, PointElement, LinearScale,
  CategoryScale, Tooltip, Legend, Filler,
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const BurnupChart = forwardRef(({ burnupData, initialPoints, dailyBurnup = [] }, ref) => {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }));

  useEffect(() => {
    if (!burnupData || !canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const { labels, completed, totalScope, ideal } = burnupData;
    const scopeLine = totalScope.map((v) => v ?? initialPoints);

    const weekendPlugin = {
      id: "weekendShading",
      beforeDraw(chart) {
        const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
        if (!x) return;
        dailyBurnup.forEach((d, i) => {
          if (!d.isWeekend) return;
          const xStart = x.getPixelForValue(i - 0.5);
          const xEnd   = x.getPixelForValue(i + 0.5);
          ctx.save();
          ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
          ctx.fillRect(xStart, top, xEnd - xStart, bottom - top);
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
            label:                "Completed",
            data:                 completed,
            borderColor:          "#16A34A",
            backgroundColor:      "rgba(22,163,74,0.08)",
            borderWidth:          2.5,
            pointRadius:          5,
            pointBackgroundColor: "#16A34A",
            pointBorderColor:     "#fff",
            pointBorderWidth:     2,
            fill:                 true,
            tension:              0.3,
            spanGaps:             false,
          },
          {
            label:                "Total scope",
            data:                 scopeLine,
            borderColor:          "#6366F1",
            borderDash:           [4, 3],
            borderWidth:          2,
            pointRadius:          3,
            pointBackgroundColor: "#6366F1",
            fill:                 false,
            tension:              0,
            spanGaps:             true,
          },
          {
            label:       "Ideal completion",
            data:        ideal,
            borderColor: "#94A3B8",
            borderDash:  [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            fill:        false,
            tension:     0,
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
                const label  = this.getLabelForValue(val);
                const isWknd = dailyBurnup[index]?.isWeekend;
                return isWknd ? `${label} 🌙` : label;
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
  }, [burnupData, initialPoints, dailyBurnup]);

  const hasActualData = burnupData?.completed?.some((v) => v !== null);

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 bg-green-600 rounded" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 bg-indigo-500 rounded" />
          Total scope
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0" style={{ borderTop: "2px dashed #94A3B8" }} />
          Ideal completion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm" style={{ background: "rgba(148,163,184,0.25)" }} />
          Weekend
        </span>
      </div>

      {!hasActualData && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          No snapshot data yet — completed line will appear after the first midnight snapshot runs.
        </div>
      )}

      <div style={{ position: "relative", width: "100%", height: "300px" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
});

BurnupChart.displayName = "BurnupChart";
export default BurnupChart;