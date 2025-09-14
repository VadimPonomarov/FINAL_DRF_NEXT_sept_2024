"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { IProps } from "./interfaces";

export const usePaginationComponent = ({ total, baseUrl }: IProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!searchParams.get("skip")) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("skip", "0");
      newParams.set("limit", searchParams.get("limit") || "30");
      router.replace(`${baseUrl}?${newParams.toString()}`);
    }
  }, [searchParams, router, baseUrl]);

  const setNext = () => {
    const newSkip = (
        Number(searchParams.get("skip") || "0") + Number(searchParams.get("limit") || "30")
    ).toString();
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("skip", newSkip);
    newParams.set("limit", searchParams.get("limit") || "30");

    // Используем push вместо replace, чтобы не перезагружать страницу
    router.push(`${baseUrl}?${newParams.toString()}`, { scroll: false });
  };

  const setPrev = () => {
    const newSkip = (
        Number(searchParams.get("skip") || "0") - Number(searchParams.get("limit") || "30")
    ).toString();
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("skip", newSkip);
    newParams.set("limit", searchParams.get("limit") || "30");

    // Используем push вместо replace, чтобы не перезагружать страницу
    router.push(`${baseUrl}?${newParams.toString()}`, { scroll: false });
  };

  // Вычисляем номер текущей страницы
  const skip = Number(searchParams.get("skip") || "0");
  const limit = Number(searchParams.get("limit") || "30");
  // Страницы начинаются с 1, а не с 0
  const currentPage = Math.floor(skip / limit) + 1 || 1;
  // Проверяем, есть ли следующая страница
  const hasNextPage = (total - skip) / limit > 1;
  // Проверяем, есть ли предыдущая страница
  const hasPrevPage = skip >= limit;

  return {
    setNext,
    setPrev,
    currentPage,
    hasNextPage,
    hasPrevPage,
  };
};
