import { twMerge } from "tailwind-merge";

// Form container styles
export const formContainerClasses = "w-full max-w-2xl space-y-8";

// Header styles
export const headerClasses = "space-y-2 text-center";
export const titleClasses = "text-2xl font-bold tracking-tight";
export const contentClasses = "space-y-4";

// Resizable wrapper styles
export const resizableWrapperStyle = {
  minHeight: "400px",
  minWidth: "320px",
};

export const resizableWrapperClasses = "w-full max-w-md";

// Form styles
export const formClasses = "space-y-6";

export const formHeaderClasses = "space-y-2 text-center";
export const formTitleClasses = "text-2xl font-bold tracking-tight";
export const formDescriptionClasses = "text-sm text-muted-foreground";

// Form group styles
export const formGroupClasses = "space-y-3 mb-6";

// Label styles
export const labelClasses = "text-sm font-medium leading-none";

// Input styles
export const inputClasses = "w-full";

// Error message styles
export const errorMessageClasses = "text-sm font-medium text-destructive";
export const errorClasses = "text-sm font-medium text-destructive";

// Button styles
export const buttonClasses = "w-full";

// Button group styles
export const buttonGroupClasses = "flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0";

// Submit button styles
export const submitButtonClasses = "w-full sm:w-auto";
export const submitButtonLoadingClasses = "opacity-70 cursor-not-allowed";

// Link styles
export const linkClasses = "text-sm text-muted-foreground hover:text-primary";

// Alert styles
export const alertClasses = "mt-4";

// Helper function to merge classes
export const cn = (...classes: (string | undefined)[]) => {
  return twMerge(classes.filter(Boolean));
};

// Form field error styles
export const fieldErrorClasses = "mt-1 text-sm text-destructive";

// Form field description styles
export const fieldDescriptionClasses = "text-xs text-muted-foreground mt-2 mb-2";

// Form field container styles
export const fieldContainerClasses = "space-y-1";

// Form field group styles
export const fieldGroupClasses = "space-y-4";

// Form field group title styles
export const fieldGroupTitleClasses = "text-sm font-medium";

// Form section styles
export const formSectionClasses = "space-y-6";

export const formSectionTitleClasses = "text-lg font-medium";

export const formSectionDescriptionClasses = "text-sm text-muted-foreground";
