import { t } from "@/lib/i18n";
import {
  Flame,
  Trophy,
  Target,
  CircleX,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { number } from "@/features/practice/format";
import type { Snapshot } from "@/features/practice/types";
import type { ReactNode } from "react";
import { EmptyMetric } from "./empty-metric";

function Metric({
  label,
  value,
  icon: Icon,
  accent,
  suffix,
  id,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  accent?: string;
  suffix?: string;
  id: string;
}) {
  return (
    <Card className="gap-0 rounded-xl border-border/70 py-0 shadow-none">
      <CardContent className="p-3.5 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-1 text-muted-foreground">
          <span className="text-[10px] sm:text-xs">{t(label)}</span>
          <Icon className="hidden size-3.5 sm:block" />
        </div>
        <div className="flex items-baseline gap-2">
          <strong
            id={id}
            className={cn(
              "text-xl font-semibold tracking-tight tabular-nums sm:text-2xl",
              accent,
            )}
          >
            {t(value)}
          </strong>
          {suffix && (
            <span className="text-xs text-muted-foreground">{t(suffix)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
export function Scoreboard({ state }: { state: Snapshot }) {
  const multiplier =
    1 + Math.min(3, Math.floor(Math.max(0, state.combo - 1) / 10));
  return (
    <section
      aria-label={t("Результаты попытки")}
      className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3"
    >
      <Metric
        id="score"
        label={t("Счёт")}
        value={number.format(state.score)}
        icon={Zap}
        accent="text-primary"
      />
      <Metric
        id="accuracy"
        label={t("Точность")}
        value={state.accuracy === null ? <EmptyMetric /> : `${state.accuracy}%`}
        icon={Target}
      />
      <Metric
        id="combo"
        label={t("Серия")}
        value={state.combo}
        suffix={`×${multiplier}`}
        icon={Flame}
        accent="text-amber-300"
      />
      <Metric
        id="bestcombo"
        label={t("Лучшая серия")}
        value={state.bestCombo}
        icon={Trophy}
      />
      <Metric
        id="errors"
        label={t("Ошибки")}
        value={state.misses + state.wrong + state.short}
        icon={CircleX}
        accent={
          state.misses + state.wrong + state.short > 0
            ? "text-destructive"
            : undefined
        }
      />
    </section>
  );
}
