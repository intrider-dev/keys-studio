import { useSyncExternalStore } from "react";
import english from "../locales/en.json";

export type Locale = "ru" | "en";
const storageKey = "keys-studio.locale";
function initialLocale(): Locale {
  try {
    const query = new URLSearchParams(location.search).get("lang");
    if (query === "ru" || query === "en") return query;
    const saved = localStorage.getItem(storageKey);
    if (saved === "ru" || saved === "en") return saved;
    return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
  } catch {
    return "ru";
  }
}
let locale = initialLocale();
const listeners = new Set<() => void>();
export const getLocale = () => locale;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useLocale = () =>
  useSyncExternalStore(subscribe, getLocale, () => "ru" as Locale);
export function setLocale(next: Locale) {
  locale = next;
  try {
    localStorage.setItem(storageKey, next);
  } catch {
    /* Session-only choice when storage is unavailable. */
  }
  if (typeof location !== "undefined") {
    const url = new URL(location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", next);
      history.replaceState(null, "", url);
    }
  }
  updateDocument();
  listeners.forEach((listener) => listener());
}
function updateDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.title =
    locale === "ru" ? "Клавиши · Студия практики" : "Keys · Practice studio";
}
updateDocument();
const messages: Record<string, string> = english;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const templates = Object.entries(messages)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, translation]) => ({
    expression: new RegExp(
      "^" +
        key
          .split(/\{\d+\}/)
          .map(escape)
          .join("(.*?)") +
        "$",
    ),
    translation,
  }));

/** Russian source strings stay in state; translation happens at the UI boundary. */
export function t<T>(value: T): T {
  if (locale === "ru" || typeof value !== "string") return value;
  const key = value.replace(/\s+/g, " ").trim();
  let translated = messages[key];
  if (translated === undefined) {
    for (const template of templates) {
      const match = template.expression.exec(key);
      if (match) {
        translated = template.translation.replace(/\{(\d+)\}/g, (_, index) =>
          String(t(match[Number(index) + 1])),
        );
        break;
      }
    }
  }
  if (translated === undefined) return value;
  return ((/^\s/.test(value) ? " " : "") +
    translated +
    (/\s$/.test(value) ? " " : "")) as T;
}
