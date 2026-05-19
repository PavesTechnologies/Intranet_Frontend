export function toBurndownDatasets(dailyBurnup, initialPoints) {
  const labels = dailyBurnup.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const actualRemaining = dailyBurnup.map((d) =>
    d.completedPoints !== null && d.completedPoints !== undefined
      ? initialPoints - d.completedPoints
      : null
  );

  const idealRemaining = dailyBurnup.map((d) =>
    initialPoints - d.idealCompletedPoints
  );

  return { labels, actualRemaining, idealRemaining };
}

export function toBurnupDatasets(dailyBurnup) {
  const labels = dailyBurnup.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const completed  = dailyBurnup.map((d) => d.completedPoints  ?? null);
  const totalScope = dailyBurnup.map((d) => d.totalScopePoints ?? null);
  const ideal      = dailyBurnup.map((d) => d.idealCompletedPoints);

  return { labels, completed, totalScope, ideal };
}

export function toVelocityData(dailyBurnup) {
  return dailyBurnup.map((d) => d.velocityPoints ?? 0);
}

export function toScopeMarkers(scopeChanges) {
  return scopeChanges
    .filter((s) => s.pointsDelta !== 0 && s.pointsDelta !== null)
    .map((s) => ({
      dayNumber:  s.sprintDayNumber,
      type:       s.pointsDelta > 0 ? "added" : "removed",
      delta:      s.pointsDelta,
      label:      s.issueTitle,
      changeType: s.changeType,
      date:       s.date,
    }));
}

export function toVelocitySummary(dailyBurnup, sprintData) {
  const velocities = dailyBurnup
    .map((d) => d.velocityPoints ?? 0)
    .filter((v) => v > 0);

  const avgVelocity = velocities.length > 0
    ? Math.round((velocities.reduce((a, b) => a + b, 0) / velocities.length) * 10) / 10
    : 0;

  const bestDay = dailyBurnup.reduce(
    (best, d) => {
      const v = d.velocityPoints ?? 0;
      return v > (best.velocity ?? 0) ? { velocity: v, dayNumber: d.sprintDayNumber } : best;
    },
    { velocity: 0, dayNumber: null }
  );

  const totalCompleted = sprintData?.completedStoryPoints ?? 0;
  const remaining      = sprintData?.remainingStoryPoints ?? 0;

  let projectedCompletion = null;
  if (avgVelocity > 0 && remaining > 0) {
    const daysLeft = Math.ceil(remaining / avgVelocity);
    const today    = new Date();
    today.setDate(today.getDate() + daysLeft);
    projectedCompletion = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const endDate  = sprintData?.endDate ? new Date(sprintData.endDate) : null;
  const projDate = projectedCompletion ? new Date(projectedCompletion) : null;
  const onTime   = endDate && projDate ? projDate <= endDate : remaining === 0;

  return { avgVelocity, bestDay, totalCompleted, projectedCompletion, onTime };
}