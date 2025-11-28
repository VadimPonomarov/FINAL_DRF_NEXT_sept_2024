import { Metadata } from "next";
import { AdDetailPageView } from "./AdDetailPageView";

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
  return <AdDetailPageView id={params.id} />;
};

export default AdDetail;
