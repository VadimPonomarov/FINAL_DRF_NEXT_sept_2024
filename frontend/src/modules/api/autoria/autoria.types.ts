// AutoRia API Types
export interface AutoRiaApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface AutoRiaApiError {
  code: string;
  message: string;
  details?: any;
  status: number;
}

export interface AutoRiaApiOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
  skipRetry?: boolean;
  headers?: Record<string, string>;
}

export interface AutoRiaApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

// AutoRia specific types
export interface CarAd {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  brand: string;
  brand_name: string;
  model: string;
  year: number;
  mileage: number;
  fuel_type: string;
  transmission: string;
  body_type: string;
  color: string;
  condition: string;
  status: string;
  created_at: string;
  updated_at: string;
  user: number;
  images: CarAdImage[];
}

export interface CarAdImage {
  id: number;
  url: string;
  caption: string;
  is_primary: boolean;
  order: number;
}

export interface ModerationStats {
  total_ads: number;
  pending_moderation: number;
  needs_review: number;
  rejected: number;
  blocked: number;
  active: number;
  today_moderated: number;
}

export interface ModerationAction {
  action: 'approve' | 'reject' | 'block' | 'activate' | 'review';
  reason?: string;
}

export interface SearchFilters {
  search?: string;
  status?: string;
  vehicle_type?: string;
  brand?: string;
  model?: string;
  year_from?: number;
  year_to?: number;
  price_from?: number;
  price_to?: number;
  region?: string;
  city?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}


