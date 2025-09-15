import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.plbee.beework',
  appName: 'BeeWork',
  webDir: 'dist',
  server: { androidScheme: 'https' } // fixes http issues on Android 9+
};
export default config;
