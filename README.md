# Khan Expert — Field Engineer App

Expo app for field technicians. Engineer role only.

Specs: [`docs/specs/`](./docs/specs/00-overview.md) · Build plan: [`docs/plan.html`](./docs/plan.html)

---

## Setup

```bash
cd mobile

# 1. Core packages — the only versions pinned by hand
npm install

# 2. Everything else, resolved against the installed SDK version
npx expo install expo-router expo-constants expo-linking expo-secure-store \
  expo-status-bar react-native-safe-area-context react-native-screens \
  react-native-gesture-handler react-native-reanimated

# 3. Correct anything still mismatched
npx expo install --fix

# 4. Configure and run
cp .env.example .env     # then set EXPO_PUBLIC_API_URL
npm start
```

Add packages with `npx expo install <pkg>`, not `npm install` — it picks the version
matching this SDK. `npm install` is for packages with no native side (axios, date libs).

`EXPO_PUBLIC_*` variables are inlined at bundle time — **restart the dev server after changing `.env`**, a reload is not enough.

Point `EXPO_PUBLIC_API_URL` at a host the device can actually reach. `localhost` is the device itself, not your machine:

| Target | Value |
|---|---|
| Physical device, local backend | `http://<your-LAN-ip>:8000/api` |
| Android emulator, local backend | `http://10.0.2.2:8000/api` |
| Deployed backend | `https://<host>/api` |

---

## What is built

**Engineer login.** Against `POST /api/engineer-auth/login` exactly as it behaves today — no backend changes.

- Phone or email + password, with the identifier remembered between sessions
- Token in `expo-secure-store` (Keystore-backed), never `AsyncStorage`
- Session restored on cold start, then verified in the background
- Server prose mapped to stable error codes in one place
- 401 anywhere clears the session and explains why on the login screen
- Support number surfaces after three failures

Everything else is a placeholder.

---

## Structure

```
app/            routes only (expo-router) — every file here is a screen
  (auth)/       login
  (tabs)/       calls · profile
src/
  api/          axios instance + one module per backend resource
  components/   presentational, split by domain
  config/       env
  context/      AuthProvider
  services/     storage (secure store), later: camera, location, offline
  theme/        colors, typography, spacing
  types/        shapes mirroring what the backend actually returns
```

Import via the `@/` alias: `import { colors } from '@/theme'`.

---

## Backend quirks this app works around

Neither is fixed here — both are the backend's to fix, and both are documented in `docs/specs/10-api-contract.md`.

**`GET /api/engineer-auth/profile` is broken.** `authMiddleware` sets `req.user._id` for engineers, but the controller reads `req.user?.id`, so it calls `findById(undefined)` and 404s for every engineer. The app therefore persists the profile from the login response and validates the token against `/api/engineer-calls` instead.

**There is no engineer logout, and no password reset.** Tokens live 30 days with no server-side revocation, so signing out is purely local. Passwords are set by an administrator by hand — the login screen says so rather than offering a reset that does not exist.

---

## Next

The assigned-call list. `GET /api/engineer-calls` already returns full call documents with search, status filter, pagination and summary counts — but see blockers B1, B2 and B6 in the plan before trusting its scoping.
