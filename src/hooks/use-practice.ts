import { useEffect, useState, useSyncExternalStore } from "react";
import { PracticeSession } from "@/features/practice/session";

const keys: Record<string, number> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
};

export function usePractice() {
  const [session] = useState(() => new PracticeSession());
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => session.mount(), [session]);
  useEffect(() => {
    let octave = 0;
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing)
        return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'input, select, textarea, [contenteditable="true"], [role="slider"], [role="combobox"], [role="dialog"]',
        ) ||
        session.getSnapshot().result
      )
        return;
      if (event.code === "Space") {
        if (
          target.closest(
            'button, [role="button"], [role="switch"], [role="tab"]',
          )
        )
          return;
        event.preventDefault();
        if (!event.repeat) void session.toggle();
        return;
      }
      if (event.repeat) return;
      if (event.code === "BracketLeft") octave = Math.max(-2, octave - 1);
      if (event.code === "BracketRight") octave = Math.min(2, octave + 1);
      if (event.code in keys) {
        event.preventDefault();
        session.press(60 + keys[event.code] + octave * 12, event.code);
      }
    };
    const keyup = (event: KeyboardEvent) => session.release(event.code);
    const blur = () => session.releaseComputerKeys();
    const visibility = () => {
      if (document.hidden) session.pause();
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [session]);
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("test")) return;
    const harness = {
      get state() {
        return { ...session.getSnapshot(), notes: session.engine.notes };
      },
      press: (pitch: number) => session.press(pitch, `test:${pitch}`),
      release: (pitch: number) => session.release(`test:${pitch}`),
      setBeat: session.testing.setBeat,
      advance: session.testing.advance,
      reset: () => session.reset(),
    };
    Object.assign(window, { trainerTest: harness });
    return () => {
      Reflect.deleteProperty(window, "trainerTest");
    };
  }, [session]);
  return { session, state };
}
