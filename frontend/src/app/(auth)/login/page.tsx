"use client";

import { FC } from "react";
import LoginForm from "@/components/Forms/LoginForm/LoginForm";
import { LoginLoading } from "./LoginLoading";
import { useLoginPageLogic } from "./useLoginPageLogic";

const LoginPage: FC = () => {
  const { status, isCheckingAuth } = useLoginPageLogic();

  if (status === "loading" || isCheckingAuth) {
    return <LoginLoading />;
  }

  return (
    <div className="flex justify-center items-center h-[calc(100vh-60px)] w-full">
      <LoginForm />
    </div>
  );
};

export default LoginPage;
