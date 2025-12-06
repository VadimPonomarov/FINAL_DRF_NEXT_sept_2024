"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Save,
  Eye
} from 'lucide-react';

import { AdStatus } from '@/modules/autoria/shared/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { useAdModerationPageState } from '@/modules/autoria/moderation/useAdModerationPageState';
import { AdModerationPageProps } from './types';
import { LoadingState, ErrorState, ModerationContent } from './components';

const AdModerationPage: React.FC<AdModerationPageProps> = ({ adId }) => {
  const { t, formatDate } = useI18n();
  const router = useRouter();
  const {
    adData,
    isLoading,
    loadError,
    isSaving,
    newStatus,
    moderationReason,
    setNewStatus,
    setModerationReason,
    reload,
    handleSaveModeration,
  } = useAdModerationPageState({ adId });

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (loadError || !adData) {
    return (
      <ErrorState 
        loadError={loadError} 
        onReload={reload} 
        onBack={() => router.push('/autoria/search')}
      />
    );
  }

  return (
    <ModerationContent
      adId={adId}
      adData={adData}
      isSaving={isSaving}
      newStatus={newStatus}
      moderationReason={moderationReason}
      setNewStatus={setNewStatus}
      setModerationReason={setModerationReason}
      handleSaveModeration={handleSaveModeration}
      formatDate={formatDate}
      t={t}
      router={router}
    />
  );
};

export default AdModerationPage;
