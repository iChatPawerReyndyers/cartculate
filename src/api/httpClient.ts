import { API_BASE_URL, ENABLE_MOCK_FALLBACK } from './config';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getUserFriendlyErrorMessage(error: unknown, action: string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return `We couldn't connect while trying to ${action}. Check your connection and try again.`;
    }
    if (error.status === 400) {
      return `Some of the information is not valid. Check the form and try to ${action} again.`;
    }
    if (error.status === 401 || error.status === 403) {
      return `You don't have permission to ${action}. Please sign in again and try once more.`;
    }
    if (error.status === 404) {
      return `We couldn't find what was needed to ${action}. Refresh the app and try again.`;
    }
    if (error.status === 409) {
      return `This conflicts with an existing product or store. Check the details and try again.`;
    }
    if (error.status >= 500) {
      return `Something went wrong while trying to ${action}. Please try again in a moment.`;
    }
  }
  return `We couldn't ${action}. Please try again.`;
}

/**
 * Wraps fetch() with consistent error handling: throws ApiError on non-2xx
 * responses, returns parsed JSON on success. Pass expectJson=false for
 * endpoints that return 204 No Content (e.g. the cart adjust endpoint).
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  expectJson: boolean = true
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch (err) {
    // Network failure (backend not running, wrong host, no connectivity, etc.)
    throw new ApiError(0, `Could not reach the server. Is the backend running at ${API_BASE_URL}?`);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new ApiError(response.status, `Request to ${path} failed (${response.status}): ${bodyText}`);
  }

  if (!expectJson) return undefined as T;
  return response.json() as Promise<T>;
}

/**
 * TESTING-ONLY FALLBACK: wraps an API call so that if it fails with a
 * genuine network error (backend unreachable - status 0, see above), and
 * ENABLE_MOCK_FALLBACK is on, a mock value is returned instead of throwing.
 *
 * This deliberately does NOT catch real 4xx/5xx errors from a reachable
 * backend - those are real bugs and should still surface as errors. Only
 * "the backend isn't running at all" falls back, so this can't silently
 * mask broken endpoints during normal development.
 *
 * mockValue can be a plain value or a function (call a function when the
 * mock needs to be freshly constructed per call, e.g. with a new ID/timestamp).
 */
export async function withMockFallback<T>(
  apiCall: () => Promise<T>,
  mockValue: T | (() => T)
): Promise<T> {
  try {
    return await apiCall();
  } catch (err) {
    if (ENABLE_MOCK_FALLBACK && err instanceof ApiError && err.status === 0) {
      console.warn('[mock-fallback] Backend unreachable, returning mock data. Set ENABLE_MOCK_FALLBACK=false in src/api/config.ts to disable this.');
      return typeof mockValue === 'function' ? (mockValue as () => T)() : mockValue;
    }
    throw err;
  }
}