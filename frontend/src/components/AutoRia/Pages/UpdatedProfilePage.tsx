"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  Crown,
  Settings,
  MapPin,
  Upload,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Building,
  Shield,
  Sparkles
} from 'lucide-react';
import { useUserProfileData } from '@/modules/autoria/shared/hooks/useUserProfileData';
import {
  ProfileUpdateData,
  AccountUpdateData,
  RawAddressUpdateData,
  ContactUpdateData,
  AccountTypeEnum,
  ModerationLevelEnum,
  RoleEnum,
  ContactTypeEnum
} from '@/shared/types/backend-user';
import { useI18n } from '@/contexts/I18nContext';
import { useAuthErrorHandler } from '@/modules/autoria/shared/hooks/useAuthErrorHandler';
import AddressCard from '@/components/AutoRia/AddressCard/AddressCard';
import { useVirtualReferenceData } from '@/modules/autoria/shared/hooks/useVirtualReferenceData';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { VirtualSelect } from '@/components/ui/virtual-select';
import { useCascadingProfile } from '@/modules/autoria/shared/hooks/useCascadingProfile';
import { resolveMediaUrl } from '@/shared/utils/media-url';

const UpdatedProfilePage = () => {
  const { t } = useI18n();
  const { handleAuthError } = useAuthErrorHandler();
  const { toast } = useToast();

  const {
    data,
    loading,
    error,
    updating,
    loadUserData,
    updateProfile,
    updateAccount,
    uploadAvatar,
    createAddress,
    updateAddress,
    deleteAddress,
    createContact,
    updateContact,
    deleteContact,
    updateAvatarUrl,
    mutate,
    hasProfile,
    hasAccount,
    addressCount,
    contactCount
  } = useUserProfileData();

  // Каскадная загрузка данных по табам
  const cascadingProfile = useCascadingProfile();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'addresses' | 'contacts'>('profile');

  // Обработчик переключения табов с каскадной загрузкой
  const handleTabChange = async (tabValue: string) => {
    const tabName = tabValue as 'profile' | 'account' | 'addresses' | 'contacts';
    setActiveTab(tabName as any);

    // Каскадная загрузка данных для выбранного таба
    const tabMapping = {
      'profile': 'personal-info' as const,
      'account': 'account-settings' as const,
      'addresses': 'addresses' as const,
      'contacts': 'contacts' as const
    };

    const cascadingTabName = tabMapping[tabName];
    if (cascadingTabName) {
      console.log(`[UpdatedProfilePage] 🔄 Loading data for tab: ${cascadingTabName}`);
      await cascadingProfile.loadTabData(cascadingTabName as any);
    }
  };

  // Загрузка данных при первом рендере
  useEffect(() => {
    const loadInitialData = async () => {
      await handleTabChange(activeTab);
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Локальное состояние для форм
  const [profileForm, setProfileForm] = useState({
    name: '',
    surname: '',
    age: null as number | null
  });

  const [accountForm, setAccountForm] = useState({
    account_type: 'basic',
    moderation_level: 'auto',
    role: 'seller',
    organization_name: '',
    stats_enabled: false
  });

  // Состояние для единственного адреса (изменено с множественных на один)
  const [addressForm, setAddressForm] = useState({
    region: '', // ID региона для селектора
    city: '',   // ID города для селектора
    input_region: '', // Текстовое название региона
    input_locality: '' // Текстовое название города
  });

  // Состояния для контактов
  const [editingContact, setEditingContact] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    contact_type: 'phone' as ContactTypeEnum,
    contact_value: '',
    is_primary: false,
    is_visible: true
  });

  // Хуки для работы с селекторами регионов и городов
  const { fetchRegions, fetchCities } = useVirtualReferenceData();

  // Убираем статическое состояние - VirtualSelect будет загружать данные динамически

  // Состояние для генерации аватара
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState({
    style: 'realistic',
    gender: 'neutral',
    customRequirements: ''
  });



  const [editingAddress, setEditingAddress] = useState(false); // Изменено на boolean
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Мемоизация списка контактов для избежания лишних перерендеров
  const memoizedContacts = useMemo(() => {
    if (!data?.contacts) return [];
    return data.contacts;
  }, [data?.contacts]);

  // Мемоизация списка адресов
  const memoizedAddresses = useMemo(() => {
    if (!data?.addresses) return [];
    return data.addresses;
  }, [data?.addresses]);

  // Обновляем формы при загрузке данных
  useEffect(() => {
    if (data?.user.profile) {
      setProfileForm({
        name: data.user.profile.name || '',
        surname: data.user.profile.surname || '',
        age: data.user.profile.age
      });
    }
    
    if (data?.account) {
      setAccountForm({
        account_type: data.account.account_type || 'basic',
        moderation_level: data.account.moderation_level || 'auto',
        role: data.account.role || 'seller',
        organization_name: data.account.organization_name || '',
        stats_enabled: data.account.stats_enabled || false
      });
    }

    // Инициализация адреса (берем первый адрес, если есть)
    if (data?.addresses && data.addresses.length > 0) {
      const firstAddress = data.addresses[0];
      setAddressForm({
        region: '', // Будет заполнено при загрузке селектора
        city: '',   // Будет заполнено при загрузке селектора
        input_region: firstAddress.input_region || '',
        input_locality: firstAddress.input_locality || ''
      });
    }
  }, [data]);

  // VirtualSelect будет загружать данные динамически при каждом открытии
  // console.debug('[Profile] Using dynamic data loading with VirtualSelect');

  // Отладочная информация для данных пользователя
  // console.debug('[Profile] User data:', data?.user);
  // console.debug('[Profile] User email:', data?.user?.email);

  // Handle authentication errors automatically (перемещено сюда из конца файла)
  useEffect(() => {
    if (error && (error.includes('Authentication required') || error.includes('401'))) {
      console.log('[ProfilePage] Authentication error detected, handling...');
      handleAuthError(new Error(error));
    }
  }, [error, handleAuthError]);

  // VirtualSelect управляет данными динамически
  // console.debug('[Profile] Address form state:', addressForm);

  // Валидация профиля
  const validateProfileForm = () => {
    const errors: string[] = [];

    if (!profileForm.name.trim()) {
      errors.push(t('profile.form.firstName'));
    }

    if (!profileForm.surname.trim()) {
      errors.push(t('profile.form.lastName'));
    }

    if (!profileForm.age || profileForm.age < 18 || profileForm.age > 100) {
      errors.push(t('profile.form.age') + ' (18-100)');
    }

    return errors;
  };

  // Обработчики для профиля
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // console.debug('🚀 [ProfilePage] handleProfileSubmit called');
    // console.debug('📝 [ProfilePage] Profile form data:', profileForm);
    // console.debug('🖼️ [ProfilePage] Current avatar in state:', data?.user.profile?.avatar);

    // Валидация
    const validationErrors = validateProfileForm();
    if (validationErrors.length > 0) {
      toast({
        title: t('common.validation.error'),
        description: (t('common.validation.requiredFields') || 'Заполните обязательные поля') + ': ' + validationErrors.join(', '),
        variant: "destructive",
      });
      return;
    }

    const profileData: ProfileUpdateData = {
      name: profileForm.name,
      surname: profileForm.surname,
      age: profileForm.age
    };

    // Include avatar_url if it exists
    const currentAvatar = data?.user.profile?.avatar;
    if (currentAvatar) {
      profileData.avatar_url = currentAvatar;
      // console.debug('🖼️ [ProfilePage] Including avatar_url in profile data:', currentAvatar);
    } else {
      console.log('⚠️ [ProfilePage] No avatar found to include in profile data');
    }

    try {
      // console.debug('🔄 [ProfilePage] Calling updateProfile with data:', profileData);
      await updateProfile(profileData);
      // console.debug('✅ [ProfilePage] Profile update completed successfully');
      // console.debug('🖼️ [ProfilePage] Avatar after update:', data?.user.profile?.avatar);
      toast({
        title: t('common.success'),
        description: t('profile.form.updateSuccess'),
      });
    } catch (error) {
      console.error('❌ [ProfilePage] Failed to update profile:', error);
      toast({
        title: t('common.error'),
        description: t('profile.form.updateError'),
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await uploadAvatar(file);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    }
  };

  // Валидация аккаунта
  const validateAccountForm = () => {
    const errors: string[] = [];

    if (!accountForm.account_type) {
      errors.push(t('profile.account.type'));
    }

    if (!accountForm.moderation_level) {
      errors.push(t('profile.account.moderationLevel'));
    }

    if (!accountForm.role) {
      errors.push(t('profile.account.role'));
    }

    return errors;
  };

  // Обработчики для аккаунта
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    const validationErrors = validateAccountForm();
    if (validationErrors.length > 0) {
      toast({
        title: t('common.validation.error'),
        description: t('common.validation.requiredFields') + ': ' + validationErrors.join(', '),
        variant: "destructive",
      });
      return;
    }

    const accountData: AccountUpdateData = {
      account_type: accountForm.account_type as any,
      moderation_level: accountForm.moderation_level as any,
      role: accountForm.role as any,
      organization_name: accountForm.organization_name,
      stats_enabled: accountForm.stats_enabled
    };

    try {
      await updateAccount(accountData);
      toast({
        title: t('common.success'),
        description: t('profile.account.updateSuccess'),
      });
    } catch (error) {
      console.error('Failed to update account:', error);
      toast({
        title: t('common.error'),
        description: t('profile.account.updateError'),
        variant: "destructive",
      });
    }
  };

  // Валидация адреса
  const validateAddressForm = () => {
    const errors: string[] = [];

    if (!addressForm.input_region.trim()) {
      errors.push(t('profile.address.region'));
    }

    if (!addressForm.input_locality.trim()) {
      errors.push(t('profile.address.locality'));
    }

    return errors;
  };

  // Обработчики для единственного адреса
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    const validationErrors = validateAddressForm();
    if (validationErrors.length > 0) {
      toast({
        title: t('common.validation.error'),
        description: t('common.validation.requiredFields') + ': ' + validationErrors.join(', '),
        variant: "destructive",
      });
      return;
    }

    const addressData: RawAddressUpdateData = {
      input_region: addressForm.input_region,
      input_locality: addressForm.input_locality
    };

    try {
      // Если есть адрес - обновляем, если нет - создаем
      if (data?.addresses && data.addresses.length > 0) {
        await updateAddress(data.addresses[0].id, addressData);
      } else {
        await createAddress(addressData);
      }

      setEditingAddress(false);
      toast({
        title: t('common.success'),
        description: t('profile.address.updateSuccess'),
      });
    } catch (error) {
      console.error('Failed to save address:', error);
    }
  };

  const handleEditAddress = () => {
    setEditingAddress(true);
  };

  const handleCancelEdit = () => {
    // Восстанавливаем данные из существующего адреса
    if (data?.addresses && data.addresses.length > 0) {
      const address = data.addresses[0];
      setAddressForm({
        region: '',
        city: '',
        input_region: address.input_region || '',
        input_locality: address.input_locality || ''
      });
    }
    setEditingAddress(false);
  };

  const handleDeleteAddress = async () => {
    if (data?.addresses && data.addresses.length > 0) {
      const { alertHelpers } = await import('@/components/ui/alert-dialog-helper');
      const confirmed = await alertHelpers.confirmDelete(t('profile.address.thisAddress') || 'цю адресу');
      if (confirmed) {
        try {
          await deleteAddress(data.addresses[0].id);
          setAddressForm({
            region: '',
            city: '',
            input_region: '',
            input_locality: ''
          });
        } catch (error) {
          console.error('Failed to delete address:', error);
        }
      }
    }
  };

  // Обработчики для селекторов (упрощенные - VirtualSelect сам загружает данные)
  const handleRegionChange = async (regionId: string, regionLabel?: string) => {
    // console.debug('[Profile] Region changed:', regionId, regionLabel);

    setAddressForm(prev => ({
      ...prev,
      region: regionId,
      city: '', // Сбрасываем город при смене региона
      input_region: regionLabel || '', // Сохраняем текстовое название
      input_locality: '' // Сбрасываем текстовое название города
    }));
  };

  const handleCityChange = async (cityId: string, cityLabel?: string) => {
    // console.debug('[Profile] City changed:', cityId, cityLabel);

    setAddressForm(prev => ({
      ...prev,
      city: cityId,
      input_locality: cityLabel || '' // Сохраняем текстовое название
    }));
  };

  // Функции для работы с контактами
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ ВАЛИДАЦИЯ: Проверяем обязательные поля
    if (!contactForm.contact_value.trim()) {
      toast({
        title: t('common.error'),
        description: t('profile.contact.enterValue', 'Введите значение контакта'),
        variant: "destructive"
      });
      return;
    }

    // ✅ ВАЛИДАЦИЯ: Проверяем формат контакта

    // console.debug('[ProfilePage] 📤 Submitting contact:', contactForm);
    // console.debug('[ProfilePage] 🔍 Current user data:', data);
    // console.debug('[ProfilePage] 🔍 Has account:', hasAccount);

    // ✅ ПРОВЕРКА: Логируем информацию об аккаунте
    // console.debug('[ProfilePage] 🏢 Account info:', { hasAccount, accountId: data?.account?.id, accountType: data?.account?.account_type });

    try {
      let result;
      if (editingContact) {
        // console.debug('[ProfilePage] ✏️ Updating contact:', editingContact);
        result = await updateContact(editingContact, contactForm);
      } else {
        // console.debug('[ProfilePage] ➕ Creating new contact');
        result = await createContact(contactForm);
      }

      // console.debug('[ProfilePage] 📋 Operation result:', result);

      // Сброс формы
      setContactForm({
        contact_type: ContactTypeEnum.PHONE,
        contact_value: '',
        is_primary: false,
        is_visible: true
      });
      setEditingContact(null);

      // ✅ ОБНОВЛЯЕМ ДАННЫЕ: Перезагружаем данные профиля
      await loadUserData();

      toast({
        title: t('common.success'),
        description: editingContact ? t('profile.contact.updated', 'Контакт обновлен') : t('profile.contact.added', 'Контакт добавлен'),
        variant: "default"
      });

      // console.debug('[ProfilePage] ✅ Contact saved successfully');
    } catch (error) {
      console.error('[ProfilePage] ❌ Failed to save contact:', error);

      let errorMessage = t('profile.contact.saveError', 'Не удалось сохранить контакт');

      if (error instanceof Error) {
        if ((error as any).message.includes('account not found')) {
          errorMessage = t('profile.contact.needAccount', 'Сначала заполните данные аккаунта');
        } else if ((error as any).message.includes('required')) {
          errorMessage = t('common.validation.requiredFields', 'Заполните все обязательные поля');
        } else {
          errorMessage = (error as any).message;
        }
      }

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleEditContact = (contact: any) => {
    setEditingContact(contact.id);
    setContactForm({
      contact_type: contact.contact_type || ContactTypeEnum.PHONE,
      contact_value: contact.contact_value || '',
      is_primary: contact.is_primary || false,
      is_visible: contact.is_visible !== false
    });
  };

  const handleCancelContactEdit = () => {
    setEditingContact(null);
    setContactForm({
      contact_type: ContactTypeEnum.PHONE,
      contact_value: '',
      is_primary: false,
      is_visible: true
    });
  };

  // Функция генерации аватара
  const handleGenerateAvatar = async () => {
    setIsGeneratingAvatar(true);
    // console.debug('🚀 Starting avatar generation...', avatarOptions);

    try {
      // console.debug('📡 Sending authenticated avatar generation request...');

      // Получаем данные профиля для передачи в запрос
      const profileData = data?.user?.profile ? {
        first_name: data.user.profile.name || 'Person',
        last_name: data.user.profile.surname || '',
        age: data.user.profile.age || 25,
        gender: (data.user.profile as any).gender || 'neutral'
      } : {
        first_name: 'Person',
        last_name: '',
        age: 25,
        gender: 'neutral'
      };

      // console.debug('📝 Profile data for generation:', profileData);

      // Используем аутентифицированный endpoint через наш API
      const response = await fetch('/api/user/profile/generate-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...profileData,
          style: avatarOptions.style,
          gender: (avatarOptions as any).gender,
          custom_requirements: avatarOptions.customRequirements
        })
      });

      // console.debug('📡 Avatar generation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Avatar generation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      // console.debug('✅ Avatar generation result:', result);

      if (result.success) {
        // console.debug('🎉 Avatar generated successfully! URL:', result.avatar_url);

        // Save avatar to profile through backend download endpoint
        try {
          // console.debug('💾 Downloading and saving avatar to profile...');

          const saveResponse = await fetch('/api/user/profile/save-avatar', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              avatar_url: result.avatar_url
            })
          });

          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            // console.debug('✅ Avatar downloaded and saved to profile successfully');

            // Update local state with the saved URL (backend returns avatar in profile.profile.avatar or profile.avatar)
            const localAvatarUrl = saveResult.profile?.profile?.avatar || saveResult.profile?.avatar || result.avatar_url;
            updateAvatarUrl(localAvatarUrl);
            // console.debug('📝 Updated avatar via updateAvatarUrl()');

            // Refresh profile data
            await mutate();
            // console.debug('🔄 Profile data refreshed');

            toast({ title: '✅ ' + t('common.success'), description: t('profile.avatar.success') });
          } else {
            const saveError = await saveResponse.json();
            console.error('❌ Failed to save avatar to profile:', saveError);

            // Still update local state with original URL
            updateAvatarUrl(result.avatar_url);

            toast({ title: '✅ ' + t('common.success'), description: `${t('profile.avatar.success')} (${t('profile.avatar.saveWarning')})` });
          }
        } catch (saveError) {
          console.error('❌ Error saving avatar to profile:', saveError);

          // Still update local state with original URL
          updateAvatarUrl(result.avatar_url);

          toast({ title: '✅ ' + t('common.success'), description: `${t('profile.avatar.success')} (${t('profile.avatar.saveWarning')})` });
        }
      } else {
        toast({ title: '❌ ' + t('common.error'), description: `${t('profile.avatar.failed')}: ${result.error}`, variant: 'destructive' });
      }
    } catch (error) {
      console.error('❌ Error generating avatar:', error);
      const errorMessage = error instanceof Error ? (error as any).message : 'Unknown error occurred';
      toast({ title: '❌ ' + t('common.error'), description: `${t('profile.avatar.failed')}: ${errorMessage}`, variant: 'destructive' });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }



  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading profile: {error}
          </AlertDescription>
        </Alert>

        {error.includes('Authentication required') && (
          <div className="mt-4">
            <Alert>
              <AlertDescription>
                Please log in to access your profile.
                <a href="/api/auth/signin" className="ml-2 underline text-blue-600">
                  Go to Login
                </a>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-7xl mx-auto flex flex-col space-y-6">
      {/* Header Section - Always on top */}
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
            <p className="text-sm text-gray-600">
              {t('profile.personalInfo')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={hasAccount ? "default" : "secondary"} className="text-xs">
              {hasAccount ? "Account Active" : "No Account"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {addressCount} Address{addressCount !== 1 ? 'es' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs and Content Section - Everything else below */}
      <div className="bg-white rounded-lg border shadow-sm">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-50 rounded-t-lg border-b">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('profile.personalInfo')}
              {cascadingProfile.getPersonalInfo().loading && (
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              )}
              {cascadingProfile.getPersonalInfo().data && (
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">✓</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              {t('profile.accountSettings')}
              {cascadingProfile.getAccountSettings().loading && (
                <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
              )}
              {cascadingProfile.getAccountSettings().data && (
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">✓</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('profile.addresses')}
              {cascadingProfile.getAddresses().loading && (
                <Loader2 className="h-3 w-3 animate-spin text-green-500" />
              )}
              {cascadingProfile.getAddresses().data && (
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                  {cascadingProfile.getAddresses().data?.addresses.length || 0}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              {t('profile.contacts')}
              {contactCount > 0 && (
                <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs">
                  {contactCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="p-6 overflow-auto max-h-screen">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5" />
                <h3 className="text-lg font-semibold">{t('profile.personalInfo')}</h3>
                {cascadingProfile.getPersonalInfo().loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
              </div>

              {/* Cascading Data Display */}
              {cascadingProfile.getPersonalInfo().data && (
                <Alert className="border-blue-200 bg-blue-50 mb-4">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Profile Completion:</span>
                        <div className="text-lg font-bold">
                          {cascadingProfile.getPersonalInfo().data?.stats.profile_completion}%
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Addresses:</span>
                        <div className="text-lg font-bold">
                          {cascadingProfile.getPersonalInfo().data?.stats.addresses_count}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Account Age:</span>
                        <div className="text-lg font-bold">
                          {cascadingProfile.getPersonalInfo().data?.stats.account_age_days} days
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Language:</span>
                        <div className="text-lg font-bold">
                          {cascadingProfile.getPersonalInfo().data?.settings.language.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {loading ? (
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (() => {
                    const rawAvatarUrl = data?.user.profile?.avatar;
                    const avatarUrl = rawAvatarUrl ? resolveMediaUrl(rawAvatarUrl) : null;

                    return avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    );
                  })()}
                </div>
                
                <div>
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={updating}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t('profile.avatar.upload')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAvatarOptions(true)}
                      disabled={updating || isGeneratingAvatar}
                    >
                      {isGeneratingAvatar ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {isGeneratingAvatar ? t('profile.avatar.generating') : t('profile.avatar.generate')}
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t('profile.avatar.fileInfo')}
                  </p>
                </div>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t('profile.form.firstName')}</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('profile.form.firstNamePlaceholder')}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="surname">{t('profile.form.lastName')}</Label>
                    <Input
                      id="surname"
                      value={profileForm.surname}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, surname: e.target.value }))}
                      placeholder={t('profile.form.lastNamePlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="age">{t('profile.form.age')}</Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    max="100"
                    value={profileForm.age || ''}
                    onChange={(e) => setProfileForm(prev => ({
                      ...prev,
                      age: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    placeholder={t('profile.form.agePlaceholder')}
                  />
                </div>

                <div>
                  <Label>{t('profile.form.email')}</Label>
                  <Input
                    value={data?.user.email || (loading ? 'Загрузка...' : 'Email не найден')}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('profile.form.emailNote')}
                  </p>
                </div>

                <Button type="submit" disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('profile.form.saving')}
                    </>
                  ) : (
                    t('profile.form.save')
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="p-6 overflow-auto max-h-screen">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-5 w-5" />
                <h3 className="text-lg font-semibold">{t('profile.accountSettings')}</h3>
              </div>
              {!(data?.user?.is_staff || data?.user?.is_superuser) && (
                <Alert className="mb-4">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    {t('profile.account.adminOnlyFields')}
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account_type">{t('profile.account.type')}</Label>
                    {data?.user?.is_staff || data?.user?.is_superuser ? (
                      <Select
                        value={accountForm.account_type}
                        onValueChange={(value) => setAccountForm(prev => ({ ...prev, account_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('profile.account.selectAccountType')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">{t('profile.accountTypes.basic')}</SelectItem>
                          <SelectItem value="premium">{t('profile.accountTypes.premium')}</SelectItem>
                          <SelectItem value="business">{t('profile.accountTypes.business')}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                        {accountForm.account_type === 'basic' && t('profile.accountTypes.basic')}
                        {accountForm.account_type === 'premium' && t('profile.accountTypes.premium')}
                        {accountForm.account_type === 'business' && t('profile.accountTypes.business')}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="role">{t('profile.account.role')}</Label>
                    {data?.user?.is_staff || data?.user?.is_superuser ? (
                      <Select
                        value={accountForm.role}
                        onValueChange={(value) => setAccountForm(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('profile.account.selectRole')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seller">{t('profile.roles.seller')}</SelectItem>
                          <SelectItem value="buyer">{t('profile.roles.buyer')}</SelectItem>
                          <SelectItem value="dealer">{t('profile.roles.dealer')}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                        {accountForm.role === 'seller' && t('profile.roles.seller')}
                        {accountForm.role === 'buyer' && t('profile.roles.buyer')}
                        {accountForm.role === 'dealer' && t('profile.roles.dealer')}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="organization_name">{t('profile.account.organizationName')}</Label>
                  <Input
                    id="organization_name"
                    value={accountForm.organization_name}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, organization_name: e.target.value }))}
                    placeholder={t('profile.account.orgPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="moderation_level">{t('profile.account.moderationLevel')}</Label>
                    {data?.user?.is_staff || data?.user?.is_superuser ? (
                      <Select
                        value={accountForm.moderation_level}
                        onValueChange={(value) => setAccountForm(prev => ({ ...prev, moderation_level: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('profile.account.selectModerationLevel')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">{t('profile.moderationLevels.auto')}</SelectItem>
                          <SelectItem value="manual">{t('profile.moderationLevels.manual')}</SelectItem>
                          <SelectItem value="strict">{t('profile.moderationLevels.strict')}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                        {accountForm.moderation_level === 'auto' && t('profile.moderationLevels.auto')}
                        {accountForm.moderation_level === 'manual' && t('profile.moderationLevels.manual')}
                        {accountForm.moderation_level === 'strict' && t('profile.moderationLevels.strict')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="stats_enabled"
                      checked={accountForm.stats_enabled}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, stats_enabled: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="stats_enabled">{t('profile.account.enableStats')}</Label>
                  </div>
                </div>

                {(data?.user?.is_staff || data?.user?.is_superuser) && (
                  <Button type="submit" disabled={updating}>
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('profile.account.saving')}
                      </>
                    ) : (
                      t('profile.account.save')
                    )}
                  </Button>
                )}
              </form>

              {/* Account Status */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{t('profile.account.status')}</h4>
                {data?.account ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('profile.account.accountId')}:</span>
                      <span className="ml-2">{data.account.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('profile.account.created')}:</span>
                      <span className="ml-2">
                        {(() => {
                          try {
                            const date = new Date(data.account.created_at) as any as any;
                            if (isNaN(date.getTime())) {
                              // Если дата некорректная, используем дату создания пользователя
                              const userDate = new Date(data.user.created_at);
                              return isNaN(userDate.getTime()) ? 'N/A' : userDate.toLocaleDateString();
                            }
                            return date.toLocaleDateString();
                          } catch {
                            // Fallback на дату создания пользователя
                            try {
                              const userDate = new Date(data.user.created_at);
                              return isNaN(userDate.getTime()) ? 'N/A' : userDate.toLocaleDateString();
                            } catch {
                              return 'N/A';
                            }
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t('profile.account.noAccount')}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="p-6 overflow-auto max-h-screen">
            <div className="space-y-6">
            {/* Address Form with Selectors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {data?.addresses && data.addresses.length > 0
                    ? (editingAddress ? t('profile.address.edit') : t('profile.address.yourAddress'))
                    : t('profile.address.add')
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Показываем форму только при редактировании или если адреса нет */}
                {(editingAddress || !data?.addresses || data.addresses.length === 0) ? (
                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="region">{t('profile.address.region')}</Label>
                        <VirtualSelect
                          value={addressForm.region}
                          onValueChange={(value, label) => {
                            handleRegionChange(value, label);
                          }}
                          placeholder={t('profile.address.regionPlaceholder')}
                          fetchOptions={fetchRegions as any}
                          pageSize={500}
                          searchPlaceholder={t('profile.address.searchRegion')}
                          emptyMessage={t('profile.address.noRegionsFound')}
                        />
                      </div>

                      <div>
                        <Label htmlFor="city">{t('profile.address.locality')}</Label>
                        <VirtualSelect
                          key={`city-${addressForm.region}`} // Перезагружаем при смене региона
                          value={addressForm.city}
                          onValueChange={(value, label) => {
                            handleCityChange(value, label);
                          }}
                          placeholder={!addressForm.region ? t('profile.address.selectRegionFirst') : t('profile.address.localityPlaceholder')}
                          fetchOptions={(addressForm.region ?
                            (search: string) => (fetchCities as any)(addressForm.region, search, 1, 50) :
                            async (): Promise<any> => ({ options: [] as any[], hasMore: false, total: 0 })
                          ) as any}
                          pageSize={500}
                          disabled={!addressForm.region}
                          searchPlaceholder={t('profile.address.searchCity')}
                          emptyMessage={t('profile.address.noCitiesFound')}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={updating || !addressForm.region || !addressForm.city}>
                        {updating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('profile.saving')}
                          </>
                        ) : (
                          <>
                            {editingAddress ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            {editingAddress ? t('profile.address.save') : t('profile.address.add')}
                          </>
                        )}
                      </Button>

                      {editingAddress && (
                        <Button type="button" variant="outline" onClick={handleCancelEdit}>
                          {t('profile.address.cancel')}
                        </Button>
                      )}
                    </div>
                  </form>
                ) : (
                  /* Показываем существующий адрес с кнопками управления */
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {data.addresses[0].input_locality}, {data.addresses[0].input_region}
                          </p>
                          {data.addresses[0].is_geocoded && (
                            <p className="text-sm text-gray-600">
                              ✅ {t('profile.address.verified')}: {data.addresses[0].locality}, {data.addresses[0].region}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleEditAddress}>
                            <Edit className="h-4 w-4 mr-1" />
                            {t('profile.address.edit')}
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleDeleteAddress} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t('profile.address.delete')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Address Details Card (показываем только если адрес есть и не редактируется) */}
            {data?.addresses && data.addresses.length > 0 && !editingAddress && (
              <AddressCard
                address={data.addresses[0]}
                onEdit={() => handleEditAddress()}
                onDelete={() => handleDeleteAddress()}
                showMap={false} // User can toggle map visibility
              />
            )}
            </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="p-6 overflow-auto max-h-screen">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-5 w-5" />
              <h3 className="text-lg font-semibold">{t('profile.contacts')}</h3>
            </div>





            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {editingContact ? t('profile.contact.edit') : t('profile.contact.add')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contact-type">{t('profile.contact.type')}</Label>
                      <Select
                        value={contactForm.contact_type}
                        onValueChange={(value) => setContactForm(prev => ({ ...prev, contact_type: value as ContactTypeEnum }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('profile.contact.selectType')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ContactTypeEnum.PHONE}>📞 {t('profile.contact.phone')}</SelectItem>
                          <SelectItem value={ContactTypeEnum.EMAIL}>📧 {t('profile.contact.email')}</SelectItem>
                          <SelectItem value={ContactTypeEnum.TELEGRAM}>📱 {t('profile.contact.telegram')}</SelectItem>
                          <SelectItem value={ContactTypeEnum.VIBER}>💜 {t('profile.contact.viber')}</SelectItem>
                          <SelectItem value={ContactTypeEnum.WHATSAPP}>💚 {t('profile.contact.whatsapp')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="contact-value">{t('profile.contact.value')}</Label>
                      <Input
                        id="contact-value"
                        value={contactForm.contact_value}
                        onChange={(e) => setContactForm(prev => ({ ...prev, contact_value: e.target.value }))}
                        placeholder={
                          contactForm.contact_type === ContactTypeEnum.PHONE ? '+380501234567' :
                          contactForm.contact_type === ContactTypeEnum.EMAIL ? 'example@email.com' :
                          contactForm.contact_type === ContactTypeEnum.TELEGRAM ? '@username' :
                          contactForm.contact_type === ContactTypeEnum.VIBER ? '+380501234567' :
                          contactForm.contact_type === ContactTypeEnum.WHATSAPP ? '+380501234567' :
                          t('profile.contact.valuePlaceholder')
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="contact-primary"
                      checked={contactForm.is_primary}
                      onChange={(e) => setContactForm(prev => ({ ...prev, is_primary: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="contact-primary">{t('profile.contact.isPrimary', 'Основной контакт')}</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={!contactForm.contact_type || !contactForm.contact_value.trim() || updating}
                    >
                      {updating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : editingContact ? (
                        <Edit className="h-4 w-4 mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {editingContact ? t('profile.contact.update') : t('profile.contact.add')}
                    </Button>

                    {editingContact && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelContactEdit}
                      >
                        {t('common.cancel')}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Contacts List */}
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.contact.list')}</CardTitle>
              </CardHeader>
              <CardContent>
                {memoizedContacts.length > 0 ? (
                  <div className="space-y-3">
                    {memoizedContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                            onClick={() => handleEditContact(contact)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {t('common.edit')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={async () => {
                              const { alertHelpers } = await import('@/components/ui/alert-dialog-helper');
                              const confirmed = await alertHelpers.confirmDelete(t('profile.contact.thisContact') || 'цей контакт');
                              if (confirmed) {
                                try {
                                  await deleteContact(contact.id);
                                  toast({
                                    title: t('common.success'),
                                    description: t('profile.contact.deleteSuccess'),
                                  });
                                } catch (error) {
                                  console.error('Failed to delete contact:', error);
                                  toast({
                                    title: t('common.error'),
                                    description: t('profile.contact.deleteError'),
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t('common.delete')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{t('profile.contact.noContacts')}</p>
                    <p className="text-sm">{t('profile.contact.addFirst')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        </Tabs>
      </div>

      {/* Avatar Generation Options Modal */}
      {showAvatarOptions && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm"
          onClick={() => setShowAvatarOptions(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">{t('profile.avatar.title')}</h3>

            <div className="space-y-4">
              {/* Style Selection */}
              <div>
                <Label htmlFor="avatar-style">{t('profile.avatar.style')}</Label>
                <Select
                  value={avatarOptions.style}
                  onValueChange={(value) => setAvatarOptions(prev => ({ ...prev, style: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('profile.avatar.selectStyle')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realistic">{t('profile.avatar.styles.realistic')}</SelectItem>
                    <SelectItem value="professional">{t('profile.avatar.styles.professional')}</SelectItem>
                    <SelectItem value="cartoon">{t('profile.avatar.styles.cartoon')}</SelectItem>
                    <SelectItem value="caricature">{t('profile.avatar.styles.caricature')}</SelectItem>
                    <SelectItem value="artistic">{t('profile.avatar.styles.artistic')}</SelectItem>
                    <SelectItem value="anime">{t('profile.avatar.styles.anime')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gender Selection */}
              <div>
                <Label htmlFor="avatar-gender">{t('profile.(avatar as any).gender')}</Label>
                <Select
                  value={(avatarOptions as any).gender}
                  onValueChange={(value) => setAvatarOptions(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('profile.avatar.selectGender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('profile.avatar.genders.male')}</SelectItem>
                    <SelectItem value="female">{t('profile.avatar.genders.female')}</SelectItem>
                    <SelectItem value="neutral">{t('profile.avatar.genders.neutral')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Requirements */}
              <div>
                <Label htmlFor="custom-requirements">{t('profile.avatar.customRequirements')}</Label>
                <textarea
                  id="custom-requirements"
                  className="w-full p-2 border rounded-md resize-none placeholder:text-gray-500"
                  rows={3}
                  placeholder={t('profile.avatar.customPlaceholder')}
                  value={avatarOptions.customRequirements}
                  onChange={(e) => setAvatarOptions(prev => ({ ...prev, customRequirements: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: "wearing glasses", "smiling", "formal suit", "outdoor background"
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAvatarOptions(false)}
                className="flex-1"
              >
                {t('profile.avatar.cancel')}
              </Button>
              <Button
                onClick={() => {
                  setShowAvatarOptions(false);
                  handleGenerateAvatar();
                }}
                disabled={isGeneratingAvatar}
                className="flex-1"
              >
                {isGeneratingAvatar ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('profile.avatar.generate_button')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default UpdatedProfilePage;
