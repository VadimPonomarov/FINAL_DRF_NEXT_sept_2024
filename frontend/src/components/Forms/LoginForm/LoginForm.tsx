"use client";

import React, { FC, useEffect } from "react";
import Link from "next/link";
import { ArrowPathIcon, PaperAirplaneIcon } from "@heroicons/react/16/solid";
import NewResizableWrapper from "@/components/All/ResizableWrapper/NewResizableWrapper";

import FormFieldsRenderer from "@/components/All/FormFieldsRenderer/FormFieldsRenderer";
import { Button } from "@/components/ui/button";
import ButtonGroup from "@/components/All/ButtonGroup/ButtonGroup";
import UsersComboBox from "@/app/(main)/(dummy)/users/(details)/UsersComboBox/UsersComboBox";
import BackendUsersComboBox from "@/app/(main)/(dummy)/users/(details)/BackendUsersComboBox/BackendUsersComboBox";
import DummyUsersComboBox from "@/app/(main)/(dummy)/users/(details)/DummyUsersComboBox/DummyUsersComboBox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AuthProvider } from "@/shared/constants/constants";

import { useAuthProvider } from "@/contexts/AuthProviderContext";
import { cn } from "@/lib/utils";
import { IDummyAuth } from "@/shared/types/dummy.interfaces";
import {
  authProviderOptions,
  IBackendAuthCredentials,
} from "@/shared/types/auth.interfaces";
import { useToast } from "@/modules/autoria/shared/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
// import { useRouter } from "next/navigation";

import { backendFormFields, dummyFormFields } from "./formFields.config";
import { useLoginForm } from "./useLoginForm";

const LoginForm: FC = () => {
    const { toast } = useToast();
    const { t } = useI18n();
    const {
        dummyForm,
        backendForm,
        error,
        message,
        isLoading,
        resetForms,
        onSubmit,
        formKey
    } = useLoginForm();

    const { provider, setProvider } = useAuthProvider();

    const handleProviderChange = async (value: AuthProvider) => {
        await setProvider(value);
        // No need to call resetForms here as it's handled by the useEffect in useLoginForm
    };

    useEffect(() => {
        if (message) {
            toast({
                title: t('auth.authenticationTitle', 'Authentication'),
                description: message,
                duration: 3000,
            });
        }
    }, [message, toast, t]);

    return (
        <div className="flex items-center justify-center w-full h-full p-4">
            <div className="w-full max-w-sm sm:max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
                <div className="w-full h-full flex flex-col overflow-auto">
                    <div className="bg-gradient-to-r from-gray-50 to-white px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-100">
                        <div className="flex flex-col gap-3 sm:gap-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{t('auth.login', 'Login')}</h1>
                                {provider === AuthProvider.MyBackendDocs && (
                                    <Link
                                        href="/register"
                                        className="text-blue-500 hover:text-blue-700 text-sm transition-colors duration-300"
                                    >
                                        {t('auth.register', 'Register')}
                                    </Link>
                                )}
                            </div>
                            <div className="w-full">
                                <Select
                                    onValueChange={handleProviderChange}
                                    defaultValue={provider}
                                    value={provider}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={t('auth.selectAuthType', 'Select auth type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {authProviderOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                        {provider === AuthProvider.Dummy && (
                            <form 
                                key={`dummy-form-${formKey}`} 
                                onSubmit={dummyForm.handleSubmit(
                                    (data) => {
                                        console.log('[LoginForm] Dummy form submitted with data:', data);
                                        onSubmit(data);
                                    },
                                    (errors) => {
                                        console.error('[LoginForm] Dummy form validation errors:', errors);
                                        toast({
                                            title: t('auth.validationError', 'Validation Error'),
                                            description: t('auth.validationErrorDescription', 'Please fill in all required fields correctly'),
                                            variant: "destructive",
                                            duration: 3000,
                                        });
                                    }
                                )} 
                                className="space-y-4 sm:space-y-6"
                            >
                                <div className="w-full">
                                    <DummyUsersComboBox reset={dummyForm.reset} />
                                </div>
                                <div className="space-y-3 sm:space-y-4">
                                    <FormFieldsRenderer<IDummyAuth>
                                        fields={dummyFormFields}
                                        register={dummyForm.register}
                                        errors={dummyForm.formState.errors}
                                        inputClassName="text-gray-800 w-full"
                                        defaultValues={dummyForm.getValues()}
                                    />
                                </div>
                                {error && (
                                    <div className="text-red-500 text-sm mt-2 p-2 sm:p-3 bg-red-50 rounded-lg">
                                        {error}
                                    </div>
                                )}
                                <div className="pt-3 sm:pt-4 border-t border-gray-100">
                                    <div className="flex gap-2 sm:gap-3">
                                        <Button
                                            variant="outline"
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-1 min-h-[44px] sm:min-h-[48px]"
                                        >
                                            {isLoading ? (
                                                <span className="animate-spin">⌛</span>
                                            ) : (
                                                <PaperAirplaneIcon className="h-5 w-5" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            type="button"
                                            onClick={resetForms}
                                            disabled={isLoading}
                                            className="flex-1 min-h-[44px] sm:min-h-[48px]"
                                        >
                                            <ArrowPathIcon className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {provider === AuthProvider.MyBackendDocs && (
                            <form 
                                key={`backend-form-${formKey}`} 
                                onSubmit={backendForm.handleSubmit(
                                    (data) => {
                                        console.log('[LoginForm] Backend form submitted with data:', { email: data.email, passwordLength: data.password?.length });
                                        onSubmit(data);
                                    },
                                    (errors) => {
                                        console.error('[LoginForm] Backend form validation errors:', errors);
                                        toast({
                                            title: t('auth.validationError', 'Validation Error'),
                                            description: t('auth.validationErrorDescription', 'Please fill in all required fields correctly'),
                                            variant: "destructive",
                                            duration: 3000,
                                        });
                                    }
                                )} 
                                className="space-y-4 sm:space-y-6"
                            >
                                <div className="w-full">
                                    <BackendUsersComboBox reset={backendForm.reset} />
                                </div>
                                <div className="space-y-3 sm:space-y-4">
                                    <FormFieldsRenderer<IBackendAuthCredentials>
                                        fields={backendFormFields}
                                        register={backendForm.register}
                                        errors={backendForm.formState.errors}
                                        inputClassName="text-gray-800 w-full"
                                        defaultValues={backendForm.getValues()}
                                    />
                                </div>
                                {error && (
                                    <div className="text-red-500 text-sm mt-2 p-2 sm:p-3 bg-red-50 rounded-lg">
                                        {error}
                                    </div>
                                )}
                                <div className="pt-3 sm:pt-4 border-t border-gray-100">
                                    <div className="flex gap-2 sm:gap-3">
                                        <Button
                                            variant="outline"
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-1 min-h-[44px] sm:min-h-[48px]"
                                        >
                                            {isLoading ? (
                                                <span className="animate-spin">⌛</span>
                                            ) : (
                                                <PaperAirplaneIcon className="h-5 w-5" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            type="button"
                                            onClick={resetForms}
                                            disabled={isLoading}
                                            className="flex-1 min-h-[44px] sm:min-h-[48px]"
                                        >
                                            <ArrowPathIcon className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;

