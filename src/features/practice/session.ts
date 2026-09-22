import { Trainer } from "@/engine.js";
import { PianoAudio } from "@/audio.js";
import { connectMidi, disconnected, midiRequest } from "../midi/connection";
import {
  lastEntry,
  readEntry,
  saveEntry,
  songId,
  parseBundle,
  cleanSettings,
  download,
  type LibraryEntry,
} from "./library";
import { Midi, parseMidi } from "./midi-file";
import { readRecord, saveRecord } from "./records";
import {
  DEFAULT_SETTINGS,
  type Feedback,
  type Result,
  type Settings,
  type Snapshot,
  type Song,
} from "./types";

/** Owns the transport and scoring clock. React consumes immutable snapshots. */
export class PracticeSession {
  song: Song = {
    name: "Первые шаги",
    notes: [],
    bpm: 90,
    bars: 1,
    beatsPerBar: 4,
    signature: "4/4",
  };
  settings: Settings = { ...DEFAULT_SETTINGS };
  engine = new Trainer();
  readonly audio = new PianoAudio();
  readonly held = new Set<number>();
  private sources = new Map<string, number>();
  private listeners = new Set<() => void>();
  private renderers = new Set<() => void>();
  private played = new Set<number>();
  private device = { ...disconnected };
  private midi: ReturnType<typeof connectMidi> | null = null;
  private frameId = 0;
  private generation = 0;
  private mounted = false;
  private frameTime = 0;
  private lastPublish = 0;
  private lastClick = -Infinity;
  private feedbackTime = 0;
  private recentFeedback: Feedback | null = null;
  private result: Result | null = null;
  private notice = "";
  private dismissedDeviceError: string | null = null;
  private loading = false;
  private preview = false;
  private testInput = false;
  private hadHits = false;
  private sentAudio = false;
  private instrumentRequest = 0;
  private midiInstrumentQueue: Promise<unknown> = Promise.resolve();
  private lastKey: Snapshot["lastKey"] = null;
  private snapshot: Snapshot;

