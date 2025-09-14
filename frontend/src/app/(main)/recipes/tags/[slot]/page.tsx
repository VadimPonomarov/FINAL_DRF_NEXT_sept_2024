import { Metadata } from "next";
import { notFound } from "next/navigation";
import { IRecipe } from "@/common/interfaces/recipe.interfaces";
import { RecipeCard } from "@/app/(main)/recipes/(details)/RecipeCard/RecipeCard";
import { BaseUrl } from "@/common/constants/constants";
import { getAuthorizationHeaders } from "@/common/constants/headers";

import styles from "./index.module.css";

import { PageProps } from 'next';

type RecipeTagsPageProps = PageProps;

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RecipesPage = async ({ params }: RecipeTagsPageProps) => {
  try {
    const resolvedParams = await params;
    const { slot } = resolvedParams;
    const headers = await getAuthorizationHeaders();

    const response = await fetch(`${BaseUrl.Dummy}/products/category/${slot}`, {
      headers,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("401: Unauthorized");
      }
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Request failed with status: ${response.status}`);
    }

    const data = await response.json();
    const recipes = data.products || [];

    return (
      <div className={styles.absoluteContainer}>
        <div className="w-screen h-[85vh] flex flex-wrap gap-8 justify-center items-center overflow-y-auto">
          {recipes.map((recipe: IRecipe) => (
            <span key={recipe.id}>
              <RecipeCard item={recipe} />
            </span>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in RecipesPage:", error);
    if (error instanceof Error && error.message.includes("401")) {
      throw error;
    }
    notFound();
  }
};

// Динамическая генерация метаданных
export async function generateMetadata({ params }: RecipeTagsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { slot } = resolvedParams;
  return {
    title: `${slot} Recipes`,
    description: `Recipes in category ${slot}`,
    // Добавляем dynamic для метаданных
    alternates: {
      canonical: `/recipes/tags/${slot}`,
    },
  };
}

export default RecipesPage;
