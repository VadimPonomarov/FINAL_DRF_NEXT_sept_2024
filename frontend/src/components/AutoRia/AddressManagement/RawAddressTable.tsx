"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { RawAccountAddress } from '@/shared/types/backend-user';

interface RawAddressTableProps {
  addresses: RawAccountAddress[];
  onEdit: (address: RawAccountAddress) => void;
  onDelete: (id: number) => void;
  loading?: boolean;
}

const RawAddressTable: React.FC<RawAddressTableProps> = ({
  addresses,
  onEdit,
  onDelete,
  loading = false
}) => {
  const { t } = useI18n();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading addresses...</span>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No addresses found</h3>
        <p className="text-gray-600 mb-4">
          Get started by adding your first address.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Total: {addresses.length} addresses
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Geocoded: {addresses.filter(addr => addr.is_geocoded).length}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <span>Pending: {addresses.filter(addr => !addr.is_geocoded).length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Locality</TableHead>
              <TableHead>Geocoded Data</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addresses.map((address) => (
              <TableRow key={address.id}>
                {/* Status */}
                <TableCell>
                  {address.is_geocoded ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Geocoded
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </TableCell>

                {/* Region */}
                <TableCell>
                  <div>
                    <div className="font-medium">{address.input_region}</div>
                    {address.is_geocoded && address.region && address.region !== address.input_region && (
                      <div className="text-xs text-muted-foreground">
                        Standardized: {address.region}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Locality */}
                <TableCell>
                  <div>
                    <div className="font-medium">{address.input_locality}</div>
                    {address.is_geocoded && address.locality && address.locality !== address.input_locality && (
                      <div className="text-xs text-muted-foreground">
                        Standardized: {address.locality}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Geocoded Data */}
                <TableCell>
                  {address.is_geocoded ? (
                    <div className="space-y-1">
                      {address.geo_code && address.geo_code !== 'unknown' && (
                        <div className="text-xs">
                          <span className="font-medium">Place ID:</span>
                          <br />
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {address.geo_code.substring(0, 20)}...
                          </code>
                        </div>
                      )}
                      {address.latitude && address.longitude && (
                        <div className="text-xs text-muted-foreground">
                          {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {address.geocoding_error ? (
                        <div className="text-red-600">
                          Error: {address.geocoding_error.substring(0, 50)}...
                        </div>
                      ) : (
                        'Not geocoded yet'
                      )}
                    </div>
                  )}
                </TableCell>

                {/* Created */}
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(address.created_at)}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(address)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(address.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="font-medium text-sm text-blue-900 mb-2">About Raw Addresses</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• <strong>Raw addresses</strong> contain the original region and locality as entered by users</li>
          <li>• <strong>Geocoding</strong> automatically converts raw addresses to standardized format using Google Maps</li>
          <li>• <strong>Place ID</strong> is a unique identifier from Google Maps for precise location matching</li>
          <li>• <strong>Coordinates</strong> enable map display and geographic calculations</li>
          <li>• Edit addresses to update the input data and trigger re-geocoding</li>
        </ul>
      </div>
    </div>
  );
};

export default RawAddressTable;
