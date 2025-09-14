"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Edit,
  Trash2,
  Globe,
  Navigation,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Map
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { RawAccountAddress } from '@/types/backend-user';

interface AddressCardProps {
  address: RawAccountAddress;
  onEdit: (address: RawAccountAddress) => void;
  onDelete: (addressId: number) => void;
  showMap?: boolean;
}

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onDelete,
  showMap = false
}) => {
  const { t } = useI18n();
  const [mapVisible, setMapVisible] = useState(showMap);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

  // Fetch Google Maps API key when component mounts
  useEffect(() => {
    const fetchApiKey = async () => {
      setApiKeyLoading(true);
      try {
        const response = await fetch('/api/google-maps-key');
        if (response.ok) {
          const data = await response.json();
          if (data.api_key && data.available) {
            setGoogleMapsApiKey(data.api_key);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error);
      } finally {
        setApiKeyLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  // Generate Google Maps URLs
  const getGoogleMapsUrl = () => {
    if (address.geo_code && address.geo_code.startsWith('ChIJ')) {
      return `https://www.google.com/maps/place/?q=place_id:${address.geo_code}`;
    }
    if (address.latitude && address.longitude) {
      return `https://www.google.com/maps/@${address.latitude},${address.longitude},15z`;
    }
    return null;
  };

  const getEmbedMapUrl = () => {
    // Check if API key is available
    if (!googleMapsApiKey) {
      return null;
    }

    if (address.geo_code && address.geo_code.startsWith('ChIJ')) {
      return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=place_id:${address.geo_code}&zoom=15`;
    }
    if (address.latitude && address.longitude) {
      return `https://www.google.com/maps/embed/v1/view?key=${googleMapsApiKey}&center=${address.latitude},${address.longitude}&zoom=15`;
    }
    return null;
  };

  const mapsUrl = getGoogleMapsUrl();
  const embedUrl = getEmbedMapUrl();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
            {t('profile.address.addressDetails')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {address.is_geocoded ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t('profile.address.verified')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                {t('profile.address.pending')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User Input Section */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Edit className="h-4 w-4" />
            {t('profile.address.userInput')}
          </h4>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm">
              <span className="font-medium">{t('profile.address.region')}:</span> {address.input_region}
            </p>
            <p className="text-sm">
              <span className="font-medium">{t('profile.address.locality')}:</span> {address.input_locality}
            </p>
          </div>
        </div>

        {/* Standardized Data Section */}
        {address.is_geocoded && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {t('profile.address.standardizedData')}
              </h4>
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">{t('profile.address.standardizedRegion')}:</span> {address.region}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('profile.address.standardizedLocality')}:</span> {address.locality}
                </p>
                {address.latitude && address.longitude && (
                  <p className="text-sm">
                    <span className="font-medium">{t('profile.address.coordinates')}:</span> {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                  </p>
                )}
                {address.geo_code && address.geo_code.startsWith('ChIJ') && (
                  <p className="text-sm">
                    <span className="font-medium">{t('profile.address.googlePlaceId')}:</span> 
                    <code className="ml-1 text-xs bg-white px-1 py-0.5 rounded">{address.geo_code}</code>
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Google Maps Section */}
        {address.is_geocoded && embedUrl && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  {t('profile.address.location')}
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMapVisible(!mapVisible)}
                  >
                    {mapVisible ? t('profile.address.hideMap') : t('profile.address.showMap')}
                  </Button>
                  {mapsUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(mapsUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      {t('profile.address.openInGoogleMaps')}
                    </Button>
                  )}
                </div>
              </div>

              {mapVisible && (
                <div className="w-full h-64 rounded-md overflow-hidden border">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Map for ${address.locality}, ${address.region}`}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Map className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        {apiKeyLoading ? (
                          <>
                            <p className="text-sm font-medium">Loading map...</p>
                            <p className="text-xs">Fetching Google Maps configuration</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">Google Maps API Key Required</p>
                            <p className="text-xs">Configure Google Maps API key in backend to show map</p>
                          </>
                        )}
                        {mapsUrl && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => window.open(mapsUrl, '_blank')}
                            className="mt-2"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open in Google Maps
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Error Section */}
        {!address.is_geocoded && address.geocoding_error && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t('profile.address.geocodingError')}
              </h4>
              <div className="bg-red-50 p-3 rounded-md">
                <p className="text-sm text-red-700">{address.geocoding_error}</p>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <Separator />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(address)}
          >
            <Edit className="h-4 w-4 mr-1" />
            {t('profile.address.edit')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(address.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {t('profile.address.delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddressCard;
