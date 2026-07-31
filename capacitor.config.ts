import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor configuration for the future iOS and Android builds.
 *
 * Nothing here affects the web build. Running `npm run cap:sync` copies the
 * contents of `dist/` into the native projects.
 *
 * IMPORTANT before the first native release:
 *  - `appId` must be the permanent bundle identifier. Once an app is published
 *    it can never be changed, on either store.
 *  - `appName` is what appears under the icon on the home screen.
 * See NATIVE_APP_RELEASE_CHECKLIST.md.
 */
const config: CapacitorConfig = {
  appId: 'com.leesmartialartsacademy.app',
  appName: "Lee's Martial Arts Academy",
  webDir: 'dist',
  // The native shell loads the bundled files from the app itself, so the web
  // build must be produced with VITE_BASE_PATH unset (base "/").
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    // Matches the app's dark chrome so there is no white flash on launch.
    backgroundColor: '#0b0b0d',
  },
  android: {
    backgroundColor: '#0b0b0d',
    // Keeps text sizing consistent with the web app.
    allowMixedContent: false,
  },
  plugins: {
    // Placeholder for the push plugin added during the native phase.
    // PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
}

export default config
