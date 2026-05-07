import React from "react";

const LoadingSpinner = ({ text = "Loading...", size = "md" }) => {
  const sizeClass = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-4",
    lg: "w-8 h-8 border-4",
  }[size];

  return (
    <div className="flex items-center justify-center gap-2 p-4">
      <div
        className={`${sizeClass} border-[#0A0082] border-t-transparent rounded-full animate-spin`}
      />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;