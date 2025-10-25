#!/usr/bin/env node

/**
 * Bundle Size Analyzer
 * Анализирует размер bundle и предлагает оптимизации
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('📦 Bundle Size Analyzer\n');

class BundleAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.nextDir = path.join(this.projectRoot, '.next');
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
  }

  async analyze() {
    console.log('🔍 Starting bundle analysis...\n');

    // Check if project is built
    if (!fs.existsSync(this.nextDir)) {
      console.log('⚠️  Project not built yet. Building...');
      try {
        execSync('npm run build', { stdio: 'inherit' });
      } catch (error) {
        console.error('❌ Build failed:', error.message);
        return;
      }
    }

    const analysis = {
      packageAnalysis: await this.analyzePackageJson(),
      bundleSize: await this.analyzeBundleSize(),
      recommendations: []
    };

    this.generateRecommendations(analysis);
    this.displayResults(analysis);
    
    return analysis;
  }

  async analyzePackageJson() {
    console.log('📋 Analyzing package.json dependencies...');
    
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf-8'));
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    // Heavy packages that might need optimization
    const heavyPackages = [
      '@radix-ui', 'framer-motion', 'chart.js', 'recharts', 
      'react-beautiful-dnd', 'html2canvas', 'jspdf', 'xlsx'
    ];

    const analysis = {
      totalDependencies: Object.keys(dependencies).length,
      totalDevDependencies: Object.keys(devDependencies).length,
      heavyPackagesFound: [],
      potentiallyUnused: [],
      duplicateTypes: []
    };

    // Check for heavy packages
    Object.keys(dependencies).forEach(pkg => {
      if (heavyPackages.some(heavy => pkg.includes(heavy))) {
        analysis.heavyPackagesFound.push(pkg);
      }
    });

    // Check for potentially unused packages
    const potentiallyUnused = [
      'react-beautiful-dnd', // Used only in specific components
      'html2canvas', // Used only for PDF generation
      'jspdf', // Used only for PDF generation
      'xlsx', // Used only for Excel export
      'websocket-as-promised', // Might be replaced with native WebSocket
      'uuid' // Often can be replaced with crypto.randomUUID()
    ];

    potentiallyUnused.forEach(pkg => {
      if (dependencies[pkg]) {
        analysis.potentiallyUnused.push(pkg);
      }
    });

    return analysis;
  }

  async analyzeBundleSize() {
    console.log('📊 Analyzing bundle size...');

    const buildManifest = path.join(this.nextDir, 'build-manifest.json');
    const appBuildManifest = path.join(this.nextDir, 'app-build-manifest.json');
    
    const analysis = {
      pages: {},
      chunks: {},
      totalSize: 0,
      largestChunks: []
    };

    try {
      // Analyze static chunks
      const staticDir = path.join(this.nextDir, 'static');
      if (fs.existsSync(staticDir)) {
        const chunks = this.getChunkSizes(staticDir);
        analysis.chunks = chunks;
        analysis.totalSize = Object.values(chunks).reduce((sum, size) => sum + size, 0);
        
        // Find largest chunks
        analysis.largestChunks = Object.entries(chunks)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([name, size]) => ({ name, size: this.formatSize(size) }));
      }

      // Analyze build manifest if exists
      if (fs.existsSync(buildManifest)) {
        const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf-8'));
        analysis.pages = this.analyzePagesFromManifest(manifest);
      }

    } catch (error) {
      console.warn('⚠️  Could not analyze build files:', error.message);
    }

    return analysis;
  }

  getChunkSizes(dir) {
    const chunks = {};
    
    const scanDirectory = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.endsWith('.js') || item.endsWith('.css')) {
          const relativePath = path.relative(dir, itemPath);
          chunks[relativePath] = stat.size;
        }
      });
    };

    scanDirectory(dir);
    return chunks;
  }

  analyzePagesFromManifest(manifest) {
    const pages = {};
    
    Object.entries(manifest.pages || {}).forEach(([route, files]) => {
      const totalSize = files.reduce((sum, file) => {
        const filePath = path.join(this.nextDir, 'static', file);
        if (fs.existsSync(filePath)) {
          return sum + fs.statSync(filePath).size;
        }
        return sum;
      }, 0);
      
      pages[route] = {
        files: files.length,
        size: totalSize,
        formattedSize: this.formatSize(totalSize)
      };
    });

    return pages;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // Package recommendations
    if (analysis.packageAnalysis.heavyPackagesFound.length > 0) {
      recommendations.push({
        type: 'packages',
        priority: 'high',
        title: 'Heavy packages detected',
        description: `Found ${analysis.packageAnalysis.heavyPackagesFound.length} potentially heavy packages`,
        packages: analysis.packageAnalysis.heavyPackagesFound,
        suggestions: [
          'Consider lazy loading these packages',
          'Use dynamic imports for non-critical features',
          'Check if lighter alternatives exist'
        ]
      });
    }

    // Bundle size recommendations
    if (analysis.bundleSize.largestChunks.length > 0) {
      const largestChunk = analysis.bundleSize.largestChunks[0];
      if (this.parseSize(largestChunk.size) > 500 * 1024) { // > 500KB
        recommendations.push({
          type: 'bundle',
          priority: 'high',
          title: 'Large chunks detected',
          description: `Largest chunk: ${largestChunk.name} (${largestChunk.size})`,
          suggestions: [
            'Consider code splitting',
            'Use dynamic imports',
            'Implement lazy loading for routes'
          ]
        });
      }
    }

    // Potentially unused packages
    if (analysis.packageAnalysis.potentiallyUnused.length > 0) {
      recommendations.push({
        type: 'cleanup',
        priority: 'medium',
        title: 'Potentially unused packages',
        description: 'Some packages might not be used frequently',
        packages: analysis.packageAnalysis.potentiallyUnused,
        suggestions: [
          'Audit package usage',
          'Consider removing unused packages',
          'Use dynamic imports for rarely used features'
        ]
      });
    }

    // Next.js specific optimizations
    recommendations.push({
      type: 'nextjs',
      priority: 'medium',
      title: 'Next.js optimizations',
      suggestions: [
        'Enable experimental.optimizePackageImports for common packages',
        'Use next/dynamic for heavy components',
        'Implement proper image optimization',
        'Consider using next/font for font optimization'
      ]
    });

    analysis.recommendations = recommendations;
  }

  displayResults(analysis) {
    console.log('\n📊 BUNDLE ANALYSIS RESULTS\n');

    // Package analysis
    console.log('📦 PACKAGE ANALYSIS:');
    console.log(`   Dependencies: ${analysis.packageAnalysis.totalDependencies}`);
    console.log(`   Dev Dependencies: ${analysis.packageAnalysis.totalDevDependencies}`);
    console.log(`   Heavy packages: ${analysis.packageAnalysis.heavyPackagesFound.length}`);
    console.log(`   Potentially unused: ${analysis.packageAnalysis.potentiallyUnused.length}`);

    if (analysis.packageAnalysis.heavyPackagesFound.length > 0) {
      console.log('\n🏋️  HEAVY PACKAGES:');
      analysis.packageAnalysis.heavyPackagesFound.forEach(pkg => {
        console.log(`   📦 ${pkg}`);
      });
    }

    // Bundle size analysis
    if (analysis.bundleSize.totalSize > 0) {
      console.log(`\n📊 BUNDLE SIZE: ${this.formatSize(analysis.bundleSize.totalSize)}`);
      
      if (analysis.bundleSize.largestChunks.length > 0) {
        console.log('\n🔝 LARGEST CHUNKS:');
        analysis.bundleSize.largestChunks.slice(0, 5).forEach(chunk => {
          console.log(`   📄 ${chunk.name}: ${chunk.size}`);
        });
      }
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:\n');
      analysis.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`${priority} ${rec.title}`);
        console.log(`   ${rec.description || ''}`);
        
        if (rec.packages) {
          console.log(`   Packages: ${rec.packages.join(', ')}`);
        }
        
        rec.suggestions.forEach(suggestion => {
          console.log(`   • ${suggestion}`);
        });
        
        if (index < analysis.recommendations.length - 1) console.log('');
      });
    }

    // Save detailed report
    const reportPath = 'bundle-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Summary
    const totalRecommendations = analysis.recommendations.length;
    const highPriority = analysis.recommendations.filter(r => r.priority === 'high').length;
    
    console.log('\n📋 SUMMARY:');
    console.log(`   Total recommendations: ${totalRecommendations}`);
    console.log(`   High priority: ${highPriority}`);
    console.log(`   Bundle size: ${this.formatSize(analysis.bundleSize.totalSize)}`);
    
    if (highPriority > 0) {
      console.log('\n⚠️  Focus on high priority recommendations first!');
    } else {
      console.log('\n✅ Bundle looks good! Consider medium priority optimizations.');
    }
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  parseSize(sizeStr) {
    const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB)$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    return value * multipliers[unit];
  }
}

// Main execution
async function main() {
  try {
    const analyzer = new BundleAnalyzer();
    await analyzer.analyze();
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run if this is the main module
main();
