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
  EyeOff
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface GeocodedData {
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

interface FormattedAddressData {
  success: boolean;
  raw_input: {
    region: string;
    locality: string;
  };
  geocoded_data?: GeocodedData;
  maps_data?: MapsData;
  error?: string;
}

interface FormattedAddressDisplayProps {
  region: string;
  locality: string;
  onGeocodeComplete?: (data: FormattedAddressData) => void;
  showMap?: boolean;
  autoGeocode?: boolean;
}

const FormattedAddressDisplay: React.FC<FormattedAddressDisplayProps> = ({
  region,
  locality,
  onGeocodeComplete,
  showMap = true,
  autoGeocode = true
}) => {
  const { t } = useI18n();
  const [addressData, setAddressData] = useState<FormattedAddressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(showMap);
  const [showLatinComponents, setShowLatinComponents] = useState(false);

  // Auto-geocode when region/locality change
  useEffect(() => {
    if (autoGeocode && region && locality) {
      handleGeocode();
    }
  }, [region, locality, autoGeocode]);

  const handleGeocode = async () => {
    if (!region || !locality) {
      setError('Region and locality are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/accounts/geocoding/detailed/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          region,
          locality
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: FormattedAddressData = await response.json();
      setAddressData(data);
      
      if (onGeocodeComplete) {
        onGeocodeComplete(data);
      }

      if (!data.success) {
        setError(data.error || 'Geocoding failed');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Geocoding error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Geocoding address...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGeocode}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!addressData || !addressData.success) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">
              {addressData?.error || 'No geocoding data available'}
            </p>
            <Button onClick={handleGeocode} variant="outline">
              <Navigation className="h-4 w-4 mr-2" />
              Geocode Address
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { geocoded_data, maps_data } = addressData;

  return (
    <div className="space-y-4">
      {/* Raw Input Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
            Original Input
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm">
              <span className="font-medium">Region:</span> {addressData.raw_input.region}
            </p>
            <p className="text-sm">
              <span className="font-medium">Locality:</span> {addressData.raw_input.locality}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Geocoded Data Section */}
      {geocoded_data && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-green-600" />
                Geocoded Information
              </CardTitle>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Place ID */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Google Maps Place ID</h4>
              <div className="bg-blue-50 p-3 rounded-md flex items-center justify-between">
                <code className="text-sm font-mono">{geocoded_data.place_id}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(geocoded_data.place_id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Formatted Address */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Formatted Address</h4>
              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm">{geocoded_data.formatted_address}</p>
              </div>
            </div>

            {/* Coordinates */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Coordinates</h4>
              <div className="bg-purple-50 p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Latitude:</span> {geocoded_data.coordinates.latitude.toFixed(6)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Longitude:</span> {geocoded_data.coordinates.longitude.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Address Components */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-700">Address Components</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLatinComponents(!showLatinComponents)}
                >
                  {showLatinComponents ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showLatinComponents ? 'Hide Latin' : 'Show Latin'}
                </Button>
              </div>
              
              {/* Ukrainian Components */}
              <div className="bg-yellow-50 p-3 rounded-md mb-2">
                <h5 className="font-medium text-xs text-gray-600 mb-2">Ukrainian (Cyrillic)</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Country:</span> {geocoded_data.components_ukrainian.country}</div>
                  <div><span className="font-medium">Region:</span> {geocoded_data.components_ukrainian.region}</div>
                  <div><span className="font-medium">Locality:</span> {geocoded_data.components_ukrainian.locality}</div>
                  <div><span className="font-medium">Street:</span> {geocoded_data.components_ukrainian.street}</div>
                </div>
              </div>

              {/* Latin Components */}
              {showLatinComponents && (
                <div className="bg-orange-50 p-3 rounded-md">
                  <h5 className="font-medium text-xs text-gray-600 mb-2">Latin (English)</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Country:</span> {geocoded_data.components_latin.country}</div>
                    <div><span className="font-medium">Region:</span> {geocoded_data.components_latin.region}</div>
                    <div><span className="font-medium">Locality:</span> {geocoded_data.components_latin.locality}</div>
                    <div><span className="font-medium">Street:</span> {geocoded_data.components_latin.street}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Address Hash */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Address Hash (SHA-256)</h4>
              <div className="bg-gray-50 p-3 rounded-md flex items-center justify-between">
                <code className="text-xs font-mono">{geocoded_data.address_hash}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(geocoded_data.address_hash)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Maps Section */}
      {maps_data && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
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
                  onClick={() => window.open(maps_data.direct_url, '_blank')}
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
                {maps_data.embed_url ? (
                  <iframe
                    src={maps_data.embed_url}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map for ${geocoded_data?.components_ukrainian.locality}, ${geocoded_data?.components_ukrainian.region}`}
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
                        onClick={() => window.open(maps_data.direct_url, '_blank')}
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
    </div>
  );
};

export default FormattedAddressDisplay;
