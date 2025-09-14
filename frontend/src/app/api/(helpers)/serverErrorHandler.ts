import { AuthProvider } from "@/common/constants/constants";
import { getRedisData } from "@/services/redis/redisService";

import { backendApiHelpers } from "./backend";
import { dummyApiHelpers } from "./dummy";

export interface ServerErrorHandlerOptions {
  retryCount?: number;
  redirectOnError?: boolean;
  callbackUrl?: string;
}

export const handleServerApiError = async (
  error: Response | Error,
  options: ServerErrorHandlerOptions = {}
): Promise<null> => {
  const { retryCount = 0, redirectOnError = true, callbackUrl = "/login" } = options;

  if (error instanceof Response) {
    const status = error.status;
    console.error(`API Error ${status}:`, await error.text());

    switch (status) {
      case 401: {
        if (retryCount === 0) {
          try {
            console.log("Attempting to refresh authentication token...");

            const authProvider = await getRedisData("auth_provider") as AuthProvider;
            const helpers = authProvider === AuthProvider.Dummy ? dummyApiHelpers : backendApiHelpers;
            const refreshSuccess = await helpers.refresh();

            console.log(refreshSuccess ? "Token refresh successful" : "Token refresh failed");

            if (refreshSuccess) {
              return null; // Retry the original request
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
          }
        }
        
        console.error("Session expired - authentication required");
        break;
      }
      case 403:
        console.error("Access forbidden - insufficient permissions");
        break;
      case 404:
        console.error("Resource not found");
        break;
      case 500:
        console.error("Internal server error");
        break;
      default:
        console.error(`Unhandled API error: ${status}`);
    }
  } else {
    console.error("Network or other error:", error.message);
  }

  return null;
};

export default handleServerApiError;
