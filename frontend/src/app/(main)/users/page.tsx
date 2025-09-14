import { FC } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { IUsersResponse } from "@/common/interfaces/users.interfaces";
import UsersClient from "@/app/(main)/users/UsersClient";
import { BaseUrl } from "@/common/constants/constants";
import { getAuthorizationHeaders } from "@/common/constants/headers";
import { BackendAuthGuard } from '@/hooks/useBackendAuth';

import styles from "./index.module.css";

const UsersPage: FC = async () => {
  try {
    // Используем фиксированные значения для начальной загрузки
    const limit = "30";
    const skip = "0";

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
