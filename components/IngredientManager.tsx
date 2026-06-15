"use client";

import { ChevronDown, Leaf, Package, Plus, Search, Snowflake, X } from "lucide-react";
import { useState } from "react";
import { normalizeIngredientName } from "@/lib/ingredients";
import type { UserIngredient } from "@/lib/types";
import { QuickIngredientButtons } from "./QuickIngredientButtons";

const CATEGORY_RULES = [
  {
    title: "주재료",
    description: "밥, 단백질, 채소처럼 요리의 중심이 되는 재료",
    Icon: Leaf,
    accent: "emerald",
    names: [
      "밥",
      "햇반",
      "즉석밥",
      "라면",
      "면",
      "파스타",
      "계란",
      "달걀",
      "참치캔",
      "참치",
      "스팸",
      "햄",
      "두부",
      "닭가슴살",
      "닭고기",
      "돼지고기",
      "소고기",
      "양파",
      "대파",
      "파",
      "김치",
      "감자",
      "당근",
      "마늘",
      "버섯",
      "애호박",
      "콩나물"
    ]
  },
  {
    title: "양념",
    description: "맛을 잡아주는 소스와 기본 조미료",
    Icon: Package,
    accent: "amber",
    names: [
      "고추장",
      "간장",
      "설탕",
      "소금",
      "후추",
      "참기름",
      "식용유",
      "고춧가루",
      "굴소스",
      "마요네즈",
      "마요",
      "된장",
      "쌈장",
      "식초",
      "케첩",
      "버터",
      "올리고당",
      "맛술",
      "다진마늘",
      "카레가루"
    ]
  },
  {
    title: "냉장/기타",
    description: "냉장 재료, 유제품, 간편식과 그 외 재료",
    Icon: Snowflake,
    accent: "sky",
    names: ["치즈", "우유", "요거트", "요구르트", "크림", "생크림", "떡", "만두", "어묵", "김", "참깨", "깨"]
  }
] as const;

type InventoryCategory = (typeof CATEGORY_RULES)[number]["title"];

function getIngredientCategory(ingredientName: string): InventoryCategory {
  const normalizedName = normalizeIngredientName(ingredientName);
  const matchedCategory = CATEGORY_RULES.find((category) =>
    category.names.some((name) => normalizeIngredientName(name) === normalizedName)
  );

  return matchedCategory?.title || "냉장/기타";
}

function getIngredientSubtitle(category: InventoryCategory, ingredientName: string): string {
  const normalizedName = normalizeIngredientName(ingredientName);

  if (category === "양념") {
    if (["간장", "고추장", "굴소스", "마요네즈", "된장", "쌈장", "케첩"].includes(normalizedName)) return "소스 · 양념";
    if (["설탕", "소금", "후추", "고춧가루", "카레가루"].includes(normalizedName)) return "가루 · 조미료";
    if (["식용유", "참기름", "버터"].includes(normalizedName)) return "오일 · 유지";
    return "기본 양념";
  }

  if (category === "냉장/기타") {
    if (["우유", "치즈", "요거트", "요구르트", "크림", "생크림"].includes(normalizedName)) return "유제품";
    if (["만두", "떡", "어묵"].includes(normalizedName)) return "간편 재료";
    return "냉장 · 기타";
  }

  if (["계란", "참치캔", "스팸", "두부", "닭가슴살", "닭고기", "돼지고기", "소고기"].includes(normalizedName)) return "단백질";
  if (["양파", "대파", "파", "감자", "당근", "마늘", "버섯", "애호박", "콩나물"].includes(normalizedName)) return "채소";
  if (["김치"].includes(normalizedName)) return "발효식품";
  return "식사 재료";
}

function getAccentClasses(accent: "emerald" | "amber" | "sky") {
  const classes = {
    emerald: {
      icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      count: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      thumb: "bg-emerald-50 text-emerald-800 ring-emerald-100"
    },
    amber: {
      icon: "bg-amber-50 text-amber-700 ring-amber-100",
      count: "bg-amber-50 text-amber-700 ring-amber-100",
      thumb: "bg-amber-50 text-amber-800 ring-amber-100"
    },
    sky: {
      icon: "bg-sky-50 text-sky-700 ring-sky-100",
      count: "bg-sky-50 text-sky-700 ring-sky-100",
      thumb: "bg-sky-50 text-sky-800 ring-sky-100"
    }
  };

  return classes[accent];
}

