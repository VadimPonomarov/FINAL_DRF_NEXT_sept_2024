/**
 * Компонент кнопок управления формой (Mock Data и Reset)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import {
  generateMockSpecs,
  generateMockPricing,
  generateMockLocation,
  generateMockContacts,
  generateMockMetadata,
  generateFullMockData,
  getRequiredFieldsByTab
} from '@/modules/autoria/shared/utils/mockData';

interface FormControlButtonsProps {
  tabId: string;
  formData: Partial<CarAdFormData>;
  onUpdateFormData: (data: Partial<CarAdFormData>) => void;
  className?: string;
}

export const FormControlButtons: React.FC<FormControlButtonsProps> = ({
  tabId,
  formData,
  onUpdateFormData,
  className = ''
}) => {
  const { t } = useTranslation();

  /**
   * Генерирует мокковые данные для текущего таба
   */
  const handleGenerateMockData = () => {
    let mockData: Partial<CarAdFormData> = {};

    switch (tabId) {
      case 'specs':
        mockData = generateMockSpecs();
        break;
      case 'pricing':
        mockData = generateMockPricing();
        break;
      case 'location':
        mockData = generateMockLocation();
        break;
      case 'contact':
        mockData = { contacts: generateMockContacts() };
        break;
      case 'metadata':
        mockData = generateMockMetadata();
        break;
      default:
        mockData = generateFullMockData();
        break;
    }

    console.log(`[FormControlButtons] Generated mock data for ${tabId}:`, mockData);
    onUpdateFormData(mockData);
  };

  /**
   * Очищает поля текущего таба
   */
  const handleResetFields = () => {
    const requiredFields = getRequiredFieldsByTab(tabId);
    const resetData: Partial<CarAdFormData> = {};

    // Определяем поля для сброса в зависимости от таба
    switch (tabId) {
      case 'specs':
        Object.assign(resetData, {
          brand: '',
          model: '',
          year: undefined,
          mileage: undefined,
          engine_volume: undefined,
          engine_power: undefined,
          fuel_type: '',
          transmission: '',
          body_type: '',
          color: '',
          condition: '',
          title: '',
          description: ''
        });
        break;
      case 'pricing':
        Object.assign(resetData, {
          price: undefined,
          currency: 'UAH'
        });
        break;
      case 'location':
        Object.assign(resetData, {
          region: '',
          city: ''
        });
        break;
      case 'contact':
        Object.assign(resetData, {
          contacts: []
        });
        break;
      case 'metadata':
        Object.assign(resetData, {
          license_plate: '',
          number_of_doors: undefined,
          number_of_seats: undefined,
          seller_type: 'private',
          exchange_status: 'no_exchange',
          is_urgent: false,
          is_highlighted: false,
          additional_info: ''
        });
        break;
    }

    console.log(`[FormControlButtons] Reset fields for ${tabId}:`, resetData);
    onUpdateFormData(resetData);
  };

  /**
   * Получает название таба для отображения
   */
  const getTabDisplayName = (tabId: string): string => {
    switch (tabId) {
      case 'specs':
        return t('autoria.tabs.specs', 'Specifications');
      case 'pricing':
        return t('autoria.tabs.pricing', 'Pricing');
      case 'location':
        return t('autoria.tabs.location', 'Location');
      case 'contact':
        return t('autoria.tabs.contact', 'Contacts');
      case 'metadata':
        return t('autoria.additional.tabs.metadata', 'Metadata');
      default:
        return t('common.form', 'Form');
    }
  };

  const tabDisplayName = getTabDisplayName(tabId);

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Кнопка генерации мокковых данных */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerateMockData}
        className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
        title={`Generate test data for ${tabDisplayName}`}
      >
        <Wand2 className="h-4 w-4" />
        <span className="hidden sm:inline">Generate Data</span>
        <span className="sm:hidden">Mock</span>
      </Button>

      {/* Кнопка сброса полей */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleResetFields}
        className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        title={`Clear fields for ${tabDisplayName}`}
      >
        <RotateCcw className="h-4 w-4" />
        <span className="hidden sm:inline">Clear</span>
        <span className="sm:hidden">Reset</span>
      </Button>
    </div>
  );
};

/**
 * Компонент для полной генерации всех данных формы
 */
interface FullFormControlButtonsProps {
  onUpdateFormData: (data: Partial<CarAdFormData>) => void;
  onResetForm: () => void;
  className?: string;
}

export const FullFormControlButtons: React.FC<FullFormControlButtonsProps> = ({
  onUpdateFormData,
  onResetForm,
  className = ''
}) => {
  const { t } = useTranslation();

  const handleGenerateFullMockData = () => {
    const mockData = generateFullMockData();
    console.log('[FullFormControlButtons] Generated full mock data:', mockData);
    onUpdateFormData(mockData);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Кнопка генерации всех данных */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerateFullMockData}
        className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300"
        title="Generate all test data for form"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Generate All</span>
        <span className="sm:hidden">Mock All</span>
      </Button>

      {/* Кнопка полного сброса */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onResetForm}
        className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        title="Очистити всю форму"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Очистити все</span>
        <span className="sm:hidden">Reset All</span>
      </Button>
    </div>
  );
};

export default FormControlButtons;
