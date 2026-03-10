declare module 'react-i18next' {
  export function useTranslation(ns?: string): {
    t: (key: string, options?: any) => string;
    i18n: any;
    ready: boolean;
  };
  export function Trans(props: any): any;
  export function withTranslation(ns?: string): any;
  export function initReactI18next(): any;
  export const initReactI18next: any;
}
