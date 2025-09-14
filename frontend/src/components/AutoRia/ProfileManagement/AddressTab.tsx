"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Plus, Edit, CheckCircle, AlertCircle } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { RawAccountAddress } from '@/types/backend-user';
import RawAddressForm from '../AddressManagement/RawAddressForm';
import TransformedAddressDisplay from '../AddressCard/TransformedAddressDisplay';

interface AddressTabProps {
  address: RawAccountAddress | null;
  onUpdate: (addressData: Partial<RawAccountAddress>) => Promise<RawAccountAddress>;
  onCreate: (addressData: Partial<RawAccountAddress>) => Promise<RawAccountAddress>;
  loading?: boolean;
}

const AddressTab: React.FC<AddressTabProps> = ({
  address,
  onUpdate,
  onCreate,
  loading = false
}) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show form if no address exists
  useEffect(() => {
    if (!address && !isEditing) {
      setIsEditing(true);
    }
  }, [address, isEditing]);

  const handleSaveAddress = async (addressData: Partial<RawAccountAddress>) => {
    setFormLoading(true);
    setError(null);

    try {
      if (address) {
        // Update existing address
        await onUpdate(addressData);
      } else {
        // Create new address
        await onCreate(addressData);
      }
      setIsEditing(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save address';
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (address) {
      setIsEditing(false);
    }
    setError(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Address Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {address ? t('profile.address.edit') : t('profile.address.add')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RawAddressForm
              initialData={address}
              onSubmit={handleSaveAddress}
              onCancel={handleCancelEdit}
              loading={formLoading || loading}
            />
          </CardContent>
        </Card>
      )}

      {/* Address Display */}
      {address && !isEditing && (
        <div className="space-y-4">
          {/* Address Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('profile.address.yourAddress')}
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  {t('profile.address.edit')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                {address.is_geocoded ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
                <span className="font-medium">
                  {address.region || address.input_region}, {address.locality || address.input_locality}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {address.is_geocoded ? t('profile.address.geocoded') : t('profile.address.pendingGeocoding')}
              </p>
            </CardContent>
          </Card>

          {/* Detailed Address Display */}
          <TransformedAddressDisplay
            address={address}
            loading={loading}
          />
        </div>
      )}

      {/* No Address State */}
      {!address && !isEditing && (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('profile.address.noAddress')}</h3>
            <p className="text-muted-foreground mb-4">{t('profile.address.addAddressDescription')}</p>
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('profile.address.add')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddressTab;
