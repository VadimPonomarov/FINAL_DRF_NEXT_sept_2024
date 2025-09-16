"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Settings,
  MapPin,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import ProfileTab from './ProfileTab';
import AccountTab from './AccountTab';
import AddressTab from './AddressTab';

interface ProfileManagementProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({ 
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('profile');

  // Simple profile data management (replaced useProfileSync)
  const [data] = useState({ profile: null, account: null, address: null });
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const refreshData = async () => {
    console.log('Profile refresh not implemented');
  };

  const updateProfile = async (profileData: any) => {
    console.log('Profile update not implemented', profileData);
    return profileData;
  };

  const updateAccount = async (accountData: any) => {
    console.log('Account update not implemented', accountData);
    return accountData;
  };

  const updateAddress = async (addressData: any) => {
    console.log('Address update not implemented', addressData);
    return addressData;
  };

  const createAddress = async (addressData: any) => {
    console.log('Address creation not implemented', addressData);
    return addressData;
  };

  const clearError = () => {
    console.log('Clear error not implemented');
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleDismissError = () => {
    clearError();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{t('profile.title')}</h2>
            {autoRefresh && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {loading ? (
                  <WifiOff className="h-4 w-4 text-orange-500" />
                ) : (
                  <Wifi className="h-4 w-4 text-green-500" />
                )}
                <span className="text-xs">
                  {loading ? t('profile.address.syncing') : t('profile.address.liveSync')}
                </span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground">
            {t('profile.personalInfo')} • {t('profile.accountSettings')} • {t('profile.addresses')}
            {autoRefresh && (
              <span className="text-xs ml-2">
                • {t('profile.address.autoRefresh')} {Math.round(refreshInterval / 1000)}s
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDismissError}
              className="ml-2"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('profile.personalInfo')} 
            {data.profile && (
              <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                ✓
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('profile.accountSettings')}
            {data.account && (
              <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                ✓
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('profile.addresses')}
            {data.address && (
              <span className={`text-xs px-1 rounded ${
                data.address.is_geocoded 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {data.address.is_geocoded ? '✓' : '⏳'}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                {t('profile.personalInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileTab
                profile={data.profile}
                onUpdate={updateProfile}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                {t('profile.accountSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AccountTab
                account={data.account}
                onUpdate={updateAccount}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                {t('profile.addresses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddressTab
                address={data.address}
                onUpdate={updateAddress}
                onCreate={createAddress}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sync Status */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="font-medium text-sm text-gray-700 mb-2">Sync Status</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${data.profile ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span>Profile: {data.profile ? 'Synced' : 'Not loaded'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${data.account ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span>Account: {data.account ? 'Synced' : 'Not loaded'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              data.address 
                ? data.address.is_geocoded 
                  ? 'bg-green-500' 
                  : 'bg-orange-500'
                : 'bg-gray-300'
            }`}></div>
            <span>Address: {
              data.address 
                ? data.address.is_geocoded 
                  ? 'Geocoded' 
                  : 'Pending geocoding'
                : 'Not set'
            }</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileManagement;
