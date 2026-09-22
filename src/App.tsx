import { t } from "@/lib/i18n";
import { SongLibrary } from "@/components/practice/song-library";
import { LanguagePicker } from "@/components/practice/language-picker";
import { useLocale } from "@/lib/i18n";
import { useRef } from "react";
import {
  Piano,
  Upload,
  Cable,
  RotateCw,
  Music2,
  SlidersHorizontal,
  AlertTriangle,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePractice } from "@/hooks/use-practice";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SettingsPanel } from "@/components/practice/settings-panel";
import { Scoreboard } from "@/components/practice/scoreboard";
import { PianoStage } from "@/components/practice/piano-stage";
import { Transport } from "@/components/practice/transport";
import { ActivityPanel } from "@/components/practice/activity-panel";
import { ResultDialog } from "@/components/practice/result-dialog";
import { HelpDialog } from "@/components/practice/help-dialog";
import { cn } from "@/lib/utils";
import type { Mode } from "@/features/practice/types";

export default function App() {
  useLocale();
  const { session, state } = usePractice();
  const desktop = useMediaQuery("(min-width: 1280px)");
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/30">
        <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between gap-3 px-4 sm:px-7 xl:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Piano className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {t("Клавиши")}
              <span className="text-primary">.</span>
            </span>
            <Separator
              orientation="vertical"
              className="mx-2 hidden h-5! sm:block"
            />
            <span className="hidden text-xs text-muted-foreground sm:block">
              {t("Студия практики")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Badge
              variant="outline"
              id="device"
              className={cn(
                "gap-2 px-2.5 py-1.5 font-normal",
                state.device.connected
                  ? "border-primary/20 bg-primary/5 text-primary"
                  : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  state.device.connected ? "bg-primary" : "bg-muted-foreground",
                )}
              />
              <span className="hidden sm:inline">
                {t(
                  state.device.connected
                    ? "Yamaha подключена"
                    : "MIDI не подключён",
                )}
              </span>
              <span className="sm:hidden">
                {t(state.device.connected ? "MIDI" : "Нет MIDI")}
              </span>
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  id="connect"
                  variant="ghost"
                  size="icon"
                  aria-label={t("Переподключить MIDI")}
                  onClick={() => void session.reconnect()}
                >
                  <RotateCw className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("Переподключить MIDI")}</TooltipContent>
            </Tooltip>
            <HelpDialog />
            <LanguagePicker />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1920px] p-4 sm:p-7 xl:px-9">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Music2 className="size-3.5" />
          <span>{t("Практика")}</span>
          <ChevronRight className="size-3" />
          <span className="truncate text-foreground">{t(state.song.name)}</span>
        </div>
        {t(
          state.notice && (
            <Alert className="mb-5 border-amber-300/20 bg-amber-300/5 text-amber-200">
              <AlertTriangle className="size-4" />
              <AlertDescription className="flex items-center justify-between gap-3 text-amber-200">
                <span>{t(state.notice)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  aria-label={t("Закрыть сообщение")}
                  onClick={session.dismissNotice}
                >
                  <X className="size-3" />
                </Button>
              </AlertDescription>
            </Alert>
          ),
        )}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <main className="min-w-0 space-y-4">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <Badge
                  variant="secondary"
                  className="mb-2.5 gap-1.5 font-normal text-muted-foreground"
                >
                  <Music2 className="size-3" />
                  {t("Фортепиано")}
                </Badge>
                <h1
                  id="songtitle"
                  className="truncate text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                  {t(state.song.name)}
                </h1>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(state.song.notes.length)}
                  {t(" нот")}
                  {t(" ")}
                  <span className="px-1.5 text-muted-foreground/40">/</span>
                  {t(" ")}
                  {t(state.song.bars)}
                  {t(" такта")}
                  {t(" ")}
                  <span className="px-1.5 text-muted-foreground/40">/</span>
                  {t(" ")}
                  {t("размер ")}
                  {t(state.song.signature)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SongLibrary session={session} state={state} />
                <Button
                  id="import"
                  variant="outline"
                  onClick={() => input.current?.click()}
                >
                  <Upload className="size-4" />
                  {t("Открыть MIDI")}
                </Button>
                {t(
                  !desktop && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={t("Открыть настройки")}
                          className="xl:hidden"
                        >
                          <SlidersHorizontal className="size-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="overflow-y-auto p-4 sm:max-w-sm">
                        <SheetHeader className="px-0">
                          <SheetTitle>{t("Настройки практики")}</SheetTitle>
                          <SheetDescription>
                            {t("Темп, партия и звук")}
                          </SheetDescription>
                        </SheetHeader>
                        <SettingsPanel
                          state={state}
                          update={session.updateSettings}
                        />
                      </SheetContent>
                    </Sheet>
                  ),
                )}
              </div>
              <input
                ref={input}
                id="file"
                type="file"
                accept=".mid,.midi,.pianopack"
                className="hidden"
                aria-label={t("Открыть MIDI-файл")}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void session.importFile(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs
                value={state.settings.mode}
                onValueChange={(mode) =>
                  session.updateSettings({ mode: mode as Mode })
                }
              >
                <TabsList aria-label={t("Режим игры")}>
                  <TabsTrigger value="practice">{t("Тренировка")}</TabsTrigger>
                  <TabsTrigger value="game">{t("На точность")}</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-sm"
                    style={{ backgroundColor: state.settings.visual.right }}
                  />
                  {t("Правая")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-sm"
                    style={{ backgroundColor: state.settings.visual.left }}
                  />
                  {t("Левая")}
                </span>
              </div>
            </div>
            <p
              id="modehint"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              {t(
                state.preview
                  ? "Слушайте пример. В этом режиме очки не начисляются."
                  : state.settings.mode === "practice"
                    ? "Играйте в своём темпе. Дорожка ждёт правильную ноту."
                    : "Следуйте ритму. Точные нажатия увеличивают серию и счёт.",
              )}
            </p>
            {t(!state.preview && <Scoreboard state={state} />)}
            <PianoStage state={state} session={session} />
            <Transport state={state} session={session} />
            {t(!state.preview && <ActivityPanel state={state} />)}
          </main>
          {t(
            desktop && (
              <aside className="space-y-4">
                <SettingsPanel state={state} update={session.updateSettings} />
                <div className="flex items-start gap-2 px-2 text-xs leading-relaxed text-muted-foreground">
                  <Cable className="mt-0.5 size-4 shrink-0" />
                  <p>
                    {t(
                      "Играйте на Yamaha. Нажатия появятся на клавиатуре в реальном времени.",
                    )}
                  </p>
                </div>
              </aside>
            ),
          )}
        </div>
        <footer className="mt-7 flex flex-wrap justify-between gap-2 border-t border-border/50 pt-4 text-[10px] text-muted-foreground/70">
          <span>{t("Настройки песни сохраняются на этом компьютере")}</span>
          <span id="inputstatus" className="tabular-nums">
            {t(
              state.device.connected
                ? `MIDI активен · ${state.device.received} нажатий`
                : "Можно играть с клавиатуры компьютера",
            )}
          </span>
        </footer>
      </div>
      <ResultDialog
        result={state.result}
        onClose={session.closeResult}
        onAgain={session.again}
      />
    </div>
  );
}
