import { useNavigate } from "react-router-dom";

/**
 * Renders its children as a navigating <button> when `to` is set, otherwise as a
 * plain <div>. Callers pass `to` only when the user's role can open that route
 * (see useFinanceAccess), so users never get a clickable path to a 403 page.
 */
export default function ClickTarget({ to, className = "", clickableClassName = "", label, children }) {
  const navigate = useNavigate();
  if (!to) return <div className={className}>{children}</div>;
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      title={label}
      className={`group block w-full text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 focus-visible:ring-offset-1 ${className} ${clickableClassName}`}
    >
      {children}
    </button>
  );
}
