import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLocale, useLocale } from "@/lib/i18n";

export function LanguagePicker() {
  const locale = useLocale();
  return (
    <div
      role="group"
      aria-label={locale === "ru" ? "Язык интерфейса" : "Interface language"}
      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/70 p-0.5"
    >
      <Languages
        aria-hidden="true"
        className="mx-1 hidden size-3.5 text-muted-foreground sm:block"
      />
      {(["ru", "en"] as const).map((language) => (
        <Button
          key={language}
          size="sm"
          variant={locale === language ? "secondary" : "ghost"}
          className="h-7 px-2 text-[11px]"
          aria-label={language === "ru" ? "Русский" : "English"}
          aria-pressed={locale === language}
          onClick={() => setLocale(language)}
        >
          {language.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
