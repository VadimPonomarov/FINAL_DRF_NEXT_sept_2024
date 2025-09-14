import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { BackendAccountContact } from '@/types/backend-user';

interface OptimizedContactListProps {
  contacts: BackendAccountContact[];
  onEditContact: (contact: BackendAccountContact) => void;
  onDeleteContact: (contactId: number) => void;
  t: (key: string) => string;
}

// Мемоизированный компонент для отдельного контакта
const ContactItem = memo(({ 
  contact, 
  onEdit, 
  onDelete, 
  t 
}: {
  contact: BackendAccountContact;
  onEdit: (contact: BackendAccountContact) => void;
  onDelete: (contactId: number) => void;
  t: (key: string) => string;
}) => (
  <div className="flex items-center justify-between p-3 border rounded-lg">
    <div className="flex items-center gap-3">
      <Badge variant="outline">
        {contact.contact_type}
      </Badge>
      <span>{contact.contact_value}</span>
      {contact.is_primary && (
        <Badge variant="default" className="text-xs">
          {t('profile.contact.primary')}
        </Badge>
      )}
      {contact.is_verified && (
        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
          ✅ {t('profile.contact.verified')}
        </Badge>
      )}
    </div>
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onEdit(contact)}
      >
        <Edit className="h-4 w-4 mr-1" />
        {t('common.edit')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onDelete(contact.id)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        {t('common.delete')}
      </Button>
    </div>
  </div>
));

ContactItem.displayName = 'ContactItem';

// Основной оптимизированный компонент списка контактов
const OptimizedContactList = memo(({ 
  contacts, 
  onEditContact, 
  onDeleteContact, 
  t 
}: OptimizedContactListProps) => {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('profile.contact.noContacts')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact) => (
        <ContactItem
          key={contact.id}
          contact={contact}
          onEdit={onEditContact}
          onDelete={onDeleteContact}
          t={t}
        />
      ))}
    </div>
  );
});

OptimizedContactList.displayName = 'OptimizedContactList';

export default OptimizedContactList;
