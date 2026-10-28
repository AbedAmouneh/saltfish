export const FEEDBACK_TAGS = ["food", "service", "vibe", "speed", "music"] as const;
export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];
