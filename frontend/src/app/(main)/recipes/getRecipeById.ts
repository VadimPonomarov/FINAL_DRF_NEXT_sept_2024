import { IRecipe } from "@/common/interfaces/recipe.interfaces";

export const getRecipeById = async (id: string): Promise<IRecipe> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${baseUrl}/api/recipes/${id}/`);
  
  if (!response.ok) {
    throw new Error('Recipe not found');
  }
  
  return response.json();
};
