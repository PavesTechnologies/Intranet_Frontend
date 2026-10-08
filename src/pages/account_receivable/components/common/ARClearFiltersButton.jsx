import { FilterX } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function ARClearFiltersButton({
  onClick,
  title = "Clear filters",
  label = "Clear",
  className = "",
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="small"
      onClick={onClick}
      title={title}
      className={`h-10 whitespace-nowrap px-3 text-xs font-semibold ${className}`}
    >
      <FilterX className="h-3.5 w-3.5 text-slate-500" />
      <span>{label}</span>
    </Button>
  );
}
