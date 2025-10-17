import { Metadata } from "next";
import AdDetailPage from "@/components/AutoRia/Pages/AdDetailPage";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Здесь можно загрузить данные объявления для SEO
  return {
    title: `Объявление #${params.id} - AutoRia`,
    description: "Подробная информация об автомобиле",
  };
}

const AdDetail = ({ params }: Props) => {
  return <AdDetailPage adId={parseInt(params.id)} />;
};

export default AdDetail;
