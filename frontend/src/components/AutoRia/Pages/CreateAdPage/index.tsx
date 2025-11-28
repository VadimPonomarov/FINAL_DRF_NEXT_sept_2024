"use client";

import React from 'react';

import CarAdForm from '@/components/AutoRia/Components/CarAdForm';
import { useCreateAdPageState } from '@/modules/autoria/create-ad/useCreateAdPageState';

const CreateAdPage: React.FC = () => {
  const { isSubmitting, handleSubmit, handleCancel } = useCreateAdPageState();

  return (
    <CarAdForm
      mode="create"
      initialData={{}}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isSubmitting}
    />
  );
};

export default CreateAdPage;
