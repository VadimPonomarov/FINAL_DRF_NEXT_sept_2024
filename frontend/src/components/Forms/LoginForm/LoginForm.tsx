"use client";

import React, { FC, useEffect } from "react";
import Link from "next/link";
import { ArrowPathIcon, PaperAirplaneIcon } from "@heroicons/react/16/solid";
import { ResizableWrapper } from "@/components/shared/layout";

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
            <ResizableWrapper
              storageKey="login-form"
              className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col"
              defaultWidth={350}
              defaultHeight={450}
              minWidth={300}
              minHeight={400}
            >
                <div className="w-full h-full flex flex-col overflow-auto">
                    <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-800">{t('auth.login', 'Login')}</h1>
                            {provider === AuthProvider.MyBackendDocs && (
                                <Link
                                    href="/register"
                                    className="text-blue-500 hover:text-blue-700 text-sm transition-colors duration-300"
                                >
                                    {t('auth.register', 'Register')}
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className={cn("w-full max-w-[180px]")}>
                            <Select
                                onValueChange={handleProviderChange}
                                defaultValue={provider}
                                value={provider}
                            >
                                <SelectTrigger>
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
                                className="space-y-4"
                            >
                                <DummyUsersComboBox reset={dummyForm.reset} />
                                <FormFieldsRenderer<IDummyAuth>
                                    fields={dummyFormFields}
                                    register={dummyForm.register}
                                    errors={dummyForm.formState.errors}
                                    inputClassName="text-gray-800"
                                    defaultValues={dummyForm.getValues()}
                                />
                                {error && (
                                    <div className="text-red-500 text-sm mt-2">
                                        {error}
                                    </div>
                                )}
                                <div className="pt-4 border-t border-gray-100">
                                    <ButtonGroup orientation="horizontal">
                                        <Button
                                            variant="outline"
                                            type="submit"
                                            disabled={isLoading}
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
                                        >
                                            <ArrowPathIcon className="h-5 w-5" />
                                        </Button>
                                    </ButtonGroup>
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
                                className="space-y-4"
                            >
                                <BackendUsersComboBox reset={backendForm.reset} />
                                <FormFieldsRenderer<IBackendAuthCredentials>
                                    fields={backendFormFields}
                                    register={backendForm.register}
                                    errors={backendForm.formState.errors}
                                    inputClassName="text-gray-800"
                                    defaultValues={backendForm.getValues()}
                                />
                                {error && (
                                    <div className="text-red-500 text-sm mt-2">
                                        {error}
                                    </div>
                                )}
                                <div className="pt-4 border-t border-gray-100">
                                    <ButtonGroup orientation="horizontal">
                                        <Button
                                            variant="outline"
                                            type="submit"
                                            disabled={isLoading}
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
                                        >
                                            <ArrowPathIcon className="h-5 w-5" />
                                        </Button>
                                    </ButtonGroup>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </ResizableWrapper>
        </div>
    );
};

export default LoginForm;

