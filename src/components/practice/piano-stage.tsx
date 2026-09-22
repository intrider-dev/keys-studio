import { t } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Piano,
  AlertTriangle,
  Box,
  PanelsTopLeft,
  FileMusic,
  RotateCcw,
  Minus,
  Plus,
  Square,
  Pause,
  Play,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PianoScene } from "@/scene.js";
import { noteName } from "@/engine.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlaybackIcon } from "./playback-icon";
import { SheetMusic } from "./sheet-music";
import { DancingCompanion } from "./dancing-companion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  feedbackLabels,
  handLabels,
  isError,
  isTiming,
} from "@/features/practice/format";
import type { PracticeSession } from "@/features/practice/session";
import type { Snapshot } from "@/features/practice/types";

export function PianoStage({
  state,
  session,
}: {
  state: Snapshot;
  session: PracticeSession;
}) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PianoScene | null>(null);
  const viewMode = state.settings.visual.view;
  const setViewMode = (view: "top" | "3d" | "sheet") =>
    session.updateSettings({ visual: { ...state.settings.visual, view } });
  const frame = useRef<HTMLElement>(null);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [expandedView, setExpandedView] = useState<string | null>(null);
  useEffect(() => {
    if (!host.current) return;
    let scene: PianoScene;
    try {
      scene = new PianoScene(
        host.current,
        (pitch: number) => session.press(pitch, "pointer"),
        () => session.release("pointer"),
      );
      sceneRef.current = scene;
    } catch {
      setError(
        "Не удалось запустить 3D. Включите аппаратное ускорение браузера и обновите страницу.",
      );
      return;
    }
    let previousFeedback: unknown = null;
    const unsubscribe = session.subscribeScene(() => {
      const recent = session.getSnapshot().recentFeedback;
      if (recent && recent !== previousFeedback && recent.pitch !== undefined)
        scene.flash(recent.pitch, isError(recent.type) ? "bad" : "good");
      previousFeedback = recent;
      const visual = session.getSnapshot().settings.visual;
      if (visual.view === "sheet") return;
      scene.setAppearance(visual);
      scene.render(session.engine.notes, session.engine.beat, session.held, {
        speed: visual.speed,
        preview: session.getSnapshot().preview && session.engine.running,
        start: session.engine.options.start,
        end: session.engine.end,
      });
    });
    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [session]);
  useEffect(() => {
    sceneRef.current?.setViewMode(viewMode === "sheet" ? "top" : viewMode);
  }, [viewMode, session]);
  useEffect(() => {
    const change = () =>
      setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);

  let title = "",
    detail = "";
  const feedback = state.recentFeedback;
  if (feedback) {
    title = feedbackLabels[feedback.type];
    detail = feedback.pitch === undefined ? "" : noteName(feedback.pitch);
    if (feedback.delta !== undefined && state.settings.mode === "game")
      detail += t(
        ` · ${feedback.delta >= 0 ? "+" : ""}${Math.round(feedback.delta)} мс`,
      );
    else if (feedback.points) detail += ` · +${feedback.points}`;
  } else if (state.running && state.beat < state.start) {
    title = String(Math.ceil(state.start - state.beat));
    detail = "Приготовьтесь";
  } else if (state.waiting) {
    title = state.expected.map(noteName).join(" + ");
    detail = "Сыграйте эти ноты, чтобы продолжить";
  } else if (!state.running) {
    title = state.loading
      ? "Подготавливаю фортепиано…"
      : state.beat > state.start - 4
        ? "Пауза"
        : "Готовы к игре";
    detail = state.loading
      ? "Первый запуск может занять несколько секунд"
      : "Нажмите «Начать». После отсчёта играйте ноты у линии нажатия.";
  }
  return (
    <section
      ref={frame}
      aria-label={t(
        viewMode === "sheet"
          ? "Нотный лист"
          : viewMode === "top"
            ? "Дорожка нот и клавиатура сверху"
            : "Объёмная дорожка нот и клавиатура",
      )}
      className={cn(
        "relative isolate overflow-hidden rounded-xl border border-border/70 bg-[#080d1a]",
        fullscreen
          ? "h-screen w-screen rounded-none"
          : viewMode === "sheet"
            ? "h-[480px] sm:h-[clamp(460px,calc(100svh-400px),720px)]"
            : "h-[380px] sm:h-[clamp(300px,calc(100svh-590px),560px)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            state.settings.visual.background === "image" &&
            state.settings.visual.image
              ? `url(${state.settings.visual.image})`
              : state.settings.visual.background === "aurora"
                ? "radial-gradient(ellipse at 20% 25%, #116d7255, transparent 65%), radial-gradient(ellipse at 85% 50%, #633cb855, transparent 70%)"
                : state.settings.visual.background === "sunset"
                  ? "linear-gradient(155deg, #581c8744, #be185d44, #fb923c33)"
                  : "none",
        }}
      />
      <div
        style={{
          filter: `brightness(${state.settings.visual.brightness})`,
          visibility: viewMode === "sheet" ? "hidden" : "visible",
        }}
        ref={host}
        id="canvas"
        className="absolute inset-0 touch-none [&_canvas]:block [&_canvas]:size-full"
      />
      {viewMode === "sheet" && (
        <SheetMusic state={state} session={session} fullscreen={fullscreen} />
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 z-30 flex items-start justify-between gap-2 bg-gradient-to-b from-black/45 to-transparent p-4 sm:p-5",
          fullscreen ? "top-28 sm:top-20 lg:top-0" : "top-0",
          viewMode === "sheet" && "bg-background/95",
        )}
      >
        <div
          className={cn(
            "hidden flex-wrap items-center gap-2",
            fullscreen ? "lg:flex" : "sm:flex",
          )}
        >
          <Badge
            variant="outline"
            className="border-white/15 bg-black/25 text-xs font-normal text-white/80"
          >
            <Piano className="size-3" />
            {t(
              state.preview ? "Прослушивание" : handLabels[state.settings.hand],
            )}
          </Badge>
          <span
            className={cn(
              "text-[11px] text-white/45",
              fullscreen ? "hidden" : "hidden sm:inline",
            )}
          >
            {t("C2–C7 · 61 клавиша")}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <Tabs
            value={viewMode}
            onValueChange={(value) =>
              setViewMode(value as "top" | "3d" | "sheet")
            }
            className="pointer-events-auto"
          >
            <TabsList
              aria-label={t("Вид дорожки")}
              className="h-8 bg-background/90"
            >
              {(
                [
                  ["sheet", "Ноты", FileMusic],
                  ["top", "Сверху", PanelsTopLeft],
                  ["3d", "3D", Box],
                ] as const
              ).map(([value, label, Icon]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  aria-label={t(label)}
                  className="min-w-8 flex-none gap-0 px-2 text-xs"
                  onMouseEnter={() => setExpandedView(value)}
                  onMouseLeave={() => setExpandedView(null)}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible"))
                      setExpandedView(value);
                  }}
                  onBlur={() => setExpandedView(null)}
                >
                  <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "origin-left overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform,margin] duration-200 ease-out motion-reduce:transition-none",
                      expandedView === value
                        ? "ml-1.5 max-w-16 scale-100 opacity-100"
                        : "ml-0 max-w-0 scale-75 opacity-0",
                    )}
                  >
                    {t(label)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <span
            id="livekey"
            className={cn(
              "text-xs text-white/65",
              fullscreen ? "hidden" : "hidden sm:block",
            )}
          >
            {t(
              state.lastKey
                ? `${noteName(state.lastKey.pitch)} · ${t(state.lastKey.source)}`
                : state.device.connected
                  ? "Нажмите клавишу Yamaha"
                  : "Играйте клавишами A-S-D-F",
            )}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="pointer-events-auto size-7 text-white/65 hover:bg-white/10 hover:text-white"
                aria-label={t(
                  fullscreen ? "Выйти из полного экрана" : "На весь экран",
                )}
                onClick={() => {
                  void (
                    fullscreen
                      ? document.exitFullscreen()
                      : frame.current?.requestFullscreen()
                  )?.catch(() =>
                    session.notify("Браузер не разрешил полный экран."),
                  );
                }}
              >
                {fullscreen ? <Minimize2 /> : <Maximize2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t(fullscreen ? "Выйти из полного экрана" : "На весь экран")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      {viewMode !== "sheet" && (title || error) && (
        <div
          id="feedback"
          className="pointer-events-none absolute inset-x-3 top-[22%] flex flex-col items-center text-center"
        >
          <div className="max-w-md rounded-2xl bg-background/75 px-7 py-4 shadow-lg backdrop-blur-md">
            {error && (
              <AlertTriangle className="mx-auto mb-3 size-6 text-destructive" />
            )}
            <strong
              className={cn(
                "block text-xl font-semibold tracking-tight text-white sm:text-2xl",
                feedback &&
                  (isError(feedback.type)
                    ? "text-rose-300"
                    : isTiming(feedback.type)
                      ? "text-amber-300"
                      : "text-emerald-300"),
              )}
            >
              {t(error || title)}
            </strong>
            {!error && (
              <span className="mt-2 block text-xs text-white/60">
                {t(detail)}
              </span>
            )}
          </div>
        </div>
      )}
      {viewMode !== "sheet" && (
        <div className="pointer-events-none absolute inset-x-4 bottom-2 flex justify-between text-[9px] uppercase tracking-wider text-white/35">
          <span>{t("Линия нажатия")}</span>
          <span>{t("Нажимайте у края клавиатуры")}</span>
        </div>
      )}
      {state.settings.visual.dancer && (
        <DancingCompanion
          key={state.song.id ?? state.song.name}
          session={session}
          visual={state.settings.visual}
        />
      )}
      {fullscreen && (
        <div
          aria-label={t("Управление в полном экране")}
          role="group"
          className="absolute left-1/2 top-4 z-30 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-lg border border-white/10 bg-background/90 px-4 py-2 text-sm tabular-nums lg:max-w-[calc(100%-32rem)]"
        >
          {!state.preview && (
            <>
              <span className="text-primary">
                {t(state.score)}
                {t(" очков")}
              </span>
              <span>
                {t(state.combo)}
                {t(" подряд")}
              </span>
            </>
          )}
          <Button
            size="sm"
            disabled={state.loading || !state.song.notes.length}
            onClick={() =>
              state.preview ? session.reset() : void session.toggle()
            }
          >
            {state.preview ? (
              <Square className="size-4" />
            ) : (
              <PlaybackIcon loading={state.loading} running={state.running} />
            )}
            {t(
              state.preview
                ? "Стоп"
                : state.loading
                  ? "Подготовка…"
                  : state.running
                    ? "Пауза"
                    : !state.finished && state.beat > state.start - 4
                      ? "Продолжить"
                      : "Начать",
            )}
          </Button>
          {state.preview && (
            <Button
              size="sm"
              variant="outline"
              disabled={state.loading}
              onClick={() => void session.togglePause()}
            >
              {state.running ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
              {t(state.running ? "Пауза" : "Продолжить")}
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("Начать заново")}
            onClick={session.restart}
          >
            <RotateCcw className="size-4" />
          </Button>
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("Уменьшить темп на 5 BPM")}
              disabled={state.settings.bpm <= 30}
              onClick={() =>
                session.updateSettings({
                  bpm: Math.max(30, state.settings.bpm - 5),
                })
              }
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="text-xs">{t(state.settings.bpm)} BPM</span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("Увеличить темп на 5 BPM")}
              disabled={state.settings.bpm >= 240}
              onClick={() =>
                session.updateSettings({
                  bpm: Math.min(240, state.settings.bpm + 5),
                })
              }
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
