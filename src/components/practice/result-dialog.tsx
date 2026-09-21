import { Trophy, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { number } from "@/features/practice/format";
import type { Result } from "@/features/practice/types";

export function ResultDialog({
  result,
  onClose,
  onAgain,
}: {
  result: Result | null;
  onClose: () => void;
  onAgain: () => void;
}) {
  return (
    <Dialog
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="size-6" />
          </div>
          <DialogTitle className="text-2xl">
            {result?.testInput
              ? "Проверка завершена"
              : (result?.accuracy ?? 0) >= 85
                ? "Получается уверенно!"
                : "Ещё на шаг ближе"}
          </DialogTitle>
          <DialogDescription>
            {result?.testInput
              ? "Игра с компьютерной клавиатуры не меняет личные рекорды."
              : "Попытка завершена. Повторите фрагмент или переходите дальше."}
          </DialogDescription>
        </DialogHeader>
        {result && (
          <div className="my-3 grid grid-cols-2 gap-5">
            {[
              ["Счёт", number.format(result.score)],
              ["Точность", `${result.accuracy ?? 0}%`],
              ["Лучшая серия", result.combo],
              ["Ошибки", result.misses + result.wrong + result.short],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <strong className="mt-1 block text-3xl font-semibold tabular-nums">
                  {value}
                </strong>
              </div>
            ))}
          </div>
        )}
        {result && (
          <p className="text-xs text-muted-foreground">
            Пропуски: {result.misses} · Неверные ноты: {result.wrong} ·
            Удержание: {result.short}
          </p>
        )}
        <DialogFooter>
          <Button id="closeResult" variant="outline" onClick={onClose}>
            Закрыть
          </Button>
          <Button id="again" onClick={onAgain}>
            <RotateCcw />
            Ещё раз
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
