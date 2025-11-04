/**
 * Create Ad module types (DRY)
 */

import { AdFormData } from '../../shared/types';

export interface CreateAdFormState {
  step: CreateAdStep;
  formData: Partial<AdFormData>;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export type CreateAdStep = 'basic' | 'specs' | 'location' | 'images' | 'contacts' | 'additional' | 'preview';

export interface CreateAdStepConfig {
  id: CreateAdStep;
  title: string;
  description: string;
  isOptional: boolean;
}
