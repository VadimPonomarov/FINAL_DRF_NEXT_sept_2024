import { redirect } from 'next/navigation';

interface CarShowroomPageProps {
  params: { id: string };
}

/**
 * Редирект со старого маршрута /cars/[id] на новый /autoria/ad/[id]
 * Обеспечивает обратную совместимость для старых ссылок
 */
export default function CarShowroomPage({ params }: CarShowroomPageProps) {
  // Редиректим на новый маршрут
  redirect(`/autoria/ad/${params.id}`);
}
