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
      className="badge cursor-pointer"
    >
      <Link href="/profile" className="px-2">
        {sessionData?.email || "Guest"}
      </Link>
    </Badge>
  );
};

export default AuthBadge;
