import { t } from "@/lib/i18n";
import { InstrumentPicker } from "./instrument-picker";
import { VisualSettingsPanel } from "./visual-settings";
import { Palette } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  Gauge,
  SlidersHorizontal,
  Volume2,
  Repeat2,
  Clock3,
  Hand,
  Headphones,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Settings, Snapshot } from "@/features/practice/types";

export function NumericField({
  label,
  value,
  min,
  max,
  onChange,
  id,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  id?: string;
  className?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const numeric = Number(draft);
    const next =
      draft.trim() && Number.isFinite(numeric)
        ? Math.min(max, Math.max(min, Math.round(numeric)))
        : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };
  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId} className="text-xs text-muted-foreground">
        {t(label)}
      </Label>
      <Input
        id={inputId}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        className={className}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </div>
  );
}

function ToggleSetting({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-normal leading-snug">
          {t(label)}
        </Label>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(description)}
          </p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function Choice({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  id: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {t(label)}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GroupTitle({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-sm font-medium">
      {t(icon)}
      {t(children)}
    </h3>
  );
}

export function SettingsPanel({
  state,
  update,
}: {
  state: Snapshot;
  update: (patch: Partial<Settings>) => void;
}) {
  const s = state.settings;
  return (
    <Card className="gap-4 border-border/70 bg-card/70 shadow-none">
      <CardHeader className="px-5 pb-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          {t("Настройки")}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("Темп, партия, звук и оформление")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <Tabs defaultValue="practice">
          <TabsList className="mb-5 grid w-full grid-cols-3">
            <TabsTrigger value="practice">
              <Gauge className="size-3.5" />
              {t("Игра")}
            </TabsTrigger>
            <TabsTrigger value="audio">
              <Volume2 className="size-3.5" />
              {t("Звук")}
            </TabsTrigger>
            <TabsTrigger value="visual">
              <Palette className="size-3.5" />
              {t("Поле")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="visual">
            <VisualSettingsPanel
              value={s.visual}
              onChange={(visual) => update({ visual })}
            />
          </TabsContent>
          <TabsContent value="practice" className="space-y-5">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <Label htmlFor="bpm" className="text-sm">
                  {t("Темп")}
                </Label>
                <Badge variant="secondary" className="font-normal">
                  {t("Оригинал ")}
                  {t(state.song.bpm)}
                </Badge>
              </div>
              <div className="mb-4 flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <NumericField
                    id="bpm"
                    label={t("Ударов в минуту")}
                    value={s.bpm}
                    min={30}
                    max={240}
                    onChange={(bpm) => update({ bpm })}
                    className="h-14 text-3xl font-semibold tabular-nums md:text-3xl"
                  />
                </div>
                <span className="pb-4 text-xs text-muted-foreground">BPM</span>
              </div>
              <Slider
                aria-label={t("Темп")}
                value={[s.bpm]}
                min={30}
                max={240}
                step={1}
                onValueChange={([bpm]) => update({ bpm })}
              />
              <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                <span>{t("30 · медленно")}</span>
                <span>{t("240 · быстро")}</span>
              </div>
            </section>
            <Separator />
            <section>
              <GroupTitle
                icon={<Hand className="size-4 text-muted-foreground" />}
              >
                {t("Партия")}
              </GroupTitle>
              <Tabs
                value={s.hand}
                onValueChange={(hand) =>
                  update({ hand: hand as Settings["hand"] })
                }
              >
                <TabsList
                  className="grid w-full grid-cols-3"
                  aria-label={t("Выбор руки")}
                >
                  <TabsTrigger value="left">{t("Левая")}</TabsTrigger>
                  <TabsTrigger value="right">{t("Правая")}</TabsTrigger>
                  <TabsTrigger value="both">{t("Обе")}</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {t(
                  s.hand === "both"
                    ? "Тренируйте координацию двух рук."
                    : "Сначала разберите одну партию, затем соедините руки.",
                )}
              </p>
            </section>
            <Choice
              id="difficulty"
              label={t("Точность ритма")}
              value={String(s.window)}
              onChange={(value) => update({ window: Number(value) })}
              options={[
                { value: "240", label: "Мягкая · ±240 мс" },
                { value: "180", label: "Обычная · ±180 мс" },
                { value: "110", label: "Строгая · ±110 мс" },
              ]}
            />
            <ToggleSetting
              id="hold"
              label={t("Удержание нот")}
              description={t("Учитывать длительность в игровом режиме")}
              checked={s.hold}
              onChange={(hold) => update({ hold })}
            />
            <Separator />
            <section>
              <GroupTitle
                icon={<Repeat2 className="size-4 text-muted-foreground" />}
              >
                {t("Фрагмент")}
              </GroupTitle>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <NumericField
                  id="loopstart"
                  label={t("С такта")}
                  value={s.firstBar}
                  min={1}
                  max={state.song.bars}
                  onChange={(firstBar) => update({ firstBar })}
                />
                <NumericField
                  id="loopend"
                  label={t("По такт")}
                  value={s.lastBar}
                  min={s.firstBar}
                  max={state.song.bars}
                  onChange={(lastBar) => update({ lastBar })}
                />
              </div>
              <ToggleSetting
                id="loop"
                label={t("Повторять фрагмент")}
                checked={s.loop}
                onChange={(loop) => update({ loop })}
              />
            </section>
            <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              {t(
                "Темп можно менять во время игры. Изменение партии или точности начинает новую попытку.",
              )}
            </p>
          </TabsContent>
          <TabsContent value="audio" className="space-y-5">
            <div className="space-y-2">
              <Label>{t("Инструмент")}</Label>
              <InstrumentPicker
                value={s.instrument}
                onChange={(instrument) => update({ instrument })}
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "128 тембров. В браузере используются локальные сэмплы, а без них простой синтезированный звук. На Yamaha тембр можно менять во время игры.",
                )}
              </p>
            </div>
            <section>
              <GroupTitle
                icon={<Headphones className="size-4 text-muted-foreground" />}
              >
                {t("Воспроизведение")}
              </GroupTitle>
              <Choice
                id="sound"
                label={t("Звук сопровождения")}
                value={s.sound}
                onChange={(sound) =>
                  update({ sound: sound as Settings["sound"] })
                }
                options={[
                  { value: "browser", label: "Компьютер" },
                  { value: "yamaha", label: "Yamaha" },
                  { value: "off", label: "Без звука" },
                ]}
              />
            </section>
            <ToggleSetting
              id="backing"
              label={t("Подыгрывать другой рукой")}
              description={t("Сопровождение для выбранной партии")}
              checked={s.backing}
              onChange={(backing) => update({ backing })}
            />
            <ToggleSetting
              id="metro"
              label={t("Метроном")}
              description={t("Держать темп по щелчкам")}
              checked={s.metronome}
              onChange={(metronome) => update({ metronome })}
            />
            <Separator />
            <section>
              <GroupTitle
                icon={<Clock3 className="size-4 text-muted-foreground" />}
              >
                {t("Синхронизация")}
              </GroupTitle>
              <NumericField
                id="latency"
                label={t("Поправка задержки, мс")}
                value={s.latency}
                min={-250}
                max={250}
                onChange={(latency) => update({ latency })}
              />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {t(
                  "Если нажатия стабильно опаздывают, добавьте положительную поправку.",
                )}
              </p>
            </section>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
