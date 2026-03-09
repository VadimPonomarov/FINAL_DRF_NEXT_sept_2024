"use client";

import { FC, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/modules/autoria/shared/hooks/use-toast";
import LoginForm from "@/components/Forms/LoginForm/LoginForm";
import { useTranslation } from "@/contexts/I18nContext";

const LoginPage: FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const t = useTranslation();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const message = searchParams.get("message");
    const alert = searchParams.get("alert");
    const error = searchParams.get("error");
    const returnUrl = searchParams.get("returnUrl");
    const callbackUrl = searchParams.get("callbackUrl");

    // Логируем параметры для отладки
    console.log('[LoginPage] Search params:', {
        message,
        alert,
        error,
        returnUrl,
        callbackUrl,
        allParams: Object.fromEntries(searchParams.entries())
    });

    // Check if running in Docker
    const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';

    // /login is the public entry point — always show the form
    // Do NOT redirect unauthenticated users: this page IS for unauthenticated users
    useEffect(() => {
        if (status === 'loading') return;
        setIsCheckingAuth(false);
    }, [status]);

    // Show toast notifications for messages
    useEffect(() => {
        if (error === 'backend_auth_required' || alert === 'backend_auth_required') {
            toast({
                title: t('auth.backendAuthRequiredTitle', 'Backend Authentication Required'),
                description: message || t('auth.backendAuthRequired', 'Please log in with backend authentication to access AutoRia features'),
                variant: "destructive",
                duration: 8000, // 8 seconds
            });
        } else if (message) {
            toast({
                title: t('auth.noticeTitle', 'Authentication'),
                description: message,
                variant: "destructive",
                duration: 6000, // 6 seconds
            });
        }

        // Show Docker environment notification
        if (isDocker) {
            toast({
                title: t('auth.dockerEnvironmentDetected', 'Docker Environment Detected'),
                description: t('auth.dockerEnvironmentDescription', 'Running in Docker environment. If you experience Redis connection issues, visit /test-redis'),
                variant: "default",
                duration: 10000, // 10 seconds
            });
        }
    }, [message, alert, error, isDocker, toast]);

    // Показываем загрузку во время проверки авторизации
    if (status === 'loading' || isCheckingAuth) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-60px)] w-full">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{t('auth.checkingAuth', 'Checking authorization...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center h-[calc(100vh-60px)] w-full">
            <LoginForm />
        </div>
    );
};

export default LoginPage;
