import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const COLORS = {
  Billable:       { fill: '#534AB7', pill: '#EEEDFe', text: '#3C3489' },
  'Non-Billable': { fill: '#AFA9EC', pill: '#EEEDFE', text: '#534AB7' },
  Internal:       { fill: '#B4B2A9', pill: '#F1EFE8', text: '#5F5E5A' },
};

const OverallVisualization = ({ projects }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  let billable = 0, nonBillable = 0, internal = 0;
  projects.forEach(p => {
    if (p.projectId === -1 || p.projectName.toLowerCase().includes('internal')) {
      internal += p.totalHours;
    } else {
      billable += p.billableHours;
      nonBillable += p.nonBillableHours;
    }
  });

  const total = parseFloat((billable + nonBillable + internal).toFixed(2));

  const data = [
    { name: 'Billable',       value: parseFloat(billable.toFixed(2)) },
    { name: 'Non-Billable',   value: parseFloat(nonBillable.toFixed(2)) },
    { name: 'Internal',       value: parseFloat(internal.toFixed(2)) },
  ].filter(d => d.value > 0).map(d => ({
    ...d,
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
    color: COLORS[d.name]?.fill ?? '#94a3b8',
    pillBg: COLORS[d.name]?.pill ?? '#f1f5f9',
    pillText: COLORS[d.name]?.text ?? '#475569',
  }));

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color),
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#e2e8f0' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            titleFont: { size: 11 },
            bodyFont: { size: 11 },
            callbacks: {
              label: ctx => ` ${ctx.parsed}h · ${data[ctx.dataIndex].pct}%`,
            },
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [projects]);

  if (data.length === 0) {
    return (
      <p className="text-[11px] text-slate-400 text-center py-8">No hours recorded.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2">
        {data.map(d => (
          <div key={d.name} className="bg-slate-50 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-slate-400 mb-1 truncate">{d.name}</p>
            <p className="text-[17px] font-medium text-slate-700 leading-none mb-1">{d.value}h</p>
            <p className="text-[10px] font-medium" style={{ color: d.color }}>{d.pct}%</p>
          </div>
        ))}
      </div>

      {/* Donut chart */}
      <div className="bg-white border border-slate-100 rounded-xl p-3.5">
        <div className="flex gap-3 flex-wrap mb-3">
          {data.map(d => (
            <span key={d.name} className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ background: d.color }} />
              {d.name} · {d.value}h
            </span>
          ))}
        </div>
        <div className="relative w-full h-44">
          <canvas
            ref={chartRef}
            role="img"
            aria-label={`Donut chart showing hour distribution: ${data.map(d => `${d.name} ${d.pct}%`).join(', ')}`}
          />
        </div>
      </div>

      {/* Breakdown rows */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] bg-slate-50 px-3 py-2 gap-2">
          {['Type', 'Hours', 'Share'].map((h, i) => (
            <span
              key={h}
              className="text-[10px] font-medium text-slate-400 capitalize tracking-wider"
              style={{ textAlign: i > 0 ? 'right' : 'left' }}
            >
              {h}
            </span>
          ))}
        </div>
        {data.map((d, i) => (
          <div
            key={d.name}
            className={`grid grid-cols-[1fr_auto_auto] items-center px-3 py-2 gap-2 border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50/60' : 'bg-white'}`}
          >
            <span className="flex items-center gap-2 text-[11px] font-medium text-slate-700 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 inline-block"
                style={{ background: d.color }}
              />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="text-[11px] text-slate-500 text-right min-w-[36px]">{d.value}h</span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-right min-w-[36px]"
              style={{ background: d.pillBg, color: d.pillText }}
            >
              {d.pct}%
            </span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default OverallVisualization;
