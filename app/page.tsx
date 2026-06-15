"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clapperboard, Refrigerator, Sparkles } from "lucide-react";
import { IngredientDrawer } from "@/components/IngredientDrawer";
import { RecipeAnalysisResult } from "@/components/RecipeAnalysisResult";
import { RecipeCard } from "@/components/RecipeCard";
import { SavedRecipeList } from "@/components/SavedRecipeList";
import { URLInput } from "@/components/URLInput";
import { getRecipeAvailability } from "@/lib/ingredients";
import { getRecipesAvailableWithCurrentIngredients } from "@/lib/recommendations";
import { extractYouTubeVideoId } from "@/lib/youtube";
import {
  createRecipeFromAnalysisResult,
  findRecipeByYoutubeVideoId,
  getApprovedRecipes,
  getOrCreateLocalUserId,
  loadIngredientsFromLocalStorage,
  loadRecipesFromLocalStorage,
  saveIngredientsToLocalStorage,
  saveRecipesToLocalStorage,
  updateRecipe as updateRecipeObject
} from "@/lib/storage";
import type { Recipe, RecipeStatus, UserIngredient, YouTubeMetadata } from "@/lib/types";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [ingredients, setIngredientsState] = useState<UserIngredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [cachedRecipe, setCachedRecipe] = useState<Recipe | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<RecipeStatus | "전체">("approved");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<"idle" | "metadata" | "video" | "saving">("idle");
  const [editing, setEditing] = useState(false);
  const [isIngredientDrawerOpen, setIsIngredientDrawerOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  useEffect(() => {
    getOrCreateLocalUserId();
    setIngredientsState(loadIngredientsFromLocalStorage());
    setRecipes(loadRecipesFromLocalStorage());
  }, []);

  function setIngredients(nextIngredients: UserIngredient[]) {
    setIngredientsState(nextIngredients);
    saveIngredientsToLocalStorage(nextIngredients);
  }

  async function analyzeRecipe({ force = false }: { force?: boolean } = {}) {
    setLoading(true);
    setAnalysisStep("metadata");
    setMessage(null);
    setEditing(false);
    setCachedRecipe(null);

    try {
      const metadataResponse = await fetch("/api/youtube-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const metadata = (await metadataResponse.json()) as YouTubeMetadata & { error?: string; warning?: string };

      const youtubeVideoId = metadata.videoId || extractYouTubeVideoId(url);
      const existingRecipe = youtubeVideoId ? findRecipeByYoutubeVideoId(recipes, youtubeVideoId) : undefined;

      if (existingRecipe && !force) {
        setActiveRecipe(existingRecipe);
        setCachedRecipe(existingRecipe);
        setMessage({ type: "warning", text: "이미 저장된 영상이라 기존 레시피를 불러왔어요." });
        return;
      }

      setAnalysisStep("video");
      const analysisResponse = await fetch("/api/analyze-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          metadata: {
            title: metadata.title || "YouTube 레시피",
            description: metadata.description,
            channelName: metadata.channelName,
            thumbnailUrl: metadata.thumbnailUrl
          },
          userIngredients: ingredients
        })
      });

      const result = await analysisResponse.json();
      if (!analysisResponse.ok) {
        throw new Error(result.error || "AI 분석에 실패했어요.");
      }

      setAnalysisStep("saving");
      const analyzedRecipe = createRecipeFromAnalysisResult(result as Recipe);
      const nextRecipe =
        force && existingRecipe
          ? updateRecipeObject(existingRecipe, {
              ...analyzedRecipe,
              id: existingRecipe.id,
              status: analyzedRecipe.status,
              createdAt: existingRecipe.createdAt
            })
          : analyzedRecipe;
      const nextRecipes = [nextRecipe, ...recipes.filter((recipe) => recipe.id !== nextRecipe.id && recipe.youtubeVideoId !== nextRecipe.youtubeVideoId)];
      saveRecipesToLocalStorage(nextRecipes);
      setRecipes(nextRecipes);
      setActiveRecipe(nextRecipe);
      setMessage(
        nextRecipe.status === "needs_review"
          ? { type: "warning", text: "분석은 끝났어요. 확인 후 추천에 사용할 수 있어요." }
          : { type: "success", text: "초안으로 저장했어요. 확인 후 추천에 사용으로 바꿔주세요." }
      );
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "알 수 없는 오류가 생겼어요."
      });
    } finally {
      setLoading(false);
      setAnalysisStep("idle");
    }
  }

  function saveRecipe(recipe: Recipe) {
    const saved = [{ ...recipe, updatedAt: new Date().toISOString() }, ...recipes.filter((item) => item.id !== recipe.id)];
    saveRecipesToLocalStorage(saved);
    setRecipes(saved);
    setMessage({ type: "success", text: "레시피를 저장했어요." });
  }

  function updateRecipe(recipe: Recipe) {
    const updated = updateRecipeObject(recipe, recipe);
    setActiveRecipe(updated);
    setRecipes((current) => {
      const exists = current.some((item) => item.id === recipe.id);
      if (!exists) return current;
      const next = current.map((item) => (item.id === recipe.id ? updated : item));
      saveRecipesToLocalStorage(next);
      return next;
    });
    setMessage({ type: "success", text: recipe.status === "approved" ? "추천에 사용할 레시피로 승인했어요." : "레시피를 수정했어요." });
  }

  function deleteSavedRecipe(recipe: Recipe) {
    const confirmed = window.confirm(`'${recipe.title}' 레시피를 삭제할까요?`);
    if (!confirmed) return;

    const nextRecipes = recipes.filter((item) => item.id !== recipe.id);
    saveRecipesToLocalStorage(nextRecipes);
    setRecipes(nextRecipes);
    setActiveRecipe((current) => (current?.id === recipe.id ? null : current));
    setEditing(false);
    setMessage({ type: "success", text: "저장한 레시피를 삭제했어요." });
  }

  const approvedRecipes = getApprovedRecipes(recipes);
  const recommendationRecipes = getRecipesAvailableWithCurrentIngredients(recipes, ingredients);
  const readyNowRecipes = approvedRecipes.filter((recipe) => getRecipeAvailability(recipe, ingredients).status === "바로 가능");
  const recommendationPreview = recommendationRecipes.slice(0, 3);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 overflow-hidden rounded-lg bg-white p-6 shadow-soft ring-1 ring-carrot-100 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-carrot-50 px-3 py-1 text-sm font-semibold text-carrot-700 ring-1 ring-carrot-100">
              <Sparkles aria-hidden className="h-4 w-4" />
              이거가능?
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-normal text-stone-950 sm:text-5xl">
              집에 있는 재료로 지금 가능한 요리 찾기
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
              내 재료함을 기준으로 바로 가능한 레시피를 먼저 보여줘요. 유튜브 레시피는 필요할 때 추가하고, 평소에는 내 재료함 기준으로
              바로 가능한 요리를 추천받아요.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => scrollToSection("recommendation-preview")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-carrot-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-carrot-700"
              >
                <Sparkles aria-hidden className="h-4 w-4" />
                가능한 요리 보기
              </button>
              <button
                type="button"
                onClick={() => setIsIngredientDrawerOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-100 px-5 py-3 text-sm font-bold text-stone-900 transition hover:bg-stone-200"
              >
                <Refrigerator aria-hidden className="h-4 w-4" />
                재료함 관리하기
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <SummaryCard label="보유 재료" value={`${ingredients.length}개`} />
            <SummaryCard label="추천 사용 레시피" value={`${approvedRecipes.length}개`} />
            <SummaryCard label="바로 가능한 요리" value={`${readyNowRecipes.length}개`} accent />
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <section id="recommendation-preview" className="scroll-mt-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-stone-950">내 재료로 추천받기</h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">승인된 레시피 중 지금 재료함 기준으로 만들기 쉬운 요리를 먼저 보여줘요.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFilter("approved");
                scrollToSection("saved-recipes");
              }}
              className="inline-flex items-center justify-center rounded-lg bg-stone-100 px-4 py-2 text-sm font-bold text-stone-900 transition hover:bg-stone-200"
            >
              전체 레시피 보기
            </button>
          </div>

          {recommendationPreview.length > 0 ? (
            <div className="space-y-3">
              {recommendationPreview.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  userIngredients={ingredients}
                  onSelect={(selectedRecipe) => {
                    setActiveRecipe(selectedRecipe);
                    setEditing(false);
                    scrollToSection("recipe-review");
                  }}
                  onDelete={deleteSavedRecipe}
                />
              ))}
            </div>
          ) : null}

          {recommendationPreview.length === 0 ? (
            <div className="rounded-lg bg-stone-50 p-5 text-sm leading-6 text-stone-600 ring-1 ring-stone-200">
              아직 바로 추천할 요리가 없어요. 재료를 추가하거나 레시피를 승인해보세요.
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-black text-stone-950">유튜브 레시피 추가</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">마음에 드는 유튜브 레시피를 추가해서 추천 DB를 채울 수 있어요.</p>
          </div>
          <URLInput url={url} setUrl={setUrl} onAnalyze={analyzeRecipe} loading={loading} />
        </section>

        {loading ? <AnalysisLoadingCard step={analysisStep} /> : null}

        {message ? <MessageBanner type={message.type} text={message.text} /> : null}

        {cachedRecipe ? (
          <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-stone-200">
            <p className="text-sm font-bold text-stone-900">이미 저장된 영상이에요.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setCachedRecipe(null)} className="rounded-lg bg-carrot-600 px-4 py-3 text-sm font-bold text-white">
                기존 레시피 보기
              </button>
              <button type="button" onClick={() => analyzeRecipe({ force: true })} className="rounded-lg bg-stone-100 px-4 py-3 text-sm font-bold text-stone-900">
                다시 분석하기
              </button>
            </div>
          </section>
        ) : null}

        <section id="recipe-review" className="scroll-mt-6">
          {activeRecipe ? (
            <RecipeAnalysisResult
              recipe={activeRecipe}
              userIngredients={ingredients}
              editing={editing}
              setEditing={setEditing}
              onSave={saveRecipe}
              onUpdate={updateRecipe}
            />
          ) : null}
        </section>

        <section id="saved-recipes" className="scroll-mt-6">
          <SavedRecipeList
            recipes={recipes}
            approvedCount={approvedRecipes.length}
            userIngredients={ingredients}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            search={search}
            setSearch={setSearch}
            onSelect={(recipe) => {
              setActiveRecipe(recipe);
              setEditing(false);
              scrollToSection("recipe-review");
            }}
            onDelete={deleteSavedRecipe}
          />
        </section>
      </div>

      <IngredientDrawer
        ingredients={ingredients}
        setIngredients={setIngredients}
        isOpen={isIngredientDrawerOpen}
        onToggle={() => setIsIngredientDrawerOpen((isOpen) => !isOpen)}
        onClose={() => setIsIngredientDrawerOpen(false)}
      />
    </main>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ring-1 ${accent ? "bg-emerald-50 ring-emerald-100" : "bg-stone-50 ring-stone-200"}`}>
      <p className={`text-sm font-semibold ${accent ? "text-emerald-800" : "text-stone-500"}`}>{label}</p>
      <p className="mt-1 text-2xl font-black tracking-normal text-stone-950">{value}</p>
    </div>
  );
}

function AnalysisLoadingCard({ step }: { step: "idle" | "metadata" | "video" | "saving" }) {
  const stepLabel = {
    idle: "준비 중",
    metadata: "영상 정보를 확인하는 중",
    video: "AI가 영상을 보고 재료와 순서를 정리하는 중",
    saving: "결과를 정리하는 중"
  }[step];

  const steps = [
    { key: "metadata", label: "영상 확인" },
    { key: "video", label: "AI 분석" },
    { key: "saving", label: "결과 정리" }
  ];
  const currentIndex = Math.max(0, steps.findIndex((item) => item.key === step));

  return (
    <section className="overflow-hidden rounded-lg bg-white p-4 shadow-soft ring-1 ring-carrot-100">
      <div className="flex items-start gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-carrot-100 text-carrot-700">
          <Clapperboard aria-hidden className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500 loading-ping" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h2 className="text-base font-black text-stone-950">AI가 레시피를 분석하고 있어요</h2>
            <span className="loading-dots" aria-hidden>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-stone-600">{stepLabel}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {steps.map((item, index) => {
              const active = index <= currentIndex;
              return (
                <div key={item.key} className="min-w-0">
                  <div className={`h-1.5 rounded-full ${active ? "bg-carrot-500 loading-bar" : "bg-stone-200"}`} />
                  <p className={`mt-1 truncate text-xs font-semibold ${active ? "text-carrot-700" : "text-stone-400"}`}>{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function MessageBanner({ type, text }: { type: "success" | "error" | "warning"; text: string }) {
  const styles = {
    success: "bg-emerald-50 text-emerald-900 ring-emerald-100",
    error: "bg-rose-50 text-rose-900 ring-rose-100",
    warning: "bg-yellow-50 text-yellow-900 ring-yellow-100"
  };
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`flex gap-2 rounded-lg p-3 text-sm font-medium ring-1 ${styles[type]}`}>
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{text}</p>
    </div>
  );
}
