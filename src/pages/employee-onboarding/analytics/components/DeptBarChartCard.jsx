import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import RawDataModal from "./RawDataModal";

export default function DeptBarChartCard({
  title,
  data,
  xKey,
  bars,
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <>
      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: 18,
          marginTop: 20,
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
            }}
          >
            👁 View Raw Data
          </button>
        </div>

        {/* Chart */}
        <BarChart width={900} height={300} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />

          {bars.map((b, i) => (
            <Bar
              key={i}
              dataKey={b.key}
              fill={b.color}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </div>

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
