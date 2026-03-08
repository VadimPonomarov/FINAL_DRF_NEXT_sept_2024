"use client";

import { FC } from "react";
import LoginForm from "@/components/Forms/LoginForm/LoginForm";

const SimpleLoginPage: FC = () => {
    return (
        <div className="flex justify-center items-center h-[calc(100vh-60px)] w-full">
            <LoginForm />
        </div>
    );
};

export default SimpleLoginPage;
