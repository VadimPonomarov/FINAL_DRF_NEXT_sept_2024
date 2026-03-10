"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Phone,
  Mail,
  MessageCircle,
  Plus,
  Edit,
  Trash2,
  Building,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { ContactTypeEnum } from '@/shared/types/backend-user';
import { AdContact } from '@/modules/autoria/shared/types/autoria';

// Интерфейс для данных формы контактов объявления
export interface AdContactsFormData {
  contacts: AdContact[];
  contact_name?: string; // Имя контактного лица
  additional_info?: string; // Дополнительная информация
  use_profile_contacts?: boolean; // Использовать контакты из профиля
  region_name?: string;
  city_name?: string;
  [key: string]: any;
}

interface AdContactsFormProps {
  data: AdContactsFormData;
  onChange: (data: AdContactsFormData) => void;
  errors?: string[];
  profileContacts?: AdContact[]; // Контакты из профиля для предзаполнения
}

const AdContactsForm: React.FC<AdContactsFormProps> = ({
  data,
  onChange,
  errors,
  profileContacts = []
}) => {
  const { t } = useI18n();

  // Локальное состояние для формы добавления контакта
  const [newContact, setNewContact] = useState<Partial<AdContact>>({
    type: ContactTypeEnum.PHONE,
    value: '',
    is_visible: true,
    is_primary: false,
    note: ''
  });

  // Локальное состояние для редактирования
  const [editingContact, setEditingContact] = useState<AdContact | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Состояние для уведомлений
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'warning';
    message: string;
  } | null>(null);

  // Используем контакты из пропсов (они теперь приходят из хука useProfileContacts)
  const effectiveProfileContacts = profileContacts;



  // Отладочная информация
  console.log('[AdContactsForm] Render - data:', data);
  console.log('[AdContactsForm] Profile contacts:', profileContacts);
  console.log('[AdContactsForm] Effective profile contacts:', effectiveProfileContacts);
  console.log('[AdContactsForm] use_profile_contacts:', data.use_profile_contacts);

  // Инициализация use_profile_contacts по умолчанию
  useEffect(() => {
    // Если use_profile_contacts не определен (undefined), устанавливаем его в true
    if (data.use_profile_contacts === undefined) {
      console.log('[AdContactsForm] Initializing use_profile_contacts to true');
      onChange({
        ...data,
        use_profile_contacts: true
      });
    }
  }, []); // Выполняем только один раз при монтировании

  // Управление контактами из профиля при изменении чекбокса
  useEffect(() => {
    const currentContacts = data.contacts || [];

    if (data.use_profile_contacts === true) {
      // Чекбокс включен - добавляем контакты из профиля если их еще нет
      if (effectiveProfileContacts.length > 0) {
        // Находим контакты, которые уже есть из профиля (по значению и типу)
        const existingProfileContacts = currentContacts.filter(contact =>
          effectiveProfileContacts.some(profileContact =>
            profileContact.type === contact.type && profileContact.value === contact.value
          )
        );

        // Если контактов из профиля еще нет, добавляем их
        if (existingProfileContacts.length === 0) {
          const profileContactsToAdd = effectiveProfileContacts.map((contact, index) => ({
            ...contact,
            id: 0 as any || undefined, // Убираем ID, так как это новые контакты для объявления
            is_primary: index === 0 && currentContacts.length === 0, // Первый контакт основной только если нет других
            source: 'profile' // Помечаем как контакт из профиля
          }));

          onChange({
            ...data,
            contacts: [...profileContactsToAdd, ...currentContacts]
          });
        }
      }
    } else {
      // Чекбокс выключен - удаляем контакты из профиля, оставляем только дополнительные
      const additionalContacts = currentContacts.filter(contact =>
        !effectiveProfileContacts.some(profileContact =>
          profileContact.type === contact.type && profileContact.value === contact.value
        )
      );

      if (additionalContacts.length !== currentContacts.length) {
        onChange({
          ...data,
          contacts: additionalContacts
        });
      }
    }
  }, [data.use_profile_contacts, effectiveProfileContacts]); // Добавляем use_profile_contacts в зависимости

  // Получить иконку для типа контакта
  const getContactIcon = (type: string) => {
    switch (type) {
      case ContactTypeEnum.PHONE:
        return <Phone className="h-4 w-4 text-green-600" />;
      case ContactTypeEnum.EMAIL:
        return <Mail className="h-4 w-4 text-blue-600" />;
      case ContactTypeEnum.TELEGRAM:
      case ContactTypeEnum.VIBER:
      case ContactTypeEnum.WHATSAPP:
        return <MessageCircle className="h-4 w-4 text-purple-600" />;
      default:
        return <Building className="h-4 w-4 text-gray-600" />;
    }
  };

  // Получить метку для типа контакта
  const getContactTypeLabel = (type: string) => {
    switch (type) {
      case ContactTypeEnum.PHONE:
        return 'Телефон';
      case ContactTypeEnum.EMAIL:
        return 'Email';
      case ContactTypeEnum.TELEGRAM:
        return 'Telegram';
      case ContactTypeEnum.WHATSAPP:
        return 'WhatsApp';
      case ContactTypeEnum.VIBER:
        return 'Viber';
      default:
        return 'Контакт';
    }
  };

  // Получить название типа контакта
  const getContactTypeName = (type: string) => {
    switch (type) {
      case ContactTypeEnum.PHONE:
        return t('profile.contact.phone');
      case ContactTypeEnum.EMAIL:
        return t('profile.contact.email');
      case ContactTypeEnum.TELEGRAM:
        return t('profile.contact.telegram');
      case ContactTypeEnum.VIBER:
        return t('profile.contact.viber');
      case ContactTypeEnum.WHATSAPP:
        return t('profile.contact.whatsapp');
      default:
        return type;
    }
  };

  // Добавить новый контакт
  const handleAddContact = () => {
    if (!newContact.type || !newContact.value) {
      return;
    }

    const contactToAdd: AdContact = {
      type: newContact.type,
      value: newContact.value,
      is_visible: newContact.is_visible ?? true,
      is_primary: newContact.is_primary ?? false,
      note: newContact.note || ''
    };

    // Если это первый контакт или установлен как primary, сбрасываем primary у других
    let updatedContacts = [...data.contacts];
    if (contactToAdd.is_primary || updatedContacts.length === 0) {
      updatedContacts = updatedContacts.map(c => ({ ...c, is_primary: false }));
      contactToAdd.is_primary = true;
    }

    updatedContacts.push(contactToAdd);

    onChange({
      ...data,
      contacts: updatedContacts
    });

    // Сброс формы
    setNewContact({
      type: ContactTypeEnum.PHONE,
      value: '',
      is_visible: true,
      is_primary: false,
      note: ''
    });
    setShowAddForm(false);
  };

  // Удалить контакт
  const handleDeleteContact = (index: number) => {
    const updatedContacts = (data.contacts || []).filter((_, i) => i !== index);
    
    // Если удаляем primary контакт, делаем первый оставшийся primary
    const deletedContact = data.contacts[index];
    if (deletedContact.is_primary && updatedContacts.length > 0) {
      updatedContacts[0].is_primary = true;
    }

    onChange({
      ...data,
      contacts: updatedContacts
    });
  };

  // Редактировать контакт
  const handleEditContact = (index: number) => {
    setEditingContact({ ...data.contacts[index], id: index });
  };

  // Сохранить изменения контакта
  const handleSaveContact = () => {
    if (!editingContact || editingContact.id === undefined) return;

    const updatedContacts = [...data.contacts];
    const { id, ...contactData } = editingContact;
    
    // Если устанавливаем как primary, сбрасываем у других
    if (contactData.is_primary) {
      updatedContacts.forEach((c, i) => {
        if (i !== id) c.is_primary = false;
      });
    }
    
    updatedContacts[id] = contactData;

    onChange({
      ...data,
      contacts: updatedContacts
    });

    setEditingContact(null);
  };

  // Установить primary контакт
  const handleSetPrimary = (index: number) => {
    const updatedContacts = (data.contacts || []).map((contact, i) => ({
      ...contact,
      is_primary: i === index
    }));

    onChange({
      ...data,
      contacts: updatedContacts
    });
  };

  // Включить связь с профилем
  const handleSyncWithProfile = () => {
    onChange({
      ...data,
      use_profile_contacts: true,
      contacts: [],
      // Сохраняем названия регионов и городов
      region_name: data.region_name,
      city_name: data.city_name
    });
  };

  // Отключить связь с профилем
  const handleReset = () => {
    onChange({
      ...data,
      use_profile_contacts: false,
      contacts: [],
      contact_name: data.contact_name || '',
      additional_info: data.additional_info || '',
      // Сохраняем названия регионов и городов
      region_name: data.region_name,
      city_name: data.city_name
    });
  };



  return (
    <div className="space-y-6">
      <Alert>
        <Building className="h-4 w-4" />
        <AlertDescription>
          {data.use_profile_contacts === true
            ? t('contacts.linkedInfo', 'Contacts for this ad will be taken from your profile. Changes in the profile will be reflected automatically.')
            : t('contacts.manualInfo', 'Provide contact information for this ad. You can use profile contacts or add new ones.')
          }
        </AlertDescription>
      </Alert>

      {/* Чекбокс для связи с профилем */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="use_profile_contacts"
                checked={data.use_profile_contacts === true} // Показываем отмеченным только если явно true
                onChange={(e) => {
                  if (e.target.checked) {
                    handleSyncWithProfile();
                  } else {
                    handleReset();
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="use_profile_contacts"
                className="text-sm font-medium text-gray-900 cursor-pointer select-none"
              >
                {t('contacts.useProfileContacts', 'Use profile contacts')}
              </label>
              <p className="text-sm text-gray-500 mt-1">
                {t('contacts.syncNote', 'Contacts will be synchronized with your profile. Changes in the profile will be reflected in all ads.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Предварительный просмотр контактов профиля */}
      {data.use_profile_contacts === true && effectiveProfileContacts.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div>
              <strong>{t('contacts.linked', 'Linked to profile')}:</strong> {t('contacts.willBeUsed', 'The following contacts will be used:')}
              <div className="mt-2 space-y-1">
                {effectiveProfileContacts.map((contact, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {getContactIcon(contact.type)}
                    <span className="font-medium">{getContactTypeName(contact.type)}:</span>
                    <span>{contact.value}</span>
                    {contact.is_primary && (
                      <Badge variant="secondary" className="text-xs">{t('contacts.primary', 'Primary')}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Сообщение если нет контактов в профиле */}
      {data.use_profile_contacts === true && effectiveProfileContacts.length === 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{t('contacts.attention', 'Attention')}:</strong> {t('contacts.noProfileContacts', 'There are no contacts in your profile. Add contacts in profile or uncheck to add individual contacts.')}
          </AlertDescription>
        </Alert>
      )}



      {/* Основная контактная информация */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contacts.mainInfo', 'Main information')}</CardTitle>
          <CardDescription>
            {t('contacts.contactNameAndAdditionalInfo', 'Contact person name and additional information')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="contact-name">{t('contacts.contactPersonName', 'Contact person name')}</Label>
            <Input
              id="contact-name"
              value={data.contact_name || ''}
              onChange={(e) => onChange({ ...data, contact_name: e.target.value })}
              placeholder={t('contacts.enterContactPersonName', 'Enter contact person name')}
            />
          </div>
          <div>
            <Label htmlFor="additional-info">{t('contacts.additionalInfo', 'Additional information')}</Label>
            <Input
              id="additional-info"
              value={data.additional_info || ''}
              onChange={(e) => onChange({ ...data, additional_info: e.target.value })}
              placeholder={t('contacts.additionalInfoPlaceholder', 'Additional info about the contact')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Кнопка добавления контакта - доступна всегда */}
      {!showAddForm && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              {data.use_profile_contacts === true
                ? t('contacts.addAdditionalContact', 'Add additional contact')
                : t('contacts.addContact', 'Add contact')
              }
            </Button>
            {data.use_profile_contacts === true && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                {t('contacts.additionalContactNote', 'You can add additional contacts specific to this ad')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Форма добавления контакта - доступна всегда */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('contacts.addContactHeader', 'Add contact')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('contacts.contactType', 'Contact type')}</Label>
                <Select
                  value={newContact.type}
                  onValueChange={(value) => setNewContact({ ...newContact, type: value as ContactTypeEnum })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ContactTypeEnum.PHONE}>📞 {getContactTypeName(ContactTypeEnum.PHONE)}</SelectItem>
                    <SelectItem value={ContactTypeEnum.EMAIL}>📧 {getContactTypeName(ContactTypeEnum.EMAIL)}</SelectItem>
                    <SelectItem value={ContactTypeEnum.TELEGRAM}>📲 {getContactTypeName(ContactTypeEnum.TELEGRAM)}</SelectItem>
                    <SelectItem value={ContactTypeEnum.VIBER}>📡 {getContactTypeName(ContactTypeEnum.VIBER)}</SelectItem>
                    <SelectItem value={ContactTypeEnum.WHATSAPP}>💬 {getContactTypeName(ContactTypeEnum.WHATSAPP)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('contacts.value', 'Value')}</Label>
                <Input
                  value={newContact.value}
                  onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
                  placeholder={t('contacts.enterContactData', 'Enter contact details')}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-visible"
                  checked={newContact.is_visible}
                  onCheckedChange={(checked) => setNewContact({ ...newContact, is_visible: !!checked })}
                />
                <Label htmlFor="is-visible">{t('contacts.showInAd', 'Show in ad')}</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-primary"
                  checked={newContact.is_primary}
                  onCheckedChange={(checked) => setNewContact({ ...newContact, is_primary: !!checked })}
                />
                <Label htmlFor="is-primary">{t('contacts.primaryContact', 'Primary contact')}</Label>
              </div>
            </div>

            <div>
              <Label>{t('contacts.noteOptional', 'Note (optional)')}</Label>
              <Input
                value={newContact.note}
                onChange={(e) => setNewContact({ ...newContact, note: e.target.value })}
                placeholder={t('contacts.notePlaceholder', 'Note about the contact')}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddContact} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {t('contacts.add', 'Add')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список контактов - показываем всегда когда есть контакты */}
      {data.contacts && data.contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {data.use_profile_contacts === true
                ? t('contacts.profileContactsHeader', 'Profile contacts')
                : t('contacts.adContactsHeader', 'Ad contacts')
              }
            </CardTitle>
            <CardDescription>
              {data.use_profile_contacts === true
                ? t('contacts.profileContactsDesc', 'Contacts from your profile. You can add additional contacts below.')
                : t('contacts.manageAdContacts', 'Manage contacts for this ad')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.contacts || []).map((contact, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getContactIcon(contact.type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getContactTypeName(contact.type)}
                        </Badge>
                        <span className="font-medium">{contact.value}</span>
                        {contact.is_primary && (
                            <Badge variant="default" className="text-xs">
                            {t('contacts.primary', 'Primary')}
                          </Badge>
                        )}
                        {!contact.is_visible && (
                          <Badge variant="secondary" className="text-xs">
                            {t('contacts.hidden', 'Hidden')}
                          </Badge>
                        )}
                      </div>
                      {contact.note && (
                        <p className="text-sm text-gray-500 mt-1">{contact.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!contact.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(index)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {t('contacts.makePrimary', 'Make primary')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditContact(index)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit', 'Edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteContact(index)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('common.delete', 'Delete')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Форма редактирования контакта */}
      {editingContact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              {t('contacts.editContact', 'Edit contact')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('contacts.contactType', 'Contact type')}</Label>
                <Select
                  value={editingContact.type}
                  onValueChange={(value) => setEditingContact({
                    ...editingContact,
                    type: value as ContactTypeEnum
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ContactTypeEnum.PHONE}>📞 {getContactTypeName(ContactTypeEnum.PHONE)}</SelectItem>
                    <SelectItem value={ContactTypeEnum.EMAIL}>📧 {getContactTypeName(ContactTypeEnum.EMAIL)}</SelectItem>
                    <SelectItem value={ContactTypeEnum.TELEGRAM}>📲 {getContactTypeName(ContactTypeEnum.TELEGRAM)}</SelectItem>
                    <SelectItem value={ContactTypeEnum.VIBER}>📡 {getContactTypeName(ContactTypeEnum.VIBER)}</SelectItem>
                    <SelectItem value={ContactTypeEnum.WHATSAPP}>💬 {getContactTypeName(ContactTypeEnum.WHATSAPP)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('contacts.value', 'Value')}</Label>
                <Input
                  value={editingContact.value}
                  onChange={(e) => setEditingContact({
                    ...editingContact,
                    value: e.target.value
                  })}
                  placeholder={t('contacts.enterContactData', 'Enter contact details')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-is-visible"
                  checked={editingContact.is_visible}
                  onCheckedChange={(checked) => setEditingContact({
                    ...editingContact,
                    is_visible: !!checked
                  })}
                />
                <Label htmlFor="edit-is-visible">{t('contacts.showInAd', 'Show in ad')}</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-is-primary"
                  checked={editingContact.is_primary}
                  onCheckedChange={(checked) => setEditingContact({
                    ...editingContact,
                    is_primary: !!checked
                  })}
                />
                <Label htmlFor="edit-is-primary">{t('contacts.primaryContact', 'Primary contact')}</Label>
              </div>
            </div>

            <div>
              <Label>{t('contacts.noteOptional', 'Note (optional)')}</Label>
              <Input
                value={editingContact.note || ''}
                onChange={(e) => setEditingContact({
                  ...editingContact,
                  note: e.target.value
                })}
                placeholder={t('contacts.notePlaceholder', 'Note about the contact')}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveContact} className="flex-1">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('common.save', 'Save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingContact(null)}
                className="flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Показать ошибки если есть */}
      {errors && errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Информационное сообщение если нет контактов */}
      {(!data.contacts || data.contacts.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">
              {t('contacts.noContacts', 'No contacts added')}
            </p>
            <p className="text-sm text-gray-400">
              {t('contacts.addAtLeastOne', 'Add at least one contact so buyers can reach you')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdContactsForm;
