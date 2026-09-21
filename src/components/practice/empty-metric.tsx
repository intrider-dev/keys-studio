import { Ellipsis } from "lucide-react";

export function EmptyMetric() {
  return (
    <span className="inline-flex items-center">
      <Ellipsis aria-hidden="true" className="size-6" />
      <span className="sr-only">Пока нет данных</span>
    </span>
  );
}
