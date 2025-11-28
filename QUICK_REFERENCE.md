# Pages Modularization - Quick Reference

## Directory Structure

```
frontend/src/components/AutoRia/Pages/
├── AdDetailPage/              # Fully modularized
├── AdModerationPage/          # Fully modularized
├── AdViewPage/                # Re-export wrapper
├── AuthTestPage/              # Single file
├── AutoRiaMainPage/           # Single file
├── CreateAdPage/              # Single file
├── EditAdPage/                # Single file
├── ModerationPage/            # Single file
├── MyAdCard/                  # Re-export wrapper
├── MyAdsBulkActionsBar/       # Re-export wrapper
├── MyAdsFiltersBar/           # Re-export wrapper
├── MyAdsListItem/             # Re-export wrapper
├── MyAdsPage/                 # Single file
├── ProfilePage/               # Single file
├── ResponsiveAnalyticsStyles/ # Re-export wrapper
├── SearchPage/                # Re-export wrapper
├── SimpleEnhancedAnalyticsPage/ # Re-export wrapper
├── UpdatedProfilePage/        # Re-export wrapper
├── UserModerationPage/        # Re-export wrapper
└── README.md
```

## File Organization Patterns

### Pattern 1: Fully Modularized (AdDetailPage)
```
AdDetailPage/
├── index.tsx          # Main component
├── types.ts           # Props interfaces
├── utils.ts           # Utilities
└── components.tsx     # Sub-components
```

### Pattern 2: Single File (CreateAdPage)
```
CreateAdPage/
└── index.tsx          # All logic here
```

### Pattern 3: Re-export Wrapper (AdViewPage)
```
AdViewPage/
└── index.tsx          # Re-exports from original file
```

## Common Imports

```typescript
// Import pages
import AdDetailPage from '@/components/AutoRia/Pages/AdDetailPage';
import CreateAdPage from '@/components/AutoRia/Pages/CreateAdPage';
import MyAdsPage from '@/components/AutoRia/Pages/MyAdsPage';

// Import components
import { MyAdCard } from '@/components/AutoRia/Pages/MyAdCard';
import { MyAdsFiltersBar } from '@/components/AutoRia/Pages/MyAdsFiltersBar';

// Import types
import type { AdDetailPageProps } from '@/components/AutoRia/Pages/AdDetailPage/types';
```

## Page Purposes

| Page | Purpose | Status |
|------|---------|--------|
| AdDetailPage | View ad details | ✅ Modularized |
| AdModerationPage | Moderate ads | ✅ Modularized |
| AdViewPage | Alias for AdDetailPage | ✅ Wrapper |
| AuthTestPage | Test authentication | ✅ Single file |
| AutoRiaMainPage | Main dashboard | ✅ Single file |
| CreateAdPage | Create new ad | ✅ Single file |
| EditAdPage | Edit existing ad | ✅ Single file |
| ModerationPage | Moderation dashboard | ✅ Single file |
| MyAdsPage | User's ads list | ✅ Single file |
| ProfilePage | User profile | ✅ Single file |
| SearchPage | Search ads | ✅ Wrapper |
| UpdatedProfilePage | Enhanced profile | ✅ Wrapper |
| UserModerationPage | User moderation | ✅ Wrapper |

## Adding a New Page

### Step 1: Create Folder
```bash
mkdir frontend/src/components/AutoRia/Pages/NewPageName
```

### Step 2: Create index.tsx
```typescript
"use client";

import React from 'react';

const NewPage: React.FC = () => {
  return <div>{/* Content */}</div>;
};

export default NewPage;
```

### Step 3: Add Types (if needed)
```typescript
// types.ts
export interface NewPageProps {
  // Props here
}
```

### Step 4: Add Utils (if needed)
```typescript
// utils.ts
export const helperFunction = () => {
  // Logic here
};
```

### Step 5: Add Components (if needed)
```typescript
// components.tsx
export const SubComponent: React.FC = () => {
  return <div>Sub component</div>;
};
```

## File Size Guidelines

- **index.tsx**: Keep under 300 lines
- **components.tsx**: Keep under 500 lines
- **utils.ts**: Keep under 200 lines

If exceeded, consider further modularization.

## Best Practices

✅ **Do**
- Keep files focused and small
- Use TypeScript strictly
- Export types from types.ts
- Document complex logic
- Follow naming conventions

❌ **Don't**
- Mix concerns in one file
- Use `any` types
- Create circular dependencies
- Skip documentation
- Ignore TypeScript errors

## Modularization Checklist

When modularizing a page:

- [ ] Create folder with page name
- [ ] Create index.tsx with main component
- [ ] Create types.ts with interfaces
- [ ] Create utils.ts with helpers
- [ ] Create components.tsx with sub-components
- [ ] Update imports within components
- [ ] Test all functionality
- [ ] Update documentation
- [ ] Verify backward compatibility

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Pages directory overview |
| `MODULARIZATION_GUIDE.md` | Detailed migration guide |
| `MODULARIZATION_SUMMARY.md` | Project summary |
| `QUICK_REFERENCE.md` | This file |

## Key Statistics

- **Total Pages**: 19
- **Fully Modularized**: 2
- **Single File**: 7
- **Re-export Wrappers**: 10
- **Documentation Files**: 4

## Common Tasks

### View Page Structure
```bash
tree frontend/src/components/AutoRia/Pages/AdDetailPage
```

### Check Page Imports
```bash
grep -r "import.*AdDetailPage" frontend/src
```

### Find All Pages
```bash
ls -la frontend/src/components/AutoRia/Pages/*/index.tsx
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Import not found | Check folder exists and index.tsx is present |
| Type errors | Verify types.ts has correct interfaces |
| Build fails | Clear .next folder, restart dev server |
| Circular imports | Review import paths, refactor if needed |

## Related Documentation

- Full guide: `MODULARIZATION_GUIDE.md`
- Project summary: `MODULARIZATION_SUMMARY.md`
- Pages README: `frontend/src/components/AutoRia/Pages/README.md`

## Support

For help:
1. Check this quick reference
2. Read the full modularization guide
3. Review page-specific README
4. Check git history
5. Ask team members

---

**Last Updated**: November 27, 2025  
**Status**: ✅ Complete
