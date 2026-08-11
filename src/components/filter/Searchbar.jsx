import { useState, useEffect, useRef } from "react";

export default function SearchInput({
  value,
  onChange,
  onSearch,
  delay = 300,
  placeholder = "Search...",
  className = "",
}) {
  const [query, setQuery] = useState(value || "");
  const isFirstRender = useRef(true);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (!onSearch) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const handler = setTimeout(() => {
      onSearch(query.trim());
    }, delay);

    return () => clearTimeout(handler);
  }, [query, delay, onSearch]);

  const handleChange = (e) => {
    setQuery(e.target.value);
    onChange?.(e);
  };

  return (
    <input
      type="text"
      value={query}
      onChange={handleChange}
      placeholder={placeholder}
      className={`w-full h-10 rounded-lg border border-gray-300 px-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${className}`}
    />
  );
}