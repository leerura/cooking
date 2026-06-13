import { Clock, Trash2, Utensils } from "lucide-react";
import { getRecipeAvailability } from "@/lib/ingredients";
import type { Recipe, UserIngredient } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function RecipeCard({
  recipe,
  userIngredients,
  onSelect,
  onDelete
}: {
  recipe: Recipe;
  userIngredients: UserIngredient[];
  onSelect: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}) {
  const availability = getRecipeAvailability(recipe, userIngredients);

  return (
    <article className="grid w-full grid-cols-[88px_1fr_auto] gap-3 rounded-lg bg-white p-3 text-left shadow-soft ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:ring-carrot-200">
      <button type="button" onClick={() => onSelect(recipe)} className="contents" aria-label={`${recipe.title} 열기`}>
        <div className="aspect-square overflow-hidden rounded-md bg-stone-100">
          {recipe.thumbnailUrl ? (
            <img src={recipe.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-400">
              <Utensils aria-hidden className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={recipe.status} compact />
            {recipe.needsReview ? <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-900">수정 필요</span> : null}
          </div>
          <h3 className="line-clamp-2 text-sm font-bold text-stone-950">{recipe.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
            <span>{availability.status}</span>
            <span>부족 {availability.missingIngredients.length}개</span>
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="h-3 w-3" />
              {recipe.cookingTimeMinutes ? `${recipe.cookingTimeMinutes}분` : "시간 확인"}
            </span>
            <span>{recipe.difficulty}</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onDelete(recipe)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-700"
        aria-label={`${recipe.title} 삭제`}
        title="삭제"
      >
        <Trash2 aria-hidden className="h-4 w-4" />
      </button>
    </article>
  );
}
