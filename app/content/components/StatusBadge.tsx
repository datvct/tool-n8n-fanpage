import type { ContentStatus } from "@/lib/content-types";
import { statusLabels } from "@/app/content/ui/content-presentation";

export function StatusBadge({
  status,
  label,
}: {
  status: ContentStatus;
  label?: string;
}) {
  return <span className={`badge ${status}`}>{label ?? statusLabels[status]}</span>;
}
