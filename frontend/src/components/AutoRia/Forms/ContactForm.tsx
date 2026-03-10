"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import {
  Plus,
  Trash2,
  Phone,
  Mail,
  MessageCircle,
  Globe2,
  Camera,
  Eye,
  EyeOff,
  Save,
  CheckCircle
} from 'lucide-react';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';

// 🎨 Функция для получения типов контактов с переводами
const getContactTypes = (t: any) => [
  { value: 'phone', label: `📞 ${t('phone')}`, icon: Phone, placeholder: '+380XXXXXXXXX', required: true },
  { value: 'email', label: `📧 ${t('email')}`, icon: Mail, placeholder: 'example@email.com', required: false },
  { value: 'telegram', label: `📲 ${t('telegram')}`, icon: MessageCircle, placeholder: '@username', required: false },
  { value: 'whatsapp', label: `💬 ${t('whatsapp')}`, icon: MessageCircle, placeholder: '+380XXXXXXXXX', required: false },
  { value: 'viber', label: `📡 ${t('viber')}`, icon: MessageCircle, placeholder: '+380XXXXXXXXX', required: false },
  { value: 'instagram', label: `📸 ${t('instagram')}`, icon: Camera, placeholder: '@username', required: false },
  { value: 'website', label: `🌐 ${t('website')}`, icon: Globe2, placeholder: 'https://example.com', required: false }
];

// 📞 Интерфейс для контакта согласно AddsAccountContact модели
interface Contact {
  type: string;
  value: string;
  is_visible: boolean;
  note: string;
}

interface ContactFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
}

