"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  X,
  AlertCircle,
  MapPin,
  Navigation
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { RawAccountAddress } from '@/shared/types/backend-user';
import VirtualSelect from '@/components/ui/virtual-select';
import { fetchRegions, fetchCitiesForRegion } from '@/lib/api/reference';

interface RawAddressFormProps {
  initialData?: RawAccountAddress | null;
  onSubmit: (data: Partial<RawAccountAddress>) => Promise<RawAccountAddress>;
  onCancel: () => void;
  loading?: boolean;
}

const RawAddressForm: React.FC<RawAddressFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    input_region: '',
    input_locality: '',
  });
  const [selectedRegion, setSelectedRegion] = useState<{ value: string; label: string } | null>(null);
  const [selectedCity, setSelectedCity] = useState<{ value: string; label: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setFormData({
        input_region: initialData.input_region || '',
        input_locality: initialData.input_locality || '',
      });
      
      // Set selected values for dropdowns
      if (initialData.input_region) {
        setSelectedRegion({
          value: initialData.input_region,
          label: initialData.input_region
        });
      }
      
      if (initialData.input_locality) {
        setSelectedCity({
          value: initialData.input_locality,
          label: initialData.input_locality
        });
      }
    }
  }, [initialData]);

  const handleRegionChange = (value: string, label: string) => {
    setSelectedRegion({ value, label });
    setFormData(prev => ({
      ...prev,
      input_region: label,
      input_locality: '' // Reset locality when region changes
    }));
    setSelectedCity(null); // Reset city selection
  };

  const handleCityChange = (value: string, label: string) => {
    setSelectedCity({ value, label });
    setFormData(prev => ({
      ...prev,
      input_locality: label
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.input_region.trim()) {
      setFormError('Region is required');
      return;
    }

    if (!formData.input_locality.trim()) {
      setFormError('Locality is required');
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(formData);
      // Form will be closed by parent component
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save address';
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      input_region: '',
      input_locality: '',
    });
    setSelectedRegion(null);
    setSelectedCity(null);
    setFormError(null);
  };

  return (
    <div className="max-h-[60vh] overflow-y-auto pr-2">
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Error */}
      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Region Selection */}
        <div className="space-y-2">
          <Label htmlFor="region" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('profile.address.region')} *
          </Label>
          <VirtualSelect
            value={selectedRegion?.value || ''}
            onValueChange={handleRegionChange}
            placeholder={t('profile.address.regionPlaceholder')}
            fetchOptions={fetchRegions}
            pageSize={50}
            searchPlaceholder={t('common.search')}
            emptyMessage={t('common.none')}
          />
          <p className="text-xs text-muted-foreground">
            {t('profile.address.helpText.selectRegion')}
          </p>
        </div>

        {/* City Selection */}
        <div className="space-y-2">
          <Label htmlFor="locality" className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            {t('profile.address.locality')} *
          </Label>
          <VirtualSelect
            value={selectedCity?.value || ''}
            onValueChange={handleCityChange}
            placeholder={!selectedRegion ? t('profile.address.regionPlaceholder') : t('profile.address.localityPlaceholder')}
            fetchOptions={selectedRegion ? fetchCitiesForRegion : undefined}
            pageSize={50}
            searchPlaceholder={t('common.search')}
            emptyMessage={t('common.none')}
            disabled={!selectedRegion}
            key={`city-${selectedRegion?.value}`} // Reset when region changes
          />
          <p className="text-xs text-muted-foreground">
            {t('profile.address.helpText.selectRegion')}
          </p>
        </div>
      </div>

      {/* Preview Section */}
      {(formData.input_region || formData.input_locality) && (
        <>
          <Separator />
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium text-sm text-gray-700 mb-3">{t('common.preview')}</h4>
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">{t('profile.address.region')}:</span> {formData.input_region || t('common.none')}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('profile.address.locality')}:</span> {formData.input_locality || t('common.none')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('profile.address.helpText.autoGeocode')}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={submitting || loading}
          >
            Reset
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting || loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || loading || !formData.input_region || !formData.input_locality}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {initialData ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {initialData ? 'Update Address' : 'Create Address'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h5 className="font-medium text-sm text-gray-700 mb-2">How it works:</h5>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Select region and city from the dropdown lists</li>
          <li>• The address will be automatically geocoded when saved</li>
          <li>• Geocoding provides standardized data and coordinates</li>
          <li>• View the formatted data in the "Formatted Data" tab</li>
          <li>• Google Maps integration shows the location on a map</li>
        </ul>
      </div>
    </form>
    </div>
  );
};

export default RawAddressForm;
