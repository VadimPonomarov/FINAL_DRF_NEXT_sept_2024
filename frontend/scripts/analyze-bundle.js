#!/usr/bin/env node

/**
 * Bundle analysis script to identify optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Analyzing bundle for optimization opportunities...\n');

// Check if webpack-bundle-analyzer is available
const hasBundleAnalyzer = checkPackage('webpack-bundle-analyzer');

if (!hasBundleAnalyzer) {
  console.log('📦 Installing webpack-bundle-analyzer...');
  try {
    execSync('npm install --save-dev webpack-bundle-analyzer', { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Failed to install webpack-bundle-analyzer');
    console.log('Please install it manually: npm install --save-dev webpack-bundle-analyzer');
  }
}

// Analyze package.json dependencies
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('📊 Dependency Analysis:');
console.log('====================');

// Analyze Radix UI dependencies
const radixDependencies = Object.keys(packageJson.dependencies)
  .filter(dep => dep.startsWith('@radix-ui/'))
  .sort();

console.log(`\n🎯 Radix UI Dependencies (${radixDependencies.length}):`);
radixDependencies.forEach(dep => {
  const version = packageJson.dependencies[dep];
  console.log(`  • ${dep}@${version}`);
});

// Analyze other UI dependencies
const uiDependencies = Object.keys(packageJson.dependencies)
  .filter(dep => 
    dep.includes('ui') || 
    dep.includes('component') || 
    dep.includes('design') ||
    dep.includes('radix') ||
    dep.includes('shadcn')
  )
  .sort();

console.log(`\n🎨 UI Dependencies (${uiDependencies.length}):`);
uiDependencies.forEach(dep => {
  const version = packageJson.dependencies[dep];
  console.log(`  • ${dep}@${version}`);
});

// Analyze React dependencies
const reactDependencies = Object.keys(packageJson.dependencies)
  .filter(dep => dep.includes('react'))
  .sort();

console.log(`\n⚛️  React Dependencies (${reactDependencies.length}):`);
reactDependencies.forEach(dep => {
  const version = packageJson.dependencies[dep];
  console.log(`  • ${dep}@${version}`);
});

// Calculate estimated bundle impact
const estimatedSizes = {
  '@radix-ui/react-dialog': 12,
  '@radix-ui/react-select': 15,
  '@radix-ui/react-tabs': 8,
  '@radix-ui/react-switch': 6,
  '@radix-ui/react-checkbox': 5,
  '@radix-ui/react-dropdown-menu': 18,
  '@radix-ui/react-popover': 10,
  '@radix-ui/react-tooltip': 7,
  '@radix-ui/react-toast': 9,
  '@radix-ui/react-progress': 4,
  '@radix-ui/react-scroll-area': 8,
  '@radix-ui/react-separator': 3,
  '@radix-ui/react-avatar': 6,
  '@radix-ui/react-label': 4,
  '@radix-ui/react-menubar': 12,
  '@radix-ui/react-slot': 5,
  '@radix-ui/react-visually-hidden': 2
};

let totalRadixSize = 0;
radixDependencies.forEach(dep => {
  const size = estimatedSizes[dep] || 5;
  totalRadixSize += size;
});

console.log(`\n📏 Estimated Bundle Impact:`);
console.log(`  • Total Radix UI size: ~${totalRadixSize}KB`);
console.log(`  • Potential reduction: ~${Math.round(totalRadixSize * 0.7)}KB (70% reduction)`);

// Generate optimization recommendations
const recommendations = generateRecommendations(radixDependencies, uiDependencies);

console.log(`\n💡 Optimization Recommendations:`);
console.log('================================');
recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec}`);
});

// Generate bundle analysis report
const report = {
  timestamp: new Date().toISOString(),
  radixDependencies: radixDependencies.length,
  uiDependencies: uiDependencies.length,
  reactDependencies: reactDependencies.length,
  estimatedRadixSize: totalRadixSize,
  potentialReduction: Math.round(totalRadixSize * 0.7),
  recommendations
};

fs.writeFileSync(
  path.join(__dirname, '../bundle-analysis.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📋 Bundle analysis report saved to bundle-analysis.json');

// Run bundle analyzer if available
if (hasBundleAnalyzer) {
  console.log('\n🚀 Running bundle analyzer...');
  try {
    execSync('npm run analyze', { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Bundle analyzer failed. Please check your build configuration.');
  }
}

function checkPackage(packageName) {
  try {
    require.resolve(packageName);
    return true;
  } catch (error) {
    return false;
  }
}

function generateRecommendations(radixDeps, uiDeps) {
  const recs = [];
  
  if (radixDeps.length > 5) {
    recs.push('Replace multiple Radix UI components with custom shadcn/ui components');
  }
  
  if (radixDeps.includes('@radix-ui/react-dialog')) {
    recs.push('Replace @radix-ui/react-dialog with custom Modal component');
  }
  
  if (radixDeps.includes('@radix-ui/react-select')) {
    recs.push('Replace @radix-ui/react-select with custom Select component');
  }
  
  if (radixDeps.includes('@radix-ui/react-tabs')) {
    recs.push('Replace @radix-ui/react-tabs with custom Tabs component');
  }
  
  if (radixDeps.includes('@radix-ui/react-switch')) {
    recs.push('Replace @radix-ui/react-switch with custom Switch component');
  }
  
  if (radixDeps.includes('@radix-ui/react-checkbox')) {
    recs.push('Replace @radix-ui/react-checkbox with custom Checkbox component');
  }
  
  if (radixDeps.includes('@radix-ui/react-dropdown-menu')) {
    recs.push('Replace @radix-ui/react-dropdown-menu with custom Dropdown component');
  }
  
  if (radixDeps.includes('@radix-ui/react-popover')) {
    recs.push('Replace @radix-ui/react-popover with custom Popover component');
  }
  
  if (radixDeps.includes('@radix-ui/react-tooltip')) {
    recs.push('Replace @radix-ui/react-tooltip with custom Tooltip component');
  }
  
  if (radixDeps.includes('@radix-ui/react-toast')) {
    recs.push('Replace @radix-ui/react-toast with custom Toast component');
  }
  
  recs.push('Implement tree-shaking for unused components');
  recs.push('Use dynamic imports for large components');
  recs.push('Optimize CSS with PurgeCSS or similar tools');
  recs.push('Consider using CSS-in-JS for better tree-shaking');
  
  return recs;
}
