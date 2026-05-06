import { PieChart, Pie, Cell, Tooltip } from "recharts";

export default function DonutChart({ data, total, colors }) {
  const RADIAN = Math.PI / 180;

  // fallback if no colors passed
  const COLORS = colors || ["#5b8def"];

  const renderPercentLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    if (percent === 0) return null;

    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#1f2d3d"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 12, fontWeight: 600 }}
      >
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <PieChart width={240} height={240}>
      {/* Hover Tooltip */}
      <Tooltip
        formatter={(value, name, props) => [
          `${value}`,
          props.payload.label,
        ]}
      />

      <Pie
        data={data || []}
        dataKey="value"
        nameKey="label"
        cx="50%"
        cy="50%"
        innerRadius={55}
        outerRadius={110}
        paddingAngle={3}
        labelLine={false}
        label={renderPercentLabel}
      >
        {(data || []).map((entry, index) => (
          <Cell
            key={index}
            fill={entry.color || COLORS[index % COLORS.length]}
          />
        ))}
      </Pie>

      {/* Center Total */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: 18,
          fontWeight: "bold",
          fill: "#1f2d3d",
        }}
      >
        {total}
      </text>
    </PieChart>
  );
}

// import { PieChart, Pie, Cell } from "recharts";

// export default function DonutChart({ data, total }) {
//   const RADIAN = Math.PI / 180;

//   const COLORS= [
//   "#5b8def", // blue
//   "#b57bb5", // purple
//   "#59b3b8", // teal
//   "#6cc070", // green
//   "#f2a65a", // orange
//   "#d97b7b", // red
// ];

//   // % label on arc
//   const renderPercentLabel = ({
//     cx,
//     cy,
//     midAngle,
//     innerRadius,
//     outerRadius,
//     percent,
//   }) => {
//     if (percent === 0) return null;

//     const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
//     const x = cx + radius * Math.cos(-midAngle * RADIAN);
//     const y = cy + radius * Math.sin(-midAngle * RADIAN);
    

//     return (
//       <text
//         x={x}
//         y={y}
//         fill="#5b8def"
//         textAnchor="middle"
//         dominantBaseline="central"
//         style={{ fontSize: 12, fontWeight: 600 }}
//       >
//         {(percent * 100).toFixed(2)}%
//       </text>
//     );
//   };

//   return (
//     <PieChart width={240} height={240}>
//       <Pie
//         data={data}
//         dataKey="value"
//         cx="50%"
//         cy="50%"
//         innerRadius={55}     
//         outerRadius={110}    
//         paddingAngle={2}
//         labelLine={false}
//         label={renderPercentLabel}
//       >

// {(data || []).map((entry, index) => (
//   <Cell
//     key={index}
//     fill={entry.color || COLORS[index % COLORS.length]}
//   />
// ))}
//         {/* {data.map((entry, index) => (
//           <Cell key={index} fill={entry.color} />
//         ))} */}
//       </Pie>

//       {/* Center Total */}
//       <text
//         x="50%"
//         y="50%"
//         textAnchor="middle"
//         dominantBaseline="middle"
//         style={{
//           fontSize: 18,
//           fontWeight: "bold",
//           fill: "#1f2d3d",
//         }}
//       >
//         {total}
//       </text>
//     </PieChart>
//   );
// }
