import type { Snapshot } from "./types";
export const MIKU_EMOTIONS = [
  "neutral",
  "happy",
  "wink",
  "surprised",
  "sad",
] as const;
export type MikuEmotion = (typeof MIKU_EMOTIONS)[number];
export function mikuEmotion(state: Snapshot): MikuEmotion {
  const selected = state.settings.visual.dancerEmotion;
  if (selected && selected !== "auto") return selected;
  const feedback = state.recentFeedback?.type;
  if (feedback && ["wrong", "miss", "short", "tooEarly"].includes(feedback))
    return "surprised";
  if (feedback && ["correct", "perfect", "good"].includes(feedback))
    return state.combo >= 10 ? "wink" : "happy";
  if (state.running && !state.waiting) return "happy";
  return "neutral";
}
