import { Platform } from 'react-native';

// React Native can't reach your dev machine's backend via "localhost" the
// same way a browser can:
// - iOS simulator: "localhost" works directly.
// - Android emulator: "localhost" resolves to the emulator itself, not your
//   host machine - use 10.0.2.2 instead (Android's special alias for the host).
// - Physical device (either platform): neither works - use your machine's
//   LAN IP, e.g. "http://192.168.1.23:8888", and make sure the device is on
//   the same network as your dev machine.
//
// Port 8888 matches server.port in the backend's application.properties.
export const API_BASE_URL = Platform.select({
  ios: 'http://localhost:8888',
  android: 'http://10.0.2.2:8888',
  default: 'http://localhost:8888',
});

// Was a hardcoded literal before login existed (see the old TODO here).
// Now set by App.tsx after a successful login/session-restore, via
// setCurrentUserId() below. Every other file in the app still just does
// `import { CURRENT_USER_ID } from '../api/config'` unchanged - named ES
// module imports are live bindings, so they automatically see the updated
// value once setCurrentUserId() runs, with no per-file changes needed.
export let CURRENT_USER_ID: number = 0;

/** Called once after login succeeds or a saved session is restored on app boot. */
export function setCurrentUserId(userId: number): void {
  CURRENT_USER_ID = userId;
}

// ─── TESTING ONLY ────────────────────────────────────────────────────────
// When true, every API call falls back to hardcoded mock data if (and only
// if) the backend is genuinely unreachable (a network error, not a real
// 4xx/5xx from a running backend). Lets you develop/demo the UI without a
// backend running at all.
//
// Set this to false before anything resembling a real test of backend
// behavior - it exists purely so the app doesn't go blank when the
// backend is off, not as a substitute for testing against the real API.
export const ENABLE_MOCK_FALLBACK = true;