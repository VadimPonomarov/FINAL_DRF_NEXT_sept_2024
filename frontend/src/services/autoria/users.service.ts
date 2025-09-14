/**
 * Сервис для работы с пользователями AutoRia
 */

export interface AutoRiaUser {
  id: number;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  profile?: {
    name: string;
    surname: string;
    age?: number;
  };
  account_adds?: {
    id: number;
    account_type: 'BASIC' | 'PREMIUM';
    role: string;
    organization_name: string;
  };
}

export interface UserSelectionResult {
  user: AutoRiaUser;
  canCreateAds: boolean;
  maxAds: number;
  currentAds: number;
}

export class AutoRiaUsersService {
  /**
   * Получить список активных пользователей AutoRia
   */
  static async getActiveUsers(): Promise<AutoRiaUser[]> {
    try {
      console.log('[AutoRiaUsersService] 👥 Fetching active users...');
      
      const response = await fetch('/api/autoria/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const result = await response.json();
      const users = result.data?.results || [];
      
      console.log('[AutoRiaUsersService] ✅ Got users:', users.length);
      return users;
    } catch (error) {
      console.error('[AutoRiaUsersService] ❌ Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Получить количество объявлений пользователя
   */
  static async getUserAdsCount(userId: number): Promise<number> {
    try {
      // Запрос к API для получения количества объявлений пользователя
      const response = await fetch(`/api/autoria/users/${userId}/ads/count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`[AutoRiaUsersService] Could not get ads count for user ${userId}, assuming 0`);
        return 0;
      }

      const result = await response.json();
      return result.count || 0;
    } catch (error) {
      console.warn(`[AutoRiaUsersService] Error getting ads count for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Выбрать подходящего пользователя для создания объявления
   */
  static async selectUserForAd(): Promise<UserSelectionResult | null> {
    try {
      const users = await this.getActiveUsers();
      
      if (users.length === 0) {
        console.warn('[AutoRiaUsersService] ⚠️ No active users found');
        return null;
      }

      // Сначала проверяем премиум пользователей (неограниченные объявления)
      const premiumUsers = users.filter(user => 
        user.account_adds?.account_type === 'PREMIUM'
      );

      if (premiumUsers.length > 0) {
        const randomPremiumUser = premiumUsers[Math.floor(Math.random() * premiumUsers.length)];
        console.log('[AutoRiaUsersService] 👑 Selected premium user:', randomPremiumUser.email);
        
        return {
          user: randomPremiumUser,
          canCreateAds: true,
          maxAds: -1, // Неограниченно
          currentAds: 0 // Не важно для премиум
        };
      }

      // Проверяем обычных пользователей (по одному объявлению)
      const basicUsers = users.filter(user => 
        user.account_adds?.account_type === 'BASIC' || !user.account_adds
      );

      // Проверяем, у кого еще нет объявлений
      for (const user of basicUsers) {
        const adsCount = await this.getUserAdsCount(user.id);
        
        if (adsCount === 0) {
          console.log('[AutoRiaUsersService] 👤 Selected basic user (0 ads):', user.email);
          
          return {
            user,
            canCreateAds: true,
            maxAds: 1,
            currentAds: adsCount
          };
        }
      }

      console.warn('[AutoRiaUsersService] ⚠️ All basic users have reached their limit (1 ad each)');
      
      // Если все обычные пользователи исчерпали лимит, возвращаем случайного премиум
      if (premiumUsers.length > 0) {
        const randomPremiumUser = premiumUsers[Math.floor(Math.random() * premiumUsers.length)];
        console.log('[AutoRiaUsersService] 👑 Fallback to premium user:', randomPremiumUser.email);
        
        return {
          user: randomPremiumUser,
          canCreateAds: true,
          maxAds: -1,
          currentAds: 0
        };
      }

      return null;
    } catch (error) {
      console.error('[AutoRiaUsersService] ❌ Error selecting user:', error);
      throw error;
    }
  }

  /**
   * Получить информацию о лимитах пользователей
   */
  static async getUsersLimitsInfo(): Promise<{
    totalUsers: number;
    premiumUsers: number;
    basicUsers: number;
    availableSlots: number;
  }> {
    try {
      const users = await this.getActiveUsers();
      const premiumUsers = users.filter(u => u.account_adds?.account_type === 'PREMIUM');
      const basicUsers = users.filter(u => u.account_adds?.account_type === 'BASIC' || !u.account_adds);
      
      // Подсчитываем доступные слоты для обычных пользователей
      let availableSlots = premiumUsers.length * 1000; // Премиум = "неограниченно"
      
      for (const user of basicUsers) {
        const adsCount = await this.getUserAdsCount(user.id);
        if (adsCount === 0) {
          availableSlots += 1;
        }
      }

      return {
        totalUsers: users.length,
        premiumUsers: premiumUsers.length,
        basicUsers: basicUsers.length,
        availableSlots
      };
    } catch (error) {
      console.error('[AutoRiaUsersService] ❌ Error getting limits info:', error);
      return {
        totalUsers: 0,
        premiumUsers: 0,
        basicUsers: 0,
        availableSlots: 0
      };
    }
  }
}
