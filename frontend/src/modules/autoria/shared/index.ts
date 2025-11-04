/**
 * Shared AutoRia module (DRY - single source of truth)
 * All reusable types, components, hooks, and utilities
 */

// Types
export * from './types';

// Components
export * from './components';

// Hooks
export * from './hooks';

// Legacy exports (will be refactored)
export { default as CarAdForm } from '@/components/AutoRia/Components/CarAdForm';
export { default as AddressCard } from '@/components/AutoRia/AddressCard/AddressCard';
export { default as RegionSelect } from '@/components/AutoRia/RegionSelect';
export { default as CitySelect } from '@/components/AutoRia/CitySelect';
export { default as CurrencySelector } from '@/components/AutoRia/CurrencySelector/CurrencySelector';
