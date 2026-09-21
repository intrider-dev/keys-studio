import type { MidiEvent, MidiStatus } from "../practice/types";

export const disconnected: MidiStatus = {
  connected: false,
  output: false,
  name: null,
  error: null,
  received: 0,
};

export async function midiRequest<T = { ok: boolean }>(
  path: string,
  body = {},
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "Не удалось выполнить MIDI-команду.");
  return result;
}

export function connectMidi(
  onEvent: (event: MidiEvent) => void,
  onStatus: (status: MidiStatus) => void,
  onInterrupted: () => void,
) {
  const abort = new AbortController();
  const events = new EventSource("/api/events");
  let disposed = false;
  async function refresh() {
    try {
      const response = await fetch("/api/status", { signal: abort.signal });
      if (!response.ok) throw new Error("MIDI bridge unavailable");
      const status = (await response.json()) as MidiStatus;
      if (!disposed) onStatus(status);
    } catch {
      if (!disposed)
        onStatus({
          ...disconnected,
          error: "Нет связи с локальной программой. Запустите start.cmd.",
        });
    }
  }
  events.onmessage = (event) => {
    try {
      onEvent(JSON.parse(event.data) as MidiEvent);
    } catch {
      /* Ignore malformed transport data. */
    }
  };
  events.onopen = refresh;
  events.onerror = () => {
    if (!disposed) onInterrupted();
  };
  void refresh();
  const timer = window.setInterval(refresh, 3000);
  return {
    async reconnect() {
      await midiRequest("connect");
      await refresh();
    },
    dispose() {
      disposed = true;
      abort.abort();
      events.close();
      window.clearInterval(timer);
    },
  };
}
