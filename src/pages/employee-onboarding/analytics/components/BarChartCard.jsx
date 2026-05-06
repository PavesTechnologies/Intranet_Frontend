import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  Legend,
} from "recharts";
import RawDataModal from "./RawDataModal";

/* 🔹 Circle Legend (Female / Male style) */
const renderCircleLegend = ({ payload }) => {
  if (!payload) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 20,
        marginTop: 10,
        flexWrap: "wrap",
        fontSize: 13,
      }}
    >
      {payload.map((entry, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: entry.color,
              display: "inline-block",
            }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

/* 🔹 Experience Key : Value Legend */
const renderKeyValueLegend = (data, xKey, bars) => {
  if (!data || !bars || bars.length !== 1) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 20,
        marginTop: 8,
        flexWrap: "wrap",
        fontSize: 13,
      }}
    >
      {data.map((d, i) => (
        <div key={i}>
          <b>{d[xKey]}</b> : {d[bars[0].key]}
        </div>
      ))}
    </div>
  );
};

/* 🔹 Custom Tooltip (Experience format) */
/* 🔹 Custom Tooltip (Single + Stacked support) */
const renderCustomTooltip = ({ active, payload, label, title }) => {
  if (!active || !payload || !payload.length) return null;

  const isStacked = payload.length > 1;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 4,
        padding: "8px 10px",
        fontSize: 13,
      }}
    >
      {/* Title line */}
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {title ? `${title} : ${label}` : label}
      </div>

      {/* 🔹 Stacked bars (Age / Gender / Worker etc.) */}
      {isStacked ? (
        <>
          {payload.map((p, i) =>
            p.value ? (
              <div key={i} style={{ color: p.color }}>
                {p.name} : {p.value}
              </div>
            ) : null
          )}

          {/* Total */}
          <div style={{ marginTop: 4, fontWeight: 600 }}>
            Total :{" "}
            {payload.reduce((sum, p) => sum + (p.value || 0), 0)}
          </div>
        </>
      ) : (
        /* 🔹 Single bar (Experience) */
        <div style={{ color: payload[0].color }}>
          value : {payload[0].value}
        </div>
      )}
    </div>
  );
};


export default function BarChartCard({ title, data, xKey, bars }) {
  const [showRaw, setShowRaw] = useState(false);

  /* 🔹 Add total automatically */
  const processedData = data.map((d) => {
    let total = 0;
    bars.forEach((b) => {
      total += d[b.key] || 0;
    });
    return { ...d, total };
  });

  return (
    <>
      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: 18,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>

          <button
            onClick={() => setShowRaw(true)}
            style={{
              border: "none",
              background: "transparent",
              color: "#6c5ce7",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            👁 View Raw Data
          </button>
        </div>

        {/* Chart */}
        <BarChart
          width={420}
          height={260}
          data={processedData}
          barGap={0}
          barCategoryGap="22%"
          maxBarSize={40}
        >
          <CartesianGrid strokeDasharray={2} />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />

          <Tooltip
            content={(props) =>
              renderCustomTooltip({
                ...props,
                title:
                 title.includes("Experience")
                  ? "Experience"
                  : title.includes("Age")
                  ? "Age of Employees"
                  : "",
              })
            }
          />

          {/* Circle Legend */}
          <Legend content={renderCircleLegend} />

          {bars.map((b, i) => (
            <Bar
              key={i}
              dataKey={b.key}
              fill={b.color}
              stackId={bars.length > 1 ? "a" : undefined}
              barSize={50}
              stroke="none"
              radius={
                bars.length === 1
                  ? [6, 6, 0, 0]
                  : i === bars.length - 1
                  ? [6, 6, 0, 0]
                  : [0, 0, 0, 0]
              }
            >
              {/* Value inside bar */}
              <LabelList
                dataKey={b.key}
                position="center"
                formatter={(v) => (v === 0 ? "" : v)}
                style={{
                  fill: "#fff",
                  fontWeight: 600,
                  fontSize: 12,
                }}
              />

              {/* Total on top */}
              {i === bars.length - 1 && (
                <LabelList
                  dataKey="total"
                  position="top"
                  formatter={(v) => (v === 0 ? "" : v)}
                  style={{
                    fill: "#000",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                />
              )}
            </Bar>
          ))}
        </BarChart>

        {/* Experience Key : Value Legend */}
        {bars.length === 1 && renderKeyValueLegend(data, xKey, bars)}
      </div>

      {/* Raw Data Modal */}
      {showRaw && (
        <RawDataModal
          title={title}
          data={data}
          onClose={() => setShowRaw(false)}
        />
      )}
    </>
  );
}
