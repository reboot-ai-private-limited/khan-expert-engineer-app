import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { api } from '@/api/client';

/**
 * Push notifications (Firebase Cloud Messaging, through expo-notifications).
 *
 * The backend sends to the FCM token this phone registers after sign-in —
 * see backend utils/notificationService.ts. Everything here is best-effort:
 * a failure to register is logged and ignored, never shown as an error, so
 * the app works exactly as before without notifications.
 */

const TOKEN_KEY = 'push.fcmToken';

// Show notifications while the app is open too — an engineer looking at
// another job must still see "New job assigned".
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Channel ids must match `channelId` in the backend's android payload. */
const ensureChannels = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('jobs', {
    name: 'Jobs',
    description: 'New jobs, changes to your jobs and notes from the office',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync('updates', {
    name: 'Wallet & account',
    description: 'Wallet, parts, expenses and account updates',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
};

/** Asks permission (Android 13+ shows a prompt), then sends this phone's token to the backend. */
export const registerForPushNotifications = async (): Promise<void> => {
  try {
    await ensureChannels();

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return;

    // The native FCM token — the backend sends through Firebase directly.
    // Throws on a build without google-services.json; caught below.
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token || typeof token !== 'string') return;

    await api.post('/engineer-auth/device-token', { token, platform: Platform.OS });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.log('[Push] Not registered:', (error as Error)?.message || error);
  }
};

/** Called on sign-out, while the session token is still valid, so this phone stops getting that engineer's pushes. */
export const unregisterPushNotifications = async (): Promise<void> => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await api.delete('/engineer-auth/device-token', { data: { token }, timeout: 5000 });
  } catch {
    // Signed out anyway; the backend drops tokens that stop working.
  }
};

/** Opens the screen a notification points at — `data` is the backend's NotificationTarget. */
export const openNotificationTarget = (data: Record<string, unknown> | undefined) => {
  const screen = typeof data?.screen === 'string' ? data.screen : '';
  switch (screen) {
    case 'call':
      if (typeof data?.callId === 'string') {
        router.push({ pathname: '/(tabs)/calls/[id]', params: { id: data.callId } });
      }
      return;
    case 'calls':
      router.push('/(tabs)/calls');
      return;
    case 'wallet':
      router.push('/(tabs)/profile/wallet');
      return;
    case 'advance':
      if (typeof data?.requestId === 'string') {
        router.push({ pathname: '/(tabs)/profile/advance', params: { requestId: data.requestId } });
      }
      return;
    case 'kyc':
      router.push('/(tabs)/profile/kyc');
      return;
    case 'skills':
      router.push('/(tabs)/profile/skills');
      return;
    case 'profile':
      router.push('/(tabs)/profile');
      return;
  }
};
