import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../api/authApi';

// Persists just enough to skip the login screen on next app launch and to
// restore CURRENT_USER_ID (see api/config.ts's setCurrentUserId). The
// password is never stored here or anywhere on-device - only the already-
// authenticated user's id/name/username, which is not sensitive.

const SESSION_KEY = 'cartculate:session';

export interface StoredSession {
  userId: string;
  name: string;
  username: string;
}

export async function saveSession(user: AuthUser): Promise<void> {
  const session: StoredSession = { userId: user.id, name: user.name, username: user.username };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    // Corrupt/unreadable storage shouldn't crash app boot - just fall through to the login screen.
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
