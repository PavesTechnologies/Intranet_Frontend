import React, { useState, useMemo, useRef } from "react";

const ProjectDonutChart = ({ entries }) => {
  const [hoveredProject, setHoveredProject] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef(null);

  // -------------------------------
  // PREPARE DATA
  // -------------------------------
  const projectData = useMemo(() => {
    if (!entries) return [];

    return entries.map((e) => ({
      name: e.projectName,
      totalHours: e.totalHours,
      billableHours: e.billableHours,
      nonBillableHours: e.nonBillableHours,
      percentage: e.contribution,
      billablePercentage: ((e.billableHours / e.totalHours) * 100).toFixed(1),
      nonBillablePercentage: ((e.nonBillableHours / e.totalHours) * 100).toFixed(1),
    }));
  }, [entries]);

  const colors = [
    { main: "#4f46e5", light: "#818cf8" },
    { main: "#16a34a", light: "#4ade80" },
    { main: "#ea580c", light: "#fb923c" },
    { main: "#0284c7", light: "#38bdf8" },
    { main: "#dc2626", light: "#f87171" },
    { main: "#7c3aed", light: "#a78bfa" },
    { main: "#d97706", light: "#fbbf24" },
    { main: "#059669", light: "#34d399" },
  ];

  const totalHoursAll = projectData.reduce((s, p) => s + p.totalHours, 0);

  // -------------------------------
  // DONUT SEGMENTS (WITH SINGLE PROJECT FIX)
  // -------------------------------
  const donutSegments = useMemo(() => {
    if (projectData.length === 1) {
      // SINGLE PROJECT = FULL 360° RING
      const project = projectData[0];
      return [
        {
          project: project.name,
          path: `
            M 100 20
            A 80 80 0 1 1 99.9 20
            L 100 50
            A 50 50 0 1 0 100 50
            Z
          `,
          color: colors[0],
          data: project,
          midX: 160,
          midY: 100,
          midAngle: 180,
        },
      ];
    }

    // MULTIPLE PROJECTS → REAL DONUT SLICES
    let currentAngle = -90;
    const center = 100;
    const innerR = 50;
    const outerR = 80;

    return projectData.map((project, index) => {
      const angle = (project.totalHours / totalHoursAll) * 360;
      const endAngle = currentAngle + angle;

      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const midAngle = (currentAngle + endAngle) / 2;
      const midRad = (midAngle * Math.PI) / 180;

      const midX = center + (outerR + 12) * Math.cos(midRad);
      const midY = center + (outerR + 12) * Math.sin(midRad);

      const x1 = center + outerR * Math.cos(startRad);
      const y1 = center + outerR * Math.sin(startRad);
      const x2 = center + outerR * Math.cos(endRad);
      const y2 = center + outerR * Math.sin(endRad);
      const x3 = center + innerR * Math.cos(endRad);
      const y3 = center + innerR * Math.sin(endRad);
      const x4 = center + innerR * Math.cos(startRad);
      const y4 = center + innerR * Math.sin(startRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const path = `
        M ${x1} ${y1}
        A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4}
        Z
      `;

      const seg = {
        project: project.name,
        path,
        color: colors[index % colors.length],
        data: project,
        midX,
        midY,
        midAngle,
      };

      currentAngle = endAngle;
      return seg;
    });
  }, [projectData, totalHoursAll]);

  const totalHours = projectData.reduce((s, p) => s + p.totalHours, 0);

  const updateTooltipPos = (segment) => {
    if (!wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const tooltipWidth = 240;

    let left =
      segment.midAngle > 0
        ? segment.midX + 20
        : segment.midX - tooltipWidth - 20;

    const minLeft = 10;
    const maxLeft = rect.width - tooltipWidth - 10;

    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    setTooltipPos({
      x: left,
      y: segment.midY - 40,
    });
  };

  return (
    <div className="donut-chart-container relative" ref={wrapperRef}>
      <h2 className="section-title">Project-wise Hours Distribution</h2>

      <div className="flex flex-col md:flex-row gap-8 items-center relative">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: "300px", height: "300px" }}>
          <svg width="100%" height="100%" viewBox="0 0 200 200">
            {donutSegments.map((segment, idx) => (
              <path
                key={idx}
                d={segment.path}
                fill={
                  hoveredProject === segment.project
                    ? segment.color.light
                    : segment.color.main
                }
                stroke="white"
                strokeWidth="2"
                opacity={hoveredProject === segment.project ? 1 : 0.88}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => {
                  setHoveredProject(segment.project);
                  updateTooltipPos(segment);
                }}
                onMouseLeave={() => setHoveredProject(null)}
              />
            ))}

            {/* Inner white circle */}
            <circle
              cx="100"
              cy="100"
              r="45"
              fill="white"
              stroke="#e5e7eb"
              strokeWidth="2"
            />

            {/* Total Hours */}
            <text
              x="100"
              y="95"
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
              fontWeight="500"
            >
              Total Hours
            </text>
            <text
              x="100"
              y="115"
              textAnchor="middle"
              fontSize="18"
              fill="#111827"
              fontWeight="600"
            >
              {totalHours.toFixed(1)}
            </text>
          </svg>

          {hoveredProject && (
            <div
              className="absolute bg-white shadow-lg rounded-xl p-4 w-60"
              style={{
                top: tooltipPos.y,
                left: tooltipPos.x,
                pointerEvents: "none",
                zIndex: 999,
              }}
            >
              {(() => {
                const p = projectData.find((x) => x.name === hoveredProject);
                const seg = donutSegments.find((x) => x.project === hoveredProject);

                return (
                  <>
                    <div className="flex items-center mb-2">
                      <div
                        className="w-4 h-4 rounded-sm mr-2"
                        style={{ backgroundColor: seg.color.main }}
                      ></div>
                      <h3 className="font-semibold text-gray-800">
                        {hoveredProject}
                      </h3>
                    </div>

                    <div className="text-sm text-gray-700">
                      <div className="mb-2">
                        <strong>Total Hours:</strong>{" "}
                        {p.totalHours.toFixed(1)} hrs ({p.percentage}%)
                      </div>

                      <div className="p-2 bg-green-50 border border-green-200 rounded mb-2">
                        <strong>Billable:</strong>{" "}
                        {p.billableHours.toFixed(1)} hrs (
                        {p.billablePercentage}%)
                      </div>

                      <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                        <strong>Non-Billable:</strong>{" "}
                        {p.nonBillableHours.toFixed(1)} hrs (
                        {p.nonBillablePercentage}%)
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 w-full self-stretch">
          <div className="h-full rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Projects
            </h3>

            <div className="divide-y divide-gray-100">
              {donutSegments.map((segment, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-2 py-3 cursor-pointer rounded-lg transition-colors ${
                    hoveredProject === segment.project ? "bg-white shadow-sm" : "hover:bg-white/70"
                  }`}
                  onMouseEnter={() => {
                    setHoveredProject(segment.project);
                    updateTooltipPos(segment);
                  }}
                  onMouseLeave={() => setHoveredProject(null)}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-md shrink-0"
                    style={{ backgroundColor: segment.color.main }}
                  ></div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">
                      {segment.project}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {segment.data.totalHours.toFixed(1)} hrs
                    </div>
                  </div>

                  <div
                    className="text-sm font-bold tabular-nums"
                    style={{ color: segment.color.main }}
                  >
                    {segment.data.percentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDonutChart;
