import { apiRequest } from './httpClient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  currentMode: string;
}

/**
 * No mock fallback here (unlike the rest of src/api/*) - logging in while
 * the backend is unreachable would mean fabricating a fake session, which
 * defeats the point of gating the app behind real credentials. If the
 * backend's down, login should visibly fail rather than silently let
 * anyone in.
 */

/** POST /api/auth/login - username + password only. Throws ApiError(401) on bad credentials. */
export async function login(username: string, password: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/** POST /api/auth/signup - name + username + password. Throws ApiError(409) if username's taken. */
export async function signup(name: string, username: string, password: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, username, password }),
  });
}
