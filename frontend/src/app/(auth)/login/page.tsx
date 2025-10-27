"use client";

import { FC, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import LoginForm from "@/components/Forms/LoginForm/LoginForm";

const LoginPage: FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
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

    // Проверка ТОЛЬКО NextAuth сессии
    // Страница /login требует сессию NextAuth для получения backend токенов
    useEffect(() => {
        if (status === 'loading') {
            return;
        }

        if (status === 'unauthenticated' || !session) {
            console.log('[LoginPage] ❌ No NextAuth session, redirecting to signin');
            router.replace(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl || '/login')}`);
            return;
        }

        console.log('[LoginPage] ✅ NextAuth session valid');
        setIsCheckingAuth(false);
    }, [status, session, router, callbackUrl]);

    // Show toast notifications for messages
    useEffect(() => {
        if (error === 'backend_auth_required' || alert === 'backend_auth_required') {
            toast({
                title: "Backend Authentication Required",
                description: message || "Please log in with backend authentication to access AutoRia features",
                variant: "destructive",
                duration: 8000, // 8 seconds
            });
        } else if (message) {
            toast({
                title: "Authentication Required",
                description: message,
                variant: "destructive",
                duration: 6000, // 6 seconds
            });
        }

        // Show Docker environment notification
        if (isDocker) {
            toast({
                title: "Docker Environment Detected",
                description: "Running in Docker environment. If you experience Redis connection issues, visit /test-redis",
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
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Перевірка авторизації...</p>
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
