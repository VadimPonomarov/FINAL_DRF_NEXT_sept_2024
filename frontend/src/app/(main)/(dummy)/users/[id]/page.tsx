import React from "react";
import { notFound } from "next/navigation";
import { IUserResponse } from "@/shared/types/users.interfaces";
import { IRecipesResponse } from "@/shared/types/recipe.interfaces";
import { Metadata } from "next";
import UserDetailsComponent from "@/app/(main)/(dummy)/users/(details)/UserDetails/UserDetailsComponent";
import { BaseUrl } from "@/shared/constants/constants";
import { getAuthorizationHeaders } from "@/shared/constants/headers";

import { PageProps } from 'next';

type UserPageProps = PageProps;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UserDetails = async ({ params }: UserPageProps) => {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const headers = await getAuthorizationHeaders();

    const [userResponse, recipesResponse] = await Promise.all([
      fetch(`${BaseUrl.Dummy}/users/${id}`, {
        headers,
        cache: 'no-store'
      }),
      fetch(`${BaseUrl.Dummy}/products?limit=0`, {
        headers,
        cache: 'no-store'
      }),
    ]);

    if (!userResponse.ok || !recipesResponse.ok) {
      if (userResponse.status === 401 || recipesResponse.status === 401) {
        throw new Error("401: Unauthorized");
      }
      notFound();
    }

    const user = await userResponse.json() as IUserResponse;
    const recipes = await recipesResponse.json() as IRecipesResponse;

    // Фильтруем рецепты для конкретного пользователя
    const userRecipes = {
      ...recipes,
      products: recipes.products.filter(recipe => recipe.userId === Number(id))
    };

    return (
      <div className="flex justify-center items-center h-[calc(100vh-60px)] w-full pt-4">
        <UserDetailsComponent user={user} recipes={userRecipes} />
      </div>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      throw error;
    }
    notFound();
  }
};

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  try {
    const headers = await getAuthorizationHeaders();
    const response = await fetch(`${BaseUrl.Dummy}/users/${id}`, {
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      return {
        title: 'User Not Found',
        description: 'The requested user could not be found'
      };
    }

    const user = await response.json();
    return {
      title: `${user.firstName} ${user.lastName} | User Profile`,
      description: `Profile page of ${user.firstName} ${user.lastName}`
    };
  } catch {
    return {
      title: 'User Details',
      description: 'User profile page'
    };
  }
}

export default UserDetails;
