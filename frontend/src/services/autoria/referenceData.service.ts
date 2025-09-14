/**
 * Сервис для работы со справочными данными
 * Получение марок, моделей, регионов, цветов и других справочников
 */

export interface ReferenceItem {
  id: number;
  name: string;
  value?: string;
  label?: string;
}

export interface VehicleType extends ReferenceItem {
  description?: string;
}

export interface CarMark extends ReferenceItem {
  is_popular?: boolean;
  country_origin?: string;
  models_count?: number;
}

export interface CarModel extends ReferenceItem {
  mark_id: number;
  mark_name?: string;
  generations_count?: number;
}

export interface Region extends ReferenceItem {
  cities_count?: number;
}

export interface City extends ReferenceItem {
  region_id: number;
  region_name?: string;
}

export interface Color extends ReferenceItem {
  hex_code?: string;
  is_popular?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class ReferenceDataService {
  private static readonly API_BASE = '/api/public/reference';

  // Получение типов транспортных средств
  static async getVehicleTypes(): Promise<VehicleType[]> {
    try {
      const response = await fetch(`${this.API_BASE}/vehicle-types/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch vehicle types: ${response.statusText}`);
      }
      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      return [];
    }
  }

  // Получение марок автомобилей
  static async getCarMarks(params?: {
    search?: string;
    is_popular?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<CarMark>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `${this.API_BASE}/brands${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch car marks: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching car marks:', error);
      return { count: 0, next: null, previous: null, results: [] };
    }
  }

  // Получение моделей по марке
  static async getCarModels(markId?: number, params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<CarModel>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (markId) {
        queryParams.append('mark_id', String(markId));
      }
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `/api/public/reference/models${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch car models: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching car models:', error);
      return { count: 0, next: null, previous: null, results: [] };
    }
  }

  // Получение регионов
  static async getRegions(params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Region>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `${this.API_BASE}/regions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch regions: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching regions:', error);
      return { count: 0, next: null, previous: null, results: [] };
    }
  }

  // Получение городов по региону
  static async getCities(regionId?: number, params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<City>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (regionId) {
        queryParams.append('region_id', String(regionId));
      }
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `/api/public/reference/cities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cities: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching cities:', error);
      return { count: 0, next: null, previous: null, results: [] };
    }
  }

  // Получение цветов
  static async getColors(params?: {
    search?: string;
    is_popular?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Color>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `${this.API_BASE}/colors${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch colors: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching colors:', error);
      return { count: 0, next: null, previous: null, results: [] };
    }
  }

  // Получение всех справочных данных для форм (упрощенный формат)
  static async getAllReferenceData() {
    try {
      const [vehicleTypes, marks, regions, colors] = await Promise.all([
        this.getVehicleTypes(),
        this.getCarMarks({ page_size: 100 }),
        this.getRegions({ page_size: 100 }),
        this.getColors({ page_size: 50 })
      ]);

      return {
        vehicleTypes,
        marks: marks.results,
        regions: regions.results,
        colors: colors.results
      };
    } catch (error) {
      console.error('Error fetching all reference data:', error);
      return {
        vehicleTypes: [],
        marks: [],
        regions: [],
        colors: []
      };
    }
  }
}

export default ReferenceDataService;
