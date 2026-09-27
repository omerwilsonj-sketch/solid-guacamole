# Echelon Form — App Store & Google Play Readiness Report

**Date:** 2026-09-22
**Author:** App Developer (agent-app-developer)
**Codebase:** `~/vantagefit-app` — pushed to **github.com/omerwilsonj-sketch/solid-guacamole** (`main`) as the canonical app repo. Latest commits: `e4b5dd1` (EAS config + identifiers), `88e2129` (TypeScript build fixes).

---

## 1. Executive Summary

The Echelon Form mobile app (React Native + Expo SDK 56, TypeScript strict) is **functionally complete and now compiles cleanly** (`tsc --noEmit` passes with 0 errors). All previous build-blocking issues were found and fixed during this audit. The app is **not yet submittable** to either store — it needs real credentials, a privacy policy URL, screenshots, and store-listing copy, all of which the owner must supply (developer accounts + secrets). Estimated remaining work: **~1–2 days of setup + review**, not code.

---

## 2. What Works (verified in audit)

| Area | Status |
|---|---|
| Auth (email/password, Supabase) | ✅ `AuthScreen.tsx` — sign in / create account, session persistence |
| Home / tab navigation | ✅ Train / Fuel / Coach / You tabs with entitlement gating |
| Workout library | ✅ 52 exercises in `src/constants/exercises.ts` (searchable, full form cues) |
| Workout tracking | ✅ `WorkoutSessionScreen.tsx` — 30-min timer, set/rep/kg logging, save to Supabase |
| Nutrition logging | ✅ `NutritionScreen.tsx` — MSJ macro calculator, progress bars, daily food log |
| Coaching chat | ✅ `ChatScreen.tsx` — Supabase Realtime, group + private channels, photo upload |
| Profile & paywall | ✅ `ProfileScreen.tsx` — current tier, restore purchases, RevenueCat offering-driven upgrades |
| RevenueCat billing | ✅ Wired (Go £14.99 / Core £49 / VIP £249 / Elite £999). SDK uses `EXPO_PUBLIC_REVENUECAT_API_KEY` |
| Retell AI concierge | ✅ Client lib + Supabase edge functions (retell-concierge, retell-webhook) |
| Branding | ✅ No "VantageFit" references anywhere; dark luxury theme, Echelon Form assets |
| App icons/splash | ✅ 1024×1024 icon, 1024 splash, Android adaptive icons (512 foreground/background/monochrome) |
| Repository hygiene | ✅ `.env` NOT tracked; no secrets committed; `.gitignore` covers env + native folders |

### Compilation & verification
- `npx tsc --noEmit` → **exit 0** (was failing on 9 errors before this audit — all fixed)
- `bun install` → 462 packages, lockfile stable
- Schema parity: all 7 Supabase tables referenced by the app exist in `/home/team/shared/supabase_setup.sql` + `retell_ai_setup.sql`

### Bugs fixed during this audit (commit 88e2129)
1. **ExerciseLibraryScreen.tsx** — invalid JSX (`<Text …>>` broke the build) → `{'>'}`
2. **workouts.ts vs Exercise type** — inline workout exercise references lacked required fields → new `ExerciseRef` type
3. **revenuecat.ts** — `addCustomerInfoListener` returned the SDK's `void` where an unsubscribe function was promised → now wraps `removeCustomerInfoUpdateListener`
4. **ProfileScreen.tsx** — local `Offering` interface required a `description` field the SDK doesn't expose (`serverDescription`) → dropped the field
5. **WorkoutSessionScreen.tsx** — `NodeJS.Timeout` type doesn't exist in React Native → `ReturnType<typeof setInterval>`
6. **HomeScreen.tsx** — duplicated `tier === 'go'` condition (dead logic)
7. **tsconfig.json** — `supabase/functions` (Deno edge functions) are now excluded from the Expo TypeScript project

---

## 3. What's Missing / Blocked (store submission checklist)

### A. Secrets & accounts (owner must provide — cannot be invented)

| Item | Where it goes | Blocking? |
|---|---|---|
| **Apple Developer Program account** ($99/yr) | App Store Connect | ✅ Blocking — required to submit |
| **Google Play Console account** ($25 one-time) | Play Console | ✅ Blocking |
| **Supabase project URL + anon key** | `.env` → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ Blocking — app cannot authenticate without these |
| **RevenueCat production key** | `.env` → `EXPO_PUBLIC_REVENUECAT_API_KEY` | ⚠️ Current `.env` holds a *test* key; production key needed before release |
| **EAS / Expo account** (owner) | `eas login` | ✅ Blocking — required for cloud builds |
| **Android keystore** / iOS signing | Auto-managed by EAS if using EAS credentials | ⚠️ Owner consents to EAS managing signing |

### B. Store submission assets (being built / must be built)

