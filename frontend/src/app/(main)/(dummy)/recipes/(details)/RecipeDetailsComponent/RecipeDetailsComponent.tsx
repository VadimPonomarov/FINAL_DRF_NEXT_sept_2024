import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import Link from "next/link";
import { IRecipe } from "@/shared/types/recipe.interfaces.ts";
import { FC } from "react";
import NewResizableWrapper from "@/components/All/ResizableWrapper/NewResizableWrapper";
import {
  CalendarIcon,
  ClockIcon,
  FlameIcon,
  StarIcon,
  UserIcon,
  UtensilsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import styles from "./index.module.css";

interface IProps {
  item: IRecipe;
}

const RecipeDetailsComponent: FC<IProps> = async (props) => {
  const item = (await props).item;

  const totalTime = (item.prepTimeMinutes || 0) + (item.cookTimeMinutes || 0);

  return (
    <div className={"w-screen h-[85vh] flex justify-center items-center"}>
      {item && (
        <NewResizableWrapper
          storageKey="recipe-details"
          defaultWidth={600}
          defaultHeight={500}
          minWidth={400}
          minHeight={300}
        >
          <Card className={styles.card}>
            <CardHeader className={styles.cardHeader}>
              <div className="flex justify-between items-start">
                <CardTitle className={styles.title}>{item.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <StarIcon className="text-yellow-500" size={20} />
                  <span className="text-lg font-semibold">{item.rating}/5</span>
                  <span className="text-sm text-gray-500">
                    ({item.reviewCount} reviews)
                  </span>
                </div>
              </div>
              <div className={styles.description}>
                <UserIcon size={16} />
                <CardDescription>ID: {item.id}</CardDescription>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <ClockIcon size={16} />
                  <span>Prep: {item.prepTimeMinutes || "N/A"} mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <UtensilsIcon size={16} />
                  <span>Cook: {item.cookTimeMinutes || "N/A"} mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} />
                  <span>Total: {totalTime} mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <FlameIcon size={16} />
                  <span>{item.caloriesPerServing} cal/serving</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className={styles.content}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  {item.cuisine && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Cuisine</h3>
                      <p className={styles.cuisine}>{item.cuisine}</p>
                    </div>
                  )}

                  {item.mealType && item.mealType.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Meal Type</h3>
                      <div className={styles.tags}>
                        {item.mealType.map((type, index) => (
                          <span key={index} className={styles.tag}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Tags</h3>
                      <div className={styles.tags}>
                        {item.tags.map((tag, index) => (
                          <span key={index} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {item.ingredients && item.ingredients.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Ingredients</h3>
                    <ul className="list-disc pl-4 space-y-1">
                      {item.ingredients.map((ingredient, index) => (
                        <li key={index} className={styles.instructions}>
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {item.instructions && item.instructions.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Instructions</h3>
                  <ul className="list-decimal pl-4 space-y-2">
                    {item.instructions.map((instruction, index) => (
                      <li key={index} className={styles.instructions}>
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>

            <CardFooter className={styles.footer}>
              <div className="flex justify-between items-center w-full">
                <div className="flex gap-6">
                  {item.difficulty && (
                    <div className="flex items-center gap-2">
                      <span>Difficulty:</span>
                      <span className="font-medium">{item.difficulty}</span>
                    </div>
                  )}
                  {item.servings && (
                    <div className="flex items-center gap-2">
                      <span>Servings:</span>
                      <span className="font-medium">{item.servings}</span>
                    </div>
                  )}
                </div>
              </div>

              <Link href={`/users/${item.id}`} className={styles.authorLink}>
                <Button variant="outline" className="w-full">
                  <UserIcon size={16} className="mr-2" />
                  View Profile
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </NewResizableWrapper>
      )}
    </div>
  );
};

export default RecipeDetailsComponent;
