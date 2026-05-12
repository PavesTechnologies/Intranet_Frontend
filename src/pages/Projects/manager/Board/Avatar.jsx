import { stableColorClass } from "./constants";

// Compact avatar — consistent with TaskCard's Avatar (w-5 h-5, tooltip on hover)
const Avatar = ({ name }) => {
  const displayName = name || "Unassigned";
  const initials = displayName
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = stableColorClass(displayName);

  return (
    <div className="relative flex items-center group">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold cursor-default shrink-0 ${color}`}
      >
        {initials}
      </div>
      <div className="absolute left-6 whitespace-nowrap bg-white border border-gray-200 shadow-md text-indigo-600 text-[10px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
        {displayName}
      </div>
    </div>
  );
};

export default Avatar;
