import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { login, signup, AuthUser } from '../api/authApi';
import { ApiError } from '../api/httpClient';
import { ENABLE_MOCK_FALLBACK } from '../api/config';
import { neumo, neumoText, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

interface LoginScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

type AuthMode = 'login' | 'signup';

// Matches userId '1' used throughout mockPurchaseHistory.ts /
// mockStoreData.ts / mockItemData.ts, so a test-mode login lines up with
// whichever mock user the rest of the app's fallback data already assumes.
const LOCAL_TEST_MODE_USER: AuthUser = {
  id: '1',
  name: 'Test User',
  email: 'test@local',
  username: 'test',
  currentMode: 'HOME',
};

/**
 * Gates the whole app - App.tsx renders this instead of the tab bar until
 * onAuthenticated fires, per the "ask username and password only" request.
 * Signup (name + username + password) is reached via the link below the
 * form since there was previously no way to create a user account at all
 * (see AuthController.java's javadoc) - the login form itself stays
 * exactly username + password.
 *
 * TEST/LOCAL MODE BYPASS: submitting the login form completely blank
 * (both fields empty) while the backend is genuinely unreachable logs
 * straight in as a local mock user, instead of blocking on real
 * credentials - see handleSubmit below. Gated on ENABLE_MOCK_FALLBACK
 * (config.ts), same flag the rest of the app's mock-data fallback uses,
 * so it's one switch to turn off before anything resembling a real test.
 * Only triggers on a genuine network failure (ApiError status 0) with
 * BOTH fields blank - a reachable backend rejecting blank credentials
 * (or a partially-filled form) still shows the normal error, so this
 * never masks an actual wrong-password situation.
 */
export default function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>('login');

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetFields() {
    setName('');
    setUsername('');
    setPassword('');
    setErrorMessage(null);
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    resetFields();
  }

  async function handleSubmit() {
    setErrorMessage(null);

    const isBlankLoginAttempt = mode === 'login' && username.trim().length === 0 && password.length === 0;

    // A partially-filled form is always a mistake worth catching locally,
    // no network round-trip needed. A FULLY blank login attempt is let
    // through instead - see the try/catch below for why.
    if (!isBlankLoginAttempt && (username.trim().length === 0 || password.length === 0)) {
      setErrorMessage('Enter a username and password.');
      return;
    }
    if (mode === 'signup' && name.trim().length === 0) {
      setErrorMessage('Enter your name.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user =
        mode === 'login'
          ? await login(username.trim(), password)
          : await signup(name.trim(), username.trim(), password);
      onAuthenticated(user);
    } catch (err) {
      // Test/local mode bypass: a completely blank login form is only
      // ever a deliberate "let me in without typing anything" attempt,
      // never a real credential guess - and status 0 means the backend
      // genuinely can't be reached (not a real rejection of blank
      // credentials from a running server). Skip past the login screen
      // using a local mock identity, same one the rest of the app's
      // mock-data fallback already assumes (see mockPurchaseHistory.ts /
      // mockStoreData.ts's userId '1').
      if (isBlankLoginAttempt && ENABLE_MOCK_FALLBACK && err instanceof ApiError && err.status === 0) {
        onAuthenticated(LOCAL_TEST_MODE_USER);
        return;
      }
      // Backend IS reachable (or mock fallback is off) and rejected the
      // blank submission normally - keep the original helpful message
      // instead of "Incorrect username or password" or a raw validation
      // error, since the person didn't actually attempt real credentials.
      if (isBlankLoginAttempt) {
        setErrorMessage('Enter a username and password.');
      } else if (err instanceof ApiError && err.status === 401) {
        setErrorMessage('Incorrect username or password.');
      } else if (err instanceof ApiError && err.status === 409) {
        setErrorMessage('That username is already taken.');
      } else if (err instanceof ApiError && err.status === 0) {
        setErrorMessage(`Could not reach the server. Is the backend running?`);
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.logoCircleWrap}>
          <NeumoInset borderRadius={20} style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🛒</Text>
          </NeumoInset>
        </View>
        <Text style={styles.appName}>Cartculate</Text>
        <Text style={styles.appSub}>{isSignup ? 'Set up your store' : 'Log in to your store'}</Text>

        {errorMessage && (
          <NeumoInset borderRadius={10} style={styles.errorPill}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </NeumoInset>
        )}

        {isSignup && (
          <>
            <Text style={styles.fieldLabel}>Your name</Text>
            <NeumoInset borderRadius={12} style={styles.fieldInset}>
              <TextInput
                style={styles.fieldText}
                value={name}
                onChangeText={setName}
                placeholder="Jane Cruz"
                placeholderTextColor={neumo.textMuted}
                autoCapitalize="words"
                editable={!isSubmitting}
              />
            </NeumoInset>
          </>
        )}

        <Text style={styles.fieldLabel}>Username</Text>
        <NeumoInset borderRadius={12} style={styles.fieldInset}>
          <TextInput
            style={styles.fieldText}
            value={username}
            onChangeText={setUsername}
            placeholder="yourusername"
            placeholderTextColor={neumo.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />
        </NeumoInset>

        <Text style={styles.fieldLabel}>Password</Text>
        <NeumoInset borderRadius={12} style={styles.fieldInset}>
          <TextInput
            style={styles.fieldText}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={neumo.textMuted}
            secureTextEntry
            editable={!isSubmitting}
          />
        </NeumoInset>

        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting} style={styles.submitWrap}>
          <NeumoAccentRaised borderRadius={12} distance={5} fullWidth style={styles.submitInner}>
            <Text style={styles.submitText}>
              {isSubmitting ? (isSignup ? 'Creating account…' : 'Logging in…') : isSignup ? 'Create account' : 'Log in'}
            </Text>
          </NeumoAccentRaised>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => switchMode(isSignup ? 'login' : 'signup')} disabled={isSubmitting}>
          <Text style={styles.linkRow}>
            {isSignup ? 'Already have an account? ' : 'New here? '}
            <Text style={styles.linkAccent}>{isSignup ? 'Log in' : 'Create an account'}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neumo.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logoCircleWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 28,
  },
  appName: {
    ...neumoText.heading,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 2,
  },
  appSub: {
    ...neumoText.caption,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  errorText: {
    ...neumoText.body,
    fontSize: 12,
    color: neumo.dangerDark,
  },
  fieldLabel: {
    ...neumoText.subheading,
    fontSize: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  fieldInset: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  fieldText: {
    ...neumoText.body,
    fontSize: 14,
    padding: 0,
  },
  submitWrap: {
    marginTop: 8,
  },
  submitInner: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
  linkRow: {
    ...neumoText.caption,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 22,
  },
  linkAccent: {
    ...neumoText.subheading,
    fontSize: 12,
    color: neumo.accentDark,
  },
});