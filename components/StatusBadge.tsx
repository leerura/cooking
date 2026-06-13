import type { RecipeStatus } from "@/lib/types";

const STATUS_CLASS: Record<RecipeStatus, string> = {
  draft: "bg-stone-100 text-stone-800 ring-stone-200",
  needs_review: "bg-yellow-100 text-yellow-900 ring-yellow-200",
  approved: "bg-emerald-100 text-emerald-800 ring-emerald-200"
};

const STATUS_LABEL: Record<RecipeStatus, string> = {
  draft: "초안",
  needs_review: "확인 필요",
  approved: "추천 사용"
};

export function StatusBadge({ status, compact = false }: { status: RecipeStatus; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ring-1 ${compact ? "text-xs" : "text-sm"} ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
