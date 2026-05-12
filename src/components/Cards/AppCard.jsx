import React from "react";

const DEFAULT_VARIANTS = {
  default: "border-gray-200 bg-white",
  selected: "border-blue-300 bg-blue-50",
  danger: "border-red-300 bg-red-50",
  success: "border-green-300 bg-green-50",
  warning: "border-yellow-300 bg-yellow-50",
  ghost: "border-transparent bg-transparent shadow-none",
};

const DENSITY_MAP = {
  compact: {
    padding: "p-3",
    gap: "gap-2",
    title: "text-sm",
    subtitle: "text-xs mt-0.5 line-clamp-1",
    meta: "mt-3 space-y-1",
    body: "mt-3",
    actions: "mt-3",
    iconSize: "w-8 h-8",
  },
  comfortable: {
    padding: "p-4",
    gap: "gap-3",
    title: "text-base",
    subtitle: "text-sm mt-1 line-clamp-2",
    meta: "mt-4 space-y-2",
    body: "mt-4",
    actions: "mt-4",
    iconSize: "w-10 h-10",
  },
  spacious: {
    padding: "p-5",
    gap: "gap-3",
    title: "text-base",
    subtitle: "text-sm mt-1 line-clamp-2",
    meta: "mt-4 space-y-2",
    body: "mt-4",
    actions: "mt-5",
    iconSize: "w-10 h-10",
  },
};

const AppCard = ({
  icon,
  iconBg = "bg-blue-50",
  iconColor = "text-blue-700",
  title,
  subtitle,
  meta = [],
  actions,
  children,

  renderHeader,
  renderMeta,
  renderBody,
  renderActions,
  renderCard: renderCardFull,

  selected = false,
  variant = "default",
  variantClassMap = {},
  disabled = false,

  onClick,
  href,

  className = "",
  headerClassName = "",
  metaClassName = "",
  bodyClassName = "",
  actionsClassName = "",

  iconSize,
  density = "comfortable",
  compact = false,
  cardWidth = "w-full",
  cardMaxWidth = "",
}) => {
  const resolvedDensity = compact ? "compact" : density;
  const densityStyle = DENSITY_MAP[resolvedDensity] || DENSITY_MAP.comfortable;

  const resolvedIconSize = iconSize || densityStyle.iconSize;

  const variantMap = { ...DEFAULT_VARIANTS, ...variantClassMap };
  const activeVariant = selected ? "selected" : variant;
  const variantClass = variantMap[activeVariant] ?? variantMap.default;

  const disabledClass = disabled ? "opacity-50 pointer-events-none" : "";

  const clickableClass =
    (onClick || href) && !disabled
      ? "cursor-pointer hover:shadow-md active:scale-[0.99] transition-transform"
      : "";

  const baseClass = `
    ${cardWidth} ${cardMaxWidth}
    rounded-xl border shadow-sm transition-all
    ${densityStyle.padding}
    flex flex-col min-w-0 overflow-hidden
    ${variantClass}
    ${disabledClass}
    ${clickableClass}
    ${className}
  `;

  const defaultHeader = (
    <div
      className={`flex items-start ${densityStyle.gap} min-w-0 ${headerClassName}`}
    >
      {icon && (
        <div
          className={`${resolvedIconSize} rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}
        >
          {icon}
        </div>
      )}

      <div className="min-w-0 flex-1">
        {title && (
          <h4
            className={`${densityStyle.title} font-semibold text-gray-800 truncate leading-snug`}
            title={typeof title === "string" ? title : undefined}
          >
            {title}
          </h4>
        )}

        {subtitle && (
          <p
            className={`${densityStyle.subtitle} text-gray-500`}
            title={typeof subtitle === "string" ? subtitle : undefined}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  const defaultMeta = meta.length > 0 && (
    <div className={`${densityStyle.meta} min-w-0 ${metaClassName}`}>
      {meta.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-2 text-sm text-gray-600 min-w-0"
        >
          <span className="font-medium shrink-0">{item.label}:</span>

          {item.badge ? (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold truncate max-w-full ${
                item.badgeClass || "bg-blue-50 text-blue-700"
              }`}
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

  const defaultActions = actions && (
    <div
      className={`${densityStyle.actions} flex justify-end gap-2 flex-wrap ${actionsClassName}`}
    >
      {actions}
    </div>
  );

  const interior = renderCardFull ? (
    renderCardFull()
  ) : (
    <>
      {renderHeader ? renderHeader() : defaultHeader}

      {renderMeta ? renderMeta() : defaultMeta}

      {(children || renderBody) && (
        <div className={`${densityStyle.body} min-w-0 ${bodyClassName}`}>
          {renderBody ? renderBody() : children}
        </div>
      )}

      {renderActions ? renderActions() : defaultActions}
    </>
  );

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