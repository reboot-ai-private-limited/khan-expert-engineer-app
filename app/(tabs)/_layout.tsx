import React from 'react';
import { StyleSheet } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { CallsProvider } from '@/context/CallsContext';
import { TabBarButton } from '@/components/common/TabBarButton';
import { canCompleteApplication } from '@/utils/accountStatus';
import { useResumePendingCapture } from '@/hooks/useResumePendingCapture';

/** Renders nothing — reopens the screen a photo was for after Android killed the app. See the hook. */
const ResumePendingCapture: React.FC = () => {
  useResumePendingCapture();
  return null;
};
import { colors, typography } from '@/theme';

export default function TabsLayout() {
  const { status, engineer } = useAuth();
  const insets = useSafeAreaInsets();

  if (status === 'restoring') return null;
  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }
  // Still onboarding (pending/changes-requested/approved) is let in far
  // enough to reach Profile → KYC/skills, so they have some way to finish
  // their application — the "My jobs" tab itself stays blocked below.
  // Rejected/suspended/inactive get bounced straight to the status screen.
  if (!canCompleteApplication(engineer)) {
    return <Redirect href="/(auth)/status" />;
  }

  // Android's edge-to-edge mode (app.json: edgeToEdgeEnabled) draws content
  // behind the system navigation bar. Without explicit bottom padding here,
  // the tab bar renders underneath it — technically present, but invisible.
  const tabBarHeight = 56 + insets.bottom;

  return (
    <CallsProvider>
      <ResumePendingCapture />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: TabBarButton,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: typography.caption,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.borderSoft,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="calls"
          options={{
            title: 'My jobs',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </CallsProvider>
  );
}
