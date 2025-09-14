"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MapPin,
  Globe,
  Navigation,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Map,
  Copy,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { RawAccountAddress } from '@/types/backend-user';

interface TransformedAddressDisplayProps {
  address: RawAccountAddress | null;
  onRefresh?: () => void;
  loading?: boolean;
}

interface DetailedGeocodingData {
  place_id: string;
  formatted_address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  components_latin: {
    country: string;
    region: string;
    locality: string;
    street: string;
    building: string;
  };
  components_ukrainian: {
    country: string;
    region: string;
    locality: string;
    street: string;
    building: string;
  };
  address_hash: string;
}

interface MapsData {
  embed_url: string | null;
  direct_url: string;
}

const TransformedAddressDisplay: React.FC<TransformedAddressDisplayProps> = ({
  address,
  onRefresh,
  loading = false
}) => {
  const { t } = useI18n();
  const [detailedData, setDetailedData] = useState<DetailedGeocodingData | null>(null);
  const [mapsData, setMapsData] = useState<MapsData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showLatinComponents, setShowLatinComponents] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load detailed geocoding data when address changes
  useEffect(() => {
    if (address && address.is_geocoded) {
      loadDetailedGeocodingData();
    } else {
      setDetailedData(null);
      setMapsData(null);
    }
  }, [address]);

  const loadDetailedGeocodingData = async () => {
    if (!address || !address.is_geocoded) return;

    setLoadingDetails(true);
    setError(null);

    try {
      const response = await fetch(`/api/accounts/geocoding/formatted/${address.id}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.geocoded_data) {
        setDetailedData(data.geocoded_data);
        setMapsData(data.maps_data);
      } else {
        setError(data.error || 'Failed to load detailed geocoding data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading detailed geocoding data:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRefreshData = () => {
    if (onRefresh) {
      onRefresh();
    }
    if (address && address.is_geocoded) {
      loadDetailedGeocodingData();
    }
  };

  if (!address) {
    return (
      <div className="text-center py-8">
        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('profile.address.add')}</h3>
        <p className="text-gray-600 mb-4">
          {t('profile.address.helpText.selectRegion')}
        </p>
      </div>
    );
  }

  if (!address.is_geocoded) {
    return (
      <div className="space-y-4">
        {/* Raw Address Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-600" />
              {t('profile.address.input')} ({t('profile.address.pending')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-orange-50 p-4 rounded-md">
              <p className="text-sm">
                <span className="font-medium">{t('profile.address.region')}:</span> {address.input_region}
              </p>
              <p className="text-sm">
                <span className="font-medium">{t('profile.address.locality')}:</span> {address.input_locality}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('profile.address.helpText.autoGeocode')}
              </p>
            </div>
            {address.geocoding_error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Geocoding error: {address.geocoding_error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Refresh Button */}
        <div className="text-center">
          <Button onClick={handleRefreshData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-2"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Raw Input vs Standardized */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {t('profile.address.verified')} {t('profile.address.input')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Input */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">{t('profile.address.input')}</h4>
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">{t('profile.address.region')}:</span> {address.input_region}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('profile.address.locality')}:</span> {address.input_locality}
                </p>
              </div>
            </div>

            {/* Standardized */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">{t('profile.address.standardized')}</h4>
              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">{t('profile.address.region')}:</span> {address.region || address.input_region}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('profile.address.locality')}:</span> {address.locality || address.input_locality}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Geocoding Data */}
      {loadingDetails ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
              <span>Loading detailed geocoding data...</span>
            </div>
          </CardContent>
        </Card>
      ) : detailedData ? (
        <>
          {/* Place ID and Coordinates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                {t('profile.address.geocoding')} Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Place ID */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">{t('profile.address.placeId')}</h4>
                <div className="bg-blue-50 p-3 rounded-md flex items-center justify-between">
                  <code className="text-sm font-mono">{detailedData.place_id}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(detailedData.place_id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Formatted Address */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">{t('profile.address.formattedAddress')}</h4>
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-sm">{detailedData.formatted_address}</p>
                </div>
              </div>

              {/* Coordinates */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">{t('profile.address.coordinates')}</h4>
                <div className="bg-purple-50 p-3 rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">Latitude:</span> {detailedData.coordinates.latitude.toFixed(6)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Longitude:</span> {detailedData.coordinates.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Components */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-orange-600" />
                  {t('profile.address.addressComponents')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLatinComponents(!showLatinComponents)}
                >
                  {showLatinComponents ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showLatinComponents ? 'Hide Latin' : 'Show Latin'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ukrainian Components */}
              <div>
                <h5 className="font-medium text-xs text-gray-600 mb-2">{t('profile.address.ukrainian')}</h5>
                <div className="bg-yellow-50 p-3 rounded-md">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Country:</span> {detailedData.components_ukrainian.country}</div>
                    <div><span className="font-medium">Region:</span> {detailedData.components_ukrainian.region}</div>
                    <div><span className="font-medium">Locality:</span> {detailedData.components_ukrainian.locality}</div>
                    {detailedData.components_ukrainian.street && (
                      <div><span className="font-medium">Street:</span> {detailedData.components_ukrainian.street}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Latin Components */}
              {showLatinComponents && (
                <div>
                  <h5 className="font-medium text-xs text-gray-600 mb-2">{t('profile.address.latin')}</h5>
                  <div className="bg-orange-50 p-3 rounded-md">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="font-medium">Country:</span> {detailedData.components_latin.country}</div>
                      <div><span className="font-medium">Region:</span> {detailedData.components_latin.region}</div>
                      <div><span className="font-medium">Locality:</span> {detailedData.components_latin.locality}</div>
                      {detailedData.components_latin.street && (
                        <div><span className="font-medium">Street:</span> {detailedData.components_latin.street}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Address Hash */}
              <div>
                <h5 className="font-medium text-xs text-gray-600 mb-2">{t('profile.address.addressHash')}</h5>
                <div className="bg-gray-50 p-3 rounded-md flex items-center justify-between">
                  <code className="text-xs font-mono">{detailedData.address_hash}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(detailedData.address_hash)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Maps */}
          {mapsData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5 text-red-600" />
                    Google Maps
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMapVisible(!mapVisible)}
                    >
                      {mapVisible ? 'Hide Map' : 'Show Map'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(mapsData.direct_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open in Google Maps
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {mapVisible && (
                <CardContent>
                  <div className="w-full h-64 rounded-md overflow-hidden border">
                    {mapsData.embed_url ? (
                      <iframe
                        src={mapsData.embed_url}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Map for ${detailedData.components_ukrainian.locality}, ${detailedData.components_ukrainian.region}`}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Map className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">Google Maps API Key Required</p>
                          <p className="text-xs">Configure Google Maps API key to show embedded map</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => window.open(mapsData.direct_url, '_blank')}
                            className="mt-2"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open in Google Maps
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <Button onClick={loadDetailedGeocodingData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Detailed Data
          </Button>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <Button onClick={handleRefreshData} variant="outline" disabled={loading || loadingDetails}>
          <RefreshCw className={`h-4 w-4 mr-2 ${(loading || loadingDetails) ? 'animate-spin' : ''}`} />
          {t('common.refresh')} All Data
        </Button>
      </div>
    </div>
  );
};

export default TransformedAddressDisplay;
