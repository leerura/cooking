import { getRecipeAvailability } from "./ingredients";
import type { Recipe, UserIngredient } from "./types";

export function getRecommendationRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.filter((recipe) => recipe.status === "approved");
}

export function getRecipesAvailableWithCurrentIngredients(recipes: Recipe[], userIngredients: UserIngredient[]): Recipe[] {
  return getRecommendationRecipes(recipes).filter((recipe) => {
    const availability = getRecipeAvailability(recipe, userIngredients);
    return availability.status !== "자취생 비추천";
  });
}
