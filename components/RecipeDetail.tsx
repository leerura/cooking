"use client";

import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Pencil, Save, Utensils } from "lucide-react";
import type { Recipe, RecipeData, UserIngredient } from "@/lib/types";
import { getRecipeAvailability } from "@/lib/ingredients";
import { approveRecipe } from "@/lib/storage";
import { MissingIngredients } from "./MissingIngredients";
import { RecipeEditor } from "./RecipeEditor";
import { StatusBadge } from "./StatusBadge";

export function RecipeDetail({
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
  if (editing) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-stone-200">
        <RecipeEditor
          recipe={recipe}
          onCancel={() => setEditing(false)}
          onSave={(updated) => {
            onUpdate(updated);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  const availability = getRecipeAvailability(recipe, userIngredients);

  return (
    <article className="overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-stone-200">
      {recipe.thumbnailUrl ? <img src={recipe.thumbnailUrl} alt="" className="h-48 w-full object-cover sm:h-64" /> : null}
      <div className="space-y-5 p-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={recipe.status} />
            <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700">신뢰도 {recipe.confidence}</span>
            {recipe.needsReview ? <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-900">수정 필요</span> : null}
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700">현재 재료 기준 {availability.status}</span>
          <h2 className="text-2xl font-black tracking-normal text-stone-950">{recipe.title}</h2>
          <p className="text-sm leading-6 text-stone-600">{recipe.summary}</p>
          {recipe.sourceUrl ? (
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-carrot-700">
              원본 영상 보기
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>

        {recipe.confidence === "낮음" ? (
          <div className="flex gap-2 rounded-lg bg-yellow-50 p-3 text-sm leading-6 text-yellow-900 ring-1 ring-yellow-200">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <p>AI 분석 결과가 부정확할 수 있어요. 저장 전에 확인해주세요.</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <InfoTile label="시간" value={recipe.cookingTimeMinutes ? `${recipe.cookingTimeMinutes}분` : "확인 필요"} icon={<Clock className="h-4 w-4" />} />
          <InfoTile label="난이도" value={recipe.difficulty} icon={<Utensils className="h-4 w-4" />} />
          <InfoTile label="종류" value={recipe.dishType || "분류 없음"} />
          <InfoTile label="채널" value={recipe.channelName || "확인 필요"} />
        </div>

        <Section title="부족한 재료">
          <MissingIngredients ingredients={availability.missingIngredients} />
        </Section>

        <Section title="필수 재료">
          <IngredientList ingredients={recipe.requiredIngredients} />
        </Section>

        <Section title="선택 재료">
          <IngredientList ingredients={recipe.optionalIngredients} emptyText="선택 재료가 따로 없어요." />
        </Section>

        <Section title="대체 가능 재료">
          {recipe.substituteSuggestions.length === 0 ? (
            <p className="text-sm text-stone-500">추천 대체 재료가 아직 없어요.</p>
          ) : (
            <div className="grid gap-2">
              {recipe.substituteSuggestions.map((suggestion) => (
                <div key={`${suggestion.original}-${suggestion.reason}`} className="rounded-lg bg-stone-50 p-3 ring-1 ring-stone-200">
                  <p className="text-sm font-bold text-stone-900">{suggestion.original}</p>
                  <p className="mt-1 text-sm text-stone-700">{suggestion.substitutes.join(", ")}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{suggestion.reason}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="자취생 장벽 요소">
          {recipe.barrierFactors.length === 0 ? (
            <p className="text-sm text-emerald-700">큰 장벽 요소는 없어 보여요.</p>
          ) : (
            <TagList items={recipe.barrierFactors} tone="warn" />
          )}
        </Section>

        <Section title="조리 도구">
          <TagList items={recipe.cookingTools.length ? recipe.cookingTools : ["프라이팬 또는 냄비"]} />
        </Section>

        <Section title="조리 순서">
          <ol className="space-y-3">
            {recipe.steps.map((step) => (
              <li key={step.order} className="grid grid-cols-[2rem_1fr] gap-2 text-sm leading-6 text-stone-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-carrot-100 text-xs font-black text-carrot-700">{step.order}</span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        </Section>

        <div className="rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-100">
          <strong className="block">자취생 코멘트</strong>
          {recipe.studentComment}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-100 px-4 py-3 text-sm font-bold text-stone-900">
            <Pencil aria-hidden className="h-4 w-4" />
            수정
          </button>
          <button
            type="button"
            onClick={() => onUpdate(approveRecipe(recipe))}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:bg-stone-200 disabled:text-stone-500"
            disabled={recipe.status === "approved"}
          >
            <CheckCircle2 aria-hidden className="h-4 w-4" />
            추천에 사용
          </button>
          <button type="button" onClick={() => onSave(recipe)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-carrot-600 px-4 py-3 text-sm font-bold text-white">
            <Save aria-hidden className="h-4 w-4" />
            저장
          </button>
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-base font-black text-stone-950">{title}</h3>
      {children}
    </section>
  );
}

function InfoTile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-stone-50 p-3 ring-1 ring-stone-200">
      <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-stone-500">{icon}{label}</p>
      <p className="truncate text-sm font-bold text-stone-900">{value}</p>
    </div>
  );
}

function IngredientList({ ingredients, emptyText = "재료 정보가 없어요." }: { ingredients: RecipeData["requiredIngredients"]; emptyText?: string }) {
  if (ingredients.length === 0) return <p className="text-sm text-stone-500">{emptyText}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {ingredients.map((ingredient) => (
        <span key={ingredient.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-800">
          {ingredient.name}{ingredient.amount ? ` ${ingredient.amount}` : ""}
        </span>
      ))}
    </div>
  );
}

function TagList({ items, tone = "default" }: { items: string[]; tone?: "default" | "warn" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-3 py-1 text-sm font-semibold ${tone === "warn" ? "bg-rose-50 text-rose-800" : "bg-stone-100 text-stone-800"}`}>
          {item}
        </span>
      ))}
    </div>
  );
}
