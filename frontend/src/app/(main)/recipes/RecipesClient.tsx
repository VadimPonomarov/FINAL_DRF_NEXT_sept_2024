"use client";
import { FC } from "react";
import InfiniteScroll from "@/components/All/InfiniteScroll/InfiniteScroll.tsx";
import { PaginationComponent } from "@/components/All/PaginationComponent/PaginationComponent.tsx";
import {
  IRecipe,
  IRecipesResponse,
} from "@/common/interfaces/recipe.interfaces.ts";
import { RecipeCard } from "@/app/(main)/recipes/(details)/RecipeCard/RecipeCard.tsx";
import DialogModal from "@/components/All/DialogModal/DialogModal.tsx";
import UniversalFilter from "@/components/All/UniversalFilter/FilterInput.tsx";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { useRecipes } from "./useRecipes.ts";

interface IProps {
  initialData: IRecipesResponse | Error;
}

const RecipesClient: FC<IProps> = ({ initialData }) => {
  const baseUrl = "/recipes";
  const searchParams = useSearchParams();
  const limit = searchParams.get("limit");
  const skip = searchParams.get("skip");

  const {
    filteredRecipes,
    handleNextPage,
    isFetchingNextPage,
    hasNextPage,
    total,
    filterRecipes,
  } = useRecipes({ initialData });

  return (
    <>
      <div className={"fixed top-[60px] z-50"}>
        <PaginationComponent total={total} baseUrl={baseUrl} />
      </div>
      <div className="w-screen flex justify-center ">
        <DialogModal>
          <UniversalFilter<IRecipe>
            queryKey={["recipes", limit, skip]}
            filterKeys={[
              "id",
              "name",
              "cuisine",
              "mealType",
              "tags",
              "userId",
              "rating",
              "reviewCount",
            ]}
            cb={filterRecipes}
            targetArrayKey="recipes"
          />
        </DialogModal>
      </div>
      <InfiniteScroll
        isLoading={isFetchingNextPage}
        hasMore={!!hasNextPage}
        next={handleNextPage}
      >
        {filteredRecipes
          .sort((a, b) => (a.id > b.id ? 1 : -1))
          .map((recipe: IRecipe) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.5,
                ease: [0, 0.71, 0.2, 1.01],
              }}
            >
              <RecipeCard item={recipe} />
            </motion.div>
          ))}
      </InfiniteScroll>
    </>
  );
};

export default RecipesClient;
