import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from "next";
import RecipeDetailsComponent from "@/app/(main)/(dummy)/recipes/(details)/RecipeDetailsComponent/RecipeDetailsComponent";
import { BaseUrl } from "@/common/constants/constants";
import { getAuthorizationHeaders } from "@/common/constants/headers";
import { IRecipe } from "@/common/interfaces/recipe.interfaces";

import { PageProps } from 'next';

type RecipePageProps = PageProps;

const RecipeDetails = async ({params}: RecipePageProps) => {
    try {
        const resolvedParams = await params;
        const {id} = resolvedParams;
        const headers = await getAuthorizationHeaders();

        const response = await fetch(`${BaseUrl.Dummy}/products/${id}`, { headers });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('401: Unauthorized');
            }
            notFound();
        }

        const item = await response.json() as IRecipe;

        return (
            <div className="flex justify-center items-center h-[calc(100vh-60px)] w-full pt-4">
                <RecipeDetailsComponent item={item}/>
            </div>
        );
    } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
            throw error;
        }
        notFound();
    }
};

export async function generateMetadata({params}: RecipePageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const {id} = resolvedParams;
    return {
        title: `Recipe ${id} Details`,
        description: "..."
    };
}

export default RecipeDetails;