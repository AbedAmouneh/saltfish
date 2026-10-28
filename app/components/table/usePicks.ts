import { useCallback, useEffect, useState } from "react";

type Picks = Record<string, number>;
const TTL = 6 * 60 * 60 * 1000; // a visit, not forever

/** "My picks" for one table, kept in this phone's browser only. */
export function usePicks(key: string) {
  const storageKey = `sf-picks:${key}`;
  const [picks, setPicks] = useState<Picks>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { at: number; picks: Picks };
      if (Date.now() - saved.at < TTL) setPicks(saved.picks);
      else localStorage.removeItem(storageKey);
    } catch {
      /* storage unavailable: picks just won't persist */
    }
  }, [storageKey]);

  const save = useCallback(
    (next: Picks) => {
      setPicks(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), picks: next }));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const change = useCallback(
    (id: string, delta: number) => {
      const qty = Math.max(0, Math.min(20, (picks[id] ?? 0) + delta));
      const next = { ...picks };
      if (qty) next[id] = qty;
      else delete next[id];
      save(next);
    },
    [picks, save],
  );

  const count = Object.values(picks).reduce((a, b) => a + b, 0);
  return { picks, change, clear: () => save({}), count };
}
