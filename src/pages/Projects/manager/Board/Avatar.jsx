
import {stableColorClass} from "./constants"

const Avatar = ({ name }) => {
  const initials = (name || "U")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = stableColorClass(name || initials);
  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${color}`}
    >
      {initials}
    </div>
  );
};

export default Avatar;