import type { Recipe, RecipeAvailabilityStatus, RecipeData, RecipeIngredient, SubstituteSuggestion, UserIngredient } from "./types";

const QUANTITY_WORDS = [
  "약간",
  "조금",
  "적당량",
  "한개",
  "두개",
  "세개",
  "1개",
  "2개",
  "3개",
  "큰술",
  "작은술",
  "스푼",
  "컵",
  "그램",
  "g",
  "ml",
  "개",
  "장",
  "쪽",
  "줌",
  "봉",
  "캔"
];

const ALIASES: Record<string, string[]> = {
  "참치캔": ["참치", "캔참치", "참치통조림"],
  "대파": ["파", "쪽파", "실파"],
  "밥": ["햇반", "즉석밥", "흰밥", "찬밥"],
  "마요네즈": ["마요"],
  "식용유": ["기름", "카놀라유", "올리브유", "포도씨유"],
  "고추장": ["초고추장"],
  "간장": ["진간장", "양조간장", "국간장"],
  "고춧가루": ["고추가루"],
  "스팸": ["햄", "리챔"],
  "라면": ["라멘", "봉지라면"],
  "김치": ["배추김치", "신김치"],
  "두부": ["부침두부", "찌개두부"],
  "계란": ["달걀"],
  "우유": ["밀크"],
  "치즈": ["슬라이스치즈", "모짜렐라", "모차렐라"]
};

const NORMALIZED_ALIAS = Object.entries(ALIASES).reduce<Record<string, string>>((acc, [base, aliases]) => {
  const normalizedBase = simpleNormalize(base);
  acc[normalizedBase] = normalizedBase;
  aliases.forEach((alias) => {
    acc[simpleNormalize(alias)] = normalizedBase;
  });
  return acc;
}, {});

const STUDENT_BARRIERS = [
  "오븐",
  "에어프라이어",
  "생크림",
  "파마산",
  "월계수",
  "와인",
  "허브",
  "타임",
  "로즈마리",
  "바질",
  "튀김",
  "딥프라이",
  "고기망치"
];

function simpleNormalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[0-9./~,\s]/g, "")
    .replace(new RegExp(QUANTITY_WORDS.join("|"), "g"), "")
    .replace(/[^a-z가-힣]/g, "");
}

export function normalizeIngredientName(value: string): string {
  const normalized = simpleNormalize(value);
  return NORMALIZED_ALIAS[normalized] || normalized;
}

export function createRecipeIngredient(name: string, required: boolean): RecipeIngredient {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    normalizedName: normalizeIngredientName(name),
    required
  };
}

export function ingredientMatches(a: string, b: string): boolean {
  const left = normalizeIngredientName(a);
  const right = normalizeIngredientName(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

export function compareIngredients(required: RecipeIngredient[], userIngredients: UserIngredient[]): RecipeIngredient[] {
  return required.filter((ingredient) => {
    return !userIngredients.some((userIngredient) =>
      ingredientMatches(ingredient.normalizedName || ingredient.name, userIngredient.normalizedName || userIngredient.name)
    );
  });
}

export function getMissingIngredientsForAvailability(
  required: RecipeIngredient[],
  userIngredients: UserIngredient[]
): RecipeIngredient[] {
  return compareIngredients(required, userIngredients).filter((ingredient) => {
    if (!ingredient.missingImpact) return true;
    return ingredient.missingImpact === "cannot_cook" || ingredient.missingImpact === "major_change";
  });
}

export function hasAvailableSubstitute(
  missing: RecipeIngredient,
  substitutions: SubstituteSuggestion[],
  userIngredients: UserIngredient[]
): boolean {
  const suggestion = substitutions.find((item) => ingredientMatches(item.original, missing.name));
  if (!suggestion) return false;

  return suggestion.substitutes.some((substitute) =>
    userIngredients.some((userIngredient) => ingredientMatches(substitute, userIngredient.name))
  );
}

export function calculateRecipeStatus(recipeData: RecipeData, userIngredients: UserIngredient[]): RecipeAvailabilityStatus {
  const missing = getMissingIngredientsForAvailability(recipeData.requiredIngredients, userIngredients);
  const barrierText = [...recipeData.barrierFactors, ...recipeData.cookingTools].join(" ");
  const hasHardBarrier =
    STUDENT_BARRIERS.some((barrier) => barrierText.includes(barrier)) ||
    (recipeData.cookingTimeMinutes || 0) > 40 ||
    recipeData.barrierFactors.length >= 3 ||
    missing.length >= 5;

  if (hasHardBarrier) return "자취생 비추천";
  if (missing.length === 0) return "바로 가능";
  if (missing.length === 1) return "1개만 사면 가능";

  const allSubstitutable = missing.every((ingredient) =>
    hasAvailableSubstitute(ingredient, recipeData.substituteSuggestions, userIngredients)
  );

  if (allSubstitutable) return "대체하면 가능";
  return "장보기 필요";
}

export function getRecipeAvailability(recipe: Recipe, userIngredients: UserIngredient[]) {
  const missingIngredients = getMissingIngredientsForAvailability(recipe.requiredIngredients, userIngredients);
  return {
    missingIngredients,
    status: calculateRecipeStatus(recipe, userIngredients)
  };
}

export function refreshRecipeAvailability(recipe: Recipe, userIngredients: UserIngredient[]): Recipe {
  getRecipeAvailability(recipe, userIngredients);
  return recipe;
}
