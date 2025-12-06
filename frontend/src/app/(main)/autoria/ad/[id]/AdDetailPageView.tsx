import React from "react";
import AdDetailPage from "@/components/AutoRia/Pages/AdDetailPage";

interface AdDetailPageViewProps {
  id: string;
}

export const AdDetailPageView: React.FC<AdDetailPageViewProps> = ({ id }) => {
  const adId = parseInt(id, 10);

  if (Number.isNaN(adId) || adId <= 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Неверный ID объявления</h1>
          <p className="text-slate-600 mb-4">
            Указанный ID объявления "{id}" некорректен. ID должен быть положительным числом.
          </p>
          <div className="space-x-4">
            <a
              href="/autoria"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Все объявления
            </a>
            <a
              href="/autoria/my-ads"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Мои объявления
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <AdDetailPage adId={adId} />;
};
