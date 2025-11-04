/**
 * Утилиты для работы с информацией о текущем пользователе
 */

export interface UserInfo {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined?: string;
  last_login?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
}

/**
 * Получить информацию о текущем пользователе из Redis
 */
export const getCurrentUserInfo = async (): Promise<UserInfo | null> => {
  try {
    console.log('[UserInfo] Getting current user info from Redis...');
    
    const response = await fetch('/api/redis?key=me');
    
    if (!response.ok) {
      console.log('[UserInfo] No user info found in Redis');
      return null;
    }

    const redisData = await response.json();
    
    if (!redisData.exists || !redisData.value) {
      console.log('[UserInfo] No user data exists in Redis');
      return null;
    }

    const userInfo: UserInfo = JSON.parse(redisData.value);
    console.log('[UserInfo] User info retrieved:', {
      id: userInfo.id,
      email: userInfo.email,
      is_staff: userInfo.is_staff,
      is_superuser: userInfo.is_superuser
    });

    return userInfo;
  } catch (error) {
    console.error('[UserInfo] Error getting user info:', error);
    return null;
  }
};

/**
 * Обновить информацию о текущем пользователе в Redis
 */
export const updateCurrentUserInfo = async (): Promise<UserInfo | null> => {
  try {
    console.log('[UserInfo] Updating current user info...');
    
    const response = await fetch('/api/auth/me');
    
    if (!response.ok) {
      console.error('[UserInfo] Failed to update user info:', response.status);
      return null;
    }

    const userInfo: UserInfo = await response.json();
    console.log('[UserInfo] User info updated successfully');
    
    return userInfo;
  } catch (error) {
    console.error('[UserInfo] Error updating user info:', error);
    return null;
  }
};

/**
 * Проверить права пользователя
 */
export const checkUserPermissions = async () => {
  const userInfo = await getCurrentUserInfo();
  
  if (!userInfo) {
    return {
      isAuthenticated: false,
      isStaff: false,
      isSuperuser: false,
      canEditAnyAd: false,
      canDeleteAnyAd: false
    };
  }

  return {
    isAuthenticated: true,
    isStaff: userInfo.is_staff,
    isSuperuser: userInfo.is_superuser,
    canEditAnyAd: userInfo.is_staff || userInfo.is_superuser,
    canDeleteAnyAd: userInfo.is_superuser,
    userInfo
  };
};

/**
 * Проверить может ли пользователь редактировать конкретное объявление
 */
export const canUserEditAd = async (adOwnerEmail: string): Promise<boolean> => {
  const userInfo = await getCurrentUserInfo();
  
  if (!userInfo) return false;
  
  // Владелец может редактировать
  if (userInfo.email === adOwnerEmail) return true;
  
  // Стафф и суперюзер могут редактировать любые объявления
  return userInfo.is_staff || userInfo.is_superuser;
};

/**
 * Проверить может ли пользователь удалить конкретное объявление
 */
export const canUserDeleteAd = async (adOwnerEmail: string): Promise<boolean> => {
  const userInfo = await getCurrentUserInfo();
  
  if (!userInfo) return false;
  
  // Владелец может удалять
  if (userInfo.email === adOwnerEmail) return true;
  
  // Только суперюзер может удалять чужие объявления
  return userInfo.is_superuser;
};
