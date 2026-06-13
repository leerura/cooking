export type UserIngredient = {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
};

export type IngredientCategory =
  | "탄수화물"
  | "단백질"
  | "채소"
  | "양념"
  | "유제품"
  | "가공식품"
  | "기타";

export type IngredientRole =
  | "base"
  | "main"
  | "sauce"
  | "seasoning"
  | "garnish"
  | "topping"
  | "finishing"
  | "other";

export type MissingImpact =
  | "cannot_cook"
  | "major_change"
  | "minor_change"
  | "garnish_only";

export type RecipeIngredient = {
  id: string;
  name: string;
  normalizedName: string;
  amount?: string;
  required: boolean;
  category?: IngredientCategory;
  role?: IngredientRole;
  missingImpact?: MissingImpact;
  necessityScore?: number;
};

export type SubstituteSuggestion = {
  original: string;
  substitutes: string[];
  reason: string;
};

export type RecipeStep = {
  order: number;
  text: string;
};

export type RecipeAvailabilityStatus =
  | "바로 가능"
  | "1개만 사면 가능"
  | "대체하면 가능"
  | "장보기 필요"
  | "자취생 비추천";

export type RecipeStatus = "draft" | "needs_review" | "approved";

export type RecipeConfidence = "높음" | "보통" | "낮음";

export type RecipeDifficulty = "쉬움" | "보통" | "어려움";

export type Recipe = {
  id: string;

  youtubeVideoId?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  channelName?: string;

  title: string;
  summary: string;

  requiredIngredients: RecipeIngredient[];
  optionalIngredients: RecipeIngredient[];
  substituteSuggestions: SubstituteSuggestion[];
  barrierFactors: string[];

  cookingTools: string[];
  cookingTimeMinutes?: number;
  difficulty: RecipeDifficulty;
  dishType?: string;

  steps: RecipeStep[];
  studentComment: string;

  confidence: RecipeConfidence;
  needsReview: boolean;

  status: RecipeStatus;

  createdAt: string;
  updatedAt: string;
};

export type RecipeData = Pick<
  Recipe,
  | "title"
  | "summary"
  | "requiredIngredients"
  | "optionalIngredients"
  | "substituteSuggestions"
  | "barrierFactors"
  | "cookingTools"
  | "cookingTimeMinutes"
  | "difficulty"
  | "dishType"
  | "steps"
  | "studentComment"
>;

export type GlobalRecipeAnalysis = {
  id: string;
  youtubeVideoId?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  channelName?: string;
  recipeData?: RecipeData;
  confidence?: RecipeConfidence;
  needsReview?: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type UserRecipe = {
  id: string;
  localUserId?: string;
  globalRecipeAnalysisId?: string;
  youtubeVideoId?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  channelName?: string;
  recipeData?: RecipeData;
  status?: RecipeStatus | RecipeAvailabilityStatus;
  missingIngredients?: RecipeIngredient[];
  isCustomized?: boolean;
  confidence?: RecipeConfidence;
  needsReview?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type YouTubeMetadata = {
  title: string;
  description?: string;
  channelName?: string;
  thumbnailUrl?: string;
  videoId?: string;
  isLimited?: boolean;
};
