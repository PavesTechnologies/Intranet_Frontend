// Summary/preloadWidgets.js
export function preloadAllWidgets() {
  if (typeof window === "undefined") return;
  const imports = [
    () => import("../../../components/Summary/widgets/ScopeAndProgress"),
    () => import("../../../components/Summary/widgets/StatusOverview"),
    () => import("../../../components/Summary/widgets/PriorityDistribution"),
    () => import("../../../components/Summary/widgets/TypesOfWork"),
    () => import("../../../components/Summary/widgets/TeamWorkload"),
    () => import("../../../components/Summary/widgets/EpicProgress"),
  ];
  const runner = () => {
    imports.forEach(fn => fn().catch(() => {}));
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(runner, { timeout: 2000 });
  } else {
    setTimeout(runner, 1500);
  }
}
