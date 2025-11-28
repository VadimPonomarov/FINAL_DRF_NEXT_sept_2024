"use client";

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import CarAdForm from '@/components/AutoRia/Components/CarAdForm';
import { useEditAdPageState } from '@/modules/autoria/edit-ad/useEditAdPageState';

interface EditAdPageProps {
  adId: number;
}

const EditAdPage: React.FC<EditAdPageProps> = ({ adId }) => {
  const { t } = useI18n();
  const {
    isLoadingAd,
    loadError,
    initialData,
    isSubmitting,
    handleSubmit,
    handleCancel,
    handleDelete,
  } = useEditAdPageState({ adId });

  // Show loading state while ad data is being fetched
  if (isLoadingAd) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">{t('autoria.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error when ad data failed to load
  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {loadError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <CarAdForm
      mode="edit"
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onDelete={handleDelete}
      isLoading={isSubmitting}
      adId={adId}
    />
  );
};

export default EditAdPage;
