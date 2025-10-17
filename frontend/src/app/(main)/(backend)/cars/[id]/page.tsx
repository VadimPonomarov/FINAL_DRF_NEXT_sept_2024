'use client';

import { use } from 'react';
import { redirect } from 'next/navigation';

interface CarShowroomPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Редирект со старого маршрута /cars/[id] на новый /autoria/ad/[id]
 * Обеспечивает обратную совместимость для старых ссылок
 */
export default function CarShowroomPage({ params }: CarShowroomPageProps) {
  const resolvedParams = use(params);

  // Редиректим на новый маршрут
  redirect(`/autoria/ad/${resolvedParams.id}`);
}
