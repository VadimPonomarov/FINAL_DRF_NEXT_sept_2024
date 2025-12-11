import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MapPin } from 'lucide-react';
import { BackendAddress } from '@/shared/types/backend-user';

interface OptimizedAddressListProps {
  addresses: BackendAddress[];
  onEditAddress: (address: BackendAddress) => void;
  onDeleteAddress: (addressId: number) => void;
  t: (key: string) => string;
}

// Мемоизированный компонент для отдельного адреса
const AddressItem = memo(({ 
  address, 
  onEdit, 
  onDelete, 
  t 
}: {
  address: BackendAddress;
  onEdit: (address: BackendAddress) => void;
  onDelete: (addressId: number) => void;
  t: (key: string) => string;
}) => (
  <div className="flex items-center justify-between p-3 border rounded-lg">
    <div className="flex items-center gap-3">
      <MapPin className="h-4 w-4 text-gray-500" />
      <div className="flex flex-col">
        <span className="font-medium">
          {address.input_locality || address.city}, {address.input_region || address.region}
        </span>
        {address.street && (
          <span className="text-sm text-gray-500">
            {address.street} {address.house_number}
          </span>
        )}
      </div>
      {address.is_primary && (
        <Badge variant="default" className="text-xs">
          {t('profile.address.primary')}
        </Badge>
      )}
    </div>
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onEdit(address)}
      >
        <Edit className="h-4 w-4 mr-1" />
        {t('common.edit')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onDelete(address.id)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        {t('common.delete')}
      </Button>
    </div>
  </div>
));

AddressItem.displayName = 'AddressItem';

// Основной оптимизированный компонент списка адресов
const OptimizedAddressList = memo(({ 
  addresses, 
  onEditAddress, 
  onDeleteAddress, 
  t 
}: OptimizedAddressListProps) => {
  if (addresses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('profile.address.noAddresses')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((address) => (
        <AddressItem
          key={address.id}
          address={address}
          onEdit={onEditAddress}
          onDelete={onDeleteAddress}
          t={t}
        />
      ))}
    </div>
  );
});

OptimizedAddressList.displayName = 'OptimizedAddressList';

export default OptimizedAddressList;
