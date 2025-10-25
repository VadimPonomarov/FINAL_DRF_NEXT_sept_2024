#!/usr/bin/env node

/**
 * Script to optimize dependencies by removing unused Radix UI packages
 * and replacing them with custom shadcn/ui components
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Radix UI packages that can be replaced with custom components
const radixPackagesToRemove = [
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox', 
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-label',
  '@radix-ui/react-menubar',
  '@radix-ui/react-popover',
  '@radix-ui/react-progress',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-slot',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  '@radix-ui/react-tooltip',
  '@radix-ui/react-visually-hidden'
];

// Keep only essential Radix UI packages
const essentialRadixPackages = [
  '@radix-ui/react-slot' // Still needed for shadcn/ui
];

console.log('🔍 Analyzing dependencies...');

// Check which Radix UI packages are actually used
const usedRadixPackages = [];
const unusedRadixPackages = [];

radixPackagesToRemove.forEach(packageName => {
  if (packageJson.dependencies[packageName]) {
    // Check if package is actually used in the codebase
    const isUsed = checkPackageUsage(packageName);
    if (isUsed) {
      usedRadixPackages.push(packageName);
    } else {
      unusedRadixPackages.push(packageName);
    }
  }
});

console.log(`📦 Found ${usedRadixPackages.length} used Radix UI packages`);
console.log(`🗑️  Found ${unusedRadixPackages.length} unused Radix UI packages`);

// Remove unused packages
if (unusedRadixPackages.length > 0) {
  console.log('\n🧹 Removing unused Radix UI packages...');
  
  unusedRadixPackages.forEach(packageName => {
    delete packageJson.dependencies[packageName];
    console.log(`  ✅ Removed ${packageName}`);
  });

  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('\n✅ Updated package.json');
}

// Add optimization recommendations
const recommendations = [
  'Replace @radix-ui/react-dialog with custom Modal component',
  'Replace @radix-ui/react-select with custom Select component', 
  'Replace @radix-ui/react-tabs with custom Tabs component',
  'Replace @radix-ui/react-switch with custom Switch component',
  'Replace @radix-ui/react-checkbox with custom Checkbox component',
  'Use custom Button component instead of Radix UI primitives',
  'Implement custom Form components for better reusability'
];

console.log('\n💡 Optimization Recommendations:');
recommendations.forEach((rec, index) => {
  console.log(`  ${index + 1}. ${rec}`);
});

// Calculate potential bundle size reduction
const estimatedReduction = unusedRadixPackages.length * 15; // ~15KB per package
console.log(`\n📊 Estimated bundle size reduction: ~${estimatedReduction}KB`);

console.log('\n🎯 Next steps:');
console.log('  1. Run npm install to update dependencies');
console.log('  2. Update imports to use custom components');
console.log('  3. Test all components for functionality');
console.log('  4. Run bundle analyzer to verify size reduction');

function checkPackageUsage(packageName) {
  // Simple check for package usage in source files
  const srcPath = path.join(__dirname, '../src');
  const files = getAllFiles(srcPath);
  
  for (const file of files) {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(packageName)) {
        return true;
      }
    }
  }
  
  return false;
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}
