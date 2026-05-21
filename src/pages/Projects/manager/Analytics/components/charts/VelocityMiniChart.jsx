import React, { useRef, useEffect } from "react";
import {
  Chart, BarController, BarElement,
  LinearScale, CategoryScale, Tooltip,
} from "chart.js";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

const VelocityMiniChart = ({ labels, velocityData, dailyBurnup = [] }) => {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!velocityData || !canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

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
      type: "bar",
      plugins: [weekendPlugin],
      data: {
        labels,
        datasets: [{
          label:           "Velocity",
          data:            velocityData,
          backgroundColor: velocityData.map((v, i) =>
            dailyBurnup[i]?.isWeekend
              ? "rgba(148,163,184,0.2)"
              : v > 0
                ? "rgba(79,70,229,0.75)"
                : "rgba(148,163,184,0.3)"
          ),
          borderRadius:  4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend:  { display: false },
          tooltip: {
            backgroundColor: "#1E293B",
            bodyColor:       "#CBD5E1",
            callbacks: {
              label: (ctx) => ` ${Math.round(ctx.raw)} pts`,
            },
          },
        },
        scales: {
          x: {
            grid:  { display: false },
            ticks: {
              color:       "#94A3B8",
              font:        { size: 10 },
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
            grid:        { color: "rgba(0,0,0,0.04)" },
            ticks:       { color: "#94A3B8", font: { size: 10 } },
            beginAtZero: true,
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [velocityData, labels, dailyBurnup]);

  return (
    <div style={{ position: "relative", width: "100%", height: "140px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default VelocityMiniChart;