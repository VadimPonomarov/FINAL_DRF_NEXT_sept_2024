"use client";

import { FC, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import LoginForm from "@/components/Forms/LoginForm/LoginForm";

const LoginPage: FC = () => {
    const searchParams = useSearchParams();
    const { toast } = useToast();

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

    return (
        <div className="flex justify-center items-center h-[calc(100vh-60px)] w-full">
            <LoginForm />
        </div>
    );
};

export default LoginPage;
