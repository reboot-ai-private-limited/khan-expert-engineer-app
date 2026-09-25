import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/context/AuthContext';
import { openNotificationTarget, registerForPushNotifications } from '@/services/notifications/pushNotifications';

/**
 * Registers this phone for push once signed in (including a still-pending
 * applicant, so "Application approved" reaches them), and opens the right
 * screen when a notification is tapped — whether the tap started the app or
 * came while it was open. Each tap is handled once, by its identifier.
 */
export const usePushNotifications = () => {
  const { status } = useAuth();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') void registerForPushNotifications();
  }, [status]);

  useEffect(() => {
    // Waits for the session restore, so the navigation doesn't race the
    // redirect to login or home.
    if (status !== 'authenticated' || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledId.current === id) return;
    handledId.current = id;
    // Let the signed-in stack mount first when the tap launched the app.
    setTimeout(() => openNotificationTarget(lastResponse.notification.request.content.data), 300);
  }, [status, lastResponse]);
};