  constructor() {
    this.engine = this.createEngine();
    this.snapshot = this.createSnapshot();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  subscribeScene(renderer: () => void) {
    this.renderers.add(renderer);
    return () => {
      this.renderers.delete(renderer);
    };
  }

  mount() {
    this.mounted = true;
    this.midi = connectMidi(
      (event) => {
        const source = `midi:${event.channel}:${event.note}`;
        if (event.type === "on") this.press(event.note, source);
        else if (event.type === "off") this.release(source);
      },
      (status) => {
        if (status.error !== this.device.error)
          this.dismissedDeviceError = null;
        this.device = status;
        this.publish();
      },
      () => {
        if (!this.device.connected && this.settings.sound !== "yamaha") return;
        this.pause();
        this.notice =
          "Связь с MIDI прервана. Попытка на паузе; подключение восстанавливается.";
        this.publish();
      },
    );
    this.frameTime = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
    const abort = new AbortController();
    if (!this.song.notes.length) {
      lastEntry()
        .catch(() => undefined)
        .then(async (entry) => {
          if (abort.signal.aborted) return null;
          if (entry) {
            this.selectEntry(entry);
            return null;
          }
          return fetch("/songs/practice-study.mid", { signal: abort.signal });
        })
        .then((response) => {
          if (!response) return null;
          if (!response.ok) throw new Error("Не удалось открыть учебный этюд.");
          return response.arrayBuffer();
        })
        .then((buffer) => {
          if (buffer && !abort.signal.aborted)
            return this.loadSong(buffer, "Первые шаги");
        })
        .catch((error) => {
          if (!abort.signal.aborted) this.notify(error.message);
        });
    }
    return () => {
      this.mounted = false;
      this.generation++;
      this.loading = false;
      abort.abort();
      cancelAnimationFrame(this.frameId);
      this.midi?.dispose();
      this.pause();
    };
  }

  private createEngine() {
    return new Trainer(this.song.notes, {
      bpm: this.settings.bpm,
      mode: this.preview ? "demo" : this.settings.mode,
      hand: this.preview ? "both" : this.settings.hand,
      window: this.settings.window,
      latency: this.settings.latency,
      hold: this.settings.hold,
      start: (this.settings.firstBar - 1) * this.song.beatsPerBar,
      end: this.settings.lastBar * this.song.beatsPerBar,
    });
  }

  private createSnapshot(): Snapshot {
    const e = this.engine;
    return {
      song: this.song,
      settings: this.settings,
      device: this.device,
      loading: this.loading,
      running: e.running,
      preview: this.preview,
      finished: e.finished,
      waiting: e.waiting,
      beat: e.beat,
      start: e.options.start,
      end: e.end,
      score: e.score,
      accuracy: e.accuracy,
      combo: e.combo,
      bestCombo: e.bestCombo,
      hits: e.hits,
      misses: e.misses,
      wrong: e.wrong,
      short: e.short,
      feedback: e.feedback.filter((f) => f.type !== "finish").slice(0, 6),
      recentFeedback:
        performance.now() - this.feedbackTime < 950
          ? this.recentFeedback
          : null,
      expected: e.waiting
        ? e.notes
            .filter(
              (n) =>
                n.status === "pending" && Math.abs(n.start - e.beat) < 0.02,
            )
            .map((n) => n.pitch)
        : [],
      lastKey: this.lastKey,
      record: readRecord(this.song, this.settings),
      result: this.result,
      notice:
        this.notice ||
        (this.device.error === this.dismissedDeviceError
          ? ""
          : this.device.error) ||
        "",
    };
  }

  publish() {
    this.snapshot = this.createSnapshot();
    this.listeners.forEach((listener) => listener());
  }
  notify(message: string) {
    this.notice = message;
    this.publish();
  }
  dismissNotice = () => {
    this.dismissedDeviceError = this.device.error;
    this.notify("");
  };
  closeResult = () => {
    this.result = null;
    this.publish();
  };

  private stopSound() {
    this.audio.stop();
    this.played.clear();
    if (this.sentAudio) {
      this.sentAudio = false;
      void midiRequest("panic").catch(() => {});
    }
  }
  pause = () => {
    this.generation++;
    this.loading = false;
    this.engine.pause();
    this.held.clear();
    this.sources.clear();
    this.stopSound();
    this.publish();
  };

  reset = (preview = false) => {
    this.generation++;
    this.loading = false;
    this.engine.pause();
    this.stopSound();
    this.held.clear();
    this.sources.clear();
    this.preview = preview;
    this.engine = this.createEngine();
    this.result = null;
    this.recentFeedback = null;
    this.lastClick = -Infinity;
    this.testInput = false;
    this.hadHits = false;
    this.publish();
  };

  updateSettings = (patch: Partial<Settings>) => {
    const previousInstrument = this.settings.instrument;
    this.settings = { ...this.settings, ...patch };
    this.settings.bpm = Number.isFinite(this.settings.bpm)
      ? Math.min(240, Math.max(30, this.settings.bpm))
      : this.engine.options.bpm;
    this.settings.latency = Math.min(
      250,
      Math.max(-250, this.settings.latency),
    );
    this.settings.firstBar = Math.min(
      this.song.bars,
      Math.max(1, Math.round(this.settings.firstBar)),
    );
    this.settings.lastBar = Math.max(
      this.settings.firstBar,
      Math.min(this.song.bars, Math.round(this.settings.lastBar)),
    );
    this.persist();
    const liveOptions = [
      "instrument",
      "bpm",
      "loop",
      "metronome",
      "backing",
      "visual",
    ];
    if (Object.keys(patch).every((key) => liveOptions.includes(key))) {
      this.engine.options.bpm = this.settings.bpm;
      this.publish();
      if (this.settings.instrument !== previousInstrument)
        void this.changeInstrument();
    } else this.reset();
  };

  private async changeInstrument() {
    const request = ++this.instrumentRequest;
    const program = this.settings.instrument;
    const generation = this.generation;
    try {
      if (this.settings.sound === "browser") {
        await this.audio.prepare(
          this.song.notes.map((n) => n.pitch),
          program,
        );
      } else if (this.settings.sound === "yamaha") {
        this.midiInstrumentQueue = this.midiInstrumentQueue
          .catch(() => {})
          .then(async () => {
            if (
              request !== this.instrumentRequest ||
              generation !== this.generation
            )
              return;
            await midiRequest("instrument", { program });
            if (
              request === this.instrumentRequest &&
              generation === this.generation &&
              this.engine.running
            ) {
              this.played.clear();
              this.playAccompaniment(this.engine.beat, true);
            }
          });
        await this.midiInstrumentQueue;
      }
    } catch (error) {
      if (request === this.instrumentRequest && generation === this.generation)
        this.notify(
          error instanceof Error
            ? error.message
            : "Не удалось сменить инструмент.",
        );
    }
  }

  private persist() {
    void saveEntry(this.song, this.settings).catch(() =>
      this.notify(
        "Не удалось сохранить библиотеку. Проверьте свободное место в браузере.",
      ),
    );
  }
  selectEntry = (entry: LibraryEntry) => {
    this.song = entry.song;
    this.settings = cleanSettings(entry.settings, this.song.bars);
    this.notice = this.song.adaptation ?? "";
    this.reset();
    this.persist();
  };
  async loadSong(buffer: ArrayBuffer, name: string, source?: string) {
    const song = parseMidi(buffer, name);
    song.id = await songId(song);
    song.source = source;
    const stored = await readEntry(song.id).catch(() => undefined);
    this.selectEntry(
      stored ?? {
        song,
        settings: cleanSettings(
          {
            ...DEFAULT_SETTINGS,
            bpm: Math.min(120, song.bpm),
            lastBar: song.bars,
            hand: song.notes.some((n) => n.hand === "right") ? "right" : "both",
          },
          song.bars,
        ),
        updated: Date.now(),
      },
    );
  }
  importFile = async (file: File) => {
    this.pause();
    try {
      if (file.size > 12_000_000)
        throw new Error("Выберите файл размером до 12 МБ.");
      if (/\.pianopack$/i.test(file.name)) {
        const entry = parseBundle(await file.text());
        entry.song.id = await songId(entry.song);
        this.selectEntry(entry);
      } else {
        if (!/\.midi?$/i.test(file.name))
          throw new Error(
            "Поддерживаются .mid, .midi и .pianopack. Из MuseScore экспортируйте MIDI. PDF не содержит игровых событий.",
          );
        await this.loadSong(
          await file.arrayBuffer(),
          file.name.replace(/\.midi?$/i, ""),
        );
      }
    } catch (error) {
      this.notify(
        error instanceof Error
          ? error.message
          : "Не удалось открыть произведение.",
      );
    }
  };
  exportSong = (midi = false) => {
    if (midi) {
      const file = new Midi();
      file.header.setTempo(this.song.bpm);
      for (const hand of ["left", "right"] as const) {
        const track = file.addTrack();
        track.name = hand;
        track.instrument.number = this.settings.instrument;
        for (const n of this.song.notes.filter((n) => n.hand === hand))
          track.addNote({
            midi: n.pitch,
            ticks: Math.round(n.start * file.header.ppq),
            durationTicks: Math.round(n.duration * file.header.ppq),
            velocity: n.velocity ?? 0.8,
          });
      }
      const [num, den] = this.song.signature.split("/").map(Number);
      file.header.timeSignatures.push({ ticks: 0, timeSignature: [num, den] });
      download(
        this.song.name + ".mid",
        new Blob([new Uint8Array(file.toArray())], { type: "audio/midi" }),
      );
    } else
      download(
        this.song.name + ".pianopack",
        new Blob(
          [
            JSON.stringify({
              format: "piano-practice",
              version: 1,
              song: this.song,
              settings: this.settings,
            }),
          ],
          { type: "application/json" },
        ),
      );
  };

  private async begin() {
    if (!this.engine.notes.length) {
      this.notify(
        "В выбранном фрагменте нет нот этой партии. Выберите другую руку или расширьте фрагмент.",
      );
      return;
    }
    const generation = ++this.generation;
    this.loading = true;
    this.publish();
    try {
      if (this.settings.sound === "browser") {
        do {
          await this.audio.prepare(
            this.song.notes.map((n) => n.pitch),
            this.settings.instrument,
          );
        } while (
          generation === this.generation &&
          this.audio.program !== this.settings.instrument
        );
      } else if (this.settings.sound !== "off") {
        await this.audio.init();
        await midiRequest("instrument", { program: this.settings.instrument });
      }
      if (generation !== this.generation || !this.mounted) return;
      this.engine.running = true;
      if (this.engine.beat >= this.engine.options.start)
        this.playAccompaniment(this.engine.beat, true);
      this.frameTime = performance.now();
      this.notice = "";
    } catch (error) {
      if (generation === this.generation)
        this.notice =
          error instanceof Error ? error.message : "Звук недоступен.";
    } finally {
      if (generation === this.generation) {
        this.loading = false;
        this.publish();
      }
    }
  }

  toggle = async () => {
    await this.togglePause();
  };
  togglePause = async () => {
    if (this.loading || !this.song.notes.length) return;
    if (this.engine.running) this.pause();
    else {
      if (this.engine.finished) this.reset();
      await this.begin();
    }
  };
  demo = async () => {
    if (this.loading || !this.song.notes.length) return;
    if (this.preview && this.engine.running) {
      this.reset();
      return;
    }
    this.reset(true);
    await this.begin();
  };
  again = () => {
    this.reset();
    void this.begin();
  };
  restart = () => this.reset(this.preview);
  reconnect = async () => {
    this.pause();
    try {
      await this.midi?.reconnect();
      this.notice = "";
      this.publish();
    } catch (error) {
      this.notify(
        error instanceof Error ? error.message : "Не удалось подключить MIDI.",
      );
    }
  };

  press = (pitch: number, source = "pointer") => {
    if (this.sources.has(source)) return;
    this.sources.set(source, pitch);
    this.held.add(pitch);
    this.lastKey = {
      pitch,
      source: source.startsWith("midi:") ? "Yamaha" : "Клавиатура",
    };
    if (!source.startsWith("midi:")) {
      this.testInput = true;
      if (this.settings.sound === "browser") {
        const generation = this.generation;
        void this.audio
          .prepare([pitch], this.settings.instrument)
          .then(() => {
            if (
              generation === this.generation &&
              this.mounted &&
              this.sources.get(source) === pitch
            )
              this.audio.play(pitch, 0.4, 0.6);
          })
          .catch(() => {});
      }
    }
    if (this.engine.press(pitch)) this.hadHits = true;
    this.processEvents();
    this.publish();
  };
  release = (source: string) => {
    const pitch = this.sources.get(source);
    if (pitch == null) return;
    this.sources.delete(source);
    if (![...this.sources.values()].includes(pitch)) {
      this.held.delete(pitch);
      this.engine.release(pitch);
    }
    this.processEvents();
    this.publish();
  };
  releaseComputerKeys() {
    for (const source of this.sources.keys())
      if (!source.startsWith("midi:")) this.release(source);
  }

  private processEvents() {
    for (const event of this.engine.events.splice(0)) {
      if (event.type === "finish") {
        this.finish();
        continue;
      }
      this.recentFeedback = event;
      this.feedbackTime = performance.now();
    }
  }

  private finish() {
    this.stopSound();
    if (this.preview) {
      this.reset();
      return;
    }
    const e = this.engine;
    const result: Result = {
      score: e.score,
      combo: e.bestCombo,
      accuracy: e.accuracy,
      hits: e.hits,
      misses: e.misses,
      wrong: e.wrong,
      short: e.short,
      testInput: this.testInput,
    };
    if (this.hadHits && !this.testInput)
      saveRecord(this.song, this.settings, result);
    if (this.settings.loop) {
      this.reset();
      this.engine.running = true;
    } else this.result = result;
    this.publish();
  }

  private playAccompaniment(before: number, resume = false) {
    const sounding = this.song.notes.filter((note, i) => {
      if (
        this.played.has(i) ||
        note.start < this.engine.options.start ||
        note.start >= this.engine.options.end
      )
        return false;
      if (
        note.start > this.engine.beat + 1e-6 ||
        note.start + note.duration <= this.engine.beat ||
        (!resume && note.start < before - 0.02)
      )
        return false;
      this.played.add(i);
      return (
        this.preview ||
        (this.settings.backing &&
          this.settings.hand !== "both" &&
          note.hand !== this.settings.hand)
      );
    });
    if (!sounding.length) return;
    if (this.settings.sound === "browser") {
      for (const note of sounding)
        this.audio.play(
          note.pitch,
          ((note.duration - Math.max(0, this.engine.beat - note.start)) * 60) /
            this.settings.bpm,
          note.hand === "left" ? 0.55 : 0.8,
        );
    } else if (this.settings.sound === "yamaha") {
      this.sentAudio = true;
      void midiRequest("play", {
        notes: sounding.map((note) => ({
          pitch: note.pitch,
          duration: Math.max(
            0.01,
            Math.min(
              30,
              ((note.duration - Math.max(0, this.engine.beat - note.start)) *
                60) /
                this.settings.bpm,
            ),
          ),
          velocity: note.hand === "left" ? 57 : 72,
          channel: note.hand === "left" ? 1 : 0,
        })),
      }).catch((error) => {
        this.pause();
        this.notify(error.message);
      });
    }
  }

  private frame = (now: number) => {
    if (!this.mounted) return;
    const delta = (now - this.frameTime) / 1000;
    this.frameTime = now;
    if (this.engine.running) {
      if (delta > 0.5) {
        this.pause();
        this.notice =
          "Пауза после задержки окна. Продолжите, когда будете готовы.";
      } else {
        const before = this.engine.beat;
        this.engine.tick(delta);
        if (
          this.settings.sound !== "off" &&
          (this.settings.metronome ||
            this.engine.beat < this.engine.options.start)
        ) {
          const beat = Math.floor(this.engine.beat);
          if (beat !== this.lastClick) {
            this.lastClick = beat;
            this.audio.click(beat % this.song.beatsPerBar === 0);
          }
        }
        this.playAccompaniment(before);
        this.processEvents();
      }
    }
    this.renderers.forEach((renderer) => renderer());
    if (now - this.lastPublish > 80) {
      this.lastPublish = now;
      this.publish();
    }
    this.frameId = requestAnimationFrame(this.frame);
  };

  /** Deterministic transport control for browser integration tests. */
  testing = {
    setBeat: (beat: number) => {
      this.engine.beat = beat;
      this.publish();
    },
    advance: (seconds: number) => {
      this.engine.tick(seconds);
      this.processEvents();
      this.publish();
    },
  };
}
