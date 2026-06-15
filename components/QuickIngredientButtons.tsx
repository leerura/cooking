import { normalizeIngredientName } from "@/lib/ingredients";

const QUICK_INGREDIENTS = [
  "밥",
  "계란",
  "김치",
  "참치캔",
  "스팸",
  "두부",
  "양파",
  "대파",
  "라면",
  "치즈",
  "우유",
  "마요네즈",
  "고추장",
  "간장",
  "설탕",
  "소금",
  "후추",
  "참기름",
  "식용유",
  "고춧가루",
  "굴소스"
];

export function QuickIngredientButtons({ onAdd, existing }: { onAdd: (name: string) => void; existing: string[] }) {
  const normalizedExisting = existing.map((ingredient) => normalizeIngredientName(ingredient));

  return (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_INGREDIENTS.map((ingredient) => {
        const added = normalizedExisting.includes(normalizeIngredientName(ingredient));
        return (
          <button
            key={ingredient}
            type="button"
            onClick={() => onAdd(ingredient)}
            disabled={added}
            className={`rounded-full px-2.5 py-1.5 text-xs font-bold ring-1 transition ${
              added
                ? "bg-stone-100 text-stone-400 ring-stone-200"
                : "bg-white text-stone-700 ring-stone-200 hover:bg-carrot-50 hover:text-stone-950 hover:ring-carrot-200"
            }`}
            aria-pressed={added}
          >
            {ingredient}
          </button>
        );
      })}
    </div>
  );
}
