/**
 * Типы данных для синхронизации с бэкендом
 * Соответствуют ТОЧНОЙ структуре моделей Django бэкенда
 */

// Энумы из бэкенда (core.enums.ads)
export enum AccountTypeEnum {
  BASIC = 'basic',
  PREMIUM = 'premium',
  DEALER = 'dealer'
}

export enum ModerationLevelEnum {
  AUTO = 'auto',
  MANUAL = 'manual',
  STRICT = 'strict'
}

export enum RoleEnum {
  SELLER = 'seller',
  BUYER = 'buyer',
  DEALER = 'dealer'
}

export enum ContactTypeEnum {
  PHONE = 'phone',
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  VIBER = 'viber',
  WHATSAPP = 'whatsapp'
}

// Адрес аккаунта (RawAccountAddress модель) - ТОЧНАЯ структура бэкенда
export interface BackendRawAddress {
  id: number;
  account: number; // ID аккаунта
  // Пользовательский ввод (обязательные поля)
  input_region: string;
  input_locality: string;
  // Стандартизированные данные Google Maps (только для чтения)
  region: string;
  locality: string;
  geo_code: string; // Google Maps place_id
  latitude: number | null;
  longitude: number | null;
  is_geocoded: boolean;
  geocoding_error: string | null;
  created_at: string;
  updated_at: string;
}

// Профиль пользователя (ProfileModel) - ТОЧНАЯ структура бэкенда
export interface BackendProfile {
  id: number;
  name: string;
  surname: string;
  age: number | null;
  avatar: string | null; // URL загруженного файла аватара
  avatar_url: string | null; // URL сгенерированного аватара (приоритет над avatar)
  user: number; // ID пользователя
  created_at: string;
  updated_at: string;
}

// Аккаунт пользователя (AddsAccount модель) - ТОЧНАЯ структура бэкенда
export interface BackendAccount {
  id: number;
  user: number; // ID пользователя
  account_type: AccountTypeEnum; // Тип аккаунта
  moderation_level: ModerationLevelEnum; // Уровень модерации
  role: RoleEnum; // Роль пользователя
  organization_name: string;
  organization_id: string | null; // UUID, read-only
  stats_enabled: boolean;
  dealership: number | null; // FK to DealershipOrganization
  created_at: string;
  updated_at: string;
}

// Пользователь (UserModel) - полная структура
export interface BackendUser {
  id: number;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  profile: BackendProfile | null;
  created_at: string;
  updated_at: string;
}

// Контакт аккаунта (AddsAccountContact модель)
export interface BackendAccountContact {
  id: number;
  account: number; // ID аккаунта
  contact_type: ContactTypeEnum; // Тип контакта
  contact_value: string; // Значение контакта
  is_primary: boolean; // Основной контакт
  is_verified: boolean; // Верифицирован ли контакт
  created_at: string;
  updated_at: string;
}

// Данные для создания/обновления контакта
export interface ContactUpdateData {
  contact_type: ContactTypeEnum;
  contact_value: string;
  is_primary?: boolean;
}

// Данные для создания/обновления адреса (RawAccountAddress)
export interface RawAddressUpdateData {
  input_region: string;
  input_locality: string;
}

// Данные для обновления профиля (соответствует ProfileSerializer)
export interface ProfileUpdateData {
  name?: string;
  surname?: string;
  age?: number | null;
  avatar?: File | null; // Файл для загрузки аватара
  avatar_url?: string | null; // URL сгенерированного аватара (приоритет над avatar)
}

// Данные для обновления аккаунта (соответствует AddsAccountSerializer)
export interface AccountUpdateData {
  account_type?: AccountTypeEnum; // Тип аккаунта (read-only в бекенде)
  moderation_level?: ModerationLevelEnum; // Уровень модерации
  role?: RoleEnum; // Роль пользователя
  organization_name?: string;
  stats_enabled?: boolean;
  // organization_id - read-only, генерируется автоматически
  // dealership - управляется отдельно
}

// Данные для обновления пользователя (соответствует UserEditSerializer)
export interface UserUpdateData {
  email?: string;
  profile?: ProfileUpdateData;
}

// Ответ API при получении профиля (UserEditSerializer)
export interface ProfileApiResponse {
  email: string;
  profile: BackendProfile | null;
}

// Ответ API при получении аккаунта (AddsAccountSerializer)
export interface AccountApiResponse extends BackendAccount {
  contacts?: BackendAccountContact[]; // Контакты аккаунта
  addresses?: BackendRawAddress[]; // Адреса (OneToOne, но в массиве для совместимости)
}

// Ошибка API
export interface ApiError {
  error: string;
  message: string;
  code?: string;
}

