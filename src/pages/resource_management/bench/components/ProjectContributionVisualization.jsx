import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import GenericTable from "../../../../components/Table/table";
Chart.register(...registerables);

const utilizationClass = (u) => {
  if (u >= 80) return { bg: '#E1F5EE', color: '#1D9E75', bar: '#1D9E75' };
  if (u >= 60) return { bg: '#FAEEDA', color: '#BA7517', bar: '#BA7517' };
  return { bg: '#FCEBEB', color: '#A32D2D', bar: '#A32D2D' };
};

const ProjectContributionVisualization = ({ projects }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const totalBillable = projects.reduce((s, p) => s + p.billableHours, 0);
  const totalNonBillable = projects.reduce((s, p) => s + p.nonBillableHours, 0);
  const totalHours = totalBillable + totalNonBillable;
  const overallUtil = Math.round((totalBillable / totalHours) * 100);

  const summaryCards = [
    { label: 'Total', value: `${totalHours}h` },
    { label: 'Billable', value: `${totalBillable}h` },
    { label: 'Non-billable', value: `${totalNonBillable}h` },
    { label: 'Utilization', value: `${overallUtil}%` },
  ];

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
    const tickColor = isDark ? '#9ca3af' : '#94a3b8';

    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: projects.map(p =>
          p.projectName.length > 12 ? p.projectName.slice(0, 12) + '…' : p.projectName
        ),
        datasets: [
          {
            label: 'Billable',
            data: projects.map(p => p.billableHours),
            backgroundColor: '#534AB7',
            borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 3, bottomRight: 3 },
            borderSkipped: false,
            stack: 'a',
            maxBarThickness: 28,
          },
          {
            label: 'Non-billable',
            data: projects.map(p => p.nonBillableHours),
            backgroundColor: '#AFA9EC',
            borderRadius: { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            stack: 'a',
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1e1e2e' : '#fff',
            titleColor: isDark ? '#e2e8f0' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            titleFont: { size: 11 },
            bodyFont: { size: 11 },
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}h` },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: {
              font: { size: 9 },
              color: tickColor,
              maxRotation: 35,
              minRotation: 35,
            },
          },
          y: {
            stacked: true,
            grid: { color: gridColor },
            border: { display: false },
            ticks: {
              font: { size: 9 },
              color: tickColor,
              callback: v => `${v}h`,
              maxTicksLimit: 5,
            },
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [projects]);

  return (
    <div className="flex flex-col gap-4">

      {/* Summary metric cards */}
      <div className="grid grid-cols-4 gap-2">
        {summaryCards.map((c, i) => (
          <div key={i} className="bg-slate-50 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-slate-400 mb-0.5">{c.label}</p>
            <p className="text-base font-semibold text-slate-700">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Chart card */}
      <div className="bg-white border border-slate-100 rounded-xl p-3.5">
        <div className="flex gap-3 mb-3 flex-wrap">
          {[{ label: 'Billable', color: '#534AB7' }, { label: 'Non-billable', color: '#AFA9EC' }].map(l => (
            <span key={l.label} className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
        <div className="relative w-full h-44">
          <canvas
            ref={chartRef}
            role="img"
            aria-label="Stacked bar chart showing billable and non-billable hours per project"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <GenericTable
          headers={["Project", "Bill.", "Non-bill.", "Util."]}
          columns={["project_info", "bill_info", "non_bill_info", "util_info"]}
          rows={projects.map((p, idx) => {
            const u = p.utilizationPercentage;
            const { bg, color, bar } = utilizationClass(u);
            return {
              ...p,
              project_info: (
                <div className="text-[11px] font-medium text-slate-700 truncate text-left">
                  {p.projectName}
                </div>
              ),
              bill_info: (
                <div className="text-[11px] text-slate-500 text-right">
                  {p.billableHours}h
                </div>
              ),
              non_bill_info: (
                <div className="text-[11px] text-slate-500 text-right">
                  {p.nonBillableHours}h
                </div>
              ),
              util_info: (
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-8 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${u}%`, background: bar }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: bg, color }}
                  >
                    {u}%
                  </span>
                </div>
              )
            };
          })}
        />
      </div>

    </div>
  );
};

export default ProjectContributionVisualization;
