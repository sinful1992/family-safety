# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Metro bundler
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS
npm test           # Jest
npm run lint       # ESLint (js, jsx, ts, tsx)
```

**Never run `npm run build` or any build commands.**

Android environment required for adb/emulator work:
```bash
export JAVA_HOME="/c/Users/barku/.gradle/jdks/eclipse_adoptium-17-amd64-windows/jdk-17.0.17+10"
export ANDROID_HOME="/c/Users/barku/AppData/Local/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

## Architecture

React Native 0.74 + TypeScript. Firebase Realtime Database is the primary data store. Supabase hosts the three edge functions that dispatch FCM push notifications. Notifee handles local notification display on-device.

### Navigation

```
App (auth check via AuthenticationModule)
├─ Auth Stack          → Login / EmailLogin / SignUp
├─ FamilyGroup Stack   → Create or join a group
└─ Main Tabs
   ├─ HomeScreen       → 2-column grid of family members (self always first)
   │  └─ MemberDetailScreen
   ├─ SettingsScreen   (modal overlay)
   └─ CheckInResponseScreen (modal overlay, FCM-triggered)
```

### Services (singletons)

All business logic lives in `src/services/`, not in hooks or components.

- **AuthenticationModule** — Firebase Auth state, user CRUD in `/users/{uid}`, family group CRUD, token storage via EncryptedStorage
- **NotificationManager** — FCM + Notifee setup, permission flow, token registration to `/users/{uid}/fcmToken`, navigation into `CheckInResponseScreen` from background/killed states
- **CheckInService** — Creates `/checkIns/{id}`, calls Supabase edge functions, handles response + location write
- **FamilyMemberService** — Subscribes to `/familyGroups/{groupId}/memberIds`, `/users/{uid}`, and `/familyGroups/{groupId}/memberStatus/{uid}`; emits combined `MemberStatus[]` on any change; cleans up stale listeners
- **LocationService** — Geolocation permission + high-accuracy position retrieval
- **SupabaseClient** — Thin wrapper; only used to invoke edge functions

### Check-in flow

1. Initiator taps member → `CheckInService.sendCheckInRequest()` writes `/checkIns/{id}`, calls `send-checkin-request` edge function
2. Edge function reads FCM token from Firebase DB, sends data-only FCM message
3. Target device: foreground → `onMessage` → capture GPS → Notifee notification; background/killed → `setBackgroundMessageHandler` → capture GPS → Notifee notification
4. Target responds → `CheckInService.respondToCheckIn()` writes location to `/familyGroups/{groupId}/memberStatus/{uid}` and response to `/checkIns/{id}/response`, calls `send-checkin-response` edge function
5. `MemberDetailScreen` subscribes to Firebase live updates — location appears the moment it's written

### Firebase Realtime Database structure

```
/users/{uid}               — profile + fcmToken
/familyGroups/{groupId}    — memberIds, memberStatus/{uid}
/checkIns/{checkInId}      — request + response record
/invitations/{code}        — join codes
```

### Environment

`.env` (copy from `.env.example`) is loaded via `react-native-dotenv` and imported as `@env`. Required keys: `FIREBASE_*`, `GOOGLE_WEB_CLIENT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

Supabase edge functions require two secrets set in the Supabase console: `FIREBASE_SERVICE_ACCOUNT` (full service account JSON) and `FIREBASE_DATABASE_URL`.

### Edge functions

Located in `supabase/functions/`. Each function is self-contained (FCM helpers are inlined — no `_shared` imports) so they can be deployed individually:

```bash
npx supabase functions deploy --project-ref nlqpxlvjpwonqcjavayl
```

### Theme

Dark theme. Primary bg `#0D1117`, accent emerald `#00D9A0` (safe), amber (pending), red (need help). Glass morphism cards. All design tokens in `src/styles/theme.ts`.

### Context

`AlertContext` (`src/context/AlertContext.tsx`) — global modal alerts used throughout the app. Use it instead of native `Alert`.
