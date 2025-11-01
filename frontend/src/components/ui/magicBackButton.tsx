"use client"
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession } from "next-auth/react";
import { usePageTrackerStore } from '@/lib/react-page-tracker-adapter';

export const MagicBackButton = React.forwardRef<
    HTMLButtonElement,
    ButtonProps & { backLink?: string }
>(({className, onClick, children, backLink = '/', ...props}, ref) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    // Use safe adapter instead of react-page-tracker
    const isFirstPage = usePageTrackerStore((state) => state.isFirstPage);

    const handleNavigation = React.useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        // Проверяем статус сессии
        if (status === 'loading') {
            return; // Ждем загрузки сессии
        }

        if (!session) {
            router.push('/login');
            return;
        }

        try {
            // Сохраняем текущий URL для возможного возврата
            const currentPath = window.location.pathname;

            if (isFirstPage) {
                await router.push(backLink);
            } else {
                router.back();
            }

            // Добавляем обработчик для случая, если навигация не удалась
            const timeoutId = setTimeout(() => {
                if (window.location.pathname === currentPath) {
                    router.push(backLink);
                }
            }, 300);

            onClick?.(e);

            return () => clearTimeout(timeoutId);
        } catch (error) {
            console.error('Navigation error:', error);
            router.push('/login');
        }
    }, [router, session, status, isFirstPage, backLink, onClick]);

    return (
        <Button
            className={cn(
                'rounded-full text-foreground',
                'hover:bg-accent hover:text-accent-foreground',
                className
            )}
            variant="ghost"
            size="icon"
            ref={ref}
            onClick={handleNavigation}
            {...props}
        >
            {children ?? <ChevronLeft className="h-4 w-4" />}
        </Button>
    );
});
MagicBackButton.displayName = 'MagicBackButton';
