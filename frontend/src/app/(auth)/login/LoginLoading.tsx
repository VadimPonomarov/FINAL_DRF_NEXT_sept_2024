"use client";

import React from "react";
import { useTranslation } from "@/contexts/I18nContext";

export const LoginLoading: React.FC = () => {
  const t = useTranslation();

  return (
    <div className="flex justify-center items-center h-[calc(100vh-60px)] w-full">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {t("auth.checkingAuth", "Checking authorization...")}
        </p>
      </div>
    </div>
  );
};
