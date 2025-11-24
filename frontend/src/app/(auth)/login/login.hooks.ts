"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/modules/autoria/shared/hooks/use-toast";
import { useTranslation } from "@/contexts/I18nContext";
import { parseLoginSearchParams, type LoginPageSearchParams } from "./login.types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface UseLoginPageLogicResult {
  status: AuthStatus;
  isCheckingAuth: boolean;
}

export function useLoginPageLogic(): UseLoginPageLogicResult {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const t = useTranslation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const params: LoginPageSearchParams = parseLoginSearchParams(searchParams);
  const { message, alert, error, returnUrl, callbackUrl } = params;

  useEffect(() => {
    console.log("[LoginPage] Search params:", {
      message,
      alert,
      error,
      returnUrl,
      callbackUrl,
      allParams: Object.fromEntries(searchParams.entries()),
    });
  }, [message, alert, error, returnUrl, callbackUrl, searchParams]);

  const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === "true";

  // Проверка NextAuth-сессии + редиректы
  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated" || !session) {
      const hasAuthMessage = Boolean(error || alert);
      let throttled = false;

      try {
        const now = Date.now();
        const last = Number(
          window.sessionStorage.getItem("auth:lastSigninRedirectTs") || "0",
        );
        throttled = now - last < 10000; // 10s throttle
        if (!throttled) {
          window.sessionStorage.setItem("auth:lastSigninRedirectTs", String(now));
        }
      } catch {
        // ignore storage errors
      }

      if (!hasAuthMessage && !throttled) {
        console.log(
          "[LoginPage] ❌ No NextAuth session, redirecting to signin (throttled ok)",
        );
        router.replace(
          `/api/auth/signin?callbackUrl=${encodeURIComponent(
            callbackUrl || "/login",
          )}`,
        );
        return;
      }

      console.warn(
        "[LoginPage] Skipping auto-redirect to signin (hasAuthMessage or throttled)",
      );
      setIsCheckingAuth(false);
      return;
    }

    console.log("[LoginPage] ✅ NextAuth session valid");
    setIsCheckingAuth(false);
  }, [status, session, router, callbackUrl, error, alert]);

  // Тосты для сообщений и Docker-окружения
  useEffect(() => {
    if (error === "backend_auth_required" || alert === "backend_auth_required") {
      toast({
        title: t("auth.backendAuthRequiredTitle", "Backend Authentication Required"),
        description:
          message ||
          t(
            "auth.backendAuthRequired",
            "Please log in with backend authentication to access AutoRia features",
          ),
        variant: "destructive",
        duration: 8000,
      });
    } else if (message) {
      toast({
        title: t("auth.noticeTitle", "Authentication"),
        description: message,
        variant: "destructive",
        duration: 6000,
      });
    }

    if (isDocker) {
      toast({
        title: t("auth.dockerEnvironmentDetected", "Docker Environment Detected"),
        description: t(
          "auth.dockerEnvironmentDescription",
          "Running in Docker environment. If you experience Redis connection issues, visit /test-redis",
        ),
        variant: "default",
        duration: 10000,
      });
    }
  }, [message, alert, error, isDocker, toast, t]);

  return { status: status as AuthStatus, isCheckingAuth };
}
