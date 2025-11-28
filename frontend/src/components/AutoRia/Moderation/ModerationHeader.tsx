"use client";

import React from 'react';

import { Shield } from 'lucide-react';

import { useI18n } from '@/contexts/I18nContext';

interface ModerationHeaderProps {
  userEmail: string | null;
  isSuperUser: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  isProfileSuperUser: boolean;
}

const ModerationHeader: React.FC<ModerationHeaderProps> = ({
  userEmail,
  isSuperUser,
  isAuthenticated,
  authLoading,
  isProfileSuperUser
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-8 w-8 text-orange-600" />
          {t('accessDenied.moderationTitle')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('accessDenied.moderationDescription')}
        </p>

        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
          <strong>{t('autoria.moderation.userStatus')}</strong> {userEmail || t('autoria.moderation.noAdsFound')} |
          <strong> {t('autoria.moderation.superuser')}</strong> {isSuperUser ? '✅ Yes' : '❌ No'} |
          <strong> useAutoRiaAuth:</strong> {isAuthenticated ? '✅' : '❌'} |
          <strong> {t('autoria.moderation.authLoading')}</strong> {authLoading ? '⏳' : '✅'} |
          <strong> {t('autoria.moderation.userProfile')}</strong> {isProfileSuperUser ? '✅' : '❌'}
        </div>
      </div>
    </div>
  );
};

export default ModerationHeader;
