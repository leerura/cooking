"use client";

import type { Recipe, UserIngredient } from "@/lib/types";
import { RecipeDetail } from "./RecipeDetail";

export function RecipeAnalysisResult({
  recipe,
  userIngredients,
  editing,
  setEditing,
  onSave,
  onUpdate
}: {
  recipe: Recipe;
  userIngredients: UserIngredient[];
  editing: boolean;
  setEditing: (value: boolean) => void;
  onSave: (recipe: Recipe) => void;
  onUpdate: (recipe: Recipe) => void;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-stone-950">분석 결과</h2>
        <p className="text-sm text-stone-500">저장 전에 빠진 재료와 순서를 확인해보세요.</p>
      </div>
      <RecipeDetail
        recipe={recipe}
        userIngredients={userIngredients}
        editing={editing}
        setEditing={setEditing}
        onSave={onSave}
        onUpdate={onUpdate}
      />
    </section>
  );
}
