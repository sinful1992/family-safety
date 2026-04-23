import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import SplashScreen from 'react-native-splash-screen';
import AuthenticationModule from './src/services/AuthenticationModule';
import NotificationManager from './src/services/NotificationManager';
import LocationService from './src/services/LocationService';
import { AlertProvider } from './src/contexts/AlertContext';
import { User, MemberStatus } from './src/types';
import { COLORS } from './src/styles/theme';

const DEV_PREVIEW = false;

const PREVIEW_USER: User = {
  uid: 'preview-user',
  email: 'preview@example.com',
  displayName: 'You',
  familyGroupId: 'preview-group',
  role: 'Dad',
  createdAt: Date.now(),
};

const PREVIEW_MEMBERS: MemberStatus[] = [
  { uid: 'preview-user', displayName: 'You', role: 'Dad', checkIn: { status: 'okay', requestedBy: 'preview-user', requestedByName: 'You', requestedAt: Date.now() - 120000, respondedAt: Date.now() - 60000 } },
  { uid: 'preview-2', displayName: 'Sarah', role: 'Mom', checkIn: { status: 'pending', requestedBy: 'preview-user', requestedByName: 'You', requestedAt: Date.now() - 30000 } },
  { uid: 'preview-3', displayName: 'Jake', role: 'Son', checkIn: { status: 'need_help', requestedBy: 'preview-user', requestedByName: 'You', requestedAt: Date.now() - 90000, respondedAt: Date.now() - 45000 } },
  { uid: 'preview-4', displayName: 'Emma', role: 'Daughter' },
];

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import EmailLoginScreen from './src/screens/auth/EmailLoginScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import FamilyGroupScreen from './src/screens/auth/FamilyGroupScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import MemberDetailScreen from './src/screens/home/MemberDetailScreen';
import CheckInResponseScreen from './src/screens/checkin/CheckInResponseScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.accent.green,
    background: COLORS.background.primary,
    card: COLORS.background.secondary,
    text: COLORS.text.primary,
    border: COLORS.border.subtle,
    notification: COLORS.accent.green,
  },
};

// Navigation ref for notification-driven navigation
const navigationRef = React.createRef<NavigationContainerRef<any>>();

function navigate(name: string, params?: object) {
  navigationRef.current?.navigate(name, params);
}

function HomeStack({ user, previewMembers }: { user: User; previewMembers?: MemberStatus[] }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Family">
        {() => <HomeScreen user={user} previewMembers={previewMembers} />}
      </Stack.Screen>
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} />
    </Stack.Navigator>
  );
}

function MainTabs({ user, previewMembers }: { user: User; previewMembers?: MemberStatus[] }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background.secondary,
          borderTopColor: COLORS.border.subtle,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.accent.green,
        tabBarInactiveTintColor: COLORS.text.tertiary,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            HomeTab: 'people',
          };
          return <Icon name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" options={{ title: 'Family' }}>
        {() => <HomeStack user={user} previewMembers={previewMembers} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function RootNavigator({ user }: { user: User | null }) {
  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
      </Stack.Navigator>
    );
  }

  if (!user.familyGroupId) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FamilyGroup" component={FamilyGroupScreen} />
      </Stack.Navigator>
    );
  }

  const authedUser = user as Required<Pick<User, 'familyGroupId'>> & User;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {() => <MainTabs user={authedUser} previewMembers={DEV_PREVIEW ? PREVIEW_MEMBERS : undefined} />}
      </Stack.Screen>
      <Stack.Screen name="Settings">
        {() => <SettingsScreen user={authedUser} />}
      </Stack.Screen>
      <Stack.Screen name="CheckInResponse">
        {() => <CheckInResponseScreen user={authedUser} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (DEV_PREVIEW) {
      setUser(PREVIEW_USER);
      SplashScreen.hide();
      return;
    }

    NotificationManager.setNavigationHandler((checkInId, groupId) => {
      navigate('CheckInResponse', { checkInId, groupId });
    });

    const unsubscribe = AuthenticationModule.onAuthStateChanged(updatedUser => {
      setUser(updatedUser);
      SplashScreen.hide();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user?.uid && user.familyGroupId) {
      NotificationManager.registerToken(user.uid, user.familyGroupId);
      NotificationManager.initializeListeners();
      LocationService.requestPermission().catch(() => {});
    }
  }, [user?.uid, user?.familyGroupId]);

  // Show nothing while loading auth state
  if (user === undefined) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AlertProvider>
          <NavigationContainer theme={DarkTheme} ref={navigationRef}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} />
            <RootNavigator user={user} />
          </NavigationContainer>
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
