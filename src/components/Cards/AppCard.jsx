import React from "react";

/**
 * AppCard
 *
 * A fully composable card component with named render slots and variant support.
 * Every visual section can be overridden via render props.
 *
 * Props
 * ─────────────────────────────────────────────────────────────────────────────
 * Convenience (auto-builds the standard layout)
 * ─────────────────────────────────────────────
 * icon              {ReactNode}   Icon shown in the coloured badge.
 * iconBg            {string}      Tailwind bg class for icon badge. Default: "bg-blue-50"
 * iconColor         {string}      Tailwind text class for icon. Default: "text-blue-700"
 * title             {string|ReactNode}
 * subtitle          {string|ReactNode}
 * meta              {Array<{ label, value, badge?, badgeClass? }>}
 * actions           {ReactNode}   Rendered at the bottom-right.
 * children          {ReactNode}   Extra content between meta and actions.
 *
 * Full slot overrides (replace entire sections)
 * ─────────────────────────────────────────────
 * renderHeader      {Function}    () => ReactNode — replaces icon+title+subtitle block
 * renderMeta        {Function}    () => ReactNode — replaces meta list
 * renderBody        {Function}    () => ReactNode — replaces children slot
 * renderActions     {Function}    () => ReactNode — replaces actions row
 * renderCard        {Function}    () => ReactNode — replaces the ENTIRE card interior
 *
 * State & variant
 * ───────────────
 * selected          {boolean}     Applies selected variant styling.
 * variant           {"default"|"selected"|"danger"|"success"|"warning"|"ghost"|string}
 * variantClassMap   {Object}      Custom variant → className map (merged with defaults).
 *
 * Behaviour
 * ─────────
 * onClick           {Function}    Makes the whole card clickable.
 * href              {string}      Wraps card in an <a> tag instead.
 * disabled          {boolean}     Dims card and disables interaction.
 *
 * Style
 * ─────
 * className         {string}      Extra classes applied to the outer wrapper.
 * headerClassName   {string}
 * metaClassName     {string}
 * bodyClassName     {string}
 * actionsClassName  {string}
 * iconSize          {string}      Tailwind size for icon badge. Default: "w-10 h-10"
 */
const DEFAULT_VARIANTS = {
  default:  "border-gray-200 bg-white",
  selected: "border-blue-300 bg-blue-50",
  danger:   "border-red-300   bg-red-50",
  success:  "border-green-300 bg-green-50",
  warning:  "border-yellow-300 bg-yellow-50",
  ghost:    "border-transparent bg-transparent shadow-none",
};

const AppCard = ({
  // Convenience props
  icon,
  iconBg = "bg-blue-50",
  iconColor = "text-blue-700",
  title,
  subtitle,
  meta = [],
  actions,
  children,

  // Slot overrides
  renderHeader,
  renderMeta,
  renderBody,
  renderActions,
  renderCard: renderCardFull,

  // Variant / state
  selected = false,
  variant = "default",
  variantClassMap = {},
  disabled = false,

  // Behaviour
  onClick,
  href,

  // Style
  className = "",
  headerClassName = "",
  metaClassName = "",
  bodyClassName = "",
  actionsClassName = "",
  iconSize = "w-10 h-10",
}) => {
  const variantMap = { ...DEFAULT_VARIANTS, ...variantClassMap };
  const activeVariant = selected ? "selected" : variant;
  const variantClass = variantMap[activeVariant] ?? variantMap.default;

  const disabledClass = disabled ? "opacity-50 pointer-events-none" : "";
  const clickableClass = (onClick || href) && !disabled
    ? "cursor-pointer hover:shadow-md active:scale-[0.99] transition-transform"
    : "";

  const baseClass = `rounded-xl border shadow-sm transition-all p-5 flex flex-col min-w-0 overflow-hidden ${variantClass} ${disabledClass} ${clickableClass} ${className}`;

  // ─── Default header ───────────────────────────────────────────────────────
  const defaultHeader = (
    <div className={`flex items-start gap-3 min-w-0 ${headerClassName}`}>
      {icon && (
        <div
          className={`${iconSize} rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {title && (
          <h4
            className="text-base font-semibold text-gray-800 truncate leading-snug"
            title={typeof title === "string" ? title : undefined}
          >
            {title}
          </h4>
        )}
        {subtitle && (
          <p
            className="text-sm text-gray-500 mt-1 line-clamp-2"
            title={typeof subtitle === "string" ? subtitle : undefined}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  // ─── Default meta ─────────────────────────────────────────────────────────
  const defaultMeta = meta.length > 0 && (
    <div className={`mt-4 space-y-2 min-w-0 ${metaClassName}`}>
      {meta.map((item, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
          <span className="font-medium shrink-0">{item.label}:</span>
          {item.badge ? (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold truncate max-w-full ${item.badgeClass || "bg-blue-50 text-blue-700"}`}
              title={item.value}
            >
              {item.value ?? "N/A"}
            </span>
          ) : (
            <span className="truncate min-w-0 flex-1" title={item.value}>
              {item.value ?? "N/A"}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  // ─── Default actions ──────────────────────────────────────────────────────
  const defaultActions = actions && (
    <div className={`mt-5 flex justify-end gap-2 flex-wrap ${actionsClassName}`}>
      {actions}
    </div>
  );

  // ─── Card interior ────────────────────────────────────────────────────────
  const interior = renderCardFull ? (
    renderCardFull()
  ) : (
    <>
      {renderHeader ? renderHeader() : defaultHeader}
      {renderMeta ? renderMeta() : defaultMeta}
      {(children || renderBody) && (
        <div className={`mt-4 min-w-0 ${bodyClassName}`}>
          {renderBody ? renderBody() : children}
        </div>
      )}
      {renderActions ? renderActions() : defaultActions}
    </>
  );

  // ─── Wrapper ──────────────────────────────────────────────────────────────
  if (href) {
    return (
      <a href={href} className={baseClass} aria-disabled={disabled}>
        {interior}
      </a>
    );
  }

  return (
    <div
      className={baseClass}
      onClick={disabled ? undefined : onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={
        onClick && !disabled
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(e)
          : undefined
      }
    >
      {interior}
    </div>
  );
};

export default AppCard;