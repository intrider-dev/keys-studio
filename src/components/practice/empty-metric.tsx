import { t } from "@/lib/i18n";
import { Ellipsis } from "lucide-react";

export function EmptyMetric() {
  return (
    <span className="inline-flex items-center">
      <Ellipsis aria-hidden="true" className="size-6" />
      <span className="sr-only">{t("Пока нет данных")}</span>
    </span>
  );
}
