/**
 * React хук для управления данными профиля пользователя, аккаунта и адресов
 * Обеспечивает синхронизацию с бэкендом и управление состоянием
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import {
  FullUserDataService,
  UserProfileService,
  UserAccountService,
  UserAddressService,
  UserContactService
} from '@/services/userProfileService';
import {
  FullUserProfileData,
  ProfileUpdateData,
  AccountUpdateData,
  RawAddressUpdateData,
  ContactUpdateData,
  BackendRawAddress,
  BackendAccountContact,
  DataLoadingState,
  AccountTypeEnum,
  ModerationLevelEnum,
  RoleEnum,
  ContactTypeEnum
} from '@/shared/types/backend-user';

/**
 * Хук для управления полными данными пользователя
 */
export const useUserProfileData = () => {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const { t } = useI18n();
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_PROFILE !== 'false' && process.env.NODE_ENV !== 'production';

  // Состояние данных
  const [state, setState] = useState<DataLoadingState<FullUserProfileData>>({
    loading: true,
    error: null,
    data: null,
    updating: false,
    updateError: null
  });

  /**
   * Загрузить все данные пользователя
   */
  const loadUserData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await FullUserDataService.getFullUserData();
      
      if (!data) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load user data'
        }));
        return;
      }
      
      // Если аккаунт не существует, создаем его автоматически
      if (data.user && !data.account) {
        if (DEBUG) console.log('[useUserProfileData] Account not found, creating default account...');
        try {
          const defaultAccountData = {
            account_type: 'basic',
            moderation_level: 'auto',
            role: 'seller',
            organization_name: '',
            stats_enabled: false
          };

          const createdAccount = await UserAccountService.updateUserAccount(defaultAccountData);
          if (createdAccount) {
            data.account = createdAccount;
            if (DEBUG) console.log('[useUserProfileData] Default account created successfully');
          }
        } catch (accountError) {
          if (DEBUG) console.error('[useUserProfileData] Failed to create default account:', accountError);
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        data,
        error: null
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      toast({
        title: t('common.error'),
        description: t('profile.error', 'Failed to load user data'),
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * Обновить профиль пользователя
   */
  const updateProfile = useCallback(async (profileData: ProfileUpdateData) => {
    if (DEBUG) console.log('🚀 [useUserProfileData] updateProfile called with:', profileData);
    setState(prev => ({ ...prev, updating: true, updateError: null }));

    try {
      // Получаем текущий аватар из актуального состояния
      const currentAvatar = state.data?.user.profile?.avatar;

      if (DEBUG) console.log('[useUserProfileData] Current avatar:', currentAvatar);
      if (DEBUG) console.log('[useUserProfileData] Full profile data:', state.data?.user.profile);
      if (DEBUG) console.log('[useUserProfileData] Profile data before avatar check:', profileData);

      // Создаем структуру данных для отправки на бэкенд
      const profileDataWithAvatar = { ...profileData };

      // Если есть аватар, всегда включаем его в данные профиля
      if (currentAvatar) {
        profileDataWithAvatar.avatar_url = currentAvatar;
        if (DEBUG) console.log('[useUserProfileData] Including avatar_url in profile update:', currentAvatar);
      }

      const updateData = {
        profile: profileDataWithAvatar
      };

      if (DEBUG) console.log('[useUserProfileData] Final update data with avatar:', updateData);

      const updatedProfile = await UserProfileService.updateUserProfile(updateData);

      if (!updatedProfile) {
        throw new Error('Failed to update profile');
      }

      // Обновляем локальные данные, используя ответ от сервера
      setState(prev => {
        if (DEBUG) console.log('[useUserProfileData] Profile update - using server response:', {
          currentAvatar,
          serverAvatar: updatedProfile.profile?.avatar,
          serverProfile: updatedProfile.profile,
          updatedFields: profileData
        });

        // Используем аватар из ответа сервера, если он есть, иначе сохраняем текущий
        // Бэкенд возвращает аватар в поле 'avatar', а не 'avatar_url'
        const finalAvatar = updatedProfile.profile?.avatar || currentAvatar;

        return {
          ...prev,
          updating: false,
          data: prev.data ? {
            ...prev.data,
            user: {
              ...prev.data.user,
              email: updatedProfile.email,
              profile: prev.data.user.profile ? {
                ...prev.data.user.profile,
                // Обновляем данные из ответа сервера
                ...updatedProfile.profile,
                // Убеждаемся, что аватар сохранен
                avatar: finalAvatar
              } : updatedProfile.profile
            }
          } : null
        };
      });

      if (DEBUG) console.log('[useUserProfileData] ✅ Profile updated successfully');
      if (DEBUG) console.log('[useUserProfileData] 📸 Final avatar after update:', updatedProfile.profile?.avatar || currentAvatar);

      toast({
        title: t('common.success'),
        description: t('profile.updateSuccess', 'Profile updated successfully')
      });

      return updatedProfile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }));

      toast({
        title: t('common.error'),
        description: t('profile.updateError', 'Failed to update profile'),
        variant: "destructive"
      });

      throw error;
    }
  }, [toast]);

  /**
   * Обновить аккаунт пользователя
   */
  const updateAccount = useCallback(async (accountData: AccountUpdateData) => {
    setState(prev => ({ ...prev, updating: true, updateError: null }));
    
    try {
      const updatedAccount = await UserAccountService.updateUserAccount(accountData);
      
      if (!updatedAccount) {
        throw new Error('Failed to update account');
      }
      
      // Обновляем локальное состояние
      setState(prev => ({
        ...prev,
        updating: false,
        data: prev.data ? {
          ...prev.data,
          account: updatedAccount
        } : null
      }));
      
      toast({
        title: t('common.success'),
        description: t('account.updateSuccess', 'Account updated successfully')
      });
      
      return updatedAccount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }));
      
      toast({
        title: t('common.error'),
        description: t('account.updateError', 'Failed to update account'),
        variant: "destructive"
      });
      
      throw error;
    }
  }, [toast]);

  /**
   * Загрузить аватар
   */
  const uploadAvatar = useCallback(async (avatarFile: File) => {
    if (!state.data?.user.id) {
      throw new Error('User ID not available');
    }
    
    setState(prev => ({ ...prev, updating: true, updateError: null }));
    
    try {
      const updatedProfile = await UserProfileService.uploadAvatar(avatarFile, state.data.user.id);
      
      if (!updatedProfile) {
        throw new Error('Failed to upload avatar');
      }
      
      // Обновляем локальное состояние
      setState(prev => ({
        ...prev,
        updating: false,
        data: prev.data ? {
          ...prev.data,
          user: {
            ...prev.data.user,
            profile: updatedProfile
          }
        } : null
      }));
      
      toast({
        title: t('common.success'),
        description: t('profile.avatar.success', 'Avatar uploaded successfully')
      });
      
      return updatedProfile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }));
      
      toast({
        title: t('common.error'),
        description: t('profile.avatar.failed', 'Failed to upload avatar'),
        variant: "destructive"
      });
      
      throw error;
    }
  }, [state.data?.user.id, toast]);

  /**
   * Создать новый адрес
   */
  const createAddress = useCallback(async (addressData: RawAddressUpdateData) => {
    setState(prev => ({ ...prev, updating: true, updateError: null }));
    
    try {
      const newAddress = await UserAddressService.createAddress(addressData);
      
      if (!newAddress) {
        throw new Error('Failed to create address');
      }
      
      // Обновляем локальное состояние
      setState(prev => ({
        ...prev,
        updating: false,
        data: prev.data ? {
          ...prev.data,
          addresses: [...prev.data.addresses, newAddress]
        } : null
      }));
      
      toast({
        title: t('common.success'),
        description: t('profile.address.updateSuccess', 'Address created successfully')
      });
      
      return newAddress;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }));
      
      toast({
        title: t('common.error'),
        description: t('profile.address.geocodingError', 'Failed to create address'),
        variant: "destructive"
      });
      
      throw error;
    }
  }, [toast]);

  /**
   * Обновить существующий адрес
   */
  const updateAddress = useCallback(async (addressId: number, addressData: RawAddressUpdateData) => {
    setState(prev => ({ ...prev, updating: true, updateError: null }));
    
    try {
      const updatedAddress = await UserAddressService.updateAddress(addressId, addressData);
      
      if (!updatedAddress) {
        throw new Error('Failed to update address');
      }
      
      // Обновляем локальное состояние
      setState(prev => ({
        ...prev,
        updating: false,
        data: prev.data ? {
          ...prev.data,
          addresses: prev.data.addresses.map(addr => 
            addr.id === addressId ? updatedAddress : addr
          )
        } : null
      }));
      
      toast({
        title: t('common.success'),
        description: t('profile.address.updateSuccess', 'Address updated successfully')
      });
      
      return updatedAddress;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }));
      
      toast({
        title: t('common.error'),
        description: t('profile.address.updateError', 'Failed to update address'),
        variant: "destructive"
      });
      
      throw error;
    }
  }, [toast]);

  /**
   * Удалить адрес
   */
  const deleteAddress = useCallback(async (addressId: number) => {
    setState(prev => ({ ...prev, updating: true, updateError: null }));
    
    try {
      const success = await UserAddressService.deleteAddress(addressId);
      
      if (!success) {
        throw new Error('Failed to delete address');
      }
      
      // Обновляем локальное состояние
      setState(prev => ({
        ...prev,
        updating: false,
        data: prev.data ? {
          ...prev.data,
          addresses: prev.data.addresses.filter(addr => addr.id !== addressId)
        } : null
      }));
      
      toast({
        title: t('common.success'),
        description: t('profile.address.updateSuccess', 'Address deleted successfully')
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }));
      
      toast({
        title: t('common.error'),
        description: t('profile.address.updateError', 'Failed to delete address'),
        variant: "destructive"
      });
      
      throw error;
    }
  }, [toast]);

  /**
   * Обновить аватар в локальном состоянии
   */
  const updateAvatarUrl = useCallback((avatarUrl: string) => {
    if (DEBUG) console.log('[useUserProfileData] Updating avatar URL:', avatarUrl);
    setState(prev => {
      const newState = {
        ...prev,
        data: prev.data ? {
          ...prev.data,
          user: {
            ...prev.data.user,
            profile: prev.data.user.profile ? {
              ...prev.data.user.profile,
              avatar: avatarUrl
            } : null
          }
        } : null
      };
      if (DEBUG) console.log('[useUserProfileData] New avatar state:', newState.data?.user.profile?.avatar);
      return newState;
    });
  }, []);

  /**
   * Создать новый контакт
   */
  const createContact = useCallback(async (contactData: ContactUpdateData): Promise<BackendAccountContact | null> => {
    setState(prev => ({ ...prev, updating: true, updateError: null }));

    try {
      const newContact = await UserContactService.createContact(contactData);

      if (newContact) {
        setState(prev => ({
          ...prev,
          updating: false,
          data: prev.data ? {
            ...prev.data,
            contacts: [...prev.data.contacts, newContact]
          } : null
        }));

        toast({
          title: t('common.success'),
          description: t('profile.contact.add', 'Contact created successfully')
        });
      }

      return newContact;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }));

      toast({
        title: t('common.error'),
        description: t('profile.updateError', 'Failed to create contact'),
        variant: "destructive"
      });

      return null;
    }
  }, [toast]);

  /**
   * Обновить контакт
   */
  const updateContact = useCallback(async (contactId: number, contactData: Partial<ContactUpdateData>): Promise<BackendAccountContact | null> => {
    setState(prev => ({ ...prev, updating: true, updateError: null }));

    try {
      const updatedContact = await UserContactService.updateContact(contactId, contactData);

      if (updatedContact) {
        setState(prev => ({
          ...prev,
          updating: false,
          data: prev.data ? {
            ...prev.data,
            contacts: prev.data.contacts.map(contact =>
              contact.id === contactId ? updatedContact : contact
            )
          } : null
        }));

        toast({
          title: t('common.success'),
          description: t('profile.updateSuccess', 'Contact updated successfully')
        });
      }

      return updatedContact;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }));

      toast({
        title: t('common.error'),
        description: t('profile.updateError', 'Failed to update contact'),
        variant: "destructive"
      });

      return null;
    }
  }, [toast]);

  /**
   * Удалить контакт
   */
  const deleteContact = useCallback(async (contactId: number): Promise<boolean> => {
    setState(prev => ({ ...prev, updating: true, updateError: null }));

    try {
      const success = await UserContactService.deleteContact(contactId);

      if (success) {
        setState(prev => ({
          ...prev,
          updating: false,
          data: prev.data ? {
            ...prev.data,
            contacts: prev.data.contacts.filter(contact => contact.id !== contactId)
          } : null
        }));

        toast({
          title: t('common.success'),
          description: t('profile.updateSuccess', 'Contact deleted successfully')
        });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }));

      toast({
        title: t('common.error'),
        description: t('profile.updateError', 'Failed to delete contact'),
        variant: "destructive"
      });

      return false;
    }
  }, [toast]);

  // Load data only when authenticated: NextAuth session OR access_token cookie (form login)
  useEffect(() => {
    if (status === 'loading') {
      if (DEBUG) console.log('[useUserProfileData] Session loading, waiting...');
      return;
    }

    // NextAuth session present — authenticated
    if (session) {
      if (DEBUG) console.log('[useUserProfileData] NextAuth session found, loading data...');
      loadUserData();
      return;
    }

    // No NextAuth session — check cookie-based auth (form login via httpOnly cookie)
    fetch('/api/auth/token', { cache: 'no-store', credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(tokenData => {
        if (tokenData?.access) {
          if (DEBUG) console.log('[useUserProfileData] Cookie token found, loading data...');
          loadUserData();
        } else {
          if (DEBUG) console.log('[useUserProfileData] No auth, skipping data load');
          setState({ loading: false, error: null, data: null, updating: false, updateError: null });
        }
      })
      .catch(() => {
        setState({ loading: false, error: null, data: null, updating: false, updateError: null });
      });
  }, [status, session, loadUserData, DEBUG]);

  // Очистка данных при signout
  useEffect(() => {
    const handleSignout = (event: CustomEvent) => {
      if (DEBUG) console.log('[useUserProfileData] Signout event received, clearing user data');
      setState({
        loading: false,
        error: null,
        data: null,
        updating: false,
        updateError: null
      });
    };

    window.addEventListener('auth:signout', handleSignout as EventListener);

    return () => {
      window.removeEventListener('auth:signout', handleSignout as EventListener);
    };
  }, [DEBUG]);

  return {
    // Состояние
    ...state,

    // Методы профиля и аккаунта
    loadUserData,
    updateProfile,
    updateAccount,
    uploadAvatar,
    updateAvatarUrl,

    // Методы адресов
    createAddress,
    updateAddress,
    deleteAddress,

    // Методы контактов
    createContact,
    updateContact,
    deleteContact,

    mutate: loadUserData, // Добавляем alias для совместимости с SWR

    // Вычисляемые значения
    hasProfile: !!state.data?.user.profile,
    hasAccount: !!state.data?.account,
    addressCount: (() => {
      const addresses = state.data?.addresses;
      if (DEBUG) console.log('[useUserProfileData] Address count calculation:', {
        addresses,
        isArray: Array.isArray(addresses),
        length: addresses?.length,
        hasAddresses: addresses && addresses.length > 0
      });
      return (addresses && addresses.length > 0) ? 1 : 0;
    })(),
    contactCount: (() => {
      const contacts = state.data?.contacts;
      return Array.isArray(contacts) ? contacts.length : 0;
    })()
  };
};
