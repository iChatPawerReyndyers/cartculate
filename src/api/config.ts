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

// TODO: replace with the real logged-in user's ID once auth exists.
export const CURRENT_USER_ID = 1;

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