export interface LoginPageSearchParams {
  message?: string | null;
  alert?: string | null;
  error?: string | null;
  returnUrl?: string | null;
  callbackUrl?: string | null;
}

export function parseLoginSearchParams(searchParams: URLSearchParams): LoginPageSearchParams {
  return {
    message: searchParams.get("message"),
    alert: searchParams.get("alert"),
    error: searchParams.get("error"),
    returnUrl: searchParams.get("returnUrl"),
    callbackUrl: searchParams.get("callbackUrl"),
  };
}
