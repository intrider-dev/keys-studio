import type { FeedbackType, Hand } from "./types";
export const number = new Intl.NumberFormat("ru-RU");
export const handLabels: Record<Hand, string> = {
  left: "Левая рука",
  right: "Правая рука",
  both: "Обе руки",
};
export const feedbackLabels: Record<FeedbackType, string> = {
  correct: "Верно",
  perfect: "Точно!",
  good: "Хорошо",
  early: "Чуть раньше",
  late: "Чуть позже",
  tooEarly: "Слишком рано",
  wrong: "Другая клавиша",
  miss: "Пропущено",
  short: "Держите дольше",
  finish: "Завершено",
};
export const isError = (type: FeedbackType) =>
  ["wrong", "tooEarly", "miss", "short"].includes(type);
export const isTiming = (type: FeedbackType) =>
  ["early", "late"].includes(type);
export function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
