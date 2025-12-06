import React from "react";
import EditAdPage from "@/components/AutoRia/Pages/EditAdPage";

interface EditAdPageViewProps {
  id: string;
}

export const EditAdPageView: React.FC<EditAdPageViewProps> = ({ id }) => {
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
              href="/autoria/my-ads"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Мои объявления
            </a>
            <a
              href="/autoria"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Назад к AutoRia
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <EditAdPage adId={adId} />;
};
