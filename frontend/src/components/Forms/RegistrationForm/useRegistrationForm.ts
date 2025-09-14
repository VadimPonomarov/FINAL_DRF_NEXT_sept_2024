"use client";

import { useState, useEffect } from "react";
import { joiResolver } from "@hookform/resolvers/joi";
import { SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useNotification } from "@/contexts/NotificationContext";
import { IRegistration } from "@/common/interfaces/auth.interfaces";
import { ISession } from "@/common/interfaces/session.interfaces";
import { apiAuthService } from "@/services/apiAuth";
import { toast } from "@/hooks/use-toast";

import { schema } from "./index.joi";
import { formFields } from "./formFields.config";

export const useRegistrationForm = () => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const router = useRouter();
    const { data: sessionData } = useSession();
    const session = sessionData as unknown as ISession;
    const { setNotification } = useNotification();
    
    const defaultValues: IRegistration = {
        email: session?.email || "",
        password: "",
        confirmPassword: "",
    };

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        watch,
        reset,
        trigger,
        clearErrors,
    } = useForm<IRegistration>({
        resolver: joiResolver(schema),
        defaultValues,
        mode: "all", 
        reValidateMode: "onChange", 
    });

    // Наблюдаем за изменениями полей для очистки ошибок и запуска валидации
    useEffect(() => {
        const subscription = watch((value, { name, type }) => {
            // Очищаем общую ошибку при любом изменении
            if (error) setError(null);
            
            // Если изменилось конкретное поле, запускаем его валидацию
            if (name && type === "change") {
                // Проверяем, является ли name ключом IRegistration
                if (name === "email" || name === "password" || name === "confirmPassword") {
                    // Сначала очищаем ошибку для этого поля
                    clearErrors(name);
                    
                    // Затем запускаем валидацию с небольшой задержкой
                    setTimeout(() => {
                        trigger(name);
                    }, 10);
                }
                
                // Если изменились пароли, проверяем их совпадение
                if (name === "password" || name === "confirmPassword") {
                    setTimeout(() => {
                        trigger("confirmPassword");
                    }, 10);
                }
            }
        });
        
        return () => subscription.unsubscribe();
    }, [watch, error, clearErrors, trigger]);

    // Функция для сброса формы
    const resetForm = () => {
        reset(defaultValues);
        setError(null);
        setFormKey(prev => prev + 1);
    };

    const onSubmit: SubmitHandler<IRegistration> = async (data) => {
        // Защита от повторных вызовов
        if (isLoading) {
            console.log('[Registration] Registration already in progress, ignoring duplicate request');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            console.log('[Registration] Starting registration process...');

            const response = await apiAuthService.register({
                email: data.email,
                password: data.password
            });

            console.log('[Registration] Registration response received:', response);

            if (response && response.user) {
                console.log('[Registration] ✅ Registration successful');

                setNotification(`Registration successful! An activation link has been sent to ${data.email}. Please check your email to activate your account.`);

                toast({
                    title: "Registration successful!",
                    description: "Please check your email to activate your account.",
                    duration: 5000,
                });

                // Небольшая задержка перед перенаправлением для показа уведомления
                setTimeout(() => {
                    router.push("/login?message=Registration successful! Please check your email and activate your account before logging in.");
                }, 1000);
            } else {
                console.warn('[Registration] ⚠️ Registration response missing user data');
                throw new Error('Registration completed but user data is missing');
            }
        } catch (error) {
            console.error('[Registration] ❌ Registration failed:', error);

            if (error instanceof Error) {
                setError(error.message);

                toast({
                    title: "Registration failed",
                    description: error.message,
                    variant: "destructive",
                    duration: 5000,
                });
            } else {
                const errorMessage = "An unexpected error occurred during registration";
                setError(errorMessage);

                toast({
                    title: "Registration failed",
                    description: errorMessage,
                    variant: "destructive",
                    duration: 5000,
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Создаем расширенный register с дополнительной обработкой
    const registerWithValidation = (name: keyof IRegistration) => {
        return {
            ...register(name),
            onBlur: () => {
                // Запускаем валидацию при потере фокуса
                setTimeout(() => {
                    trigger(name);
                }, 10);
            },
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                // Получаем оригинальный обработчик
                const originalOnChange = register(name).onChange;
                // Вызываем его
                originalOnChange(e);
                // Очищаем ошибку для этого поля
                clearErrors(name);
                // Запускаем валидацию с небольшой задержкой
                setTimeout(() => {
                    trigger(name);
                }, 10);
            }
        };
    };

    return {
        register: registerWithValidation,
        handleSubmit,
        onSubmit,
        errors,
        isValid,
        isLoading,
        error,
        watch,
        resetForm,
        formKey,
    };
};