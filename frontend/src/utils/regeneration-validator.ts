/**
 * Система валидации и перегенерации проблемных записей
 * Принцип: При неопределенности и ошибках - делать цикл перегенераций вместо fallback значений
 */

export interface ValidationIssue {
  type: 'critical' | 'warning' | 'info';
  field: string;
  message: string;
  currentValue: any;
  expectedValue?: any;
}

export interface ValidationResult {
  isValid: boolean;
  needsRegeneration: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100, где 100 = идеально
}

export interface RegenerationConfig {
  maxAttempts: number;
  criticalThreshold: number; // Минимальный score для принятия записи
  warningThreshold: number;
}

const DEFAULT_CONFIG: RegenerationConfig = {
  maxAttempts: 3,
  criticalThreshold: 80, // Если score < 80, нужна перегенерация
  warningThreshold: 90   // Если score < 90, показываем предупреждения
};

/**
 * Валидатор для проверки качества сгенерированных объявлений
 */
export class RegenerationValidator {
  private config: RegenerationConfig;

  constructor(config: Partial<RegenerationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Проверяет объявление на проблемы и определяет нужна ли перегенерация
   */
  validateAd(adData: any): ValidationResult {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // 1. Проверка каскадной консистентности (КРИТИЧНО)
    const cascadeIssues = this.validateCascadeConsistency(adData);
    issues.push(...cascadeIssues);
    score -= cascadeIssues.filter(i => i.type === 'critical').length * 30;

    // 2. Проверка соответствия брендов и типов (КРИТИЧНО)
    const brandTypeIssues = this.validateBrandTypeMatch(adData);
    issues.push(...brandTypeIssues);
    score -= brandTypeIssues.filter(i => i.type === 'critical').length * 25;

    // 3. Проверка логичности данных (ПРЕДУПРЕЖДЕНИЕ)
    const logicIssues = this.validateDataLogic(adData);
    issues.push(...logicIssues);
    score -= logicIssues.filter(i => i.type === 'warning').length * 10;

    // 4. Проверка полноты данных (ПРЕДУПРЕЖДЕНИЕ)
    const completenessIssues = this.validateCompleteness(adData);
    issues.push(...completenessIssues);
    score -= completenessIssues.filter(i => i.type === 'warning').length * 5;

    const finalScore = Math.max(0, score);
    const needsRegeneration = finalScore < this.config.criticalThreshold;

    return {
      isValid: finalScore >= this.config.warningThreshold,
      needsRegeneration,
      issues,
      score: finalScore
    };
  }

  /**
   * Проверяет каскадную консистентность: Модель → Марка → Тип транспорта
   */
  private validateCascadeConsistency(adData: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Проверяем что все уровни каскада заполнены
    if (!adData.vehicle_type_name) {
      issues.push({
        type: 'critical',
        field: 'vehicle_type_name',
        message: 'Отсутствует тип транспорта',
        currentValue: adData.vehicle_type_name
      });
    }

    if (!adData.brand) {
      issues.push({
        type: 'critical',
        field: 'brand',
        message: 'Отсутствует марка',
        currentValue: adData.brand
      });
    }

    if (!adData.model) {
      issues.push({
        type: 'critical',
        field: 'model',
        message: 'Отсутствует модель',
        currentValue: adData.model
      });
    }

    return issues;
  }

  /**
   * Проверяет соответствие марки и типа транспорта
   */
  private validateBrandTypeMatch(adData: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const brand = adData.brand?.toLowerCase();
    const vehicleType = adData.vehicle_type_name?.toLowerCase();

    if (!brand || !vehicleType) return issues;

    // Известные несоответствия которые требуют перегенерации
    const carBrands = ['bmw', 'mercedes-benz', 'audi', 'toyota', 'honda', 'hyundai', 'ford', 'volkswagen'];
    const motorcycleBrands = ['yamaha', 'honda', 'kawasaki', 'suzuki', 'ducati', 'brp'];
    const truckBrands = ['man', 'scania', 'volvo', 'daf', 'iveco', 'kamaz'];
    const specialBrands = ['atlas copco', 'caterpillar', 'komatsu', 'liebherr'];

    // Проверяем критические несоответствия
    if (vehicleType.includes('легков') && !carBrands.some(cb => brand.includes(cb))) {
      // Если тип "легковые", но марка не автомобильная
      if (motorcycleBrands.some(mb => brand.includes(mb))) {
        issues.push({
          type: 'critical',
          field: 'vehicle_type_brand_mismatch',
          message: `Марка мотоциклов "${adData.brand}" не может быть типа "Легковые"`,
          currentValue: { brand: adData.brand, type: adData.vehicle_type_name },
          expectedValue: 'Мото'
        });
      }
      if (specialBrands.some(sb => brand.includes(sb))) {
        issues.push({
          type: 'critical',
          field: 'vehicle_type_brand_mismatch',
          message: `Марка спецтехники "${adData.brand}" не может быть типа "Легковые"`,
          currentValue: { brand: adData.brand, type: adData.vehicle_type_name },
          expectedValue: 'Спецтехніка'
        });
      }
    }

    return issues;
  }

  /**
   * Проверяет логичность данных (год, пробег, цена)
   */
  private validateDataLogic(adData: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Проверка года
    const year = adData.year;
    if (year && (year < 1900 || year > 2025)) {
      issues.push({
        type: 'warning',
        field: 'year',
        message: `Некорректный год: ${year}`,
        currentValue: year
      });
    }

    // Проверка пробега
    const mileage = adData.mileage;
    if (mileage && (mileage < 0 || mileage > 1000000)) {
      issues.push({
        type: 'warning',
        field: 'mileage',
        message: `Некорректный пробег: ${mileage}`,
        currentValue: mileage
      });
    }

    // Проверка соответствия года и пробега
    if (year && mileage && year > 1900) {
      const age = 2024 - year;
      const expectedMileageRange = [age * 5000, age * 30000]; // 5-30 тыс км в год
      if (age > 0 && (mileage < expectedMileageRange[0] * 0.1 || mileage > expectedMileageRange[1] * 2)) {
        issues.push({
          type: 'warning',
          field: 'year_mileage_mismatch',
          message: `Несоответствие года (${year}) и пробега (${mileage} км)`,
          currentValue: { year, mileage }
        });
      }
    }

    return issues;
  }

  /**
   * Проверяет полноту данных
   */
  private validateCompleteness(adData: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const requiredFields = ['title', 'description', 'price', 'currency'];
    const missingFields = requiredFields.filter(field => !adData[field]);

    missingFields.forEach(field => {
      issues.push({
        type: 'warning',
        field,
        message: `Отсутствует обязательное поле: ${field}`,
        currentValue: adData[field]
      });
    });

    return issues;
  }

  /**
   * Определяет нужна ли перегенерация для массива объявлений
   */
  validateBatch(ads: any[]): { validAds: any[], problematicAds: any[], needsRegeneration: boolean } {
    const results = ads.map(ad => ({ ad, validation: this.validateAd(ad) }));
    
    const validAds = results
      .filter(r => !r.validation.needsRegeneration)
      .map(r => r.ad);
    
    const problematicAds = results
      .filter(r => r.validation.needsRegeneration)
      .map(r => ({ ...r.ad, validationIssues: r.validation.issues }));

    return {
      validAds,
      problematicAds,
      needsRegeneration: problematicAds.length > 0
    };
  }

  /**
   * Создает отчет о валидации
   */
  createValidationReport(ads: any[]): string {
    const batchResult = this.validateBatch(ads);
    const totalAds = ads.length;
    const validCount = batchResult.validAds.length;
    const problematicCount = batchResult.problematicAds.length;

    let report = `📊 ОТЧЕТ ВАЛИДАЦИИ:\n`;
    report += `================================================================================\n`;
    report += `📋 Всего объявлений: ${totalAds}\n`;
    report += `✅ Валидных: ${validCount} (${Math.round(validCount/totalAds*100)}%)\n`;
    report += `❌ Проблемных: ${problematicCount} (${Math.round(problematicCount/totalAds*100)}%)\n\n`;

    if (problematicCount > 0) {
      report += `🔄 ТРЕБУЮТ ПЕРЕГЕНЕРАЦИИ:\n`;
      report += `------------------------------------------------------------\n`;
      
      batchResult.problematicAds.forEach((ad, index) => {
        report += `${index + 1}. ${ad.title || 'Без названия'}\n`;
        if (ad.validationIssues) {
          ad.validationIssues.forEach((issue: ValidationIssue) => {
            const icon = issue.type === 'critical' ? '🚨' : '⚠️';
            report += `   ${icon} ${issue.message}\n`;
          });
        }
        report += `\n`;
      });
    }

    return report;
  }
}

// Экспорт singleton instance
export const regenerationValidator = new RegenerationValidator();