const ContactForm: React.FC<ContactFormProps> = ({ data, onChange, errors }) => {
  const { t } = useI18n();
  const { toast } = useToast();

  // Получаем типы контактов с переводами
  const CONTACT_TYPES = getContactTypes(t);

  // 📋 Состояние для динамического списка контактов
  const [contacts, setContacts] = useState<any[]>(() => {
    // Инициализируем с обязательным телефоном
    return data.contacts || [
      { type: 'phone', value: '', is_visible: true, note: '' }
    ];
  });

  // 🔄 Синхронизация с внешними данными
  useEffect(() => {
    if (data.contacts && Array.isArray(data.contacts) && data.contacts.length > 0) {
      console.log('[ContactForm] 🔄 Syncing with external data:', data.contacts);
      setContacts(data.contacts);
    }
  }, [data.contacts]);

  // Убираем additionalInfo из ContactForm

  // ➕ Добавить новый контакт
  const addContact = () => {
    const newContact: Contact = {
      type: 'email',
      value: '',
      is_visible: true,
      note: ''
    };
    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    updateFormData(updatedContacts);
  };

  // 🗑️ Удалить контакт
  const removeContact = (index: number) => {
    // Нельзя удалить последний контакт, если это телефон
    if (contacts.length === 1 && contacts[0].type === 'phone') {
      return;
    }
    
    const updatedContacts = contacts.filter((_, i) => i !== index);
    setContacts(updatedContacts);
    updateFormData(updatedContacts);
  };

  // 📝 Обновить контакт
  const updateContact = (index: number, field: keyof Contact, value: string | boolean) => {
    console.log('[ContactForm] 📝 Updating contact:', { index, field, value });
    const updatedContacts = contacts.map((contact, i) =>
      i === index ? { ...contact, [field]: value } : contact
    );
    setContacts(updatedContacts);
    updateFormData(updatedContacts);
  };

  // 🔄 Обновить данные формы
  const updateFormData = (updatedContacts: Contact[]) => {
    console.log('[ContactForm] 🔄 Updating form data:', { contacts: updatedContacts });
    onChange({
      contacts: updatedContacts
    });
  };

  // 🎯 Получить информацию о типе контакта
  const getContactTypeInfo = (type: string) => {
    const found = CONTACT_TYPES.find(t => t.value === type);
    return found || CONTACT_TYPES[0] || { value: 'phone', label: '📞 Phone', icon: Phone, placeholder: '+380XXXXXXXXX', required: true };
  };

  // 💾 Обработчик сохранения контактов
  const handleSave = () => {
    console.log('[ContactForm] 💾 Saving contacts:', contacts);

    // Валидация: проверяем, что есть хотя бы один заполненный контакт
    const validContacts = contacts.filter(contact => contact.value.trim() !== '');

    if (validContacts.length === 0) {
      console.error('[ContactForm] ❌ No valid contacts found');
      return;
    }

    // Обновляем данные формы
    updateFormData(validContacts);

    console.log('[ContactForm] ✅ Contacts saved successfully');

    // Показываем уведомление об успешном сохранении
    toast({
      title: "✅ " + t('contactsSaved'),
      description: `${validContacts.length} ${t('contactsSavedDescription')}`,
      duration: 3000,
    });
  };

  // 📤 Обработчик перехода к следующему шагу
  const handleNext = () => {
    console.log('[ContactForm] 📤 Moving to next step with contacts:', contacts);
    handleSave(); // Сначала сохраняем
  };

  return (
    <div className="space-y-8 p-4">
      {/* 📋 Заголовок секции */}
      <div className="space-y-2 mb-8">
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          📞 {t('autoria.contactTitle')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('autoria.contactDesc')}
        </p>
      </div>

      {/* ❌ Отображение ошибок */}
      {errors && errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
            ⚠️ {t('autoria.fixErrors', 'Fix the following errors:')}
          </h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 📞 Динамический список контактов */}
      <div className="space-y-4">
        {contacts.map((contact, index) => {
          const typeInfo = getContactTypeInfo(contact.type);
          const isRequired = typeInfo.required && index === 0; // Первый телефон обязателен
          
          return (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {typeInfo.label}
                    {isRequired && <Badge variant="destructive" className="text-xs">{t('required')}</Badge>}
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    {/* 👁️ Переключатель видимости */}
                    <div className="flex items-center gap-2">
                      {contact.is_visible ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                      <Switch
                        checked={contact.is_visible}
                        onCheckedChange={(checked) => updateContact(index, 'is_visible', checked)}
                      />
                    </div>
                    
                    {/* 🗑️ Кнопка удаления */}
                    {!isRequired && (
                      <Button
                        onClick={() => removeContact(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* 🎯 Тип контакта */}
                <div className="space-y-2">
                  <Label htmlFor={`contact-type-${index}`}>{t('contactType')}</Label>
                  <Select
                    value={contact.type}
                    onValueChange={(value) => updateContact(index, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 📝 Значение контакта */}
                <div className="space-y-2">
                  <Label htmlFor={`contact-value-${index}`}>
                    {t('contactValue')} {isRequired && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id={`contact-value-${index}`}
                    type={contact.type === 'email' ? 'email' : contact.type === 'phone' ? 'tel' : 'text'}
                    placeholder={typeInfo.placeholder}
                    value={contact.value}
                    onChange={(e) => updateContact(index, 'value', e.target.value)}
                    required={isRequired}
                  />
                </div>

                {/* 📝 Заметка */}
                <div className="space-y-2">
                  <Label htmlFor={`contact-note-${index}`}>{t('optionalNote')}</Label>
                  <Input
                    id={`contact-note-${index}`}
                    placeholder={t('contactNotePlaceholder')}
                    value={contact.note}
                    onChange={(e) => updateContact(index, 'note', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ➕ Кнопка добавления контакта */}
      <Button
        onClick={addContact}
        variant="outline"
        className="w-full border-dashed border-2 hover:border-solid"
      >
        <Plus className="h-4 w-4 mr-2" />
        ➕ {t('addContact')}
      </Button>

      {/* Убираем поле "Дополнительная информация" из контактов */}

      {/* 💾 Кнопки действий */}
      <div className="flex gap-3">
        <Button onClick={handleSave} className="flex-1" variant="default">
          <Save className="h-4 w-4 mr-2" />
          {t('saveContacts')}
        </Button>
        <Button onClick={handleNext} className="flex-1" variant="outline">
          <CheckCircle className="h-4 w-4 mr-2" />
          {t('next')}
        </Button>
      </div>

      {/* 💡 Информационное сообщение */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              💡 {t('tip')}
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                {t('contactTip')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
