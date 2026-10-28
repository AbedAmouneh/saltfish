/** Shared by the browser and the server. */
export const GAMES = ["handroll-rush", "catch", "trivia"] as const;
export type GameId = (typeof GAMES)[number];
export const PERIODS = ["tonight", "week", "all"] as const;
export type Period = (typeof PERIODS)[number];

/** Plausibility limits used to reject impossible scores. */
export const GAME_LIMITS: Record<GameId, { max: number; perSecond: number; minSeconds: number }> = {
  "handroll-rush": { max: 8000, perSecond: 180, minSeconds: 5 },
  catch: { max: 30000, perSecond: 80, minSeconds: 2 },
  trivia: { max: 2000, perSecond: 250, minSeconds: 8 },
};

export type LeaderRow = { nickname: string; score: number; branch: string | null; tableNo: number | null; at: string };
