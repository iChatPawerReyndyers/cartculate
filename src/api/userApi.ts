import { apiRequest, withMockFallback } from './httpClient';
import { UserMode } from '../types';
import { dbGetUserMode, dbSetUserMode } from '../data/mockDb';

interface UserResponse {
  id: string;
  name: string;
  email: string;
  currentMode: string;
}

/** GET /api/users/{userId} - includes the persisted Home/Away mode. */
export async function fetchUserMode(userId: number): Promise<UserMode> {
  return withMockFallback(async () => {
    const user = await apiRequest<UserResponse>(`/api/users/${userId}`);
    return user.currentMode as UserMode;
  }, () => dbGetUserMode());
}

/** PATCH /api/users/{userId}/mode - persists the Home/Away toggle. */
export async function updateUserMode(userId: number, mode: UserMode): Promise<UserMode> {
  return withMockFallback(async () => {
    const user = await apiRequest<UserResponse>(`/api/users/${userId}/mode`, {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    });
    return user.currentMode as UserMode;
  }, () => dbSetUserMode(mode));
}