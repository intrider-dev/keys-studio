import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Как играть">
          <CircleHelp className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Каждая нота на своём месте</DialogTitle>
          <DialogDescription>
            Короткая инструкция для первой тренировки
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            <strong className="text-cyan-300">Голубые ноты</strong> играйте
            правой рукой, <strong className="text-violet-300">сиреневые</strong>{" "}
            левой. Нажимайте клавишу, когда передний край блока доходит до
            линии. Длина блока показывает удержание.
          </p>
          <p>
            <strong>Тренировка</strong> ждёт правильной ноты. В режиме{" "}
            <strong>«На точность»</strong> дорожка движется непрерывно и
            оценивает ритм.
          </p>
          <Separator />
          <div>
            <h3 className="mb-2 font-medium">Счёт и серии</h3>
            <p className="text-muted-foreground">
              Точно: 1000 очков. Хорошо: 850. Чуть раньше или позже: 600. Каждые
              10 попаданий увеличивают множитель до ×4. Ошибки сбрасывают серию.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Без синтезатора</h3>
            <p className="text-muted-foreground">
              Клавиши A W S E D F T G Y H U J K соответствуют До4–До5. Клавиши [
              и ] меняют октаву. Для паузы нажмите пробел.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Свои произведения</h3>
            <p className="text-muted-foreground">
              Откройте MIDI. Руки определяются по названиям дорожек или высоте
              нот; перкуссия пропускается. Темп задаётся вручную. Файл остаётся
              на компьютере.
            </p>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Сэмплы фортепиано: FluidR3 GM, Frank Wen и участники, CC BY 3.0.{" "}
            <a
              href="https://github.com/gleitz/midi-js-soundfonts"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Источник
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
