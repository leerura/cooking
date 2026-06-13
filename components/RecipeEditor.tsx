"use client";

import type { Recipe, RecipeDifficulty, RecipeIngredient, RecipeStatus, SubstituteSuggestion } from "@/lib/types";
import { createRecipeIngredient } from "@/lib/ingredients";

const STATUS_OPTIONS: Array<{ value: RecipeStatus; label: string }> = [
  { value: "draft", label: "초안" },
  { value: "needs_review", label: "확인 필요" },
  { value: "approved", label: "추천 사용" }
];

function ingredientsToText(ingredients: RecipeIngredient[]) {
  return ingredients.map((ingredient) => `${ingredient.name}${ingredient.amount ? ` / ${ingredient.amount}` : ""}`).join("\n");
}

function textToIngredients(value: string, required: boolean, existingIngredients: RecipeIngredient[] = []): RecipeIngredient[] {
  const usedExistingIds = new Set<string>();
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, amount] = line.split("/").map((part) => part.trim());
      const normalizedAmount = amount || undefined;
      const existing = existingIngredients.find((ingredient) => {
        return (
          !usedExistingIds.has(ingredient.id) &&
          ingredient.name === name &&
          (ingredient.amount || undefined) === normalizedAmount
        );
      });

      if (existing) {
        usedExistingIds.add(existing.id);
        return { ...existing, required };
      }

      return { ...createRecipeIngredient(name, required), amount: normalizedAmount };
    });
}

function substitutesToText(substitutes: SubstituteSuggestion[]) {
  return substitutes.map((item) => `${item.original} => ${item.substitutes.join(", ")} | ${item.reason}`).join("\n");
}

function textToSubstitutes(value: string): SubstituteSuggestion[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [left, reason = "자취생 재료로 대체 가능"] = line.split("|").map((part) => part.trim());
      const [original, substitutes = ""] = left.split("=>").map((part) => part.trim());
      return {
        original: original || "확인 필요",
        substitutes: substitutes.split(",").map((part) => part.trim()).filter(Boolean),
        reason
      };
    });
}

export function RecipeEditor({
  recipe,
  onCancel,
  onSave
}: {
  recipe: Recipe;
  onCancel: () => void;
  onSave: (recipe: Recipe) => void;
}) {
  function handleSubmit(formData: FormData) {
    const updated: Recipe = {
      ...recipe,
      title: String(formData.get("title") || recipe.title),
      summary: String(formData.get("summary") || recipe.summary),
      requiredIngredients: textToIngredients(String(formData.get("requiredIngredients") || ""), true, recipe.requiredIngredients),
      optionalIngredients: textToIngredients(String(formData.get("optionalIngredients") || ""), false, recipe.optionalIngredients),
      substituteSuggestions: textToSubstitutes(String(formData.get("substitutes") || "")),
      barrierFactors: String(formData.get("barrierFactors") || "").split("\n").map((item) => item.trim()).filter(Boolean),
      cookingTools: String(formData.get("cookingTools") || "").split("\n").map((item) => item.trim()).filter(Boolean),
      cookingTimeMinutes: Number(formData.get("cookingTimeMinutes")) || undefined,
      difficulty: String(formData.get("difficulty") || "보통") as RecipeDifficulty,
      dishType: String(formData.get("dishType") || "").trim() || undefined,
      steps: String(formData.get("steps") || "")
        .split("\n")
        .map((text, index) => ({ order: index + 1, text: text.trim() }))
        .filter((step) => step.text),
      studentComment: String(formData.get("studentComment") || ""),
      status: String(formData.get("status") || recipe.status) as RecipeStatus,
      confidence: String(formData.get("confidence") || recipe.confidence) as Recipe["confidence"],
      needsReview: formData.get("needsReview") === "on",
      updatedAt: new Date().toISOString()
    };

    onSave(updated);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="rounded-lg bg-yellow-50 p-3 text-sm font-medium leading-6 text-yellow-900 ring-1 ring-yellow-200">
        레시피 내용을 확인한 뒤 추천에 사용할지 정할 수 있어요.
      </p>
      <Field label="제목">
        <input name="title" defaultValue={recipe.title} className="field-input" />
      </Field>
      <Field label="요약">
        <textarea name="summary" defaultValue={recipe.summary} className="field-textarea" />
      </Field>
      <Field label="필수 재료">
        <textarea name="requiredIngredients" defaultValue={ingredientsToText(recipe.requiredIngredients)} className="field-textarea" />
      </Field>
      <Field label="선택 재료">
        <textarea name="optionalIngredients" defaultValue={ingredientsToText(recipe.optionalIngredients)} className="field-textarea" />
      </Field>
      <Field label="대체 가능 재료">
        <textarea name="substitutes" defaultValue={substitutesToText(recipe.substituteSuggestions)} className="field-textarea" placeholder="원재료 => 대체1, 대체2 | 이유" />
      </Field>
      <Field label="자취생 장벽 요소">
        <textarea name="barrierFactors" defaultValue={recipe.barrierFactors.join("\n")} className="field-textarea" />
      </Field>
      <Field label="조리 도구">
        <textarea name="cookingTools" defaultValue={recipe.cookingTools.join("\n")} className="field-textarea" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="조리 시간">
          <input name="cookingTimeMinutes" type="number" min="0" defaultValue={recipe.cookingTimeMinutes || ""} className="field-input" />
        </Field>
        <Field label="난이도">
          <select name="difficulty" defaultValue={recipe.difficulty} className="field-input">
            <option>쉬움</option>
            <option>보통</option>
            <option>어려움</option>
          </select>
        </Field>
      </div>
      <Field label="종류">
        <input name="dishType" defaultValue={recipe.dishType || ""} className="field-input" />
      </Field>
      <Field label="조리 순서">
        <textarea name="steps" defaultValue={recipe.steps.map((step) => step.text).join("\n")} className="field-textarea min-h-36" />
      </Field>
      <Field label="자취생 코멘트">
        <textarea name="studentComment" defaultValue={recipe.studentComment} className="field-textarea" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="상태">
          <select name="status" defaultValue={recipe.status} className="field-input">
            {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </Field>
        <Field label="신뢰도">
          <select name="confidence" defaultValue={recipe.confidence} className="field-input">
            <option>높음</option>
            <option>보통</option>
            <option>낮음</option>
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
        <input name="needsReview" type="checkbox" defaultChecked={recipe.needsReview} className="h-4 w-4 rounded border-stone-300 text-carrot-600" />
        수정 필요
      </label>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-lg bg-stone-900 px-4 py-3 text-sm font-bold text-white">편집 저장</button>
        <button type="button" onClick={onCancel} className="rounded-lg bg-stone-100 px-4 py-3 text-sm font-bold text-stone-800">취소</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-stone-700">{label}</span>
      {children}
    </label>
  );
}
