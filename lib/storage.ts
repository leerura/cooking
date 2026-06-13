import { extractYouTubeVideoId } from "./youtube";
import type {
  GlobalRecipeAnalysis,
  Recipe,
  RecipeConfidence,
  RecipeData,
  RecipeIngredient,
  RecipeStatus,
  UserIngredient,
  UserRecipe
} from "./types";

export const RECIPES_STORAGE_KEY = "igogeoneung_recipes";
export const INGREDIENTS_STORAGE_KEY = "igogeoneung_user_ingredients";
export const GLOBAL_RECIPE_ANALYSES_STORAGE_KEY = "igogeoneung_global_recipe_analyses";
export const USER_RECIPES_STORAGE_KEY = "igogeoneung_user_recipes";
export const LOCAL_USER_ID_STORAGE_KEY = "igogeoneung_local_user_id";

const LEGACY_RECIPES_STORAGE_KEY = "igogeoneung_saved_recipes";

type LegacyFlatRecipe = Partial<Recipe> & {
  recipeData?: RecipeData;
  status?: RecipeStatus | string;
  confidence?: RecipeConfidence;
  needsReview?: boolean;
  missingIngredients?: RecipeIngredient[];
};

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function assertBrowser() {
  return typeof window !== "undefined";
}

function cloneRecipeData(value?: Partial<RecipeData>): RecipeData {
  return {
    title: value?.title || "제목 확인 필요",
    summary: value?.summary || "레시피 내용을 확인해주세요.",
    requiredIngredients: value?.requiredIngredients || [],
    optionalIngredients: value?.optionalIngredients || [],
    substituteSuggestions: value?.substituteSuggestions || [],
    barrierFactors: value?.barrierFactors || [],
    cookingTools: value?.cookingTools || [],
    cookingTimeMinutes: value?.cookingTimeMinutes,
    difficulty: value?.difficulty || "보통",
    dishType: value?.dishType,
    steps: value?.steps || [],
    studentComment: value?.studentComment || "추천에 사용하기 전에 내용을 확인해주세요."
  };
}

function getInitialRecipeStatus(confidence?: RecipeConfidence, needsReview?: boolean): RecipeStatus {
  return needsReview || confidence === "낮음" ? "needs_review" : "draft";
}

function recipeFromData(input: {
  id?: string;
  youtubeVideoId?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  channelName?: string;
  recipeData?: Partial<RecipeData>;
  confidence?: RecipeConfidence;
  needsReview?: boolean;
  status?: RecipeStatus | string;
  createdAt?: string;
  updatedAt?: string;
}): Recipe {
  const now = new Date().toISOString();
  const confidence = input.confidence || "낮음";
  const needsReview = input.needsReview ?? confidence === "낮음";
  const recipeData = cloneRecipeData(input.recipeData);
  const explicitStatus =
    input.status === "draft" || input.status === "needs_review" || input.status === "approved" ? input.status : undefined;

  return {
    id: input.id || crypto.randomUUID(),
    youtubeVideoId: input.youtubeVideoId || (input.sourceUrl ? extractYouTubeVideoId(input.sourceUrl) || undefined : undefined),
    sourceUrl: input.sourceUrl,
    thumbnailUrl: input.thumbnailUrl,
    channelName: input.channelName,
    ...recipeData,
    confidence,
    needsReview,
    status: explicitStatus || getInitialRecipeStatus(confidence, needsReview),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now
  };
}

function recipeFromGlobalAnalysis(analysis: GlobalRecipeAnalysis): Recipe {
  return recipeFromData({
    id: analysis.id,
    youtubeVideoId: analysis.youtubeVideoId,
    sourceUrl: analysis.sourceUrl,
    thumbnailUrl: analysis.thumbnailUrl,
    channelName: analysis.channelName,
    recipeData: analysis.recipeData,
    confidence: analysis.confidence,
    needsReview: analysis.needsReview,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt
  });
}

function recipeFromUserRecipe(recipe: UserRecipe): Recipe {
  return recipeFromData({
    id: recipe.id,
    youtubeVideoId: recipe.youtubeVideoId,
    sourceUrl: recipe.sourceUrl,
    thumbnailUrl: recipe.thumbnailUrl,
    channelName: recipe.channelName,
    recipeData: recipe.recipeData,
    confidence: recipe.confidence,
    needsReview: recipe.needsReview,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt
  });
}

