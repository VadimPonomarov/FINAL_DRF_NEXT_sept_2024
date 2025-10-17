import { FC } from "react";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";
import ClientComponentWrapper from "@/components/All/ClientComponentWrapper/ClientComponentWrapper";
import { Clock, User, Tag, Star, Timer, ChevronRight } from "lucide-react";
import Link from "next/link";

import styles from "./index.module.css";
import { IProps } from "./interfaces";

export const RecipeCard: FC<IProps> = ({ item }) => {
  return (
    <div className="relative">
      <Card className={styles.card}>
        <CardHeader className={styles.cardHeader}>
          <CardTitle className={styles.cardTitle}>
            {item.name}
            <span className={styles.recipeId}>#{item.id}</span>
          </CardTitle>
          <CardDescription>
            <div className={styles.authorInfo}>
              <User className="w-4 h-4" />
              <span>Author ID: {item.userId}</span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className={styles.cardContent}>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <Star className="w-4 h-4 text-yellow-500" />
              <span>{item.rating}/5</span>
            </div>
            <div className={styles.statItem}>
              <Clock className="w-4 h-4" />
              <span>{item.prepTimeMinutes || 0} prep</span>
            </div>
            <div className={styles.statItem}>
              <Timer className="w-4 h-4" />
              <span>{item.cookTimeMinutes || 0} cook</span>
            </div>
          </div>
          {item.tags && item.tags.length > 0 && (
            <div className={styles.tags}>
              <Tag className="w-4 h-4" />
              {item.tags.map((tag) => (
                <ClientComponentWrapper key={uuidv4()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={styles.tag}
                  >
                    {tag}
                  </Button>
                </ClientComponentWrapper>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className={`${styles.cardFooter} justify-end relative z-10`}>
          <Link href={`/recipes/${item.id}`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              View Recipe
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
