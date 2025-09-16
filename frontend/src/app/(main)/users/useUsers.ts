"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { IUser, IUsersResponse } from "@/common/interfaces/users.interfaces";
import { filterItems } from "@/services/filters/filterServices";
import { dummyApiHelpers } from "@/app/api/(helpers)/dummy";
import { getAuthorizationHeaders } from "@/common/constants/headers";
import { BaseUrl } from "@/common/constants/constants";

interface IProps {
  initialData: IUsersResponse | Error;
}

export const useUsers = ({ initialData }: IProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const limit = useMemo(() => {
    const paramValue = searchParams.get("limit");
    return paramValue !== null ? Number(paramValue) : 30;
  }, [searchParams.get("limit")]); // Более точная зависимость

  const skip = useMemo(() => {
    const paramValue = searchParams.get("skip");
    return paramValue !== null ? Number(paramValue) : 0;
  }, [searchParams.get("skip")]); // Более точная зависимость
  const total = initialData instanceof Error ? 0 : Number(initialData.total);
  const [uniqueUsers, setUniqueUsers] = useState<IUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<IUser[]>([]);
  const [filterParams, setFilterParams] = useState<{
    [key in keyof IUser]?: string;
  }>({});

  useEffect(() => {
    if (initialData instanceof Error) {
      signOut({ callbackUrl: "/api/auth" });
    }
  }, [initialData]);

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<IUsersResponse>({
      queryKey: ["users", limit, skip],
      queryFn: async ({ pageParam = skip }): Promise<IUsersResponse> => {
        // Only run on client-side to prevent build-time issues
        if (typeof window === 'undefined') {
          throw new Error('Query should not run during build time');
        }

        try {
          // Используем API роут для запросов с клиента
          const response = await fetch(
            `/api/users?${new URLSearchParams({
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
          console.error('Error fetching users:', error);
          throw error;
        }
      },
      enabled: typeof window !== 'undefined', // Only enable on client-side
      getNextPageParam: (lastPage) => {
        const nextSkip = lastPage.skip + lastPage.limit;
        return nextSkip < total ? nextSkip : undefined;
      },
      initialPageParam: skip,
      initialData: initialData instanceof Error
        ? undefined
        : { pages: [initialData], pageParams: [skip] },
      staleTime: Infinity,
    });

  useEffect(() => {
    if (data) {
      const allUsers = data.pages.flatMap((page) => page.users || []);
      const validUsers = allUsers.filter((user) => user && user.id);
      const uniqueUsers = Array.from(
        new Set(validUsers.map((user) => String(user.id))),
      )
        .map((id) => validUsers.find((user) => String(user.id) === id))
        .filter((user) => user !== undefined);

      setUniqueUsers(uniqueUsers as IUser[]);
      setFilteredUsers(filterItems(uniqueUsers as IUser[], filterParams));
    }
  }, [data, filterParams]);

  // Убираем этот useEffect - он может вызывать лишние перерисовки
  // URL параметры должны управляться только через PaginationComponent



  // Закомментируем этот эффект, чтобы он не конфликтовал с пагинатором
  // useEffect(() => {
  //   console.log(`[DEBUG] Third useEffect triggered: skip=${skip}, limit=${limit}`);
  //   const currentSkip = searchParams.get("skip") || "0";
  //   const currentLimit = searchParams.get("limit") || "30";
  //
  //   if (currentSkip !== String(skip) || currentLimit !== String(limit)) {
  //     const newParams = new URLSearchParams(searchParams.toString());
  //     newParams.set("skip", String(skip));
  //     newParams.set("limit", String(limit));
  //
  //     // Используем push вместо replace, чтобы не перезагружать страницу
  //     router.push(`?${newParams.toString()}`, { scroll: false });
  //   }
  // }, [skip, limit, searchParams, router]);

  const handleNextPage = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const filterUsers = useCallback(
    (inputValues: { [key in keyof IUser]?: string }) => {
      setFilterParams(inputValues);
    },
    [],
  );

  return {
    uniqueUsers,
    filteredUsers: useMemo(() => filteredUsers, [filteredUsers]),
    error,
    handleNextPage,
    isFetchingNextPage,
    hasNextPage,
    total,
    filterUsers,
  };
};
