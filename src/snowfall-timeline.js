// Та же временная шкала, что в мобильном SnowfallTimeline.
export function snowTimeline(elapsed, reduced) {
  const start = reduced ? 0 : 0.7;
  const end = reduced ? 1.3 : 9.3;
  const fade = reduced ? 0.3 : 0.7;
  return {
    finished: elapsed >= (reduced ? 1.6 : 10),
    opacity: Math.max(0, Math.min(1, (elapsed - start) / 0.3)) *
      Math.max(0, Math.min(1, (end + fade - elapsed) / fade)),
  };
}

