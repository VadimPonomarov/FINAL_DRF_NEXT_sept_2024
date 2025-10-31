"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ISession } from "@/common/interfaces/session.interfaces";

const AuthBadge: React.FC = () => {
  const { data: session, status } = useSession();
  const sessionData = session as unknown as ISession;

  // Скрываем бейдж если нет сессии или статус unauthenticated
  if (status === 'loading') {
    return null; // Пока загружается
  }

  if (status === 'unauthenticated' || !session) {
    return null; // Нет сессии - не показываем бейдж
  }

  const email = (session as any)?.user?.email || sessionData?.email;
  
  // Не показываем бейдж если нет email
  if (!email) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className="cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-xs py-0.5 px-2"
    >
      <Link href="/profile" className="text-xs">
        {email}
      </Link>
    </Badge>
  );
};

export default AuthBadge;
