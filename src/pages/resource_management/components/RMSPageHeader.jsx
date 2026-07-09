const RMSPageHeader = ({
  title,
  subtitle,
  actions,
  className = "",
  titleClassName = "",
  subtitleClassName = "",
  children,
}) => (
  <div
    className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`.trim()}
  >
    <div className="min-w-0">
      <h1 className={`text-2xl font-semibold tracking-tight text-gray-900 ${titleClassName}`.trim()}>
        {title}
      </h1>
      {subtitle ? (
        <p className={`mt-1 text-sm text-gray-500 ${subtitleClassName}`.trim()}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </div>
    {actions ? <div className="flex items-center gap-3 shrink-0">{actions}</div> : null}
  </div>
);

export default RMSPageHeader;
