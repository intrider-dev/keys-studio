import { t } from "@/lib/i18n";
import { AudioLines, Check, X, Clock3, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { noteName } from "@/engine.js";
import {
  feedbackLabels,
  isError,
  isTiming,
  number,
} from "@/features/practice/format";
import type { Snapshot } from "@/features/practice/types";
import { EmptyMetric } from "./empty-metric";

export function ActivityPanel({ state }: { state: Snapshot }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
      <Card className="gap-4 border-border/70 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AudioLines className="size-4 text-muted-foreground" />
            {t("Последние нажатия")}
          </CardTitle>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t(state.hits)}
            {t(" сыграно")}
          </span>
        </CardHeader>
        <CardContent>
          <div
            id="events"
            className="flex min-h-12 flex-wrap items-center gap-2"
          >
            {t(
              !state.feedback.length && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t(
                    "Сыграйте первые ноты. Здесь появится оценка каждого нажатия.",
                  )}
                </p>
              ),
            )}
            {t(
              state.feedback.map((event, i) => {
                const bad = isError(event.type),
                  timing = isTiming(event.type);
                const Icon = bad ? X : timing ? Clock3 : Check;
                return (
                  <Badge
                    key={`${event.beat}:${event.pitch}:${i}`}
                    variant="outline"
                    className={cn(
                      "gap-1.5 py-1.5 font-normal",
                      bad
                        ? "border-rose-400/25 bg-rose-400/8 text-rose-300"
                        : timing
                          ? "border-amber-300/25 bg-amber-300/8 text-amber-200"
                          : "border-emerald-300/20 bg-emerald-300/8 text-emerald-200",
                    )}
                  >
                    <Icon className="size-3" />
                    {t(
                      event.pitch === undefined ? "" : noteName(event.pitch),
                    )}{" "}
                    · {t(feedbackLabels[event.type])}
                  </Badge>
                );
              }),
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="gap-4 border-border/70 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="size-4 text-muted-foreground" />
            {t("Личный рекорд")}
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {t(state.settings.bpm)} BPM ·{t(" ")}
            {t(state.settings.mode === "game" ? "игра" : "тренировка")}
          </span>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground">{t("Счёт")}</p>
            <strong
              id="recordscore"
              className="mt-1 block text-xl font-medium tabular-nums"
            >
              {t(number.format(state.record.score))}
            </strong>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t("Серия")}</p>
            <strong className="mt-1 block text-xl font-medium tabular-nums">
              {t(state.record.combo)}
            </strong>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t("Точность")}</p>
            <strong className="mt-1 block text-xl font-medium tabular-nums">
              {t(
                state.record.accuracy === null ? (
                  <EmptyMetric />
                ) : (
                  `${state.record.accuracy}%`
                ),
              )}
            </strong>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
