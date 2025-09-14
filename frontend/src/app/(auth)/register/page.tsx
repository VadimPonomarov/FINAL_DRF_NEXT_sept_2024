"use client";

import React from "react";
import dynamic from 'next/dynamic';

const RegistrationForm = dynamic(
  () => import('@/components/Forms/RegistrationForm/RegistrationForm'),
  { ssr: false }
);

const RegisterPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <RegistrationForm />
    </div>
  );
};

export default RegisterPage;