| Item | Status |
|---|---|
| App icon | ✅ Ready (1024×1024, dark luxury) |
| Splash screen | ✅ Ready |
| **Privacy policy URL** | 🔄 In progress — lead assigned to app-developer-2; must be a live HTTPS URL that covers health/fitness data, subscriptions, and Retell AI call recording |
| **Screenshots** (6.7"/6.5"/5.5" iOS; phone + tablet Android) | ❌ Not created — recommend capturing from simulator/emulator once env vars are set |
| Store listing copy (title/subtitle/description/keywords) | ❌ Not created — suggest drafting from the landing page + business plan (see §5) |
| **Content rating questionnaire** | ❌ Not created — App Store content description + Google Play IARC questionnaire. App is fitness-only, no objectionable content. |
| **In-app purchase products in App Store Connect / Play Console** | ❌ Must mirror RevenueCat products: `echelon_go_monthly`, `echelon_core_monthly`, `echelon_vip_monthly`, `echelon_elite_monthly` (entitlements: go/core/vip/elite) |
| **iOS HealthKit / watchOS entitlements** | ⏸ Not needed for v1 — integration with Apple Health is a planned Phase-3 feature, not yet in code |

### C. Declared permissions

- **expo-secure-store** — no runtime permission prompt (keychain/keystore).
- **react-native-purchases** — adds Google Play Billing permission on Android; no iOS prompt.
- **No camera/mic/location permissions are declared** — good; Retell calls are initiated from the app only (concierge calls *back*), which avoids mic permission needs.

---

## 4. Build & Submission Path (ready to run, pending secrets)

```bash
cd ~/vantagefit-app
npm install          # or bun install
# 1. Fill real values into .env (see .env.example)
# 2. eas login            (owner's Expo/EAS account)
# 3. eas build --platform ios --profile production
# 4. eas build --platform android --profile production
# 5. eas submit --platform ios    (owner must be logged into App Store Connect)
# 6. eas submit --platform android
```

- `eas.json` is included with `development` / `preview` / `production` profiles and `autoIncrement` for versioning.
- `app.json` now declares: `ios.bundleIdentifier = com.echelonform.app`, `android.package = com.echelonform.app`, `scheme = echelonform`, `buildNumber = 1`, `versionCode = 1`.
  - ⚠️ **Owner should confirm the bundle ID / package name** — once submitted, Android package names cannot change.
  - If the owner prefers `com.echelonform` or similar, edit `app.json` before the first build.

---

## 5. Suggested Store Listing Copy (draft — for review by owner)

**Title (30 chars):** Echelon Form — Elite Fitness
**Subtitle (30 chars):** 30-Min Workouts & Smart Nutrition
**Keywords (iOS, 100 chars):** fitness, HIIT, executive, nutrition, macro, workout, coach, performance, health, luxury
**Short description (Android, 80 chars):** Elite 30-minute efficiency-first workouts and data-driven nutrition.
**Full description (draft):**
> Echelon Form delivers elite-level fitness for busy executives and high performers. Train with the Efficiency-First framework: 30 minutes, zero wasted movement. Log workouts and macros, follow a 52-exercise library with expert coaching cues, chat with your coach, and let data from your training drive your results. Plans from Echelon Go (self-guided) to Echelon Elite (1-on-1 coaching, daily check-ins, private executive network). Subscriptions billed through your App Store / Play Store account. Terms: subscriptions renew automatically and can be cancelled anytime in your account settings.

---

## 6. Risks / Notes

1. **RevenueCat product IDs must be created in the RevenueCat dashboard** before offering-driven paywalls show live pricing. Currently `ProfileScreen` falls back to static cards if no offerings are configured.
2. **Workout video links are `example.com` placeholders** — `videoUrl` in `workouts.ts`/`exercises.ts`. Not store-blocking, but must be real URLs before users rely on them.
3. **App Store review & subscriptions:** both stores require the **subscription terms and auto-renewal disclosure** in the listing and visible in-app. The Elite tier's 12-week minimum commitment must be clearly disclosed.
4. Elite tier (12-week minimum, £999/mo) is a custom RevenueCat package — confirm the entitlement mapping in the dashboard.
5. **Retell AI consent:** if the concierge records calls, the privacy policy must disclose it (retell-webhook stores transcripts in `concierge_logs`).

---

## 7. Estimated Remaining Work

| Task | Owner | Effort |
|---|---|---|
| Create Apple Developer + Play Console accounts | Owner | 1 day (account verification) |
| Provide Supabase URL/anon key + RevenueCat prod key | Owner | 15 min |
| Build & host privacy policy URL | app-developer-2 | in progress |
| Run first EAS builds (after secrets) | App Developer | 30 min config + build time |
| Capture screenshots from real build | App Developer + Brand Designer | 2–3 hrs |
| Draft/finalise store listing copy + content rating | Lead + Owner | 1–2 hrs |
| Create matching IAP products in both consoles | Owner (consoles) | 1 hr |
| Review build, submit to TestFlight / internal track | Owner (account holder) | 1 hr |

**Bottom line:** the engineering side is done and compiles; the path to submission is blocked only by owner-side accounts/secrets and store listing assets. The fastest next step is for the owner to provide `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and the production RevenueCat key, then run `eas build`.