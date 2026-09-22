import { t } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { Grip, LoaderCircle } from "lucide-react";
import { clampPosition } from "@/features/practice/dance";
import {
  mikuEmotion,
  type MikuEmotion,
} from "@/features/practice/miku-emotion";
import type { PracticeSession } from "@/features/practice/session";
import type { VisualSettings } from "@/features/practice/types";

export function DancingCompanion({
  session,
  visual,
}: {
  session: PracticeSession;
  visual: VisualSettings;
}) {
  const box = useRef<HTMLDivElement>(null),
    bounds = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("loading");
  const current = useRef(visual);
  current.current = visual;
  const drag = useRef<{
    id: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    nextX: number;
    nextY: number;
  } | null>(null);
  const flat = visual.dancerMode === "2d";
  const position = (x: number, y: number) => {
    if (box.current) {
      box.current.style.left = `${x * 100}%`;
      box.current.style.top = `${y * 100}%`;
      box.current.style.transform = `translate(${-x * 100}%, ${-y * 100}%)`;
    }
  };
  const save = (x: number, y: number) =>
    session.updateSettings({
      visual: {
        ...session.getSnapshot().settings.visual,
        dancerX: x,
        dancerY: y,
      },
    });
  useEffect(() => {
    position(visual.dancerX, visual.dancerY);
  }, [visual.dancerX, visual.dancerY]);
  useEffect(() => {
    let cancelled = false,
      character:
        | {
            render: (beat: number, emotion: MikuEmotion) => void;
            dispose: () => void;
          }
        | undefined,
      unsubscribe: (() => void) | undefined;
    setStatus("loading");
    const load = async () => {
      const host = canvas.current;
      if (!host) return;
      character = flat
        ? await (
            await import("@/features/practice/miku-sprites")
          ).createMikuSprites(host)
        : await (
            await import("@/features/practice/miku-scene")
          ).createMikuScene(host);
      if (cancelled) {
        character.dispose();
        return;
      }
      const render = () =>
        character?.render(
          session.engine.beat,
          mikuEmotion(session.getSnapshot()),
        );
      render();
      unsubscribe = session.subscribeScene(render);
      setStatus("ready");
    };
    void load().catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
      character?.dispose();
    };
  }, [session, flat]);
  const cancel = () => {
    if (drag.current) {
      drag.current = null;
      position(current.current.dancerX, current.current.dancerY);
    }
  };
  return (
    <div ref={bounds} className="pointer-events-none absolute inset-3 z-20">
      <div
        ref={box}
        role="button"
        tabIndex={0}
        aria-label={t("Танцующий персонаж. Перетащите или используйте стрелки")}
        title={t("Перетащите персонажа в удобное место")}
        className="pointer-events-auto absolute w-28 touch-none select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-40"
        style={{
          left: `${visual.dancerX * 100}%`,
          top: `${visual.dancerY * 100}%`,
          transform: `translate(${-visual.dancerX * 100}%, ${-visual.dancerY * 100}%)`,
          cursor: "grab",
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.focus({ preventScroll: true });
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            id: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            x: visual.dancerX,
            y: visual.dancerY,
            nextX: visual.dancerX,
            nextY: visual.dancerY,
          };
          e.currentTarget.style.cursor = "grabbing";
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId || !bounds.current || !box.current)
            return;
          e.stopPropagation();
          const area = bounds.current.getBoundingClientRect(),
            rect = box.current.getBoundingClientRect();
          d.nextX = clampPosition(
            d.x + (e.clientX - d.startX) / Math.max(1, area.width - rect.width),
          );
          d.nextY = clampPosition(
            d.y +
              (e.clientY - d.startY) / Math.max(1, area.height - rect.height),
          );
          position(d.nextX, d.nextY);
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          e.stopPropagation();
          drag.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
          e.currentTarget.style.cursor = "grab";
          save(d.nextX, d.nextY);
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") {
            cancel();
            return;
          }
          const step = e.shiftKey ? 0.1 : 0.025;
          const delta: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          if (delta[e.key]) {
            e.preventDefault();
            const [x, y] = delta[e.key];
            save(
              clampPosition(visual.dancerX + x),
              clampPosition(visual.dancerY + y),
            );
          }
        }}
      >
        <div className="pointer-events-none relative aspect-[192/256]">
          <div ref={canvas} className="size-full" aria-hidden="true" />
          {t(
            status === "loading" && (
              <div
                role="status"
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/60 text-xs"
              >
                <LoaderCircle className="size-5 animate-spin" />
                {t("Загружаю Мику…")}
              </div>
            ),
          )}
          {t(
            status === "error" && (
              <div
                role="alert"
                className="absolute inset-0 flex items-center rounded-lg bg-background/80 p-3 text-xs"
              >
                {t(
                  "Не удалось загрузить Мику. Переключите режим или обновите страницу.",
                )}
              </div>
            ),
          )}
        </div>
        <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-white/15 bg-background/80 px-2 py-1 text-[9px] text-muted-foreground">
          <Grip className="size-3" />
          {t("Мику · ")}
          {t(flat ? "2D" : "3D")}
        </div>
      </div>
    </div>
  );
}
