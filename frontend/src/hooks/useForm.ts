import { useCallback, useState } from 'react';
import { FieldValues, UseFormReturn, SubmitHandler } from 'react-hook-form';

/**
 * Generic form hook for managing form state and submission
 * Extracts common logic from LoginForm and RegistrationForm
 */
export const useFormState = <T extends FieldValues>(
  onSubmit: SubmitHandler<T>,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = useCallback(
    async (data: T) => {
      if (isLoading) {
        console.log('[useFormState] Form submission already in progress, ignoring duplicate request');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setMessage(null);

        await onSubmit(data);

        setMessage('Success');
        options?.onSuccess?.();
      } catch (err: any) {
        const errorMessage = err?.message || 'An error occurred';
        setError(errorMessage);
        console.error('[useFormState] Error:', err);
        options?.onError?.(err);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, onSubmit, options]
  );

  const resetForm = useCallback(() => {
    setError(null);
    setMessage(null);
    setFormKey((prev) => prev + 1);
  }, []);

  return {
    isLoading,
    error,
    message,
    formKey,
    handleSubmit,
    resetForm,
    setError,
    setMessage,
  };
};

/**
 * Hook for managing form reset on provider/session changes
 */
export const useFormReset = (
  dependencies: any[],
  onReset: () => void
) => {
  const [prevDeps, setPrevDeps] = useState<any[]>(dependencies);

  if (JSON.stringify(prevDeps) !== JSON.stringify(dependencies)) {
    setPrevDeps(dependencies);
    onReset();
  }
};
