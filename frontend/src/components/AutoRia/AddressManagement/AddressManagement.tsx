"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  MapPin,
  Database,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { RawAccountAddress } from '@/shared/types/backend-user';
import { useAddresses } from '@/modules/autoria/shared/hooks/useAddresses';
import RawAddressForm from './RawAddressForm';
import TransformedAddressDisplay from '../AddressCard/TransformedAddressDisplay';

interface AddressManagementProps {
  accountId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const AddressManagement: React.FC<AddressManagementProps> = ({
  accountId,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<RawAccountAddress | null>(null);

  // Use the addresses hook for data management
  const {
    addresses,
    loading,
    error,
    refreshAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    getAddressById,
    clearError
  } = useAddresses({
    autoRefresh,
    refreshInterval,
    accountId
  });

  // Get the single address (first one)
  const currentAddress = addresses.length > 0 ? addresses[0] : null;

  const handleCreateOrUpdateAddress = async (addressData: Partial<RawAccountAddress>) => {
    try {
      if (currentAddress) {
        // Update existing address
        await updateAddress(currentAddress.id, addressData);
      } else {
        // Create new address
        await createAddress(addressData);
      }
      setShowForm(false);
      setEditingAddress(null);
    } catch (err) {
      // Error is handled by the hook
      throw err;
    }
  };

  const handleEditAddress = () => {
    setEditingAddress(currentAddress);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingAddress(null);
    setShowForm(false);
  };

  const handleRefresh = async () => {
    await refreshAddresses();
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
            <h2 className="text-2xl font-bold tracking-tight">{t('profile.addresses')}</h2>
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
            {currentAddress
              ? currentAddress.is_geocoded
                ? `${t('profile.address.verified')} • ${t('profile.address.geocoded')}`
                : `${t('profile.address.pending')} • ${t('profile.address.geocoding')}`
              : t('profile.address.add')
            }
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
          {currentAddress && (
            <Button
              onClick={handleEditAddress}
              disabled={showForm}
              variant="outline"
            >
              <MapPin className="h-4 w-4 mr-2" />
              {t('profile.address.edit')}
            </Button>
          )}
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

      {/* Address Form */}
      {(showForm || !currentAddress) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {currentAddress ? t('profile.address.edit') : t('profile.address.add')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RawAddressForm
              initialData={editingAddress || currentAddress}
              onSubmit={handleCreateOrUpdateAddress}
              onCancel={handleCancelEdit}
              loading={loading}
            />
          </CardContent>
        </Card>
      )}

      {/* Transformed Address Display */}
      {currentAddress && !showForm && (
        <TransformedAddressDisplay
          address={currentAddress}
          onRefresh={handleRefresh}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AddressManagement;
