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
  const [hasCharacter, setHasCharacter] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/characters/miku.vrm", { method: "HEAD", signal: abort.signal })
      .then(r => setHasCharacter(r.ok && !r.headers.get("content-type")?.includes("text/html")))
      .catch(() => {});
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
            Мику Хацунэ <Badge variant="secondary">Бета</Badge>
          </Label>
          <Switch
            id={id + "dancer"}
            checked={v.dancer}
            disabled={!hasCharacter}
            onCheckedChange={(dancer) => patch({ dancer })}
          />
        </div>
        {!hasCharacter && <p className="text-xs text-muted-foreground">Модель устанавливается отдельно и не входит в публичную версию.</p>}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Двигается в ритме BPM. На паузе и при ожидании ноты замирает вместе с
          дорожкой.
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
                aria-label="Вид персонажа"
              >
                <TabsTrigger value="2d">2D персонаж</TabsTrigger>
                <TabsTrigger value="3d">3D персонаж</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-2">
              <Label>Эмоции Мику</Label>
              <Select
                value={v.dancerEmotion}
                onValueChange={(emotion) =>
                  patch({
                    dancerEmotion: emotion as VisualSettings["dancerEmotion"],
                  })
                }
              >
                <SelectTrigger aria-label="Эмоции Мику">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Реагировать на игру</SelectItem>
                  <SelectItem value="neutral">Спокойствие</SelectItem>
                  <SelectItem value="happy">Радость</SelectItem>
                  <SelectItem value="wink">Подмигивание</SelectItem>
                  <SelectItem value="surprised">Удивление</SelectItem>
                  <SelectItem value="sad">Грусть</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Перетащите Мику мышью или пальцем. После выбора можно двигать
              стрелками; Shift увеличивает шаг.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ dancerX: 0.9, dancerY: 0.2 })}
            >
              <RotateCcw className="size-3.5" />
              Вернуть на место
            </Button>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Модель: Tda / Jjinomu, дизайн: iXima. © Crypton Future Media.{" "}
              <a
                className="underline"
                href="https://github.com/outrine/HatsuneMiku_VRM_Model"
                target="_blank"
                rel="noreferrer"
              >
                Источник и условия
              </a>
              . Для личного некоммерческого использования.
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
            {x.label}{" "}
            <span className="ml-auto tabular-nums text-muted-foreground">
              {v[x.key].toFixed(2)}
            </span>
          </Label>
          <Slider
            aria-label={x.label}
            value={[v[x.key]]}
            min={x.min}
            max={x.max}
            step={x.step}
            onValueChange={([n]) => patch({ [x.key]: n })}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Расстояние меняет вид дорожки, сохраняя BPM и момент нажатия.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(["right", "left"] as const).map((k) => (
          <div key={k} className="space-y-2">
            <Label htmlFor={id + k}>
              {k === "right" ? "Правая рука" : "Левая рука"}
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
        <Label>Фон</Label>
        <Select
          value={v.background}
          onValueChange={(background) =>
            patch({ background: background as VisualSettings["background"] })
          }
        >
          <SelectTrigger aria-label="Фон поля">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plain">Тёмный</SelectItem>
            <SelectItem value="aurora">Северное сияние</SelectItem>
            <SelectItem value="sunset">Закат</SelectItem>
            <SelectItem value="image">Моя картинка</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Label
        htmlFor={id + "image"}
        className="cursor-pointer rounded-md border p-3"
      >
        <ImagePlus className="size-4" />
        Загрузить картинку
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
          {error}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange({ ...DEFAULT_SETTINGS.visual })}
      >
        <RotateCcw className="size-4" />
        Сбросить оформление
      </Button>
      <p className="text-xs text-muted-foreground">
        Оформление автоматически сохраняется для этого произведения и включается
        в файл для обмена.
      </p>
    </div>
  );
}
