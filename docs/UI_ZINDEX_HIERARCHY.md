# Z-Index Hierarchy Documentation

## Overview
This document defines the z-index layering system used throughout the application to ensure proper element stacking and prevent visual conflicts.

## Z-Index Layers (from bottom to top)

### Layer 0-49: Base Content
- **0-10**: Regular page content, cards, containers
- **10-40**: Dropdowns, tooltips, popovers within content

### Layer 50-79: Headers & Navigation
- **50**: AutoRiaHeader (sticky header for AutoRia pages)
- **60-70**: Desktop navigation elements

### Layer 80-99: Fixed UI Controls
- **80**: MagicBackButton (both desktop and mobile)
  - Desktop: absolute positioned in header
  - Mobile: fixed positioned left-4 top-4
- **90**: Mobile menu backdrop (semi-transparent overlay)
- **95**: Mobile menu content (dropdown panel)

### Layer 100-119: Mobile Menu System
- **100**: Mobile burger button (right-4 top-4)
  - Hides on scroll down, shows on scroll up
  - Transforms to close icon when menu is open

### Layer 120-149: Language & Settings
- **120**: FixedLanguageSwitch
  - Position: fixed top-20 right-4
  - Managed by TopRightControls
  - Hidden on Dummy provider and /login page

### Layer 150+: Modals & Overlays
- **150-200**: Modal backdrops
- **200-250**: Modal content
- **250+**: Toast notifications, critical alerts

## Component Positioning Map

### Global Layout (ClientLayout.tsx)
```
├── MagicBackButton (z-80)
│   ├── Desktop: absolute in header
│   └── Mobile: fixed left-4 top-4
├── MenuMain (relative mb-8)
│   ├── Desktop: MenuComponent
│   └── Mobile: Burger button (z-100) + Menu (z-90/95)
└── TopRightControls
    ├── FixedLanguageSwitch (z-120)
    └── User Badges (z-110)
```

### AutoRia Pages (AutoRiaLayout.tsx)
```
├── AutoRiaHeader (z-50, sticky top-0)
│   ├── Logo & Navigation
│   ├── Language Selector (dropdown)
│   └── Mobile Menu (inline, not fixed)
└── FixedLanguageSwitch (via TopRightControls, z-120)
```

## Best Practices

### ✅ DO
- Use the defined z-index layers
- Keep z-index values in multiples of 10 for flexibility
- Document any new z-index usage
- Test on both desktop and mobile viewports
- Ensure fixed elements don't overlap unintentionally

### ❌ DON'T
- Use arbitrary high values (9999, 99999999)
- Create z-index conflicts within the same layer
- Duplicate fixed elements across components
- Forget to test scroll behavior on mobile

## Mobile Considerations

### Fixed Elements Positioning
- **Left side**: MagicBackButton (top-4 left-4)
- **Right side**: 
  - Burger menu button (top-4 right-4)
  - Language switcher (top-20 right-4)
  - User badges (top-60 right-50, only on non-AutoRia pages)

### Scroll Behavior
- Mobile burger button hides when scrolling down (>100px)
- Mobile burger button shows when scrolling up
- Mobile menu auto-closes after 1.5s of scroll inactivity

## Removed Duplications

### Previously Duplicated Elements
1. **FixedLanguageSwitch**
   - ❌ Was in: AutoRiaLayout, MenuMain
   - ✅ Now in: TopRightControls (single source)

2. **MagicBackButton**
   - ❌ Was in: ClientLayout (desktop), ClientLayout (mobile), MenuMain (mobile)
   - ✅ Now in: ClientLayout only (both desktop & mobile variants)

3. **Language Selector in MenuMain**
   - ❌ Was: Hardcoded dropdown in MenuMain desktop
   - ✅ Removed: Managed by FixedLanguageSwitch

## Testing Checklist

- [ ] Desktop: All fixed elements visible and non-overlapping
- [ ] Mobile: Burger menu opens/closes correctly
- [ ] Mobile: Scroll behavior works (hide/show burger)
- [ ] Mobile: No element overlap at top-4 position
- [ ] Language switcher visible on all pages (except Dummy/login)
- [ ] User badges visible only on non-AutoRia pages
- [ ] AutoRia header sticky behavior works
- [ ] Modal overlays appear above all content
- [ ] Toast notifications visible above modals

## Future Improvements

1. Consider using CSS custom properties for z-index values
2. Implement a centralized z-index management system
3. Add automated visual regression tests
4. Create a Storybook story for z-index layers
