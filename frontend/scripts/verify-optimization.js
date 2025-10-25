#!/usr/bin/env node

/**
 * Optimization Verification Script
 * Проверяет результаты оптимизации проекта
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Verification of Optimization Results\n');

class OptimizationVerifier {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      reactIcons: { status: 'unknown', details: [] },
      bundleConfig: { status: 'unknown', details: [] },
      dynamicImports: { status: 'unknown', details: [] },
      typesCleaned: { status: 'unknown', details: [] },
      typesConsolidated: { status: 'unknown', details: [] },
      buildSize: { status: 'unknown', details: [] }
    };
  }

  async verify() {
    console.log('🚀 Starting optimization verification...\n');

    await this.verifyReactIconsOptimization();
    await this.verifyBundleConfiguration();
    await this.verifyDynamicImports();
    await this.verifyTypesCleanup();
    await this.verifyTypesConsolidation();
    await this.verifyBuildSize();

    this.displayResults();
    return this.results;
  }

  async verifyReactIconsOptimization() {
    console.log('📦 Checking react-icons optimization...');
    
    try {
      // Проверяем, что импорты заменены на точечные
      const menuFile = path.join(this.projectRoot, 'src/components/Menus/MenuMain/MenuMain.tsx');
      const dialogFile = path.join(this.projectRoot, 'src/components/All/DialogModal/DialogModal.tsx');
      const filterFile = path.join(this.projectRoot, 'src/components/All/FilterIcon/FilterIconView.tsx');

      let optimizedCount = 0;
      const details = [];

      if (fs.existsSync(menuFile)) {
        const content = fs.readFileSync(menuFile, 'utf-8');
        if (content.includes("import FaBook from 'react-icons/fa/FaBook'")) {
          optimizedCount++;
          details.push('✅ MenuMain.tsx - точечные импорты');
        } else {
          details.push('❌ MenuMain.tsx - не оптимизировано');
        }
      }

      if (fs.existsSync(dialogFile)) {
        const content = fs.readFileSync(dialogFile, 'utf-8');
        if (content.includes("import FaFilter from 'react-icons/fa/FaFilter'")) {
          optimizedCount++;
          details.push('✅ DialogModal.tsx - точечные импорты');
        } else {
          details.push('❌ DialogModal.tsx - не оптимизировано');
        }
      }

      if (fs.existsSync(filterFile)) {
        const content = fs.readFileSync(filterFile, 'utf-8');
        if (content.includes("import FaFilter from 'react-icons/fa/FaFilter'")) {
          optimizedCount++;
          details.push('✅ FilterIconView.tsx - точечные импорты');
        } else {
          details.push('❌ FilterIconView.tsx - не оптимизировано');
        }
      }

      this.results.reactIcons = {
        status: optimizedCount === 3 ? 'success' : 'partial',
        details: [`Оптимизировано файлов: ${optimizedCount}/3`, ...details]
      };

    } catch (error) {
      this.results.reactIcons = {
        status: 'error',
        details: [`Ошибка проверки: ${error.message}`]
      };
    }
  }

  async verifyBundleConfiguration() {
    console.log('⚙️  Checking bundle configuration...');
    
    try {
      const nextConfigPath = path.join(this.projectRoot, 'next.config.js');
      
      if (fs.existsSync(nextConfigPath)) {
        const content = fs.readFileSync(nextConfigPath, 'utf-8');
        const details = [];
        
        if (content.includes('optimizePackageImports')) {
          details.push('✅ optimizePackageImports настроен');
        } else {
          details.push('❌ optimizePackageImports не найден');
        }

        if (content.includes('@radix-ui/react-avatar')) {
          details.push('✅ Radix UI пакеты добавлены');
        } else {
          details.push('❌ Radix UI пакеты не добавлены');
        }

        if (content.includes('react-icons')) {
          details.push('✅ react-icons добавлен в оптимизацию');
        } else {
          details.push('❌ react-icons не добавлен');
        }

        this.results.bundleConfig = {
          status: details.filter(d => d.includes('✅')).length === 3 ? 'success' : 'partial',
          details
        };
      } else {
        this.results.bundleConfig = {
          status: 'error',
          details: ['❌ next.config.js не найден']
        };
      }

    } catch (error) {
      this.results.bundleConfig = {
        status: 'error',
        details: [`Ошибка проверки: ${error.message}`]
      };
    }
  }

  async verifyDynamicImports() {
    console.log('🔄 Checking dynamic imports...');
    
    try {
      const dynamicChartPath = path.join(this.projectRoot, 'src/components/AutoRia/Analytics/Charts/DynamicChartComponents.tsx');
      const dynamicExportPath = path.join(this.projectRoot, 'src/utils/export/DynamicExportUtils.ts');
      
      const details = [];
      let successCount = 0;

      if (fs.existsSync(dynamicChartPath)) {
        const content = fs.readFileSync(dynamicChartPath, 'utf-8');
        if (content.includes('lazy(async () => {') && content.includes("await import('chart.js/auto')")) {
          details.push('✅ DynamicChartComponents.tsx создан');
          successCount++;
        } else {
          details.push('❌ DynamicChartComponents.tsx некорректен');
        }
      } else {
        details.push('❌ DynamicChartComponents.tsx не найден');
      }

      if (fs.existsSync(dynamicExportPath)) {
        const content = fs.readFileSync(dynamicExportPath, 'utf-8');
        if (content.includes("await import('jspdf')") && content.includes("await import('xlsx')")) {
          details.push('✅ DynamicExportUtils.ts создан');
          successCount++;
        } else {
          details.push('❌ DynamicExportUtils.ts некорректен');
        }
      } else {
        details.push('❌ DynamicExportUtils.ts не найден');
      }

      this.results.dynamicImports = {
        status: successCount === 2 ? 'success' : 'partial',
        details: [`Создано файлов: ${successCount}/2`, ...details]
      };

    } catch (error) {
      this.results.dynamicImports = {
        status: 'error',
        details: [`Ошибка проверки: ${error.message}`]
      };
    }
  }

  async verifyTypesCleanup() {
    console.log('🧹 Checking types cleanup...');
    
    try {
      const entitiesPath = path.join(this.projectRoot, 'src/types/entities.ts');
      const enhancedChatPath = path.join(this.projectRoot, 'src/types/enhanced-chat.ts');
      const autoriaPath = path.join(this.projectRoot, 'src/types/autoria.ts');
      
      const details = [];
      let cleanedCount = 0;

      if (fs.existsSync(entitiesPath)) {
        const content = fs.readFileSync(entitiesPath, 'utf-8');
        const lineCount = content.split('\n').length;
        if (lineCount < 100) { // Значительно уменьшился
          details.push(`✅ entities.ts очищен (${lineCount} строк)`);
          cleanedCount++;
        } else {
          details.push(`❌ entities.ts не очищен (${lineCount} строк)`);
        }
      }

      if (fs.existsSync(enhancedChatPath)) {
        const content = fs.readFileSync(enhancedChatPath, 'utf-8');
        if (!content.includes('WelcomeMessage') && !content.includes('PongMessage')) {
          details.push('✅ enhanced-chat.ts очищен');
          cleanedCount++;
        } else {
          details.push('❌ enhanced-chat.ts не очищен');
        }
      }

      if (fs.existsSync(autoriaPath)) {
        const content = fs.readFileSync(autoriaPath, 'utf-8');
        if (!content.includes('ContactType')) {
          details.push('✅ autoria.ts очищен');
          cleanedCount++;
        } else {
          details.push('❌ autoria.ts не очищен');
        }
      }

      this.results.typesCleaned = {
        status: cleanedCount >= 2 ? 'success' : 'partial',
        details: [`Очищено файлов: ${cleanedCount}/3`, ...details]
      };

    } catch (error) {
      this.results.typesCleaned = {
        status: 'error',
        details: [`Ошибка проверки: ${error.message}`]
      };
    }
  }

  async verifyTypesConsolidation() {
    console.log('🔗 Checking types consolidation...');
    
    try {
      const sharedCommonPath = path.join(this.projectRoot, 'src/types/shared/common.ts');
      const sharedIndexPath = path.join(this.projectRoot, 'src/types/shared/index.ts');
      
      const details = [];
      let consolidatedCount = 0;

      if (fs.existsSync(sharedCommonPath)) {
        const content = fs.readFileSync(sharedCommonPath, 'utf-8');
        const interfaceCount = (content.match(/export interface/g) || []).length;
        const typeCount = (content.match(/export type/g) || []).length;
        
        if (interfaceCount > 20 && typeCount > 10) {
          details.push(`✅ common.ts создан (${interfaceCount} интерфейсов, ${typeCount} типов)`);
          consolidatedCount++;
        } else {
          details.push(`❌ common.ts недостаточно типов (${interfaceCount} интерфейсов, ${typeCount} типов)`);
        }
      } else {
        details.push('❌ common.ts не найден');
      }

      if (fs.existsSync(sharedIndexPath)) {
        const content = fs.readFileSync(sharedIndexPath, 'utf-8');
        if (content.includes("export * from './common'") && content.includes('DeepPartial')) {
          details.push('✅ index.ts создан с реэкспортами');
          consolidatedCount++;
        } else {
          details.push('❌ index.ts некорректен');
        }
      } else {
        details.push('❌ index.ts не найден');
      }

      this.results.typesConsolidated = {
        status: consolidatedCount === 2 ? 'success' : 'partial',
        details: [`Создано файлов: ${consolidatedCount}/2`, ...details]
      };

    } catch (error) {
      this.results.typesConsolidated = {
        status: 'error',
        details: [`Ошибка проверки: ${error.message}`]
      };
    }
  }

  async verifyBuildSize() {
    console.log('📏 Checking build size...');
    
    try {
      // Проверяем, есть ли .next директория
      const nextDir = path.join(this.projectRoot, '.next');
      
      if (fs.existsSync(nextDir)) {
        // Запускаем анализ размера bundle
        try {
          execSync('node scripts/analyze-bundle-size.js', { 
            stdio: 'pipe',
            cwd: this.projectRoot 
          });
          
          // Читаем отчет
          const reportPath = path.join(this.projectRoot, 'bundle-analysis-report.json');
          if (fs.existsSync(reportPath)) {
            const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
            const totalSizeMB = (report.bundleSize.totalSize / (1024 * 1024)).toFixed(2);
            
            this.results.buildSize = {
              status: totalSizeMB < 15 ? 'success' : 'warning',
              details: [
                `📊 Общий размер: ${totalSizeMB} MB`,
                `📦 Зависимостей: ${report.packageAnalysis.totalDependencies}`,
                `🏋️  Тяжелых пакетов: ${report.packageAnalysis.heavyPackagesFound.length}`
              ]
            };
          } else {
            this.results.buildSize = {
              status: 'warning',
              details: ['⚠️  Отчет о размере не найден']
            };
          }
        } catch (error) {
          this.results.buildSize = {
            status: 'warning',
            details: [`⚠️  Не удалось проанализировать размер: ${error.message}`]
          };
        }
      } else {
        this.results.buildSize = {
          status: 'warning',
          details: ['⚠️  Проект не собран. Запустите npm run build']
        };
      }

    } catch (error) {
      this.results.buildSize = {
        status: 'error',
        details: [`Ошибка проверки: ${error.message}`]
      };
    }
  }

  displayResults() {
    console.log('\n📊 РЕЗУЛЬТАТЫ ВЕРИФИКАЦИИ ОПТИМИЗАЦИИ\n');

    const sections = [
      { key: 'reactIcons', title: '📦 React Icons Оптимизация' },
      { key: 'bundleConfig', title: '⚙️  Bundle Конфигурация' },
      { key: 'dynamicImports', title: '🔄 Динамические Импорты' },
      { key: 'typesCleaned', title: '🧹 Очистка Типов' },
      { key: 'typesConsolidated', title: '🔗 Консолидация Типов' },
      { key: 'buildSize', title: '📏 Размер Bundle' }
    ];

    sections.forEach(section => {
      const result = this.results[section.key];
      const statusIcon = {
        success: '✅',
        partial: '⚠️ ',
        warning: '⚠️ ',
        error: '❌',
        unknown: '❓'
      }[result.status];

      console.log(`${statusIcon} ${section.title}`);
      result.details.forEach(detail => {
        console.log(`   ${detail}`);
      });
      console.log('');
    });

    // Общая статистика
    const successCount = Object.values(this.results).filter(r => r.status === 'success').length;
    const totalCount = Object.keys(this.results).length;
    
    console.log('📈 ОБЩАЯ СТАТИСТИКА:');
    console.log(`   Успешно: ${successCount}/${totalCount}`);
    console.log(`   Процент завершения: ${Math.round((successCount / totalCount) * 100)}%`);
    
    if (successCount === totalCount) {
      console.log('\n🎉 ВСЕ ОПТИМИЗАЦИИ ПРИМЕНЕНЫ УСПЕШНО!');
    } else if (successCount >= totalCount * 0.7) {
      console.log('\n👍 БОЛЬШИНСТВО ОПТИМИЗАЦИЙ ПРИМЕНЕНО!');
    } else {
      console.log('\n⚠️  ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ РАБОТА');
    }

    // Сохраняем отчет
    const reportPath = path.join(this.projectRoot, 'optimization-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Отчет сохранен: ${reportPath}`);
  }
}

// Main execution
async function main() {
  try {
    const verifier = new OptimizationVerifier();
    await verifier.verify();
  } catch (error) {
    console.error('❌ Ошибка верификации:', error);
    process.exit(1);
  }
}

// Run if this is the main module
main();
