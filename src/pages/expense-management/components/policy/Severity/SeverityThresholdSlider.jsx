import React from "react";
import { Slider } from "@/components/ui/slider";

export default function SeverityThresholdSlider({ value, onChange, min = 0, max = 150 }) {
  return (
    <div className="space-y-2">
      <Slider value={value} onValueChange={onChange} min={min} max={max} step={1} />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}
