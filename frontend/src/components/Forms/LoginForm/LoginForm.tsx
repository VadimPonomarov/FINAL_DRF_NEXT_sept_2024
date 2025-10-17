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
import { AuthProvider } from "@/common/constants/constants";

import { useAuthProvider } from "@/contexts/AuthProviderContext";
import { cn } from "@/lib/utils";
import { IDummyAuth } from "@/common/interfaces/dummy.interfaces";
import {
  authProviderOptions,
  IBackendAuthCredentials,
} from "@/common/interfaces/auth.interfaces";
import { useToast } from "@/hooks/use-toast";
// import { useRouter } from "next/navigation";

import { backendFormFields, dummyFormFields } from "./formFields.config";
import { useLoginForm } from "./useLoginForm";

const LoginForm: FC = () => {
    const { toast } = useToast();
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
                title: "Authentication",
                description: message,
                duration: 3000,
            });
        }
    }, [message, toast]);

    return (
        <div className="flex items-center justify-center w-full h-full p-4">
            <NewResizableWrapper
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
                            <h1 className="text-2xl font-bold text-gray-800">Login</h1>
                            {provider === AuthProvider.MyBackendDocs && (
                                <Link
                                    href="/register"
                                    className="text-blue-500 hover:text-blue-700 text-sm transition-colors duration-300"
                                >
                                    Register
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
                                    <SelectValue placeholder="Select auth type" />
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
                            <form key={`dummy-form-${formKey}`} onSubmit={dummyForm.handleSubmit(onSubmit)} className="space-y-4">
                                <DummyUsersComboBox reset={dummyForm.reset} />
                                <FormFieldsRenderer<IDummyAuth>
                                    fields={dummyFormFields}
                                    register={dummyForm.register}
                                    errors={dummyForm.formState.errors}
                                    inputClassName="text-gray-800"
                                    defaultValues={dummyForm.getValues()}
                                />
                                <div className="pt-4 border-t border-gray-100">
                                    <ButtonGroup orientation="horizontal">
                                        <Button
                                            variant="outline"
                                            type="submit"
                                            disabled={!dummyForm.formState.isValid || isLoading}
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
                            <form key={`backend-form-${formKey}`} onSubmit={backendForm.handleSubmit(onSubmit)} className="space-y-4">
                                <BackendUsersComboBox reset={backendForm.reset} />
                                <FormFieldsRenderer<IBackendAuthCredentials>
                                    fields={backendFormFields}
                                    register={backendForm.register}
                                    errors={backendForm.formState.errors}
                                    inputClassName="text-gray-800"
                                    defaultValues={backendForm.getValues()}
                                />
                                <div className="pt-4 border-t border-gray-100">
                                    <ButtonGroup orientation="horizontal">
                                        <Button
                                            variant="outline"
                                            type="submit"
                                            disabled={!backendForm.formState.isValid || isLoading}
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
            </NewResizableWrapper>
        </div>
    );
};

export default LoginForm;

