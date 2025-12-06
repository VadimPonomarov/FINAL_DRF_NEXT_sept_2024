import { Metadata } from "next";
import EditAdPage from "@/components/AutoRia/Pages/EditAdPage";

export const metadata: Metadata = {
  title: "Edit Ad - CarHub",
  description: "Edit your car sale advertisement",
};

interface EditAdProps {
  params: Promise<{
    id: string;
  }>;
}

const EditAd = async ({ params }: EditAdProps) => {
  const resolvedParams = await params;
  const adId = parseInt(resolvedParams.id);

  // Проверяем, что ID является корректным числом
  if (isNaN(adId) || adId <= 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Неверный ID объявления</h1>
          <p className="text-slate-600 mb-4">
            Указанный ID объявления "{resolvedParams.id}" некорректен. ID должен быть положительным числом.
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

export default EditAd;
