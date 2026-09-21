import type {
  Note,
  TargetNote,
  Feedback,
  Hand,
  Mode,
} from "./features/practice/types";
export function noteName(pitch: number): string;
export interface EngineOptions {
  bpm: number;
  mode: Mode | "demo";
  hand: Hand;
  window: number;
  latency: number;
  hold: boolean;
  start: number;
  end: number;
}
export class Trainer {
  constructor(notes?: Note[], options?: Partial<EngineOptions>);
  source: Note[];
  notes: TargetNote[];
  options: EngineOptions;
  beat: number;
  end: number;
  running: boolean;
  finished: boolean;
  waiting: boolean;
  score: number;
  combo: number;
  bestCombo: number;
  hits: number;
  misses: number;
  wrong: number;
  short: number;
  accuracy: number | null;
  held: Map<number, TargetNote | null>;
  feedback: Feedback[];
  events: Feedback[];
  reset(): void;
  tick(seconds: number): void;
  press(pitch: number): Feedback | null;
  release(pitch: number): void;
  pause(): void;
}
