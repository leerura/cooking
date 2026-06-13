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
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {QUICK_INGREDIENTS.map((ingredient) => {
        const added = existing.includes(ingredient);
        return (
          <button
            key={ingredient}
            type="button"
            onClick={() => onAdd(ingredient)}
            disabled={added}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium ring-1 transition ${
              added
                ? "bg-stone-100 text-stone-400 ring-stone-200"
                : "bg-white text-stone-800 ring-stone-200 hover:bg-carrot-50 hover:ring-carrot-200"
            }`}
          >
            {ingredient}
          </button>
        );
      })}
    </div>
  );
}
