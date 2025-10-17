"use client";

import { use } from 'react';
import AdModerationPage from '@/components/AutoRia/Pages/AdModerationPage';

interface ModerateAdProps {
  params: Promise<{ id: string }>;
}

export default function ModerateAd({ params }: ModerateAdProps) {
  const resolvedParams = use(params);
  const adId = parseInt(resolvedParams.id);

  if (isNaN(adId)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Неверный ID объявления</h1>
          <p className="text-slate-600">Указанный ID объявления некорректен.</p>
        </div>
      </div>
    );
  }

  return <AdModerationPage adId={adId} />;
}
