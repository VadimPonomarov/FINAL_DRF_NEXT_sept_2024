/**
 * Shared AutoRia User types (DRY - single source of truth)
 * All user-related interfaces used across AutoRia modules
 */

export interface AutoRiaUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar?: string;
  account_type: AccountType;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type AccountType = 'basic' | 'premium' | 'business';
export type UserRole = 'seller' | 'buyer' | 'dealer' | 'admin' | 'moderator';

export interface UserProfile {
  id: number;
  user_id: number;
  name?: string;
  surname?: string;
  age?: number;
  gender?: 'male' | 'female' | 'neutral';
  avatar?: string;
  bio?: string;
}

export interface UserAccount {
  id: number;
  user_id: number;
  account_type: AccountType;
  moderation_level: 'auto' | 'manual' | 'strict';
  role: UserRole;
  organization_name?: string;
  stats_enabled: boolean;
}

export interface UserAddress {
  id: number;
  user_id: number;
  region: string;
  city: string;
  input_region: string;
  input_locality: string;
  is_primary: boolean;
}

export interface UserContact {
  id: number;
  user_id: number;
  contact_type: 'phone' | 'email' | 'telegram' | 'viber' | 'whatsapp';
  contact_value: string;
  is_primary: boolean;
  is_visible: boolean;
  is_verified: boolean;
}
