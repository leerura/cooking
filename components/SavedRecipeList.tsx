"use client";

import { Search } from "lucide-react";
import type { Recipe, RecipeStatus, UserIngredient } from "@/lib/types";
import { RecipeCard } from "./RecipeCard";

const FILTERS: Array<{ value: RecipeStatus | "전체"; label: string }> = [
  { value: "전체", label: "전체" },
  { value: "approved", label: "추천 사용" },
  { value: "needs_review", label: "확인 필요" },
  { value: "draft", label: "초안" }
];

export function SavedRecipeList({
  recipes,
  approvedCount,
  userIngredients,
  selectedFilter,
  setSelectedFilter,
  search,
  setSearch,
  onSelect,
  onDelete
}: {
  recipes: Recipe[];
  approvedCount: number;
  userIngredients: UserIngredient[];
  selectedFilter: RecipeStatus | "전체";
  setSelectedFilter: (filter: RecipeStatus | "전체") => void;
  search: string;
  setSearch: (value: string) => void;
  onSelect: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesFilter = selectedFilter === "전체" || recipe.status === selectedFilter;
    const searchable = [
      recipe.title,
      recipe.summary,
      ...recipe.requiredIngredients.map((ingredient) => ingredient.name),
      ...recipe.optionalIngredients.map((ingredient) => ingredient.name)
    ]
      .join(" ")
      .toLowerCase();
    return matchesFilter && (!normalizedSearch || searchable.includes(normalizedSearch));
  });

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-950">저장한 레시피</h2>
          <p className="text-sm text-stone-500">추천 사용 {approvedCount}개 / 전체 {recipes.length}개</p>
        </div>
      </div>

      {approvedCount === 0 ? (
        <p className="mb-3 rounded-lg bg-yellow-50 p-3 text-sm font-medium text-yellow-900 ring-1 ring-yellow-200">
          아직 추천할 수 있는 승인된 레시피가 없어요. 레시피를 추가하고 승인해보세요.
        </p>
      ) : null}

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3">
        <Search aria-hidden className="h-4 w-4 shrink-0 text-stone-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="제목이나 재료 검색"
          className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
        />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setSelectedFilter(filter.value)}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold ring-1 ${
              selectedFilter === filter.value ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filteredRecipes.length === 0 ? (
          <p className="rounded-lg bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200">아직 조건에 맞는 저장 레시피가 없어요.</p>
        ) : (
          filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} userIngredients={userIngredients} onSelect={onSelect} onDelete={onDelete} />
          ))
        )}
      </div>
    </section>
  );
}
