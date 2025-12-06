"use client";

import React from "react";
import AdModerationPage from "@/components/AutoRia/Pages/AdModerationPage";
import { useModerateAdPageState } from "./useModerateAdPageState";

interface ModerateAdPageViewProps {
  params: Promise<{ id: string }>;
}

export const ModerateAdPageView: React.FC<ModerateAdPageViewProps> = ({
  params,
}) => {
  const { adId, isInvalid } = useModerateAdPageState(params);

  if (isInvalid || adId === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Неверный ID объявления
          </h1>
          <p className="text-slate-600">Указанный ID объявления некорректен.</p>
        </div>
      </div>
    );
  }

  return <AdModerationPage adId={adId} />;
};
