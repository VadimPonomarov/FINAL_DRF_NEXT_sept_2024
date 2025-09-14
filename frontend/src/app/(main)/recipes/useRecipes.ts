"use client";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {useInfiniteQuery} from "@tanstack/react-query";
import {signOut} from "next-auth/react";
import {IRecipe, IRecipesResponse} from "@/common/interfaces/recipe.interfaces";
import {filterItems} from "@/services/filters/filterServices";
import {BaseUrl} from "@/common/constants/constants";
import { getAuthorizationHeaders } from "@/common/constants/headers";

interface IProps {
    initialData: IRecipesResponse | Error;  // Обновили тип
}

export const useRecipes = ({initialData}: IProps) => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const limit = useMemo(() => {
        const paramValue = searchParams.get("limit");
        return paramValue !== null ? Number(paramValue) : 30;
    }, [searchParams]);

    const skip = useMemo(() => {
        const paramValue = searchParams.get("skip");
        return paramValue !== null ? Number(paramValue) : 0;
    }, [searchParams]);

    const total = useMemo(() => {
        if (initialData instanceof Error || !initialData) return 0;
        return Number(initialData.total) || 0;
    }, [initialData]);

    const [uniqueRecipes, setUniqueRecipes] = useState<IRecipe[]>([]);
    const [filteredRecipes, setFilteredRecipes] = useState<IRecipe[]>([]);

    useEffect(() => {
        if (initialData instanceof Error) {
            signOut({callbackUrl: "/api/auth"});
        }
    }, [initialData]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery<IRecipesResponse>({
        queryKey: ["recipes", skip, limit],
        queryFn: async ({pageParam = skip}) => {
            // Only run on client-side to prevent build-time issues
            if (typeof window === 'undefined') {
                throw new Error('Query should not run during build time');
            }

            try {
                // Используем хелпер dummyApiHelpers.fetchRecipes для запросов с клиента
                const response = await fetch(
                    `/api/recipes?${new URLSearchParams({
                        limit: String(limit),
                        skip: String(pageParam)
                    })}`,
                    {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    }
                );

                if (!response.ok) {
                    if (response.status === 401) {
                        signOut({callbackUrl: "/api/auth"});
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return response.json();
            } catch (error) {
                console.error('Error fetching recipes:', error);
                throw error;
            }
        },
        enabled: typeof window !== 'undefined', // Only enable on client-side
        getNextPageParam: (lastPage, allPages) => {
            const newSkip = allPages.reduce((acc, page) => acc + (page?.products?.length || 0), 0);
            const lastPageTotal = Number(lastPage?.total || 0);
            return newSkip < lastPageTotal ? newSkip : undefined;
        },
        initialPageParam: skip,
        initialData: initialData instanceof Error ? undefined : {
            pages: [initialData],
            pageParams: [skip]
        },
        staleTime: Infinity,
    });

    useEffect(() => {
        if (data) {
            const allRecipes = data.pages.flatMap((page) => page.products || []);
            const startIndex = Number(skip);
            const endIndex = limit > 0 ? Number(skip) + Number(limit) : allRecipes.length;
            const visibleRecipes = allRecipes.slice(startIndex, endIndex);

            const validRecipes = visibleRecipes.filter(recipe => recipe && recipe.id);
            const uniqueRecipes = Array.from(new Set(validRecipes.map(recipe => recipe.id)))
                .map(id => validRecipes.find(recipe => recipe.id === id));

            setUniqueRecipes(uniqueRecipes as IRecipe[]);
            setFilteredRecipes(uniqueRecipes as IRecipe[]);
        }
    }, [data, skip, limit]);

    // Update URL parameters when skip/limit change (client-side only)
    useEffect(() => {
        // Only run on client-side to prevent build-time issues
        if (typeof window === 'undefined') return;

        const currentSkip = searchParams.get("skip") || "0";
        const currentLimit = searchParams.get("limit") || "30";

        if (currentSkip !== String(skip) || currentLimit !== String(limit)) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.set("skip", String(skip));
            newParams.set("limit", String(limit));
            router.replace(`?${newParams.toString()}`);
        }
    }, [skip, limit, searchParams, router]);

    const handleNextPage = useCallback(() => {
        fetchNextPage();
    }, [fetchNextPage]);

    const filterRecipes = useCallback(
        (inputValues: { [key in keyof IRecipe]?: string }) => {
            const filtered = filterItems(uniqueRecipes, inputValues);
            setFilteredRecipes(filtered);
        },
        [uniqueRecipes]
    );

    return {
        uniqueRecipes,
        filteredRecipes: useMemo(() => filteredRecipes, [filteredRecipes]),
        handleNextPage,
        isFetchingNextPage,
        hasNextPage,
        total,
        filterRecipes,
    };
};

