import { CapacitorConfig } from '@capacitor/cli';
// Align appId with iOS Bundle ID shown in Firebase (com.planb.beework)
const config: CapacitorConfig = {
  appId: 'com.planb.beework',
  appName: 'BeeWork',
  webDir: 'dist',
  server: { androidScheme: 'https' } // fixes http issues on Android 9+
};
export default config;
