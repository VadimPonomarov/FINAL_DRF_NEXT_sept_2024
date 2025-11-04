/**
 * Shared AutoRia Ad types (DRY - single source of truth)
 * All ad-related interfaces used across AutoRia modules
 */

export interface CarAd {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  fuel_type: string;
  transmission: string;
  body_type: string;
  color: string;
  engine_volume?: number;
  power?: number;
  drive_type?: string;
  condition?: string;
  owners_count?: number;
  vin?: string;
  status: AdStatus;
  images?: AdImage[];
  location?: AdLocation;
  contacts?: AdContact[];
  views_count?: number;
  favorites_count?: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  moderation_status?: ModerationStatus;
  rejection_reason?: string;
}

export interface AdImage {
  id: number;
  url: string;
  thumbnail_url?: string;
  order: number;
  is_primary: boolean;
  created_at: string;
}

export interface AdLocation {
  id: number;
  region: string;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface AdContact {
  id: number;
  type: ContactType;
  value: string;
  is_primary: boolean;
  is_visible: boolean;
}

export type AdStatus = 'draft' | 'active' | 'inactive' | 'pending' | 'rejected' | 'expired' | 'sold';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';
export type ContactType = 'phone' | 'email' | 'telegram' | 'viber' | 'whatsapp';

export interface AdFormData extends Omit<CarAd, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'views_count' | 'favorites_count'> {
  // Form-specific fields
}

export interface AdFilters {
  brand?: string;
  model?: string;
  year_from?: number;
  year_to?: number;
  price_from?: number;
  price_to?: number;
  mileage_from?: number;
  mileage_to?: number;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  region?: string;
  city?: string;
  status?: AdStatus;
  search?: string;
}

export interface AdSortOptions {
  field: 'created_at' | 'price' | 'year' | 'mileage' | 'views_count';
  order: 'asc' | 'desc';
}
