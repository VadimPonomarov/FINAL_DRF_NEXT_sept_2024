import { FC } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { IUsersResponse } from "@/shared/types/users.interfaces";
import UsersClient from "@/app/(main)/(dummy)/users/UsersClient";
import { BaseUrl } from "@/shared/constants/constants";
import { getAuthorizationHeaders } from "@/shared/constants/headers";
import { BackendAuthGuard } from '@/modules/autoria/shared/hooks/useBackendAuth';

import styles from "./index.module.css";

import { PageProps } from 'next';

type UsersPageProps = PageProps;

const UsersPage: FC<UsersPageProps> = async ({ searchParams }) => {
  try {
    // Читаем параметры из URL
    const resolvedSearchParams = await searchParams;
    const limit = resolvedSearchParams?.limit?.toString() || "30";
    const skip = resolvedSearchParams?.skip?.toString() || "0";

    console.log('[UsersPage] Server-side rendering with params:', { limit, skip });

    const headers = await getAuthorizationHeaders();
    const response = await fetch(
      `${BaseUrl.Dummy}/users?limit=${limit}&skip=${skip}`,
      {
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("401: Unauthorized");
      }
      notFound();
    }

    const data = (await response.json()) as IUsersResponse;

    return (
      <div className={styles.absoluteContainer}>
        <UsersClient initialData={data} />
      </div>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("401")) {
      throw error; // Позволяем middleware обработать ошибку авторизации
    }
    notFound();
  }
};

export const metadata: Metadata = {
  title: "Users",
  description: "...",
};

export default UsersPage;