// Состояние загрузки данных
export interface DataLoadingState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  updating: boolean;
  updateError: string | null;
}

// Форма данных адреса для UI (соответствует RawAccountAddress)
export interface AddressFormData {
  id?: number;
  input_region: string;
  input_locality: string;
  // Только для отображения (read-only)
  region?: string;
  locality?: string;
  geo_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_geocoded?: boolean;
  isNew?: boolean; // Флаг для новых адресов
}

// Форма данных профиля для UI (соответствует ProfileModel)
export interface ProfileFormData {
  // Основные данные пользователя
  email: string;

  // Данные профиля (ТОЛЬКО поля из ProfileModel)
  name: string;
  surname: string;
  age: number | null;
  avatar: File | null;
  avatarUrl: string | null; // Текущий URL аватара

  // Метаданные (только для отображения)
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  created_at?: string;
  updated_at?: string;
}

// Форма данных аккаунта для UI (соответствует AddsAccount)
export interface AccountFormData {
  account_type: string;
  moderation_level: string;
  role: string;
  organization_name: string;
  stats_enabled: boolean;
}

// Объединенные данные для полного профиля пользователя
export interface FullUserProfileData {
  user: BackendUser;
  account: BackendAccount | null;
  addresses: BackendRawAddress[]; // Массив для совместимости (фактически OneToOne)
  contacts: BackendAccountContact[]; // Контакты аккаунта
}

// Конвертер из бэкенд формата в форму
export const backendUserToFormData = (user: BackendUser): ProfileFormData => {
  return {
    email: user.email,
    name: user.profile?.name || '',
    surname: user.profile?.surname || '',
    age: user.profile?.age || null,
    phone: user.profile?.phone || '',
    bio: user.profile?.bio || '',
    avatar: null, // Файл не может быть получен из API
    avatarUrl: user.profile?.avatar || null,
    addresses: user.profile?.addresses?.map(addr => ({
      id: addr.id,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
      is_primary: addr.is_primary,
      isNew: false,
    })) || [],
    is_active: user.is_active,
    is_staff: user.is_staff,
    is_superuser: user.is_superuser,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
};

// Конвертер из API ответа в форму (для UserEditSerializer)
export const apiResponseToFormData = (response: ProfileApiResponse): ProfileFormData => {
  // Если это прямой ответ от UserEditSerializer
  if (response.email && response.profile) {
    const user: BackendUser = {
      id: response.profile.id,
      email: response.email,
      profile: response.profile,
      is_active: true, // Значения по умолчанию
      is_staff: false,
      is_superuser: false,
      created_at: response.profile.created_at,
      updated_at: response.profile.updated_at,
    };
    return backendUserToFormData(user);
  }

  // Если это обернутый ответ
  if (response.data) {
    return backendUserToFormData(response.data);
  }

  // Пустая форма по умолчанию
  return {
    email: '',
    name: '',
    surname: '',
    age: null,
    phone: '',
    bio: '',
    avatar: null,
    avatarUrl: null,
    addresses: [],
    is_active: false,
    is_staff: false,
    is_superuser: false,
  };
};

// Конвертер из формы в данные для обновления
export const formDataToUpdateData = (formData: ProfileFormData): UserUpdateData => {
  return {
    email: formData.email,
    profile: {
      name: formData.name,
      surname: formData.surname,
      age: formData.age,
      avatar: formData.avatar,
    },
  };
};

// Валидация данных профиля
export const validateProfileData = (data: ProfileFormData): string[] => {
  const errors: string[] = [];
  
  if (!data.email.trim()) {
    errors.push('Email is required');
  }
  
  if (!data.name.trim()) {
    errors.push('Name is required');
  }
  
  if (!data.surname.trim()) {
    errors.push('Surname is required');
  }
  
  if (data.age !== null && (data.age < 1 || data.age > 100)) {
    errors.push('Age must be between 1 and 100');
  }
  
  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email && !emailRegex.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  return errors;
};

// Утилиты для работы с аватаром
export const getAvatarUrl = (user: BackendUser): string | null => {
  return user.profile?.avatar || null;
};

export const getFullName = (user: BackendUser): string => {
  if (!user.profile) return '';
  const { name, surname } = user.profile;
  return [name, surname].filter(Boolean).join(' ');
};

export const getUserDisplayName = (user: BackendUser): string => {
  const fullName = getFullName(user);
  return fullName || user.email;
};

// Проверка валидности файла аватара
export const validateAvatarFile = (file: File): string[] => {
  const errors: string[] = [];
  const maxSize = 1024 * 1024; // 1MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (file.size > maxSize) {
    errors.push('Avatar file size must be less than 1MB');
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push('Avatar must be JPEG, PNG, or GIF format');
  }

  return errors;
};
