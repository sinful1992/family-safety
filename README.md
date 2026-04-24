# Family Safety

A real-time family check-in app for Android. Ping a family member, they get an alert that wakes their screen, they tap **I'm Okay** or **Need Help** — and their location appears on your screen within seconds.

Built with React Native, Firebase Realtime Database, and Supabase Edge Functions.

---

## The problem with existing apps

Every major family safety app — Life360, Glympse, FamilyWhere — is built on **passive location tracking**. Your phone silently reports GPS every few minutes, all day, to a server. Nobody asked. Nobody confirmed they're okay. You just watch a dot move on a map and hope the absence of bad news means good news.

Life360 added "No-Show Alerts" in 2025: it notifies you when a family member *doesn't arrive* somewhere expected. Still passive. Still waiting. A reviewer put it plainly: *"Life360 doesn't offer a single 'ask for check-in' button."*

Bark is the closest in concept — a parent can request a teen to share location — but it's a parenting tool built around content monitoring, not a peer-to-peer family safety tool.

**None of them do what Family Safety does: actively demand a response from a specific person, right now.**

---

## What this app does instead

Family Safety is built around a single interaction: the **ping**.

You tap a family member. Their phone wakes up — screen on, vibrating — even if the app was killed. They see one question: *Are you okay?* They tap **I'm Okay** or **Need Help**. Their location appears on your screen within seconds, captured automatically at the moment they responded.

That's it. No passive tracking. No always-on GPS drain. No surveillance feed. Just a deliberate signal sent, and a deliberate answer returned.

### Why this matters in real situations

Passive tracking tells you where someone *was*. A ping tells you where they are *right now* — and if they can respond, whether they're okay. Those are very different things when a family member is late, in an unfamiliar place, or hasn't been heard from.

Location is captured automatically the moment the check-in is received, before the person even taps anything. So even if they can't respond, you still get their location. If they can respond, you get their location *and* a confirmed status. Either way, you know more than you did.

The binary response — okay or not okay — is intentional. In a stressful moment, one tap is all someone can manage. There's no form to fill out, no message to type.

### What makes the technical implementation hard

Most apps can send a push notification. The hard part is making it work when the app is fully killed, waking the screen reliably, capturing GPS before the user even responds, and writing that location to a live database that updates the requester's screen in real time — all in a few seconds. That's the engineering this app is built around.

---

## What makes it work well in practice

- **Works from a killed app.** Check-in requests are delivered as FCM data-only messages, which means the target device wakes up and processes the alert even if the app was fully closed.
- **Screen wake + vibration.** When a check-in arrives, the device screen turns on and vibrates for up to 45 seconds — hard to miss even if the phone is face-down on a table.
- **Location on response, not on request.** GPS is captured the moment the person responds and written to the database instantly. The requester sees it appear in real time on a live map.
- **Emergency mode.** The "I Need Help" button broadcasts an alert to the entire family group simultaneously, not just one person.
- **No subscription, no ads, no data sold.** Your family's location data lives in your own Firebase project. Nothing is sent to a third party.
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
