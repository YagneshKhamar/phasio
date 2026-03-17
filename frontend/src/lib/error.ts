interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string | string[];
    };
  };
  message?: string;
}

export function getErrorMessage(err: unknown): string {
  const error = err as ApiError;

  // Backend validation errors — NestJS returns array
  if (Array.isArray(error.response?.data?.message)) {
    return error.response!.data!.message![0];
  }

  // Backend string message
  if (typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }

  // HTTP status based fallbacks
  switch (error.response?.status) {
    case 400:
      return "Invalid request — check your inputs";
    case 401:
      return "Session expired — please login again";
    case 403:
      return "You do not have access to this resource";
    case 404:
      return "Resource not found";
    case 409:
      return "This already exists";
    case 429:
      return "Too many requests — slow down";
    case 500:
      return "Server error — try again later";
    default:
      break;
  }

  // Network error
  if (error.message === "Network Error") {
    return "Cannot reach server — is the backend running?";
  }

  return "Something went wrong — try again";
}
