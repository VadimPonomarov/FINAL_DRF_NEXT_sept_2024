"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ISession } from "@/common/interfaces/session.interfaces";

const AuthBadge: React.FC = () => {
  const { data: session } = useSession();
  const sessionData = session as unknown as ISession;

  return (
    <Badge
      variant="outline"
      className="cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-xs py-0.5 px-2"
    >
      <Link href="/profile" className="text-xs">
        {sessionData?.email || "Guest"}
      </Link>
    </Badge>
  );
};

export default AuthBadge;
