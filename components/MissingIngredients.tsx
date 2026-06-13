import type { RecipeIngredient } from "@/lib/types";

export function MissingIngredients({ ingredients }: { ingredients: RecipeIngredient[] }) {
  if (ingredients.length === 0) {
    return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">빠진 필수 재료가 없어요.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ingredients.map((ingredient) => (
        <span key={ingredient.id} className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-800 ring-1 ring-rose-100">
          {ingredient.name}
        </span>
      ))}
    </div>
  );
}
