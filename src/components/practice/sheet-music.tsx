import { t, useLocale } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  scoreBar,
  scoreKey,
  type ScoreEvent,
} from "@/features/practice/notation";
import type { Snapshot } from "@/features/practice/types";
import type { PracticeSession } from "@/features/practice/session";
import { feedbackLabels, isError } from "@/features/practice/format";

type Mark = { element: SVGElement; event: ScoreEvent };

export function SheetMusic({
  state,
  session,
  fullscreen,
}: {
  state: Snapshot;
  session: PracticeSession;
  fullscreen: boolean;
}) {
  const locale = useLocale();
  const host = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const marks = useRef<Mark[]>([]);
  const [width, setWidth] = useState(800);
  const [manualPage, setManualPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const bar = Math.min(
    state.song.bars - 1,
    Math.max(
      0,
      Math.floor(Math.max(state.start, state.beat) / state.song.beatsPerBar),
    ),
  );
  const columns = state.settings.visual.sheetColumns;
  const rows = state.settings.visual.sheetRows;
  const perPage = columns * rows;
  const pages = Math.ceil(state.song.bars / perPage);
  const page = Math.min(pages - 1, manualPage ?? Math.floor(bar / perPage));
  const changeLayout = (field: "sheetColumns" | "sheetRows", value: number) => {
    const nextSize = field === "sheetColumns" ? value * rows : columns * value;
    if (manualPage !== null)
      setManualPage(Math.floor((page * perPage) / nextSize));
    session.updateSettings({
      visual: { ...state.settings.visual, [field]: value },
    });
  };
  const measures = useMemo(
    () =>
      Array.from(
        { length: Math.min(perPage, state.song.bars - page * perPage) },
        (_, i) => ({
          bar: page * perPage + i,
          right: scoreBar(
            state.song.notes,
            page * perPage + i,
            state.song.beatsPerBar,
            "right",
          ),
          left: scoreBar(
            state.song.notes,
            page * perPage + i,
            state.song.beatsPerBar,
            "left",
          ),
        }),
      ),
    [state.song, page, perPage],
  );

  useEffect(() => {
    setManualPage(null);
  }, [state.song]);
  useEffect(() => {
    if (!scroll.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(scroll.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    marks.current = [];
    void (async () => {
      const {
        Renderer,
        Stave,
        StaveNote,
        Voice,
        Formatter,
        StaveConnector,
        Accidental,
        StaveTie,
        Beam,
      } = await import("vexflow/bravura");
      await document.fonts.ready;
      if (cancelled || !host.current || width < 100) return;
      host.current.replaceChildren();
      const cellWidth = (width - 24) / columns;
      for (const measure of measures) {
        const wrapper = document.createElement("div");
        wrapper.dataset.measure = String(measure.bar);
        wrapper.className =
          "min-w-0 overflow-x-auto rounded-lg border border-transparent transition-colors";
        wrapper.setAttribute("aria-label", t(`Такт ${measure.bar + 1}`));
        host.current.append(wrapper);
        const events = [measure.right, measure.left];
        // Dense passages can scroll within their measure, never widen the page.
        const drawWidth = Math.max(
          cellWidth - 6,
          130 + Math.max(...events.map((e) => e.length)) * 34,
        );
        const renderer = new Renderer(wrapper, Renderer.Backends.SVG);
        renderer.resize(drawWidth, 250);
        const context = renderer.getContext();
        context.setFillStyle("#263347").setStrokeStyle("#263347");
        const staves = [
          new Stave(16, 22, drawWidth - 28),
          new Stave(16, 140, drawWidth - 28),
        ];
        staves[0].addClef("treble").addTimeSignature(state.song.signature);
        staves[1].addClef("bass").addTimeSignature(state.song.signature);
        for (const stave of staves) stave.setContext(context).draw();
        new StaveConnector(staves[0], staves[1])
          .setType(StaveConnector.type.BRACE)
          .setContext(context)
          .draw();
        context
          .setFont("Academico", 11)
          .fillText(String(measure.bar + 1), 18, 18);
        const voices = events.map((items, hand) => {
          const accidentals = new Map<string, string>();
          const notes = items.map((event) => {
            const clef = hand === 0 ? "treble" : "bass";
            const rest = !event.pitches.length;
            const note = new StaveNote({
              clef,
              keys: rest
                ? [hand === 0 ? "b/4" : "d/3"]
                : event.pitches.map(scoreKey),
              duration: String(4 / event.duration) + (rest ? "r" : ""),
              autoStem: true,
            });
            event.pitches.forEach((pitch, index) => {
              const key = scoreKey(pitch);
              const letter = key.replace("#", "");
              const accidental = key.includes("#") ? "#" : "n";
              if ((accidentals.get(letter) ?? "n") !== accidental)
                note.addModifier(new Accidental(accidental), index);
              accidentals.set(letter, accidental);
            });
            note.setStave(staves[hand]);
            return note;
          });
          return {
            notes,
            voice: new Voice({ numBeats: state.song.beatsPerBar, beatValue: 4 })
              .setMode(Voice.Mode.SOFT)
              .addTickables(notes),
          };
        });
        const formatter = new Formatter();
        voices.forEach((v) => formatter.joinVoices([v.voice]));
        formatter.format(
          voices.map((v) => v.voice),
          drawWidth - 145,
        );
        voices.forEach(({ voice, notes }, hand) => {
          const beams = Beam.generateBeams(notes);
          voice.draw(context, staves[hand]);
          beams.forEach((beam) => beam.setContext(context).draw());
          notes.forEach((note, index) => {
            const event = events[hand][index];
            const element = note.getSVGElement();
            if (element && event.pitches.length)
              marks.current.push({ element, event });
            for (const pitch of event.ties) {
              const previous = index > 0 ? events[hand][index - 1] : undefined;
              const previousIndex = previous?.pitches.indexOf(pitch) ?? -1;
              new StaveTie({
                firstNote: previousIndex >= 0 ? notes[index - 1] : undefined,
                lastNote: note,
                firstIndexes: [Math.max(0, previousIndex)],
                lastIndexes: [event.pitches.indexOf(pitch)],
              })
                .setContext(context)
                .draw();
            }
            // A partial tie at the right edge continues into the next measure.
            if (index === notes.length - 1)
              event.pitches.forEach((pitch, pitchIndex) => {
                const continues = event.sources.some((source) => {
                  const n = state.song.notes[source];
                  return (
                    n.pitch === pitch &&
                    Math.round((n.start + n.duration) * 4) / 4 >
                      (measure.bar + 1) * state.song.beatsPerBar
                  );
                });
                if (continues)
                  new StaveTie({
                    firstNote: note,
                    firstIndexes: [pitchIndex],
                    lastIndexes: [0],
                  })
                    .setContext(context)
                    .draw();
              });
          });
        });
        wrapper
          .querySelector("svg")
          ?.setAttribute(
            "aria-label",
            t(`Нотный стан, такт ${measure.bar + 1}`),
          );
      }
      setLoading(false);
      setRevision((r) => r + 1);
    })().catch((e) => {
      if (!cancelled) {
        setError(
          `Не удалось отобразить ноты: ${e instanceof Error ? e.message : String(e)}`,
        );
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [measures, width, columns, state.song, locale]);

  useEffect(() => {
    const targets = new Map(
      session.engine.notes.map((n) => [`${n.pitch}:${n.start}:${n.hand}`, n]),
    );
    for (const { element, event } of marks.current) {
      const sourceNotes = event.sources.map((i) => state.song.notes[i]);
      const statuses = sourceNotes
        .map((n) => targets.get(`${n.pitch}:${n.start}:${n.hand}`)?.status)
        .filter(Boolean);
      const active =
        state.beat >= event.start - 0.04 &&
        state.beat < event.start + event.duration;
      const selected = sourceNotes.some(
        (n) => state.settings.hand === "both" || n.hand === state.settings.hand,
      );
      const color =
        !state.preview && statuses.includes("miss")
          ? "#dc2626"
          : !state.preview &&
              statuses.length > 0 &&
              statuses.every((status) => status === "hit")
            ? "#15803d"
            : active && (state.running || state.waiting)
              ? "#0284c7"
              : selected || state.preview
                ? "#263347"
                : "#a5acb7";
      element.setAttribute("fill", color);
      element.setAttribute("stroke", color);
      element.dataset.status =
        color === "#dc2626"
          ? "miss"
          : color === "#15803d"
            ? "hit"
            : color === "#0284c7"
              ? "active"
              : "pending";
      element.querySelectorAll("[fill],[stroke]").forEach((child) => {
        if (child.getAttribute("fill") !== "none")
          child.setAttribute("fill", color);
        if (child.getAttribute("stroke") !== "none")
          child.setAttribute("stroke", color);
      });
    }
    host.current
      ?.querySelectorAll<HTMLElement>("[data-measure]")
      .forEach((el) => {
        const current = Number(el.dataset.measure) === bar;
        el.style.backgroundColor = current ? "#e8f3fa" : "transparent";
        el.style.borderColor = current ? "#bae0f3" : "transparent";
        const activeNote = el.querySelector<SVGElement>(
          '[data-status="active"]',
        );
        if (
          manualPage === null &&
          current &&
          activeNote &&
          el.scrollWidth > el.clientWidth
        ) {
          const noteBounds = activeNote.getBoundingClientRect();
          const bounds = el.getBoundingClientRect();
          if (
            noteBounds.right > bounds.right - 30 ||
            noteBounds.left < bounds.left + 20
          )
            el.scrollLeft +=
              noteBounds.left - bounds.left - el.clientWidth * 0.3;
        }
      });
  }, [state, session, revision, bar, manualPage]);

  useEffect(() => {
    if (manualPage !== null) return;
    const target = host.current?.querySelector<HTMLElement>(
      `[data-measure="${bar}"]`,
    );
    if (target && scroll.current)
      scroll.current.scrollTo({
        top: target.offsetTop - host.current!.offsetTop,
        behavior: "instant",
      });
  }, [bar, revision, manualPage]);

  return (
    <div
      className={`absolute inset-x-0 bottom-0 flex min-w-0 flex-col bg-[#faf8f2] text-slate-800 ${fullscreen ? "top-52 sm:top-40 lg:top-24" : "top-16"}`}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-3 py-2">
        {t(
          (
            [
              ["sheetColumns", "Тактов в строке", columns, 6],
              ["sheetRows", "Строк на листе", rows, 8],
            ] as const
          ).map(([field, label, value, max]) => (
            <div key={field} className="flex items-center gap-2">
              <span className="text-xs">{t(label)}</span>
              <Select
                value={String(value)}
                onValueChange={(v) => changeLayout(field, Number(v))}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={t(label)}
                  className="w-16 border-slate-300 bg-transparent text-slate-800 dark:bg-transparent"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  container={
                    fullscreen ? document.fullscreenElement : undefined
                  }
                  position="popper"
                >
                  {t(
                    Array.from({ length: max }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {t(i + 1)}
                      </SelectItem>
                    )),
                  )}
                </SelectContent>
              </Select>
            </div>
          )),
        )}
        <span className="text-[11px] text-slate-500">
          {t(perPage)}
          {t(" тактов на листе")}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-slate-200 px-3 py-1.5">
        <span className="text-xs font-medium">
          {t("Такт ")}
          {t(bar + 1)} / {t(state.song.bars)} · {t(state.settings.bpm)} BPM
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("Предыдущая страница нот")}
            disabled={page === 0}
            onClick={() => setManualPage(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="text-xs tabular-nums">
            {t(page + 1)} / {t(pages)}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("Следующая страница нот")}
            disabled={page >= pages - 1}
            onClick={() => setManualPage(page + 1)}
          >
            <ChevronRight />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={manualPage === null}
            onClick={() => setManualPage(null)}
            className={manualPage === null ? "text-sky-700" : ""}
          >
            <LocateFixed className="size-4" />
            <span className="hidden sm:inline">{t("Следить")}</span>
          </Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroll}
          className="relative h-full overflow-y-auto overflow-x-hidden"
          tabIndex={0}
          aria-label={t("Нотный лист")}
        >
          {t(
            loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#faf8f2]/90">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                {t("Подготовка нот…")}
              </div>
            ),
          )}
          {t(
            error && (
              <p role="alert" className="p-4 text-sm text-red-700">
                {t(error)}
              </p>
            ),
          )}
          <div
            ref={host}
            className="grid gap-1 p-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          />
        </div>
        {t(
          (state.loading || (state.running && state.beat < state.start)) && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#faf8f2]/40">
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-testid="sheet-count-in"
                className="flex min-w-44 flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-[#faf8f2]/95 px-8 py-5 text-center shadow-lg"
              >
                {t(
                  state.loading ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-9 animate-spin text-sky-700"
                    />
                  ) : (
                    <strong className="text-7xl font-semibold tabular-nums text-sky-700">
                      {t(Math.ceil(state.start - state.beat))}
                    </strong>
                  ),
                )}
                <span className="text-sm font-medium">
                  {t(state.loading ? "Подготовка звука…" : "Приготовьтесь")}
                </span>
              </div>
            </div>
          ),
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-x-3 border-t border-slate-200 px-3 py-1 text-[10px] text-slate-500">
        <span>{t("Из MIDI · ритм до 1/16")}</span>
        <span className="text-sky-700">{t("Текущие")}</span>
        <span className="text-green-700">{t("Верно")}</span>
        <span className="text-red-600">{t("Ошибка")}</span>
        {t(
          state.waiting && (
            <span className="font-medium text-sky-700">
              {t("Ожидаю нажатия")}
            </span>
          ),
        )}
        {t(
          state.recentFeedback && (
            <span
              className={
                isError(state.recentFeedback.type)
                  ? "font-medium text-red-600"
                  : "font-medium text-green-700"
              }
            >
              {t(feedbackLabels[state.recentFeedback.type])}
            </span>
          ),
        )}
        {t(
          !state.running && state.beat < state.start && (
            <span>{t("Нажмите «Начать»")}</span>
          ),
        )}
      </div>
    </div>
  );
}
