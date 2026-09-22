import { t } from "@/lib/i18n";
import { RotateCcw, Headphones, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaybackIcon } from "./playback-icon";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTime } from "@/features/practice/format";
import type { PracticeSession } from "@/features/practice/session";
import type { Snapshot } from "@/features/practice/types";

export function Transport({
  state: s,
  session,
}: {
  state: Snapshot;
  session: PracticeSession;
}) {
  const beat = Math.max(s.start, Math.min(s.beat, s.end));
  const position = Math.min(
    s.settings.lastBar,
    Math.floor(beat / s.song.beatsPerBar) + 1,
  );
  const progress = Math.min(
    100,
    Math.max(0, ((beat - s.start) / Math.max(0.01, s.end - s.start)) * 100),
  );
  const label = s.loading
    ? "Подготовка…"
    : s.running
      ? "Пауза"
      : (s.preview || s.beat > s.start - 4) && !s.finished
        ? "Продолжить"
        : "Начать";
  return (
    <Card className="gap-0 border-border/70 py-0 shadow-none">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="space-y-2.5">
          <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
            <span id="position">
              {t("Такт ")}
              <span className="text-foreground">{t(position)}</span> /{t(" ")}
              {t(s.settings.lastBar)}
            </span>
            <span>
              {t(formatTime(((beat - s.start) * 60) / s.settings.bpm))} /
              {t(" ")}
              {t(formatTime(((s.end - s.start) * 60) / s.settings.bpm))}
            </span>
          </div>
          <Progress
            value={progress}
            aria-label={t("Прогресс произведения")}
            className="h-1.5"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              id="start"
              size="lg"
              className="min-w-32"
              disabled={s.loading || !s.song.notes.length}
              onClick={() => void session.toggle()}
            >
              <PlaybackIcon loading={s.loading} running={s.running} />
              {t(label)}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  id="restart"
                  variant="outline"
                  size="icon"
                  className="size-10"
                  aria-label={t("Начать заново")}
                  onClick={session.restart}
                >
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("Начать попытку заново")}</TooltipContent>
            </Tooltip>
            <Button
              id="demo"
              variant="ghost"
              disabled={s.loading || !s.song.notes.length}
              onClick={() =>
                s.preview ? session.reset() : void session.demo()
              }
            >
              {s.preview ? <Square /> : <Headphones />}
              <span className="hidden sm:inline">
                {t(s.preview ? "Стоп" : "Послушать")}
              </span>
              <span className="sr-only sm:hidden">
                {t(s.preview ? "Стоп" : "Послушать")}
              </span>
            </Button>
          </div>
          <span className="hidden text-xs text-muted-foreground md:inline">
            <kbd className="mr-1 rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px]">
              {t("Пробел")}
            </kbd>
            {t(" ")}
            {t("пауза")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
