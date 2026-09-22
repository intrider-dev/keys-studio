import { get, set, del, keys } from "idb-keyval";
import { DEFAULT_SETTINGS, type Settings, type Song } from "./types";

export interface LibraryEntry {
  song: Song;
  settings: Settings;
  updated: number;
}
export async function songId(song: Song) {
  const bytes = new TextEncoder().encode(JSON.stringify(song.notes));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export const readEntry = (id: string) => get<LibraryEntry>(`song:${id}`);
export async function saveEntry(song: Song, settings: Settings) {
  if (!song.id) return;
  await set(`song:${song.id}`, { song, settings, updated: Date.now() });
  await set("last-song", song.id);
}
export async function lastEntry() {
  const id = await get<string>("last-song");
  return id ? readEntry(id) : undefined;
}
export async function listSongs() {
  const ids = (await keys()).filter(
    (k) => typeof k === "string" && k.startsWith("song:"),
  );
  return (await Promise.all(ids.map((k) => get<LibraryEntry>(k))))
    .filter((v): v is LibraryEntry => !!v)
    .sort((a, b) => b.updated - a.updated);
}
export const removeSong = (id: string) => del(`song:${id}`);
const finite = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
export function cleanSettings(
  raw: Partial<Settings> = {},
  bars: number,
): Settings {
  const d = DEFAULT_SETTINGS,
    v = raw.visual;
  const color = (s: unknown, fallback: string) =>
    typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s) ? s : fallback;
  return {
    ...d,
    bpm: finite(raw.bpm, 30, 240, d.bpm),
    instrument: Math.round(finite(raw.instrument, 0, 127, 0)),
    mode: raw.mode === "game" ? "game" : "practice",
    hand: ["both", "left", "right"].includes(raw.hand ?? "")
      ? raw.hand!
      : d.hand,
    sound: ["browser", "yamaha", "off"].includes(raw.sound ?? "")
      ? raw.sound!
      : d.sound,
    window: finite(raw.window, 50, 500, d.window),
    latency: finite(raw.latency, -250, 250, 0),
    firstBar: Math.round(finite(raw.firstBar, 1, bars, 1)),
    lastBar: Math.round(
      finite(
        raw.lastBar,
        Math.round(finite(raw.firstBar, 1, bars, 1)),
        bars,
        bars,
      ),
    ),
    hold: typeof raw.hold === "boolean" ? raw.hold : d.hold,
    loop: raw.loop === true,
    backing: typeof raw.backing === "boolean" ? raw.backing : d.backing,
    metronome: raw.metronome === true,
    visual: {
      dancer: v?.dancer === true,
      dancerEmotion: ["neutral", "happy", "wink", "surprised", "sad"].includes(
        v?.dancerEmotion ?? "",
      )
        ? v!.dancerEmotion
        : "auto",
      dancerMode: v?.dancerMode === "3d" ? "3d" : "2d",
      dancerX: finite(v?.dancerX, 0, 1, 0.9),
      dancerY: finite(v?.dancerY, 0, 1, 0.2),
      view: v?.view === "sheet" ? "sheet" : v?.view === "top" ? "top" : "3d",
      sheetColumns: Math.round(finite(v?.sheetColumns, 1, 6, 2)),
      sheetRows: Math.round(finite(v?.sheetRows, 1, 8, 2)),
      brightness: finite(v?.brightness, 0.3, 1.8, 1),
      right: color(v?.right, d.visual.right),
      left: color(v?.left, d.visual.left),
      background: ["plain", "aurora", "sunset", "image"].includes(
        v?.background ?? "",
      )
        ? v!.background
        : "aurora",
      image:
        typeof v?.image === "string" &&
        v.image.length < 4_000_000 &&
        /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(v.image)
          ? v.image
          : "",
      opacity: finite(v?.opacity, 0, 0.85, 0.35),
      speed: finite(v?.speed, 1.5, 7, 3.5),
    },
  };
}
export function parseBundle(text: string): LibraryEntry {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "Файл произведения повреждён. Попробуйте экспортировать его заново.",
    );
  }
  if (
    !data ||
    data.format !== "piano-practice" ||
    data.version !== 1 ||
    !data.song ||
    !Array.isArray(data.song.notes) ||
    !data.song.notes.length ||
    data.song.notes.length > 50000
  )
    throw new Error("Неизвестный формат произведения.");
  const raw = data.song;
  if (
    typeof raw.name !== "string" ||
    !raw.name.trim() ||
    raw.name.length > 200 ||
    !Number.isFinite(raw.beatsPerBar) ||
    raw.beatsPerBar <= 0 ||
    raw.beatsPerBar > 32
  )
    throw new Error("Некорректное произведение.");
  const notes = raw.notes
    .map((n: Song["notes"][number]) => {
      if (
        !n ||
        !Number.isInteger(n.pitch) ||
        n.pitch < 36 ||
        n.pitch > 96 ||
        !Number.isFinite(n.start) ||
        n.start < 0 ||
        n.start > 100000 ||
        !Number.isFinite(n.duration) ||
        n.duration <= 0 ||
        n.duration > 1000 ||
        !["left", "right"].includes(n.hand)
      )
        throw new Error("Некорректные ноты в файле.");
      return {
        pitch: n.pitch,
        start: n.start,
        duration: n.duration,
        hand: n.hand,
        velocity: finite(n.velocity, 0, 1, 0.8),
      };
    })
    .sort(
      (a: Song["notes"][number], b: Song["notes"][number]) =>
        a.start - b.start || a.pitch - b.pitch,
    );
  const song: Song = {
    name: raw.name,
    notes,
    beatsPerBar: raw.beatsPerBar,
    bpm: finite(raw.bpm, 30, 240, 120),
    bars: Math.ceil(
      Math.max(
        ...notes.map((n: Song["notes"][number]) => n.start + n.duration),
      ) / raw.beatsPerBar,
    ),
    signature: validSignature(raw.signature, raw.beatsPerBar),
    source:
      typeof raw.source === "string" && /^https:\/\//.test(raw.source)
        ? raw.source
        : undefined,
  };
  return {
    song,
    settings: cleanSettings(data.settings ?? {}, song.bars),
    updated: Date.now(),
  };
}

function validSignature(value: unknown, beatsPerBar: number): string {
  if (typeof value !== "string" || !/^\d+\/\d+$/.test(value))
    throw new Error("Некорректный музыкальный размер.");
  const [numerator, denominator] = value.split("/").map(Number);
  if (
    numerator < 1 ||
    numerator > 32 ||
    ![1, 2, 4, 8, 16, 32].includes(denominator) ||
    Math.abs((numerator * 4) / denominator - beatsPerBar) > 0.0001
  )
    throw new Error("Некорректный музыкальный размер.");
  return value;
}
export function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name.replace(/[<>:"/\\|?*]/g, "_");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
