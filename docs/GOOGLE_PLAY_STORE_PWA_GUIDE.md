# Bundling RAIR for the Google Play Store (TWA / PWA Guide)

RAIR is built as a compliant **Progressive Web App (PWA)** that can be packaged directly into an **Android App Bundle (`.aab`)** and published to the **Google Play Store** using Google's **Trusted Web Activity (TWA)** standard.

---

## 1. What's Already Configured in RAIR

All foundational technical requirements for PWA installability and Google Play Store TWA compliance are already implemented:

| Requirement | Implementation in RAIR | Status |
| :--- | :--- | :--- |
| **Web App Manifest** | `frontend/static/manifest.webmanifest` & `manifest.json` with standalone mode, portrait lock, metadata, and shortcuts | Verified ✅ |
| **Service Worker** | `frontend/src/service-worker.ts` caching the app shell, static assets, and providing offline play fallback | Verified ✅ |
| **App Icons** | Complete suite (16px to 512px) featuring all 4 elements (Fire, Ice, Lightning, Void) and celestial sword | Verified ✅ |
| **Maskable Icons** | `icon-192-maskable.png` & `icon-512-maskable.png` with 80% safe zone padding for Android adaptive icons | Verified ✅ |
| **Play Store Assets** | `playstore-icon-512.png` (512x512) and `playstore-feature-graphic.png` (1024x500) | Verified ✅ |
| **Store Screenshots** | Narrow mobile (`screenshot-mobile.png`) and wide tablet/desktop (`screenshot-wide.png`) | Verified ✅ |
| **Digital Asset Links** | `frontend/static/.well-known/assetlinks.json` template for domain verification | Verified ✅ |
| **Mobile & Touch UX** | `viewport-fit=cover`, safe-area insets, pull-to-refresh overscroll containment, and tap protection | Verified ✅ |
| **In-App PWA Store** | PWA store (`pwaStore.svelte.ts`) with in-game Install button and update detection in Game Options | Verified ✅ |

---

## 2. Choosing a Packaging Method

There are two primary methods to turn your PWA into a Google Play `.aab` (Android App Bundle):

### Method A: PWABuilder (Recommended — Quickest & Easiest)

[PWABuilder](https://www.pwabuilder.com) is Microsoft's open-source tool backed by the W3C and Google that packages PWAs into signed Google Play bundles directly from the browser.

1. Deploy your RAIR game to your live production HTTPS domain (e.g. `https://your-domain.com`).
2. Go to **[pwabuilder.com](https://www.pwabuilder.com)** and enter your game's URL.
3. Click **Start**. PWABuilder will audit your manifest and service worker (all checks will pass).
4. Click **Package for Stores** and select **Android / Google Play**.
5. Configure package details:
   - **Package ID**: `com.rair.game` (or your preferred unique ID)
   - **App name**: `RAIR`
   - **Short name**: `RAIR`
   - **Display mode**: `Standalone` or `Fullscreen`
6. Click **Generate Package**.
7. Download the `.zip` archive which contains:
   - Your signed or unsigned `.aab` (ready for Play Console upload)
   - `assetlinks.json` with your signing key SHA-256 fingerprint

---

### Method B: Google Bubblewrap CLI (Command Line & CI/CD)

Google's official CLI tool `@bubblewrap/cli` creates and builds Android projects directly from your manifest.

#### Step 1: Install Bubblewrap
Ensure you have Node.js and Java 17+ installed, then run:
```bash
npm install -g @bubblewrap/cli
```

#### Step 2: Initialize Project from Manifest
Run Bubblewrap pointing to your live game domain or local build:
```bash
bubblewrap init --manifest="https://<your-live-domain>/manifest.webmanifest"
```
Or use the pre-configured manifest template located in `google-play/twa-manifest.json`:
```bash
cd google-play
bubblewrap build
```

#### Step 3: Generate Android Keystore (Signing Key)
If you don't already have an Android keystore:
```bash
keytool -genkey -v -keystore rair-release-key.keystore -alias rair -keyalg RSA -keysize 2048 -validity 10000
```
> [!IMPORTANT]
> Keep your `.keystore` file and passwords safe in a secure password manager. You will need the same keystore to push updates in the future!

#### Step 4: Build the Android App Bundle (`.aab`)
```bash
bubblewrap build
```
This generates `app-release-bundle.aab`.

---

## 3. Configuring Digital Asset Links (`.well-known/assetlinks.json`)

To remove the Chrome browser URL bar inside the Android app and give players a 100% native full-screen experience, Google Play requires domain verification via Digital Asset Links.

1. Get the **SHA-256 certificate fingerprint**:
   - If using **Google Play App Signing** (recommended): In the Google Play Console, navigate to **Release > Setup > App Integrity > Play App Signing** and copy the **Digital Asset Links JSON snippet**.
   - If using your local keystore: Run `keytool -list -v -keystore rair-release-key.keystore -alias rair` and copy the SHA-256 line.
2. Open `frontend/static/.well-known/assetlinks.json` and replace the fingerprint and package name:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.rair.game",
      "sha256_cert_fingerprints": [
        "YOUR:ACTUAL:SHA256:FINGERPRINT:FROM:PLAY:CONSOLE:HERE"
      ]
    }
  }
]
```
3. Rebuild and deploy frontend:
```bash
cd frontend && npm run build
```
4. Verify by opening `https://<your-domain>/.well-known/assetlinks.json` in your browser. Google's Android TWA verifier will validate this on app launch.

---

## 4. Google Play Console Submission Checklist

When you are ready to publish:

1. **Create App in Play Console**:
   - Title: `RAIR: Rogue Ascension Idle RPG`
   - Default language: English (United States)
   - App or game: **Game**
   - Free or paid: **Free**

2. **Upload Store Assets**:
   - **App Icon**: `frontend/static/icons/playstore-icon-512.png` (512x512)
   - **Feature Graphic**: `frontend/static/screenshots/playstore-feature-graphic.png` (1024x500)
   - **Phone Screenshots**: `frontend/static/screenshots/screenshot-mobile.png` (720x1280)
   - **7-inch / 10-inch Tablet Screenshots**: `frontend/static/screenshots/screenshot-wide.png` (1920x1080)

3. **Content Rating & Data Safety**:
   - Category: **Role Playing (RPG)** / **Casual** / **Idle**
   - Data collection: Minimal (Google Sign-In uses email/name if enabled, guest accounts store no personal data)

4. **Release Track**:
   - Create a release in **Closed testing** or **Production**.
   - Upload your `app-release-bundle.aab`.
   - Submit for review!

---

## 5. Testing the PWA Locally Before Publishing

You can test PWA installability immediately in Chrome or Edge:
1. Run `npm run preview` in `frontend/` (or run backend serving static build).
2. Open Chrome DevTools (`F12`) → **Application** tab.
3. Check:
   - **Manifest**: Displays name, icons, 4-element badge, screenshots, and "App is installable".
   - **Service Workers**: Registered and active.
4. Click the install icon in the browser address bar (or click "Install App" in Game Options inside RAIR) to test the native window mode.
