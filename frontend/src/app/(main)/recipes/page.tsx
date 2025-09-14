import {FC} from "react";
import {Metadata} from "next";
import {IRecipesResponse} from "@/common/interfaces/recipe.interfaces";
import RecipesClient from "@/app/(main)/recipes/RecipesClient";
import {BaseUrl} from "@/common/constants/constants";
import {notFound} from 'next/navigation';
import { getAuthorizationHeaders } from "@/common/constants/headers";

import styles from "./index.module.css";

const RecipesPage: FC = async () => {
    try {
        // Используем фиксированные значения для начальной загрузки
        const limit = "10";
        const skip = "0";

        const headers = await getAuthorizationHeaders();
        const response = await fetch(
            `${BaseUrl.Dummy}/products?limit=${limit}&skip=${skip}`,
            { headers }
        );

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            notFound();
        }

        const data = await response.json() as IRecipesResponse;

        return (
            <div className={styles.absoluteContainer}>
                <RecipesClient initialData={data}/>
            </div>
        );
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            throw error; // Позволяем middleware обработать ошибку авторизации
        }
        notFound();
    }
};

export const metadata: Metadata = {
    title: "Recipes",
    description: "...",
};

export default RecipesPage;
