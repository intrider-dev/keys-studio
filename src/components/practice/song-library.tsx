import { t } from "@/lib/i18n";
import { useState, useRef } from "react";
import {
  Library,
  Search,
  Upload,
  Download,
  Share2,
  Trash2,
  Music2,
  Link,
  LoaderCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  listSongs,
  removeSong,
  type LibraryEntry,
} from "@/features/practice/library";
import type { PracticeSession } from "@/features/practice/session";
import type { Snapshot } from "@/features/practice/types";
interface CatalogSong {
  id: string;
  name: string;
  composer: string;
  url: string;
  source: string;
}
export function SongLibrary({
  session,
  state,
}: {
  session: PracticeSession;
  state: Snapshot;
}) {
  const [open, setOpen] = useState(false),
    [entries, setEntries] = useState<LibraryEntry[]>([]),
    [catalog, setCatalog] = useState<CatalogSong[]>([]),
    [query, setQuery] = useState(""),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const refresh = async () => setEntries(await listSongs());
  async function show(value: boolean) {
    setOpen(value);
    if (value) {
      try {
        await refresh();
        const response = await fetch("/songs/catalog.json");
        const local = response.ok
          ? await response.json().catch(() => null)
          : null;
        setCatalog(
          Array.isArray(local)
            ? local
            : await fetch("/songs/catalog.example.json").then((r) => r.json()),
        );
      } catch {
        setError("Не удалось открыть библиотеку.");
      }
    }
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось открыть файл.");
    } finally {
      setBusy(false);
    }
  }
  async function files(files: FileList | null) {
    if (!files) return;
    await run(async () => {
      for (const file of Array.from(files)) await session.importFile(file);
      if (session.getSnapshot().notice) setError(session.getSnapshot().notice);
    });
  }
  async function remote(address: string, name?: string, source?: string) {
    await run(async () => {
      const parsed = new URL(address, location.href);
      if (!["http:", "https:"].includes(parsed.protocol))
        throw new Error("Нужна ссылка HTTP или HTTPS на MIDI.");
      const response = await fetch(parsed.href, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok)
        throw new Error(
          "Файл недоступен. Скачайте MIDI и перетащите его сюда.",
        );
      const blob = await response.blob();
      if (blob.size > 5_000_000)
        throw new Error("MIDI должен быть не больше 5 МБ.");
      await session.loadSong(
        await blob.arrayBuffer(),
        name ??
          decodeURIComponent(
            parsed.pathname.split("/").pop() ?? "Произведение",
          ).replace(/\.midi?$/i, ""),
        source ?? parsed.href,
      );
    });
  }
  const match = (name: string) =>
    [name, t(name)].some((text) =>
      text.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    );
  return (
    <Dialog open={open} onOpenChange={(value) => void show(value)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Library className="size-4" />
          {t("Произведения")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
          <DialogTitle>{t("Библиотека произведений")}</DialogTitle>
          <DialogDescription>
            {t(
              "Импортируйте MIDI или откройте подборку. Темп, партия, тембр и оформление сохраняются для каждой песни.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div
          className="min-h-0 space-y-4 overflow-y-auto p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) void files(e.dataTransfer.files);
          }}
        >
          <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-center">
            <Upload className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-sm">{t("Перетащите файлы сюда")}</p>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              {t(".mid, .midi или .pianopack, можно несколько сразу")}
            </p>
            <Button disabled={busy} onClick={() => input.current?.click()}>
              {t("Выбрать файлы")}
            </Button>
            <input
              ref={input}
              type="file"
              multiple
              accept=".mid,.midi,.pianopack"
              className="hidden"
              aria-label={t("Импорт произведений")}
              onChange={(e) => {
                void files(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex gap-2">
            <Input
              aria-label={t("Ссылка на MIDI")}
              placeholder={t("Прямая ссылка на .mid")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={busy || !url.trim()}
              aria-label={t("Импортировать по ссылке")}
              onClick={() => void remote(url)}
            >
              <Link className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "Если сайт запрещает загрузку по ссылке, скачайте файл и перетащите сюда. Из MuseScore экспортируйте MIDI. PDF нужно сначала распознать или преобразовать.",
            )}
          </p>
          {t(
            busy && (
              <p role="status" className="flex items-center gap-2 text-sm">
                <LoaderCircle className="size-4 animate-spin" />
                {t("Добавляю произведение…")}
              </p>
            ),
          )}
          {t(
            error && (
              <p role="alert" className="text-sm text-destructive">
                {t(error)}
              </p>
            ),
          )}
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("Найти произведение")}
              aria-label={t("Поиск произведений")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("Моя библиотека")}</h3>
            {t(
              entries
                .filter((e) => match(e.song.name))
                .map((entry) => (
                  <div
                    key={entry.song.id}
                    className="flex items-center gap-2 rounded-lg border p-3"
                  >
                    <Button
                      disabled={busy}
                      variant="ghost"
                      className="min-w-0 flex-1 justify-start"
                      onClick={() => {
                        session.selectEntry(entry);
                        setOpen(false);
                      }}
                    >
                      <Music2 className="size-4 shrink-0" />
                      <span className="truncate">{t(entry.song.name)}</span>
                    </Button>
                    {t(
                      state.song.id === entry.song.id && (
                        <Badge variant="secondary">{t("Открыто")}</Badge>
                      ),
                    )}
                    <Button
                      disabled={busy}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t(`Удалить ${entry.song.name}`)}
                      onClick={() =>
                        void run(async () => {
                          await removeSong(entry.song.id!);
                          if (state.song.id === entry.song.id)
                            session.notify(
                              "Произведение удалено из библиотеки. При изменении настроек открытая песня сохранится снова.",
                            );
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )),
            )}
            {t(
              !entries.filter((e) => match(e.song.name)).length && (
                <p className="text-xs text-muted-foreground">
                  {t("Нет произведений по этому запросу.")}
                </p>
              ),
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("Подборка для игры")}</h3>
            {t(
              catalog
                .filter((s) => match(s.name) || match(s.composer))
                .map((song) => (
                  <Button
                    disabled={busy}
                    key={song.id}
                    variant="outline"
                    className="h-auto w-full justify-between py-3 text-left"
                    onClick={() =>
                      void remote(song.url, song.name, song.source)
                    }
                  >
                    <span>
                      <span className="block">{t(song.name)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {t(song.composer)}
                      </span>
                    </span>
                    <Download className="size-4 shrink-0" />
                  </Button>
                )),
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              disabled={!state.song.notes.length}
              onClick={() => session.exportSong()}
            >
              <Share2 className="size-4" />
              {t("Поделиться текущей песней")}
            </Button>
            <Button
              variant="outline"
              disabled={!state.song.notes.length}
              onClick={() => session.exportSong(true)}
            >
              <Download className="size-4" />
              {t("Экспорт MIDI")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "Файл .pianopack содержит ноты, настройки и вашу картинку. Отправьте его другу, затем импортируйте в этот тренажёр. MIDI подходит для других музыкальных программ.",
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Классическая подборка:")}
            {t(" ")}
            <a
              className="underline"
              href="https://github.com/googlecreativelab/chrome-music-lab/tree/master/pianoroll/midi"
              target="_blank"
              rel="noreferrer"
            >
              Chrome Music Lab / Mutopia
            </a>
            {t(". Тембры:")}
            {t(" ")}
            <a
              className="underline"
              href="https://github.com/gleitz/midi-js-soundfonts"
              target="_blank"
              rel="noreferrer"
            >
              FluidR3 GM, CC BY 3.0
            </a>
            .{t(" ")}
            {t(
              state.song.source && (
                <a
                  className="underline"
                  href={state.song.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Источник текущей песни")}
                </a>
              ),
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
