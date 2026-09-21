import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { InstrumentIcon } from "./instrument-icon";
import names from "@/features/practice/instrument-names.json";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
const groups = [
  "Фортепиано",
  "Хроматическая перкуссия",
  "Органы",
  "Гитары",
  "Бас",
  "Струнные",
  "Ансамбли и хор",
  "Медные духовые",
  "Язычковые духовые",
  "Флейты",
  "Синтезатор соло",
  "Синтезатор пэды",
  "Эффекты",
  "Этнические",
  "Ударные",
  "Звуковые эффекты",
];
const ru: Record<number, string> = {
  0: "Рояль",
  1: "Яркое фортепиано",
  2: "Электророяль",
  3: "Хонки-тонк",
  4: "Электропиано 1",
  5: "Электропиано 2",
  6: "Клавесин",
  7: "Клавинет",
  8: "Челеста",
  9: "Колокольчики",
  10: "Музыкальная шкатулка",
  11: "Вибрафон",
  12: "Маримба",
  13: "Ксилофон",
  16: "Орган",
  19: "Церковный орган",
  21: "Аккордеон",
  22: "Губная гармоника",
  24: "Гитара, нейлон",
  25: "Гитара, сталь",
  26: "Джазовая электрогитара",
  27: "Чистая электрогитара",
  29: "Перегруз гитары",
  30: "Дисторшн",
  32: "Контрабасовый бас",
  33: "Электробас",
  40: "Скрипка",
  41: "Альт",
  42: "Виолончель",
  43: "Контрабас",
  44: "Струнные тремоло",
  45: "Струнные пиццикато",
  46: "Арфа",
  47: "Литавры",
  48: "Струнный ансамбль 1",
  49: "Струнный ансамбль 2",
  50: "Синтезаторные струнные 1",
  51: "Синтезаторные струнные 2",
  52: "Хор",
  53: "Голос",
  54: "Синтезаторный хор",
  56: "Труба",
  57: "Тромбон",
  58: "Туба",
  60: "Валторна",
  64: "Сопрано саксофон",
  65: "Альт саксофон",
  66: "Тенор саксофон",
  67: "Баритон саксофон",
  68: "Гобой",
  69: "Английский рожок",
  70: "Фагот",
  71: "Кларнет",
  72: "Пикколо",
  73: "Флейта",
  74: "Блокфлейта",
  75: "Пан-флейта",
  80: "Квадратная волна",
  81: "Пилообразная волна",
  88: "Новый век",
  89: "Тёплый пэд",
  90: "Полисинтезатор",
  91: "Хоровой пэд",
  104: "Ситар",
  105: "Банджо",
  106: "Сямисэн",
  107: "Кото",
  108: "Калимба",
  109: "Волынка",
  110: "Скрипка фиддл",
  111: "Шанай",
};
export const instrumentLabel = (i: number) =>
  ru[i] ?? names[i].replaceAll("_", " ");
export function InstrumentPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Тембр инструмента"
          className="w-full justify-between"
        >
          <InstrumentIcon program={value} />
          <span className="truncate">{instrumentLabel(value)}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command defaultValue={`${instrumentLabel(value)} ${names[value]} ${groups[Math.floor(value / 8)]}`}>
          <CommandInput placeholder="Скрипка, strings, гитара…" />
          <CommandList>
            <CommandEmpty>Тембр не найден.</CommandEmpty>
            {groups.map((group, g) => (
              <CommandGroup key={group} heading={<span className="flex items-center gap-2"><InstrumentIcon program={g * 8} className="size-3.5 shrink-0" />{group}</span>}>
                {names.slice(g * 8, g * 8 + 8).map((name, j) => {
                  const i = g * 8 + j;
                  return (
                    <CommandItem
                      key={name}
                      className="pl-8"
                      value={`${instrumentLabel(i)} ${name} ${group}`}
                      onSelect={() => {
                        onChange(i);
                        setOpen(false);
                      }}
                    >
                      <span className="min-w-0 flex-1">{instrumentLabel(i)}</span>
                      {value === i && <Check aria-hidden="true" className="size-3.5 shrink-0 text-primary" />}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {i + 1}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
