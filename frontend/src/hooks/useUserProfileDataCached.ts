/**
 * Кешована версія useUserProfileData з використанням React Query
 * Оптимізує запити до backend, кешує дані на клієнті
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
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
  BackendAccountContact
} from '@/types/backend-user';

// Query keys для правильного кешування
export const userProfileKeys = {
  all: ['userProfile'] as const,
  profile: () => [...userProfileKeys.all, 'profile'] as const,
  account: () => [...userProfileKeys.all, 'account'] as const,
  addresses: () => [...userProfileKeys.all, 'addresses'] as const,
  contacts: () => [...userProfileKeys.all, 'contacts'] as const,
};

/**
 * Кешований хук для даних профілю з React Query
 * staleTime: 1 хвилина - дані вважаються свіжими
 * gcTime: 10 хвилин - кеш зберігається 10 хвилин
 */
export const useUserProfileDataCached = () => {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Основний запит даних користувача з кешуванням
  const {
    data,
    isLoading: loading,
    error,
    refetch: loadUserData
  } = useQuery({
    queryKey: userProfileKeys.profile(),
    queryFn: async () => {
      const data = await FullUserDataService.getFullUserData();
      
      // Якщо акаунт не існує, створюємо його
      if (data?.user && !data.account) {
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
        }
      }
      
      return data;
    },
    enabled: status === 'authenticated' && !!session, // Запитуємо тільки якщо авторизований
    staleTime: 1 * 60 * 1000, // 1 хвилина - дані свіжі
    gcTime: 10 * 60 * 1000, // 10 хвилин - зберігати в кеші
    refetchOnWindowFocus: false, // Не перезапитувати при фокусі вікна
    refetchOnReconnect: false, // Не перезапитувати при реконнекті
  });

  // Мутація оновлення профілю
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileUpdateData) => {
      const currentAvatar = data?.user.profile?.avatar;
      const profileDataWithAvatar = { ...profileData };
      
      if (currentAvatar) {
        profileDataWithAvatar.avatar_url = currentAvatar;
      }
      
      return UserProfileService.updateUserProfile({ profile: profileDataWithAvatar });
    },
    onSuccess: (updatedProfile) => {
      // Оновлюємо кеш
      queryClient.setQueryData<FullUserProfileData | null>(
        userProfileKeys.profile(),
        (old) => old ? {
          ...old,
          user: {
            ...old.user,
            email: updatedProfile.email,
            profile: updatedProfile.profile
          }
        } : null
      );
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  });

  // Мутація оновлення акаунту
  const updateAccountMutation = useMutation({
    mutationFn: (accountData: AccountUpdateData) => 
      UserAccountService.updateUserAccount(accountData),
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData<FullUserProfileData | null>(
        userProfileKeys.profile(),
        (old) => old ? { ...old, account: updatedAccount } : null
      );
      
      toast({
        title: "Success",
        description: "Account updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update account",
        variant: "destructive"
      });
    }
  });

  // Мутація завантаження аватара
  const uploadAvatarMutation = useMutation({
    mutationFn: async (avatarFile: File) => {
      if (!data?.user.id) throw new Error('User ID not available');
      return UserProfileService.uploadAvatar(avatarFile, data.user.id);
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData<FullUserProfileData | null>(
        userProfileKeys.profile(),
        (old) => old ? {
          ...old,
          user: { ...old.user, profile: updatedProfile }
        } : null
      );
      
      toast({
        title: "Success",
        description: "Avatar uploaded successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive"
      });
    }
  });

  return {
    // Стан
    data,
    loading,
    error: error ? (error as Error).message : null,
    updating: updateProfileMutation.isPending || updateAccountMutation.isPending || uploadAvatarMutation.isPending,
    updateError: null,

    // Методи профілю та акаунту
    loadUserData,
    updateProfile: updateProfileMutation.mutateAsync,
    updateAccount: updateAccountMutation.mutateAsync,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
    updateAvatarUrl: (avatarUrl: string) => {
      queryClient.setQueryData<FullUserProfileData | null>(
        userProfileKeys.profile(),
        (old) => old ? {
          ...old,
          user: {
            ...old.user,
            profile: old.user.profile ? { ...old.user.profile, avatar: avatarUrl } : null
          }
        } : null
      );
    },

    // Обчислювані значення
    hasProfile: !!data?.user.profile,
    hasAccount: !!data?.account,
    addressCount: (data?.addresses && data.addresses.length > 0) ? 1 : 0,
    contactCount: Array.isArray(data?.contacts) ? data.contacts.length : 0,

    // Решта методів (адреси, контакти) можна додати пізніше
    createAddress: async () => { throw new Error('Not implemented in cached version yet') },
    updateAddress: async () => { throw new Error('Not implemented in cached version yet') },
    deleteAddress: async () => { throw new Error('Not implemented in cached version yet') },
    createContact: async () => { throw new Error('Not implemented in cached version yet') },
    updateContact: async () => { throw new Error('Not implemented in cached version yet') },
    deleteContact: async () => { throw new Error('Not implemented in cached version yet') },
    
    mutate: loadUserData, // Аліас для сумісності
  };
};

