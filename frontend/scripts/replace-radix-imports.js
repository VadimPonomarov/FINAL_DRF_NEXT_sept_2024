#!/usr/bin/env node

/**
 * Script to automatically replace Radix UI imports with custom components
 */

const fs = require('fs');
const path = require('path');

// Mapping of Radix UI imports to custom components
const importMappings = {
  // Dialog components
  '@radix-ui/react-dialog': {
    'Dialog': '@/components/AutoRia/Components/Shared/Modal',
    'DialogTrigger': 'Button', // Use Button as trigger
    'DialogContent': 'Modal', // Use Modal component
    'DialogHeader': 'div', // Use div with proper styling
    'DialogTitle': 'h2', // Use semantic heading
    'DialogDescription': 'p', // Use paragraph
    'DialogFooter': 'div' // Use div with proper styling
  },
  
  // Select components
  '@radix-ui/react-select': {
    'Select': '@/components/AutoRia/Components/Shared/Select',
    'SelectTrigger': 'Button', // Use Button as trigger
    'SelectContent': 'div', // Use div with proper styling
    'SelectItem': 'button', // Use button for items
    'SelectValue': 'span', // Use span for value display
    'SelectGroup': 'div', // Use div for grouping
    'SelectLabel': 'label' // Use label element
  },
  
  // Tabs components
  '@radix-ui/react-tabs': {
    'Tabs': '@/components/AutoRia/Components/Shared/FormTabs',
    'TabsList': 'div', // Use div with proper styling
    'TabsTrigger': 'button', // Use button for triggers
    'TabsContent': 'div' // Use div for content
  },
  
  // Switch components
  '@radix-ui/react-switch': {
    'Switch': '@/components/AutoRia/Components/Shared/Switch',
    'SwitchThumb': 'span' // Use span for thumb
  },
  
  // Checkbox components
  '@radix-ui/react-checkbox': {
    'Checkbox': '@/components/AutoRia/Components/Shared/Checkbox',
    'CheckboxIndicator': 'span' // Use span for indicator
  },
  
  // Button components
  '@radix-ui/react-slot': {
    'Slot': '@/components/AutoRia/Components/Shared/Button'
  },
  
  // Card components
  '@radix-ui/react-card': {
    'Card': '@/components/AutoRia/Components/Shared/Card',
    'CardHeader': 'div',
    'CardTitle': 'h3',
    'CardDescription': 'p',
    'CardContent': 'div',
    'CardFooter': 'div'
  }
};

console.log('🔄 Starting import replacement...');

// Get all TypeScript/React files
const srcPath = path.join(__dirname, '../src');
const files = getAllFiles(srcPath).filter(file => 
  file.endsWith('.tsx') || file.endsWith('.ts')
);

let totalReplacements = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  let fileReplacements = 0;

  // Replace imports
  Object.entries(importMappings).forEach(([radixPackage, componentMap]) => {
    Object.entries(componentMap).forEach(([radixComponent, customComponent]) => {
      // Pattern 1: Named imports
      const namedImportPattern = new RegExp(
        `import\\s*{\\s*([^}]*\\b${radixComponent}\\b[^}]*)\\s*}\\s*from\\s*['"]${radixPackage}['"]`,
        'g'
      );
      
      newContent = newContent.replace(namedImportPattern, (match, imports) => {
        const newImports = imports
          .split(',')
          .map(imp => imp.trim())
          .map(imp => {
            if (imp.includes(radixComponent)) {
              const alias = imp.includes(' as ') ? imp.split(' as ')[1] : imp;
              return `${customComponent} as ${alias}`;
            }
            return imp;
          })
          .join(', ');
        
        return `import { ${newImports} } from '${customComponent.startsWith('@/') ? customComponent : `'${customComponent}'`}`;
      });

      // Pattern 2: Default imports
      const defaultImportPattern = new RegExp(
        `import\\s+${radixComponent}\\s+from\\s*['"]${radixPackage}['"]`,
        'g'
      );
      
      newContent = newContent.replace(defaultImportPattern, (match) => {
        return `import ${radixComponent} from '${customComponent.startsWith('@/') ? customComponent : `'${customComponent}'`}`;
      });

      // Pattern 3: Destructured imports
      const destructuredPattern = new RegExp(
        `import\\s*{\\s*([^}]*\\b${radixComponent}\\b[^}]*)\\s*}\\s*from\\s*['"]${radixPackage}['"]`,
        'g'
      );
      
      newContent = newContent.replace(destructuredPattern, (match, imports) => {
        const newImports = imports
          .split(',')
          .map(imp => imp.trim())
          .map(imp => {
            if (imp.includes(radixComponent)) {
              const alias = imp.includes(' as ') ? imp.split(' as ')[1] : imp;
              return `${customComponent} as ${alias}`;
            }
            return imp;
          })
          .join(', ');
        
        return `import { ${newImports} } from '${customComponent.startsWith('@/') ? customComponent : `'${customComponent}'`}`;
      });
    });
  });

  // Count replacements
  const replacements = (content.match(/@radix-ui\/react-/g) || []).length;
  if (replacements > 0) {
    fileReplacements = replacements;
    totalReplacements += replacements;
  }

  // Write updated file if changes were made
  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    console.log(`  ✅ Updated ${path.relative(srcPath, file)} (${fileReplacements} replacements)`);
  }
});

console.log(`\n🎉 Completed import replacement!`);
console.log(`📊 Total replacements: ${totalReplacements}`);
console.log(`📁 Files processed: ${files.length}`);

// Generate migration report
const migrationReport = {
  timestamp: new Date().toISOString(),
  totalFiles: files.length,
  totalReplacements,
  mappings: importMappings
};

fs.writeFileSync(
  path.join(__dirname, '../migration-report.json'),
  JSON.stringify(migrationReport, null, 2)
);

console.log('\n📋 Migration report saved to migration-report.json');

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
