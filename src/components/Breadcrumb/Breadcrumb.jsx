import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

/**
 * Generic breadcrumb trail.
 * items: [{ label: string, to?: string }] — the last item (or any item without `to`) renders as plain text.
 */
export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="flex items-center flex-wrap gap-1 text-xs text-gray-500" aria-label="Breadcrumb">
      <Link to="/dashboard" className="flex items-center hover:text-[#263383]">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:text-[#263383]">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-[#0a174e] font-medium" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
