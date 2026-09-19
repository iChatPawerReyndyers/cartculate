import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

/**
 * Live keyboard height in px, 0 when the keyboard is hidden.
 *
 * WHY THIS EXISTS: every bottom-sheet modal in this app previously relied
 * solely on `KeyboardAvoidingView` (behavior="padding" on iOS / "height" on
 * Android) to stay clear of the keyboard. That works for a plain screen,
 * but every one of these sheets renders inside React Native's own <Modal>,
 * which mounts in a separate native window/root view. KeyboardAvoidingView
 * measures the wrong root there, so on Android especially (and
 * intermittently on iOS, e.g. when a TextInput near the bottom of a tall
 * ScrollView is focused) the keyboard was covering the focused field and
 * the Save/Cancel row entirely instead of the sheet shrinking to make
 * room.
 *
 * The fix used across every modal now: read the REAL keyboard height from
 * native events and use it directly to cap the sheet's own maxHeight /
 * add bottom padding, instead of trusting KeyboardAvoidingView to do it
 * automatically inside a Modal. This is a well-known, more reliable
 * workaround than fighting KeyboardAvoidingView's Modal quirks per
 * platform.
 *
 * Uses the "will" events on iOS (fires alongside the native animation, so
 * the sheet resizes in step with the keyboard) and the "did" events on
 * Android (iOS-only events on Android; "did" is what actually fires there).
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}
