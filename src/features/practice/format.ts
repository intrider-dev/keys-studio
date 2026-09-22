import type { FeedbackType, Hand } from "./types";
import { getLocale } from "../../lib/i18n";
export const number = {
  format: (value: number) =>
    new Intl.NumberFormat(getLocale() === "ru" ? "ru-RU" : "en-US").format(
      value,
    ),
};
export function countLabel(value: number, kind: "notes" | "bars") {
  const forms =
    getLocale() === "en"
      ? kind === "notes"
        ? ["note", "notes", "notes"]
        : ["bar", "bars", "bars"]
      : kind === "notes"
        ? ["нота", "ноты", "нот"]
        : ["такт", "такта", "тактов"];
  const category = new Intl.PluralRules(getLocale()).select(value);
  return `${number.format(value)} ${forms[category === "one" ? 0 : category === "few" ? 1 : 2]}`;
}
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
