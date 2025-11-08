"use client";

import React, { FC } from "react";
import Link from "next/link";
import { ArrowPathIcon, PaperAirplaneIcon } from "@heroicons/react/16/solid";
import NewResizableWrapper from "@/components/All/ResizableWrapper/NewResizableWrapper";
import { Button } from "@/components/ui/button";
import ButtonGroup from "@/components/All/ButtonGroup/ButtonGroup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IRegistration } from "@/shared/types/auth.interfaces";
import { useToast } from "@/modules/autoria/shared/hooks/use-toast";

import { useRegistrationForm } from "./useRegistrationForm";
import { formFields } from "./formFields.config";
import { useI18n } from "@/contexts/I18nContext";
import {
    formContainerClasses,
    resizableWrapperStyle,
    resizableWrapperClasses,
    formClasses,
    headerClasses,
    titleClasses,
    linkClasses,
    contentClasses,
    formGroupClasses,
    labelClasses,
    inputClasses,
    errorClasses,
    buttonGroupClasses,
    buttonClasses,
    alertClasses
} from "../sharedFormStyles";

const RegistrationForm: FC = () => {
    const { toast } = useToast();
    const { t } = useI18n();
    const {
        register,
        handleSubmit,
        errors,
        isValid,
        resetForm,
        onSubmit,
        error,
        watch,
        isLoading,
        formKey,
    } = useRegistrationForm();

    const password = watch("password");
    const confirmPassword = watch("confirmPassword");
    const passwordsMatch = !password || !confirmPassword || password === confirmPassword;

    return (
        <div className="flex items-center justify-center w-full h-full p-4">
            <NewResizableWrapper
              storageKey="registration-form"
              className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col"
              defaultWidth={350}
              defaultHeight={500}
              minWidth={300}
              minHeight={450}
            >
                <div className="w-full h-full flex flex-col overflow-auto">
                    <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-800">{t('auth.register', 'Register')}</h1>
                            <Link
                                href="/login"
                                className="text-blue-500 hover:text-blue-700 text-sm transition-colors duration-300"
                            >
                                {t('auth.login', 'Login')}
                            </Link>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <form key={`registration-form-${formKey}`} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {formFields.map((field) => {
                                const label = field.label && field.label.includes('.') 
                                    ? t(field.label, field.label) 
                                    : field.label;
                                const placeholder = field.placeholder && field.placeholder.includes('.')
                                    ? t(field.placeholder, field.placeholder)
                                    : field.placeholder;
                                
                                return (
                                <div key={String(field.name)} className="space-y-2">
                                    <Label
                                        htmlFor={String(field.name)}
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        {label}
                                    </Label>
                                    <Input
                                        id={String(field.name)}
                                        type={field.type}
                                        className={`text-gray-800 ${errors[field.name as keyof IRegistration] ? 'border-red-500 focus:ring-red-500' : ''}`}
                                        {...register(field.name as keyof IRegistration)}
                                        placeholder={placeholder}
                                    />
                                    {errors[field.name as keyof IRegistration] && (
                                        <p className="text-sm text-red-600">
                                            {errors[field.name as keyof IRegistration]?.message as string}
                                        </p>
                                    )}
                                </div>
                            );
                            })}

                            {error && (
                                <Alert variant="destructive" className={alertClasses}>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {password && confirmPassword && !passwordsMatch && (
                                <Alert variant="destructive" className={alertClasses}>
                                    <AlertDescription>{t('auth.passwordsDoNotMatch', 'Passwords do not match')}</AlertDescription>
                                </Alert>
                            )}

                            <div className="pt-4 border-t border-gray-100">
                                <ButtonGroup orientation="horizontal">
                                    <Button
                                        variant="outline"
                                        type="submit"
                                        disabled={!isValid || !passwordsMatch || isLoading}
                                    >
                                        {isLoading ? (
                                            <span className="animate-spin">⌛</span>
                                        ) : (
                                            <PaperAirplaneIcon className="h-5 w-5" />
                                        )}
                                        {t('auth.register', 'Register')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={resetForm}
                                        disabled={isLoading}
                                    >
                                        <ArrowPathIcon className="h-5 w-5" />
                                        {t('auth.reset', 'Reset')}
                                    </Button>
                                </ButtonGroup>
                            </div>
                        </form>
                    </div>
                </div>
            </NewResizableWrapper>
        </div>
    );
};

export default RegistrationForm;