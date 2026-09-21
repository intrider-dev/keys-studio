export type Hand = "left" | "right" | "both";
export type Mode = "practice" | "game";
export type SoundOutput = "browser" | "yamaha" | "off";

export interface Note {
  pitch: number;
  start: number;
  duration: number;
  hand: Exclude<Hand, "both">;
  velocity?: number;
}
export interface TargetNote extends Note {
  id: number;
  status: "pending" | "hit" | "miss";
}
export interface Song {
  id?: string;
  source?: string;
  adaptation?: string;
  name: string;
  notes: Note[];
  bpm: number;
  beatsPerBar: number;
  bars: number;
  signature: string;
}
export interface Settings {
  instrument: number;
  visual: VisualSettings;
  bpm: number;
  mode: Mode;
  hand: Hand;
  window: number;
  latency: number;
  hold: boolean;
  firstBar: number;
  lastBar: number;
  loop: boolean;
  metronome: boolean;
  backing: boolean;
  sound: SoundOutput;
}
export type FeedbackType =
  | "correct"
  | "perfect"
  | "good"
  | "early"
  | "late"
  | "tooEarly"
  | "wrong"
  | "miss"
  | "short"
  | "finish";
export interface Feedback {
  type: FeedbackType;
  pitch?: number;
  beat: number;
  delta?: number;
  points?: number;
  note?: TargetNote;
}
export interface RecordResult {
  score: number;
  combo: number;
  accuracy: number | null;
}
export interface MidiStatus {
  connected: boolean;
  output: boolean;
  name: string | null;
  error: string | null;
  received: number;
  lastNote?: number | null;
}
export interface MidiEvent {
  type: "on" | "off" | "control";
  note: number;
  velocity: number;
  channel: number;
  timestamp: number;
}
export interface Result extends RecordResult {
  misses: number;
  wrong: number;
  short: number;
  hits: number;
  testInput: boolean;
}
export interface Snapshot {
  song: Song;
  settings: Settings;
  device: MidiStatus;
  loading: boolean;
  running: boolean;
  preview: boolean;
  finished: boolean;
  waiting: boolean;
  beat: number;
  start: number;
  end: number;
  score: number;
  accuracy: number | null;
  combo: number;
  bestCombo: number;
  hits: number;
  misses: number;
  wrong: number;
  short: number;
  feedback: Feedback[];
  recentFeedback: Feedback | null;
  expected: number[];
  lastKey: { pitch: number; source: string } | null;
  record: RecordResult;
  result: Result | null;
  notice: string;
}
export const DEFAULT_SETTINGS: Settings = {
  instrument: 0,
  visual: {
    dancer: false,
    dancerEmotion: "auto",
    dancerMode: "2d",
    dancerX: 0.9,
    dancerY: 0.2,
    view: "3d",
    sheetColumns: 2,
    sheetRows: 2,
    brightness: 1,
    right: "#67dbff",
    left: "#bca3ff",
    background: "aurora",
    image: "",
    opacity: 0.35,
    speed: 3.5,
  },
  bpm: 90,
  mode: "practice",
  hand: "right",
  window: 180,
  latency: 0,
  hold: true,
  firstBar: 1,
  lastBar: 53,
  loop: false,
  metronome: false,
  backing: true,
  sound: "browser",
};

export interface VisualSettings {
  dancer: boolean;
  dancerEmotion: "auto" | "neutral" | "happy" | "wink" | "surprised" | "sad";
  dancerMode: "2d" | "3d";
  dancerX: number;
  dancerY: number;
  view: "top" | "3d" | "sheet";
  sheetColumns: number;
  sheetRows: number;
  brightness: number;
  right: string;
  left: string;
  background: "plain" | "aurora" | "sunset" | "image";
  image: string;
  opacity: number;
  speed: number;
}
