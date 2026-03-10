#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Replace autoria.ts with clean TypeScript type definitions"""
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')
path = os.path.normpath(os.path.join(BASE, 'modules/autoria/shared/types/autoria.ts'))

clean_content = '''export type Currency = 'USD' | 'EUR' | 'UAH';
export type AccountType = 'basic' | 'premium';
export type AdStatus = 'draft' | 'pending' | 'active' | 'needs_review' | 'rejected' | 'blocked' | 'sold' | 'archived';
export type UserRole = 'buyer' | 'seller' | 'manager' | 'admin';

export interface AdContact {
  id?: number;
  type: string;
  value: string;
  is_visible: boolean;
  is_primary: boolean;
  note?: string;
}

export interface Contact {
  id?: number;
  type: string;
  value: string;
  is_primary?: boolean;
  is_verified?: boolean;
}

export interface CarAdImage {
  id: number;
  image: string;
  image_url?: string;
  image_display_url?: string;
  url?: string;
  is_main: boolean;
  order: number;
  created_at: string;
}

export interface CarAdFormData {
  id?: number;
  title?: string;
  description?: string;
  model?: string;
  price?: number;
  currency?: Currency;
  region?: string | number;
  city?: string | number;
  region_name?: string;
  city_name?: string;

  brand?: string;
  mark?: string;
  vehicle_type?: string;
  brand_name?: string;
  mark_name?: string;
  vehicle_type_name?: string;
  model_name?: string;

  generation?: string;
  modification?: string;

  year?: number;
  mileage?: number;
  mileage_km?: number;
  engine_volume?: number;
  engine_power?: number;
  fuel_type?: string;
  transmission?: string;
  transmission_type?: string;
  drive_type?: string;
  body_type?: string;
  color?: string | number;
  color_name?: string;
  steering_wheel?: string;
  condition?: string;
  vin_code?: string;
  license_plate?: string;
  number_of_doors?: number;
  number_of_seats?: number;

  seller_type?: 'private' | 'dealer' | 'auto_salon' | string;
  exchange_status?: 'no_exchange' | 'possible' | 'only_exchange' | string;
  exchange_possible?: boolean;

  geocode?: string;

  dynamic_fields?: Record<string, any>;

  images?: File[] | string[];
  existing_images?: CarAdImage[];
  images_to_delete?: number[];
  main_existing_image_id?: number;
  uploaded_images?: File[];
  generated_images?: Array<{
    id?: string | number;
    url: string;
    title?: string;
    isMain?: boolean;
    source?: 'uploaded' | 'generated' | 'existing';
    image_display_url?: string;
    image?: string;
  }>;
  main_image_index?: number;

  is_urgent?: boolean;
  is_highlighted?: boolean;

  contact_name?: string;
  additional_info?: string;
  contacts?: AdContact[];
  use_profile_contacts?: boolean;

  phone?: string;
}

export interface CarAd {
  id: number;
  title: string;
  description: string;

  mark: { id: number; name: string } | number;
  model: string;
  generation?: string;
  modification?: string;

  year?: number;
  mileage?: number;
  mileage_km?: number;
  engine_volume?: number;
  engine_power?: number;
  fuel_type?: string;
  transmission?: string;
  transmission_type?: string;
  drive_type?: string;
  body_type?: string;
  color?: { id: number; name: string; hex_code?: string } | string | number;
  steering_wheel?: string;
  condition?: string;
  vin_code?: string;
  license_plate?: string;
  number_of_doors?: number;
  number_of_seats?: number;

  price: number;
  currency: Currency;
  price_usd?: number;
  price_eur?: number;
  price_uah?: number;

  region: { id: number; name: string } | string | number;
  city: { id: number; name: string } | string | number;
  city_name?: string;
  region_name?: string;

  status: AdStatus;
  is_validated: boolean;
  moderation_reason?: string;

  seller_type: string;
  exchange_status: string;
  is_urgent: boolean;
  is_highlighted: boolean;
  is_vip?: boolean;
  is_premium?: boolean;
  is_favorite?: boolean;

  views_count?: number;
  view_count?: number;
  favorites_count?: number;
  phone_views_count?: number;
  created_at: string;
  updated_at: string;

  dynamic_fields?: Record<string, any>;

  contacts?: Contact[];
  contact_name?: string;
  phone?: string;
  additional_info?: string;
  images?: CarAdImage[];

  brand?: string | number;
  mark_name?: string;
  vehicle_type?: string;
  vehicle_type_name?: string;
  user?: {
    id: number;
    email: string;
    account_type?: string;
    phone?: string;
  };
}

export interface AdStatistics {
  ad_id: number;
  title: string;
  is_premium: boolean;
  views?: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
  pricing?: {
    your_price: { amount: number; currency: string };
    region_average: { amount: number; currency: string; count: number; position_percentile: number };
    ukraine_average: { amount: number; currency: string; count: number; position_percentile: number };
  };
  recommendations?: Array<{
    type: 'price' | 'views' | 'description' | 'photos';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  last_updated: string;
}

export interface CarSearchFormData {
  vehicle_type?: string;
  brand?: string;
  model?: string;
  year_from?: number;
  year_to?: number;
  price_from?: number;
  price_to?: number;
  currency?: Currency;
  mileage_to?: number;
  fuel_type?: string;
  transmission?: string;
  region?: string;
  city?: string;
  status?: AdStatus;
  sort_by?: 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc' | 'created_desc';
  page_size?: number;
  favorites_only?: boolean;
  page?: number;
}

export interface ImageUploadFormData {
  images: FileList;
}

export interface CarAdAnalytics {
  ad_id: number;
  title: string;
  is_premium: boolean;
  views?: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
  pricing?: {
    your_price: { amount: number; currency: Currency };
    region_average: { amount: number; currency: Currency; count: number; position_percentile: number };
    ukraine_average: { amount: number; currency: Currency; count: number; position_percentile: number };
  };
  message?: string;
}

export interface UserProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  region: string;
  city: string;
  account_type: AccountType;
  notifications_email: boolean;
  notifications_push: boolean;
}

export interface ModerationResult {
  status: 'approved' | 'rejected' | 'needs_review';
  reason?: string;
  violations?: string[];
  censored_content?: { title?: string; description?: string };
}

export interface CarBrand {
  id: number;
  name: string;
  logo?: string;
  popular: boolean;
}

export interface CarModel {
  id: number;
  name: string;
  brand: number;
  popular: boolean;
}

export interface CarColor {
  id: number;
  name: string;
  hex_code?: string;
  popular: boolean;
}

export interface Region {
  id: number;
  name: string;
  cities: City[];
}

export interface City {
  id: number;
  name: string;
  region: number;
}

export interface CurrencyRate {
  base_currency: Currency;
  target_currency: Currency;
  rate: number;
  updated_at: string;
  source: string;
}

export interface CurrencyConversion {
  amount: number;
  from_currency: Currency;
  to_currency: Currency;
  converted_amount: number;
  rate: number;
  rate_date: string;
}

export interface AccountLimits {
  allowed: boolean;
  reason: string;
  account_type: AccountType;
  current_ads: number;
  max_ads: number | null;
  upgrade_message?: string;
  upgrade_url?: string;
}

export interface PlatformStatistics {
  total_ads: number;
  active_ads: number;
  total_users: number;
  premium_users: number;
  ads_by_brand: Array<{ brand: string; count: number }>;
  ads_by_region: Array<{ region: string; count: number }>;
  average_price_by_currency: Record<Currency, number>;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  ad_approved: boolean;
  ad_rejected: boolean;
  new_message: boolean;
  price_drop_alert: boolean;
}

export interface ChatMessage {
  id: number;
  ad_id: number;
  sender: { id: number; name: string; account_type: AccountType };
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface FavoriteAd {
  id: number;
  ad: CarAd;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormSubmissionResult {
  success: boolean;
  data?: any;
  errors?: FormValidationError[];
  message?: string;
}
'''

with open(path, 'w', encoding='utf-8') as f:
    f.write(clean_content)

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f'[OK] autoria.ts replaced with clean TypeScript: {len(lines)} lines')
