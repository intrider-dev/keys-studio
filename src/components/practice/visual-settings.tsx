import { t } from "@/lib/i18n";
import { useEffect, useId, useState } from "react";
import { ImagePlus, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_SETTINGS,
  type VisualSettings,
} from "@/features/practice/types";
export function VisualSettingsPanel({
  value: v,
  onChange,
}: {
  value: VisualSettings;
  onChange: (v: VisualSettings) => void;
}) {
  const id = useId(),
    [error, setError] = useState("");
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/characters/miku.vrm", { method: "HEAD", signal: abort.signal })
      .then((r) =>
        setHasCharacter(
          r.ok && !r.headers.get("content-type")?.includes("text/html"),
        ),
      )
      .catch(() => {
        if (!abort.signal.aborted) setHasCharacter(false);
      });
    return () => abort.abort();
  }, []);
  const patch = (p: Partial<VisualSettings>) => onChange({ ...v, ...p });
  async function image(file?: File) {
    if (!file) return;
    try {
      if (
        file.size > 8_000_000 ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.type)
      )
        throw new Error("Выберите PNG, JPEG или WebP до 8 МБ.");
      const bitmap = await createImageBitmap(file),
        canvas = document.createElement("canvas"),
        scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      patch({
        image: canvas.toDataURL("image/jpeg", 0.8),
        background: "image",
      });
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось загрузить картинку.",
      );
    }
  }
  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id + "dancer"}>
            {t("Мику Хацунэ ")}
            <Badge variant="secondary">{t("Бета")}</Badge>
          </Label>
          <Switch
            id={id + "dancer"}
            checked={v.dancer}
            disabled={!hasCharacter}
            onCheckedChange={(dancer) => patch({ dancer })}
          />
        </div>
        {hasCharacter === false && (
          <p className="text-xs text-muted-foreground">
            {t(
              "Модель устанавливается отдельно и не входит в публичную версию.",
            )}
          </p>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            "Двигается в ритме BPM. На паузе и при ожидании ноты замирает вместе с дорожкой.",
          )}
        </p>
        {v.dancer && (
          <>
            <Tabs
              value={v.dancerMode}
              onValueChange={(mode) =>
                patch({ dancerMode: mode as "2d" | "3d" })
              }
            >
              <TabsList
                className="grid w-full grid-cols-2"
                aria-label={t("Вид персонажа")}
              >
                <TabsTrigger value="2d">{t("2D персонаж")}</TabsTrigger>
                <TabsTrigger value="3d">{t("3D персонаж")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-2">
              <Label>{t("Эмоции Мику")}</Label>
              <Select
                value={v.dancerEmotion}
                onValueChange={(emotion) =>
                  patch({
                    dancerEmotion: emotion as VisualSettings["dancerEmotion"],
                  })
                }
              >
                <SelectTrigger aria-label={t("Эмоции Мику")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    {t("Реагировать на игру")}
                  </SelectItem>
                  <SelectItem value="neutral">{t("Спокойствие")}</SelectItem>
                  <SelectItem value="happy">{t("Радость")}</SelectItem>
                  <SelectItem value="wink">{t("Подмигивание")}</SelectItem>
                  <SelectItem value="surprised">{t("Удивление")}</SelectItem>
                  <SelectItem value="sad">{t("Грусть")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                "Перетащите Мику мышью или пальцем. После выбора можно двигать стрелками; Shift увеличивает шаг.",
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ dancerX: 0.9, dancerY: 0.2 })}
            >
              <RotateCcw className="size-3.5" />
              {t("Вернуть на место")}
            </Button>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {t(
                "Модель: Tda / Jjinomu, дизайн: iXima. © Crypton Future Media.",
              )}
              {t(" ")}
              <a
                className="underline"
                href="https://github.com/outrine/HatsuneMiku_VRM_Model"
                target="_blank"
                rel="noreferrer"
              >
                {t("Источник и условия")}
              </a>
              {t(". Для личного некоммерческого использования.")}
            </p>
          </>
        )}
      </section>
      {(
        [
          {
            key: "brightness",
            label: "Яркость поля",
            min: 0.3,
            max: 1.8,
            step: 0.05,
          },
          {
            key: "opacity",
            label: "Прозрачность дорожки",
            min: 0,
            max: 0.85,
            step: 0.05,
          },
          {
            key: "speed",
            label: "Расстояние между битами",
            min: 1.5,
            max: 7,
            step: 0.25,
          },
        ] as const
      ).map((x) => (
        <div key={x.key} className="space-y-3">
          <Label>
            {t(x.label)}
            {t(" ")}
            <span className="ml-auto tabular-nums text-muted-foreground">
              {t(v[x.key].toFixed(2))}
            </span>
          </Label>
          <Slider
            aria-label={t(x.label)}
            value={[v[x.key]]}
            min={x.min}
            max={x.max}
            step={x.step}
            onValueChange={([n]) => patch({ [x.key]: n })}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        {t("Расстояние меняет вид дорожки, сохраняя BPM и момент нажатия.")}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(["right", "left"] as const).map((k) => (
          <div key={k} className="space-y-2">
            <Label htmlFor={id + k}>
              {t(k === "right" ? "Правая рука" : "Левая рука")}
            </Label>
            <Input
              id={id + k}
              type="color"
              value={v[k]}
              onChange={(e) => patch({ [k]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label>{t("Фон")}</Label>
        <Select
          value={v.background}
          onValueChange={(background) =>
            patch({ background: background as VisualSettings["background"] })
          }
        >
          <SelectTrigger aria-label={t("Фон поля")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plain">{t("Тёмный")}</SelectItem>
            <SelectItem value="aurora">{t("Северное сияние")}</SelectItem>
            <SelectItem value="sunset">{t("Закат")}</SelectItem>
            <SelectItem value="image">{t("Моя картинка")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Label
        htmlFor={id + "image"}
        className="cursor-pointer rounded-md border p-3"
      >
        <ImagePlus className="size-4" />
        {t("Загрузить картинку")}
      </Label>
      <input
        id={id + "image"}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => void image(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {t(error)}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange({ ...DEFAULT_SETTINGS.visual })}
      >
        <RotateCcw className="size-4" />
        {t("Сбросить оформление")}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t(
          "Оформление автоматически сохраняется для этого произведения и включается в файл для обмена.",
        )}
      </p>
    </div>
  );
}