function recipeFromLegacyFlatRecipe(recipe: LegacyFlatRecipe): Recipe {
  return recipeFromData({
    id: recipe.id,
    youtubeVideoId: recipe.youtubeVideoId,
    sourceUrl: recipe.sourceUrl,
    thumbnailUrl: recipe.thumbnailUrl,
    channelName: recipe.channelName,
    recipeData: recipe.recipeData || recipe,
    confidence: recipe.confidence,
    needsReview: recipe.needsReview,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt
  });
}

function dedupeRecipesByYoutubeVideoId(recipes: Recipe[]): Recipe[] {
  const seen = new Set<string>();
  return recipes.filter((recipe) => {
    const key = recipe.youtubeVideoId;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function migrateOldRecipeStorageIfNeeded(): Recipe[] {
  if (!assertBrowser()) return [];

  const existingRecipes = safeParse<Recipe[]>(window.localStorage.getItem(RECIPES_STORAGE_KEY), []);
  if (existingRecipes.length > 0) {
    return existingRecipes;
  }

  const globalAnalyses = safeParse<GlobalRecipeAnalysis[]>(
    window.localStorage.getItem(GLOBAL_RECIPE_ANALYSES_STORAGE_KEY),
    []
  );
  const userRecipes = safeParse<UserRecipe[]>(window.localStorage.getItem(USER_RECIPES_STORAGE_KEY), []);
  const legacyRecipes = safeParse<LegacyFlatRecipe[]>(window.localStorage.getItem(LEGACY_RECIPES_STORAGE_KEY), []);

  const migrated = dedupeRecipesByYoutubeVideoId([
    ...userRecipes.map(recipeFromUserRecipe),
    ...globalAnalyses.map(recipeFromGlobalAnalysis),
    ...legacyRecipes.map(recipeFromLegacyFlatRecipe)
  ]);

  if (migrated.length > 0) {
    saveRecipesToLocalStorage(migrated);
  }

  return migrated;
}

export function getOrCreateLocalUserId(): string {
  if (!assertBrowser()) return "local-browser-user";
  const existing = window.localStorage.getItem(LOCAL_USER_ID_STORAGE_KEY);
  if (existing) return existing;

  const localUserId = crypto.randomUUID();
  window.localStorage.setItem(LOCAL_USER_ID_STORAGE_KEY, localUserId);
  return localUserId;
}

export function loadIngredientsFromLocalStorage(): UserIngredient[] {
  if (!assertBrowser()) return [];
  return safeParse<UserIngredient[]>(window.localStorage.getItem(INGREDIENTS_STORAGE_KEY), []);
}

export function saveIngredientsToLocalStorage(ingredients: UserIngredient[]) {
  window.localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(ingredients));
}

export function loadRecipesFromLocalStorage(): Recipe[] {
  if (!assertBrowser()) return [];
  const migrated = migrateOldRecipeStorageIfNeeded();
  if (migrated.length > 0) return migrated;
  return safeParse<Recipe[]>(window.localStorage.getItem(RECIPES_STORAGE_KEY), []);
}

export function saveRecipesToLocalStorage(recipes: Recipe[]) {
  window.localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
}

export function createRecipeFromAnalysisResult(result: Recipe): Recipe {
  const confidence = result.confidence || "낮음";
  const needsReview = result.needsReview ?? confidence === "낮음";
  return {
    ...result,
    youtubeVideoId: result.youtubeVideoId || (result.sourceUrl ? extractYouTubeVideoId(result.sourceUrl) || undefined : undefined),
    confidence,
    needsReview,
    status: getInitialRecipeStatus(confidence, needsReview),
    createdAt: result.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function updateRecipe(recipe: Recipe, updates: Partial<Recipe>): Recipe {
  return {
    ...recipe,
    ...updates,
    updatedAt: new Date().toISOString()
  };
}

export function approveRecipe(recipe: Recipe): Recipe {
  return updateRecipe(recipe, {
    status: "approved",
    needsReview: false
  });
}

export function getApprovedRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.filter((recipe) => recipe.status === "approved");
}

export function findRecipeByYoutubeVideoId(recipes: Recipe[], youtubeVideoId: string): Recipe | undefined {
  return recipes.find((recipe) => recipe.youtubeVideoId === youtubeVideoId);
}
