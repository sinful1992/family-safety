# Family Safety

A real-time family check-in app for Android. Ping a family member, they get an alert that wakes their screen, they tap **I'm Okay** or **Need Help** — and their location appears on your screen within seconds.

Built with React Native, Firebase Realtime Database, and Supabase Edge Functions.

---

## What makes it different

Most family safety apps are built around passive location tracking — your phone reports GPS every few minutes whether you want it to or not. Family Safety works the other way around: **location is only shared in response to a check-in**, giving family members a nudge rather than a surveillance feed.

A few things that make it work well in practice:

- **Works from a killed app.** Check-in requests are delivered as FCM data-only messages, which means the target device wakes up and processes the alert even if the app was fully closed.
- **Screen wake + vibration.** When a check-in arrives, the device screen turns on and vibrates for up to 45 seconds — hard to miss even if the phone is face-down on a table.
- **Location on response, not on request.** GPS is captured at the moment the person responds and written to the database instantly. The requester sees it appear in real time on a live map.
- **Emergency mode.** The "I Need Help" button broadcasts an alert to the entire family group simultaneously, not just one person.
- **Self-healing tokens.** Stale FCM tokens are detected and cleaned up automatically so notifications don't silently fail after a device reinstall.
- **Free map tiles.** Location is shown on a vector map powered by OpenFreeMap and MapLibre — no Google Maps API key or billing account needed.

---

## How it works

### Check-in flow

```
Requester taps member → check-in written to Firebase
  → Supabase edge function reads FCM token → sends data-only FCM message
    → Target device wakes (foreground or killed)
      → GPS captured → location written to Firebase
        → Requester sees location appear live on map
          → Target taps I'm Okay or Need Help
            → Response written to Firebase + notification sent back
```

The entire round trip — from tap to location on screen — typically takes 3–8 seconds on a good connection.

### Emergency alert flow

```
User taps I Need Help → edge function fans out FCM to all group members simultaneously
  → Every family member receives a high-priority push notification
```

### Family group setup

One person creates a group and shares a short invitation code. Others enter the code to join. No server admin required — the group structure lives entirely in Firebase Realtime Database.

---

## Screens

| Screen | What it does |
|---|---|
| **Home** | 2-column grid of family members with live status rings (okay / pinging / need help / unknown) |
| **Member Detail** | Full status, last known location on a vector map, recent activity timeline, ping button |
| **Check-in Response** | Full-screen alert that appears when you receive a ping — wakes the screen and vibrates |
| **Settings** | Invitation code, display name, leave/delete group |

---

## Tech stack

| Layer | Technology |
|---|---|
| App | React Native 0.85, TypeScript |
| Database | Firebase Realtime Database |
| Auth | Firebase Authentication |
| Push notifications | FCM (via Supabase Edge Functions) + Notifee |
| Maps | MapLibre GL + OpenFreeMap (free, no API key) |
| Edge functions | Supabase (Deno) |
| Background handling | FCM data-only messages + React Native Headless JS |

---

## Running locally

### Prerequisites

- Node.js 18+
- Android Studio + Android SDK (API 34+)
- A Firebase project with Realtime Database enabled
- A Supabase project

### Setup

```bash
git clone https://github.com/sinful1992/family-safety.git
cd family-safety
npm install
cp .env.example .env
```

Fill in `.env` with your Firebase and Supabase credentials:

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
GOOGLE_WEB_CLIENT_ID=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Place your `google-services.json` in `android/app/`.

### Run

```bash
npm start          # Metro bundler
npm run android    # Deploy to connected device or emulator
```

### Deploy edge functions

```bash
npx supabase functions deploy --project-ref <your-project-ref>
```

Set these secrets in the Supabase dashboard:

- `FIREBASE_SERVICE_ACCOUNT` — full service account JSON from Google Cloud Console
- `FIREBASE_DATABASE_URL` — your Firebase Realtime Database URL

---

## Firebase Database rules

See `database.rules.json`. The key principle: users can only read and write data within their own family group, and only after authentication.

---

## License

MIT
