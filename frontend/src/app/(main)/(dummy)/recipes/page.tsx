import {FC} from "react";
import {Metadata} from "next";
import {IRecipesResponse} from "@/shared/types/recipe.interfaces";
import RecipesClient from "@/app/(main)/(dummy)/recipes/RecipesClient";
import {BaseUrl} from "@/shared/constants/constants";
import {notFound} from 'next/navigation';
import { getAuthorizationHeaders } from "@/shared/constants/headers";

import styles from "./index.module.css";

import { PageProps } from 'next';

type RecipesPageProps = PageProps;

const RecipesPage: FC<RecipesPageProps> = async ({ searchParams }) => {
    try {
        // Читаем параметры из URL
        const resolvedSearchParams = await searchParams;
        const limit = resolvedSearchParams?.limit?.toString() || "10";
        const skip = resolvedSearchParams?.skip?.toString() || "0";

        console.log('[RecipesPage] Server-side rendering with params:', { limit, skip });

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