export function IngredientManager({
  ingredients,
  setIngredients
}: {
  ingredients: UserIngredient[];
  setIngredients: (ingredients: UserIngredient[]) => void;
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  function addIngredient(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const normalizedName = normalizeIngredientName(trimmed);
    if (ingredients.some((ingredient) => ingredient.normalizedName === normalizedName)) return;

    setIngredients([
      ...ingredients,
      {
        id: crypto.randomUUID(),
        name: trimmed,
        normalizedName,
        createdAt: new Date().toISOString()
      }
    ]);
  }

  function handleSubmit(formData: FormData) {
    addIngredient(String(formData.get("ingredient") || ""));
  }

  function removeIngredient(id: string) {
    setIngredients(ingredients.filter((item) => item.id !== id));
  }

  const groupedIngredients = CATEGORY_RULES.map((category) => ({
    ...category,
    ingredients: ingredients.filter((ingredient) => getIngredientCategory(ingredient.name) === category.title)
  }));

  const filledCategories = groupedIngredients.filter((category) => category.ingredients.length > 0).length;
  const hasIngredients = ingredients.length > 0;

  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-stone-200">
      <div className="border-b border-stone-100 bg-gradient-to-b from-white to-carrot-50/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-normal text-stone-950">내 재료함</h2>
            <p className="mt-1 text-sm font-medium text-stone-500">{ingredients.length}개 보유 중</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2 text-right ring-1 ring-carrot-100">
            <p className="text-xs font-bold text-carrot-700">분류</p>
            <p className="text-sm font-black text-stone-950">{filledCategories}곳</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <form action={handleSubmit} className="rounded-lg bg-stone-50 p-1.5 ring-1 ring-stone-200 transition focus-within:bg-white focus-within:ring-carrot-300">
          <div className="flex items-center gap-2">
            <Search aria-hidden className="ml-2 h-4 w-4 shrink-0 text-stone-400" />
            <input
              name="ingredient"
              placeholder="재료 검색 또는 직접 추가"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm font-medium text-stone-900 outline-none placeholder:text-stone-400"
            />
            <button
              type="submit"
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-stone-950 px-3 text-sm font-bold text-white transition hover:bg-stone-800"
              aria-label="재료 추가"
            >
              <Plus aria-hidden className="h-4 w-4" />
              추가
            </button>
          </div>
        </form>

        <div className={`rounded-lg border ${hasIngredients ? "border-stone-200 bg-stone-50/70" : "border-dashed border-carrot-200 bg-carrot-50/40"}`}>
          <button
            type="button"
            onClick={() => setQuickAddOpen((isOpen) => !isOpen)}
            className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition hover:bg-white/60"
            aria-expanded={quickAddOpen}
          >
            <span>
              <span className="block text-sm font-bold text-stone-800">자취생 기본 재료 빠르게 추가</span>
              {!hasIngredients ? (
                <span className="mt-0.5 block text-xs font-medium text-stone-500">처음 세팅할 때 자주 쓰는 재료를 골라보세요.</span>
              ) : null}
            </span>
            <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-stone-400 transition ${quickAddOpen ? "rotate-180" : ""}`} />
          </button>
          {quickAddOpen ? (
            <div className="border-t border-stone-200 px-3.5 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black text-stone-700">빠른 추가</p>
                <p className="text-xs font-medium text-stone-400">이미 있는 재료는 선택됨</p>
              </div>
              <QuickIngredientButtons onAdd={addIngredient} existing={ingredients.map((ingredient) => ingredient.name)} />
            </div>
          ) : null}
        </div>

        {!hasIngredients ? (
          <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-stone-900">아직 등록한 재료가 없어요.</p>
            <p className="mt-1 text-sm leading-6 text-stone-500">자주 쓰는 재료를 빠르게 추가하거나 직접 입력해보세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-stone-950">보유 재료</h3>
                <p className="mt-0.5 text-xs font-medium text-stone-500">카테고리별로 정리해서 보여줘요.</p>
              </div>
              <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-black text-stone-700 ring-1 ring-stone-200">
                총 {ingredients.length}개
              </span>
            </div>
            {groupedIngredients.map((category) => (
              <section key={category.title} className="rounded-lg border border-stone-200 bg-white p-3.5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${getAccentClasses(category.accent).icon}`}>
                      <category.Icon aria-hidden className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-stone-950">{category.title}</h4>
                      <p className="mt-0.5 truncate text-xs text-stone-500">{category.description}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${getAccentClasses(category.accent).count}`}>
                    {category.ingredients.length}개
                  </span>
                </div>

                {category.ingredients.length > 0 ? (
                  <ul className="space-y-1.5">
                    {category.ingredients.map((ingredient) => (
                      <li key={ingredient.id} className="flex min-w-0 items-center gap-2.5 rounded-md bg-stone-50 px-2.5 py-2 ring-1 ring-stone-100">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-black ring-1 ${getAccentClasses(category.accent).thumb}`}>
                            {ingredient.name.slice(0, 1)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-stone-900">{ingredient.name}</p>
                            <p className="truncate text-xs text-stone-500">{getIngredientSubtitle(category.title, ingredient.name)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeIngredient(ingredient.id)}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`${ingredient.name} 삭제`}
                        >
                          <X aria-hidden className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-400">아직 추가된 재료가 없어요.</p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
