export interface ValidationResult {
  status: 'approved' | 'rejected' | 'needs_review';
  reason?: string;
  violations?: string[];
  censored_content?: {
    title?: string;
    description?: string;
  };
  inappropriate_words?: string[];
  suggestions?: string[];
  confidence?: number;
}

export interface FormData {
  title: string;
  description: string;
  [key: string]: any;
}

export interface ContentValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: FormData;
  validationResult: ValidationResult;
  onRetry?: () => void;
  onAccept?: () => void;
}
