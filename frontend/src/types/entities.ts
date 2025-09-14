/**
 * Complete entity types for User-Profile-Account-Address relationships
 * Matches backend Django models exactly
 */

// Base types
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// User Model (auth_user table)
export interface User extends BaseEntity {
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  profile?: Profile;
}

// Profile Model (profiles table)
export interface Profile extends BaseEntity {
  name: string;
  surname: string;
  age: number | null;
  avatar?: string; // File path
  avatar_url?: string; // Generated avatar URL
  user: number; // Foreign key to User
}

// Account Types (from backend enums)
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

// AddsAccount Model (add_accounts table)
export interface Account extends BaseEntity {
  account_type: AccountTypeEnum;
  moderation_level: ModerationLevelEnum;
  role: RoleEnum;
  organization_name: string;
  organization_id?: string;
  stats_enabled: boolean;
  user: number; // Foreign key to User
  address?: Address;
}

// RawAccountAddress Model (addresses table)
export interface Address extends BaseEntity {
  // User input fields
  input_region: string;
  input_locality: string;
  
  // Geocoded fields (filled by backend)
  formatted_address?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  
  // Address components
  street_number?: string;
  route?: string;
  locality?: string;
  administrative_area_level_1?: string;
  administrative_area_level_2?: string;
  country?: string;
  postal_code?: string;
  
  // Metadata
  geocoding_status?: string;
  geocoding_error?: string;
  last_geocoded?: string;
  
  account: number; // Foreign key to Account
}

// Pagination types (используется в проекте)
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
