# Анализ зависимостей Radix UI

## 📊 Используемые пакеты

### ✅ Активно используются (12 пакетов)
1. `@radix-ui/react-avatar` - в avatar.tsx и AssistantResponseSkeleton.tsx
2. `@radix-ui/react-checkbox` - в checkbox.tsx
3. `@radix-ui/react-dialog` - в dialog.tsx и sheet.tsx
4. `@radix-ui/react-dropdown-menu` - в dropdown-menu.tsx
5. `@radix-ui/react-label` - в label.tsx
6. `@radix-ui/react-menubar` - в menubar.tsx и MenuComponent.tsx
7. `@radix-ui/react-popover` - в popover.tsx
8. `@radix-ui/react-progress` - в progress.tsx
9. `@radix-ui/react-scroll-area` - в scroll-area.tsx
10. `@radix-ui/react-select` - в select.tsx
11. `@radix-ui/react-separator` - в separator.tsx
12. `@radix-ui/react-slot` - в button.tsx и loadingButton.tsx
13. `@radix-ui/react-switch` - в switch.tsx
14. `@radix-ui/react-tabs` - в tabs.tsx
15. `@radix-ui/react-toast` - в toast.tsx
16. `@radix-ui/react-tooltip` - в tooltip.tsx и menu-tooltip.tsx

### ❌ НЕ используются (1 пакет)
1. `@radix-ui/react-visually-hidden` - НЕ НАЙДЕН в коде

## 🎯 Возможности оптимизации

### Безопасно удалить
- `@radix-ui/react-visually-hidden` - не используется

### Оставить (критически важные)
- Все остальные пакеты используются в shadcn компонентах

## 📊 Потенциальная экономия
- **Удаление 1 пакета**: ~5-10KB
- **Общая экономия**: Минимальная (все пакеты используются)
- **Риск**: Низкий (только неиспользуемый пакет)

## 🚨 Вывод
**Большинство Radix UI пакетов активно используются в shadcn компонентах!**

Удаление их сломает UI. Можно удалить только `@radix-ui/react-visually-hidden`.

## 🎯 Рекомендации
1. Удалить только `@radix-ui/react-visually-hidden`
2. Оставить все остальные пакеты
3. Сосредоточиться на других видах оптимизации:
   - Tree shaking
   - Code splitting
   - Lazy loading
   - Image optimization

